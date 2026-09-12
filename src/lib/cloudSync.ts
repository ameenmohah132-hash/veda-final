import { supabase, getAccessToken } from './supabase';
import { AppState, UserProfile } from '../types';

// ----------------------------------------------------------------------------
// profiles table  <->  UserProfile subscription/trial fields
// ----------------------------------------------------------------------------

interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  tier: 'free' | 'premium';
  has_paid_subscription: boolean;
  subscription_billing: 'monthly' | 'yearly' | null;
  paypal_subscription_id: string | null;
  subscription_status: UserProfile['subscriptionStatus'];
  current_period_start: string | null;
  current_period_end: string | null;
  trial_started_at: string;
  trial_duration_days: number;
  trial_decision: 'pending' | 'subscribed' | 'free';
  has_completed_onboarding: boolean;
  created_at: string;
}

function mapProfileRow(row: ProfileRow): Partial<UserProfile> & { hasCompletedOnboarding: boolean } {
  return {
    id: row.id,
    email: row.email || '',
    fullName: row.full_name || 'Friend',
    avatarUrl: row.avatar_url || undefined,
    tier: row.tier,
    hasPaidSubscription: row.has_paid_subscription,
    subscriptionBilling: row.subscription_billing || undefined,
    billing: row.subscription_billing || undefined,
    paypalSubscriptionId: row.paypal_subscription_id || undefined,
    subscriptionStatus: row.subscription_status,
    currentPeriodStart: row.current_period_start || undefined,
    currentPeriodEnd: row.current_period_end || undefined,
    trialStartedAt: row.trial_started_at,
    trialDurationDays: row.trial_duration_days,
    trialDecision: row.trial_decision,
    joinedAt: row.created_at,
    hasCompletedOnboarding: row.has_completed_onboarding,
  };
}

/**
 * Fetches the authoritative profile row for the signed-in user. The
 * on_auth_user_created trigger guarantees this row already exists by the
 * time a session is available, but we retry briefly just in case of any
 * replication lag right after first signup.
 */
export async function fetchProfile(
  userId: string
): Promise<(Partial<UserProfile> & { hasCompletedOnboarding: boolean }) | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase
      .from('profiles')
      .select(
        'id, email, full_name, avatar_url, tier, has_paid_subscription, subscription_billing, paypal_subscription_id, subscription_status, current_period_start, current_period_end, trial_started_at, trial_duration_days, trial_decision, has_completed_onboarding, created_at'
      )
      .eq('id', userId)
      .maybeSingle();

    if (data) return mapProfileRow(data as ProfileRow);
    if (error) console.error('fetchProfile error:', error.message);
    await new Promise((r) => setTimeout(r, 400));
  }
  return null;
}

/** Only fields the client is actually allowed to write (see migration grants). */
export async function updateOwnBasicProfile(
  userId: string,
  fields: { fullName?: string; avatarUrl?: string; hasCompletedOnboarding?: boolean }
) {
  const payload: Record<string, any> = {};
  if (fields.fullName !== undefined) payload.full_name = fields.fullName;
  if (fields.avatarUrl !== undefined) payload.avatar_url = fields.avatarUrl;
  if (fields.hasCompletedOnboarding !== undefined) payload.has_completed_onboarding = fields.hasCompletedOnboarding;
  if (Object.keys(payload).length === 0) return;

  const { error } = await supabase.from('profiles').update(payload).eq('id', userId);
  if (error) console.error('updateOwnBasicProfile error:', error.message);
}

// ----------------------------------------------------------------------------
// user_app_state table  <->  everything in AppState except subscription/trial
// ----------------------------------------------------------------------------

export async function fetchAppStateBlob(userId: string): Promise<Partial<AppState> | null> {
  const { data, error } = await supabase
    .from('user_app_state')
    .select('state_json')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('fetchAppStateBlob error:', error.message);
    return null;
  }
  return (data?.state_json as Partial<AppState>) || null;
}

/**
 * Persists the full AppState blob (profile included, for convenience/local
 * caching) to Supabase. The `profiles` table remains authoritative for
 * subscription/trial fields regardless of what's duplicated in this blob —
 * see mergeAuthoritativeProfile, which always wins on load.
 */
export async function pushAppStateBlob(userId: string, state: AppState) {
  const { error } = await supabase
    .from('user_app_state')
    .upsert({ user_id: userId, state_json: state as any }, { onConflict: 'user_id' });

  if (error) console.error('pushAppStateBlob error:', error.message);
}

let pushTimer: ReturnType<typeof setTimeout> | null = null;
export function pushAppStateBlobDebounced(userId: string, state: AppState, delayMs = 1200) {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushAppStateBlob(userId, state);
  }, delayMs);
}

/**
 * Lets a user voluntarily opt out of their premium trial early. This is the
 * one subscription-adjacent write the client is allowed to trigger, because
 * it can only ever reduce access, never grant it — the actual column write
 * still happens server-side (service role), never directly from the client.
 */
export async function declineTrialOnServer(): Promise<boolean> {
  try {
    const token = await getAccessToken();
    if (!token) return false;
    const res = await fetch('/api/account/decline-trial', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  } catch (err) {
    console.error('declineTrialOnServer failed:', err);
    return false;
  }
}

/** Re-asserts the server-authoritative subscription/trial fields over whatever a locally-cached blob might contain. */
export function mergeAuthoritativeProfile(
  localProfile: UserProfile,
  serverProfile: Partial<UserProfile>
): UserProfile {
  return {
    ...localProfile,
    ...serverProfile,
    preferences: {
      ...localProfile.preferences,
      ...(serverProfile.preferences || {}),
    },
  };
}

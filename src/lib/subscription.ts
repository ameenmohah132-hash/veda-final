import { UserProfile, SubscriptionBilling, SubscriptionTier } from '../types';

export const DEFAULT_TRIAL_DAYS = 14;

export interface SubscriptionDetails {
  status: 'paid_premium' | 'trial_active' | 'trial_expired' | 'free_plan';
  isPremiumActive: boolean; // True if either paid OR within active 14-day trial
  isTrial: boolean;
  isExpired: boolean;
  daysRemaining: number;
  hoursRemaining: number;
  daysElapsed: number;
  totalTrialDays: number;
  progressPercent: number; // 0 to 100% of trial elapsed
  trialEndDate: Date;
  trialStartDate: Date;
  planLabel: string;
  badgeLabel: string;
}

export function getSubscriptionDetails(profile?: Partial<UserProfile>): SubscriptionDetails {
  const totalTrialDays = profile?.trialDurationDays || DEFAULT_TRIAL_DAYS;

  const now = Date.now();
  const periodEndMs = profile?.currentPeriodEnd ? new Date(profile.currentPeriodEnd).getTime() : null;
  // A subscription that was cancelled still paid for its current period —
  // access should end exactly when that period does, not the instant the
  // cancellation webhook arrives.
  const stillWithinPaidPeriod = periodEndMs !== null && !isNaN(periodEndMs) && periodEndMs > now;

  // 1. Paid Premium Subscriber (currently billing, or cancelled-but-still-in-period)
  if (
    profile?.hasPaidSubscription ||
    stillWithinPaidPeriod ||
    (profile?.tier === 'premium' && profile?.trialDecision === 'subscribed')
  ) {
    const graceDaysRemaining = stillWithinPaidPeriod
      ? Math.max(1, Math.ceil((periodEndMs! - now) / (1000 * 60 * 60 * 24)))
      : 365;
    return {
      status: 'paid_premium',
      isPremiumActive: true,
      isTrial: false,
      isExpired: false,
      daysRemaining: graceDaysRemaining,
      hoursRemaining: graceDaysRemaining * 24,
      daysElapsed: 0,
      totalTrialDays,
      progressPercent: 100,
      trialEndDate: periodEndMs ? new Date(periodEndMs) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      trialStartDate: new Date(),
      planLabel:
        profile.hasPaidSubscription === false && stillWithinPaidPeriod
          ? 'Premium (ends at period end)'
          : 'Premium',
      badgeLabel: '★ PREMIUM',
    };
  }

  // 2. User explicitly accepted or switched to Free tier after trial
  if (profile?.trialDecision === 'free' && profile?.tier === 'free') {
    return {
      status: 'free_plan',
      isPremiumActive: false,
      isTrial: false,
      isExpired: true,
      daysRemaining: 0,
      hoursRemaining: 0,
      daysElapsed: totalTrialDays,
      totalTrialDays,
      progressPercent: 100,
      trialEndDate: new Date(),
      trialStartDate: new Date(profile?.trialStartedAt || Date.now()),
      planLabel: 'Veda Free',
      badgeLabel: 'Free Plan',
    };
  }

  // 3. 14-Day Free Trial Calculation — deliberately does NOT fall back to
  // profile.joinedAt. joinedAt is "when the account was created," not "when
  // the trial started," and treating them as interchangeable is what
  // previously let a failed/missing profile fetch silently compute a brand
  // new trial starting "now" for every render. With no verified trial start,
  // there is no trial to grant — fall through to the safe (expired/free)
  // state below instead.
  const rawStartDate = profile?.trialStartedAt || profile?.installedAt;
  if (!rawStartDate) {
    return {
      status: 'trial_expired',
      isPremiumActive: false,
      isTrial: false,
      isExpired: true,
      daysRemaining: 0,
      hoursRemaining: 0,
      daysElapsed: totalTrialDays,
      totalTrialDays,
      progressPercent: 100,
      trialEndDate: new Date(now),
      trialStartDate: new Date(now),
      planLabel: 'Trial Ended',
      badgeLabel: 'Trial Ended',
    };
  }
  const trialStartDate = new Date(rawStartDate);
  const trialStartMs = trialStartDate.getTime();
  const trialDurationMs = totalTrialDays * 24 * 60 * 60 * 1000;
  const trialEndMs = trialStartMs + trialDurationMs;
  const trialEndDate = new Date(trialEndMs);

  const msRemaining = Math.max(0, trialEndMs - now);
  const msElapsed = Math.max(0, now - trialStartMs);

  const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
  const hoursRemaining = Math.ceil(msRemaining / (1000 * 60 * 60));
  const daysElapsed = Math.floor(msElapsed / (1000 * 60 * 60 * 24));

  const progressPercent = Math.min(100, Math.max(0, Math.round((msElapsed / trialDurationMs) * 100)));

  if (msRemaining > 0) {
    return {
      status: 'trial_active',
      isPremiumActive: true, // Entire Premium suite is 100% free during the 14 days!
      isTrial: true,
      isExpired: false,
      daysRemaining,
      hoursRemaining,
      daysElapsed,
      totalTrialDays,
      progressPercent,
      trialEndDate,
      trialStartDate,
      planLabel: `14-Day Free Trial (${daysRemaining}d left)`,
      badgeLabel: `✨ 14-Day Trial (${daysRemaining}d left)`,
    };
  }

  // 4. Trial has ended after 14 days
  return {
    status: 'trial_expired',
    isPremiumActive: false,
    isTrial: false,
    isExpired: true,
    daysRemaining: 0,
    hoursRemaining: 0,
    daysElapsed: totalTrialDays,
    totalTrialDays,
    progressPercent: 100,
    trialEndDate,
    trialStartDate,
    planLabel: 'Trial Ended',
    badgeLabel: 'Trial Ended',
  };
}

import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { UserProfile } from '../types';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://paxffergxmmamepunkbi.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBheGZmZXJneG1tYW1lcHVua2JpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMjI2MzksImV4cCI6MjEwMjY5ODYzOX0.SRkeYXU_dd14UZgsx2oRV9WmQxeRQPnsGEpA3MkD394';

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export function initSupabaseAuthListener(onUserChange: (user: User | null) => void) {
  // Deliberately NOT also calling supabase.auth.getSession() here. That used
  // to run in parallel with onAuthStateChange, and the two could resolve in
  // either order — right after a Google redirect, getSession() could report
  // "no session yet" a moment before onAuthStateChange fired with the real
  // one, which is exactly the kind of race that made an authenticated user
  // briefly (or, if the follow-up render committed to it, not-so-briefly)
  // look logged out. onAuthStateChange alone already fires once immediately
  // with the current session (whatever it is, including one just restored
  // from a redirect) and again on every subsequent change, so it's the
  // single source of truth here.
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    onUserChange(session?.user || null);
  });

  return () => {
    subscription.unsubscribe();
  };
}

function friendlyAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('rate limit')) {
    return "You've tried this a few times in quick succession — please wait a few minutes before trying again. (This is a temporary email-sending limit, not a problem with your account.)";
  }
  return message;
}

export async function signInWithEmailPassword(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return { user: data.user, session: data.session, error: null };
  } catch (err: any) {
    return { user: null, session: null, error: friendlyAuthError(err.message || 'Failed to sign in') };
  }
}

export async function signUpWithEmailPassword(email: string, password: string, fullName: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    if (error) throw error;
    return { user: data.user, session: data.session, error: null };
  } catch (err: any) {
    return { user: null, session: null, error: friendlyAuthError(err.message || 'Failed to register account') };
  }
}

export async function sendMagicLink(email: string) {
  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw error;
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: friendlyAuthError(err.message || 'Failed to send magic link') };
  }
}

export async function signOutUser() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

export function extractProfileFromSupabaseUser(user: User): UserProfile {
  const metadata = user.user_metadata || {};
  return {
    id: user.id,
    email: user.email || '',
    fullName: metadata.full_name || metadata.name || user.email?.split('@')[0] || 'Friend',
    avatarUrl: metadata.avatar_url || metadata.picture || undefined,
    tier: 'free',
    joinedAt: user.created_at || new Date().toISOString(),
    preferences: {
      theme: 'system',
      language: 'en',
      currency: 'USD',
      prayerCalculationMethod: 'MWL',
      asrJuristic: 'standard',
      soundEnabled: true,
      pomodoroWorkMinutes: 25,
      pomodoroBreakMinutes: 5,
    },
  };
}
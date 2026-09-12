import { AppState, UserProfile } from '../types';

/**
 * Local storage is now a fast-boot CACHE ONLY. It exists purely so the app
 * can render instantly on launch while the authoritative Supabase fetch
 * completes, and as an offline fallback. It must never be treated as the
 * source of truth for identity, subscription, or trial status — those
 * always come from the `profiles` table (see lib/cloudSync.ts) and are
 * re-asserted over anything cached here.
 */

export function getInitialCleanState(userProfile: Partial<UserProfile> & { id: string }): AppState {
  const nowIso = new Date().toISOString();
  const profile: UserProfile = {
    id: userProfile.id,
    email: userProfile.email || '',
    fullName: userProfile.fullName || 'Friend',
    avatarUrl: userProfile.avatarUrl,
    tier: userProfile.tier || 'premium',
    billing: userProfile.billing || 'monthly',
    subscriptionBilling: userProfile.subscriptionBilling || 'monthly',
    hasPaidSubscription: userProfile.hasPaidSubscription || false,
    trialStartedAt: userProfile.trialStartedAt || nowIso,
    trialDurationDays: userProfile.trialDurationDays || 14,
    trialDecision: userProfile.trialDecision || 'pending',
    joinedAt: userProfile.joinedAt || nowIso,
    location: userProfile.location || {
      city: 'Current Location',
      country: '',
      latitude: 3.139,
      longitude: 101.6869,
    },
    preferences: {
      theme: 'system',
      language: 'en',
      currency: 'USD',
      prayerCalculationMethod: 'MWL',
      asrJuristic: 'standard',
      soundEnabled: true,
      pomodoroWorkMinutes: 25,
      pomodoroBreakMinutes: 5,
      ...userProfile.preferences,
    },
  };

  return {
    profile,
    subjects: [
      { id: 'sub_1', name: 'Mathematics', colorHex: '#71717a', createdAt: new Date().toISOString() },
      { id: 'sub_2', name: 'Computer Science', colorHex: '#a1a1aa', createdAt: new Date().toISOString() },
    ],
    tasks: [],
    documents: [],
    flashcards: [],
    exams: [],
    expenses: [],
    monthlyBudget: 500,
    savingsGoals: [],
    habits: [
      {
        id: 'hab_1',
        name: 'Morning Adhkar & Fajr',
        title: 'Morning Adhkar & Fajr',
        category: 'worship',
        frequency: 'daily',
        history: {},
        completedDates: [],
        streak: 0,
        streakCount: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'hab_2',
        name: 'Daily Deep Study (45m)',
        title: 'Daily Deep Study (45m)',
        category: 'study',
        frequency: 'daily',
        history: {},
        completedDates: [],
        streak: 0,
        streakCount: 0,
        createdAt: new Date().toISOString(),
      },
    ],
    goals: [],
    focusSessions: [],
    notes: [],
    journals: [],
    prayerLogs: {},
    quranLastRead: {
      surah: 1,
      ayah: 1,
      updatedAt: new Date().toISOString(),
    },
    adhkarProgress: {},
    tasbihCount: 0,
    tasbihGoal: 100,
    khatmahProgress: 0,
    hasCompletedOnboarding: false,
  };
}

/** Fast local cache, keyed by the real authenticated user id. */
export function loadCachedAppState(userId: string): AppState | null {
  try {
    const raw = localStorage.getItem(`veda_state_${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const initial = getInitialCleanState({ id: userId });

    const normalizedHabits = (parsed.habits || initial.habits || []).map((h: any) => ({
      ...h,
      name: h.name || h.title || 'Habit',
      title: h.title || h.name || 'Habit',
      frequency: h.frequency || 'daily',
      completedDates: Array.isArray(h.completedDates)
        ? h.completedDates
        : Object.keys(h.history || {}).filter((k) => h.history[k]),
      streakCount: h.streakCount ?? h.streak ?? 0,
      streak: h.streak ?? h.streakCount ?? 0,
    }));

    return {
      ...initial,
      ...parsed,
      profile: {
        ...initial.profile,
        ...parsed.profile,
        preferences: {
          ...initial.profile.preferences,
          ...parsed.profile?.preferences,
        },
      },
      habits: normalizedHabits,
      goals: parsed.goals || [],
      tasks: parsed.tasks || [],
      expenses: parsed.expenses || [],
      notes: parsed.notes || [],
      documents: parsed.documents || [],
      flashcards: parsed.flashcards || [],
      exams: parsed.exams || [],
      savingsGoals: parsed.savingsGoals || [],
      focusSessions: parsed.focusSessions || [],
      prayerLogs: parsed.prayerLogs || {},
    };
  } catch (err) {
    console.error('Failed to load cached state:', err);
    return null;
  }
}

export function saveCachedAppState(state: AppState) {
  try {
    if (!state.profile?.id) return;
    localStorage.setItem(`veda_state_${state.profile.id}`, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to write cached state:', err);
  }
}

export function clearCachedAppState(userId: string) {
  try {
    localStorage.removeItem(`veda_state_${userId}`);
  } catch {
    // ignore
  }
}

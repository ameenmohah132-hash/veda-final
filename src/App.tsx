import { useState, useEffect } from 'react';
import {
  AppState,
  ExamGoal,
  ExpenseItem,
  FocusSession,
  Goal,
  Habit,
  PrayerName,
  QuickNote,
  SavingsGoal,
  StudyDocument,
  StudyFlashcard,
  StudyTask,
  SubscriptionBilling,
  SubscriptionTier,
  ThemeMode,
  UserProfile,
} from './types';
import {
  getInitialCleanState,
  loadCachedAppState,
  saveCachedAppState,
  clearCachedAppState,
} from './lib/storage';
import { supabase, initSupabaseAuthListener, signOutUser } from './lib/supabase';
import {
  fetchProfile,
  fetchAppStateBlob,
  pushAppStateBlobDebounced,
  updateOwnBasicProfile,
  mergeAuthoritativeProfile,
  declineTrialOnServer,
} from './lib/cloudSync';
import { initCapacitorApp } from './lib/capacitor';
import { LanguageProvider } from './lib/LanguageContext';

// Navigation & Modals
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { TrialBanner } from './components/TrialBanner';
import { AuthModal } from './components/AuthModal';
import { ProfileModal } from './components/ProfileModal';
import { PremiumModal } from './components/PremiumModal';
import { FocusModal } from './components/FocusModal';
import { WeeklyReportModal } from './components/WeeklyReportModal';
import { AskVedaDrawer } from './components/AskVedaDrawer';
import { OnboardingFlow } from './components/OnboardingFlow';
import { VedaLogo } from './components/ui/LiquidGlass';

// Tabs
import { HomeTab } from './components/tabs/HomeTab';
import { StudyTab } from './components/tabs/StudyTab';
import { IslamicTab } from './components/tabs/IslamicTab';
import { FinanceTab } from './components/tabs/FinanceTab';
import { GoalsTab } from './components/tabs/GoalsTab';
import { NotesTab } from './components/tabs/NotesTab';
import { SettingsTab } from './components/tabs/SettingsTab';

const PENDING_TIER_CHOICE_KEY = 'veda_pending_tier_choice';

function SplashScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="flex flex-col items-center gap-3">
        <VedaLogo size={40} className="text-zinc-900 dark:text-white animate-pulse" />
        <div className="w-5 h-5 border-2 border-zinc-300 dark:border-zinc-700 border-t-zinc-900 dark:border-t-white rounded-full animate-spin" />
      </div>
    </div>
  );
}

export default function App() {
  // 'checking' -> resolving whatever Supabase session may exist
  // 'unauthenticated' -> no real account signed in; a real account is required
  // 'authenticated' -> real Supabase session, `state` is the source of truth
  const [authStatus, setAuthStatus] = useState<'checking' | 'unauthenticated' | 'authenticated'>('checking');
  const [state, setState] = useState<AppState | null>(null);
  const [activeTab, setActiveTab] = useState<string>('home');
  // Lets a person pick their language on the Welcome/Auth screens, before an
  // account (and therefore a synced profile) exists yet. Persisted to
  // localStorage so it survives a reopen, and carried into the real profile
  // the moment one is created — see getInitialCleanState below.
  const [preAuthLanguage, setPreAuthLanguage] = useState<'en' | 'ar'>(() => {
    try {
      return (localStorage.getItem('veda_preferred_language') as 'en' | 'ar') || 'en';
    } catch {
      return 'en';
    }
  });
  const effectiveLanguage = state?.profile?.preferences?.language || preAuthLanguage;

  // Modal States
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isPremiumOpen, setIsPremiumOpen] = useState(false);
  const [isFocusOpen, setIsFocusOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isAskVedaOpen, setIsAskVedaOpen] = useState(false);

  // Apply theme class to <html> and <body> elements
  useEffect(() => {
    const theme = state?.profile?.preferences?.theme || 'system';

    function applyTheme() {
      const isDark =
        theme === 'dark' ||
        (theme === 'system' &&
          typeof window !== 'undefined' &&
          window.matchMedia &&
          window.matchMedia('(prefers-color-scheme: dark)').matches);

      if (isDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
        document.body.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.style.colorScheme = 'dark';
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
        document.body.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
        document.documentElement.style.colorScheme = 'light';
      }

      initCapacitorApp(isDark);
    }

    applyTheme();

    if (theme === 'system' && typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme();
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', listener);
        return () => mediaQuery.removeEventListener('change', listener);
      }
    }
  }, [state?.profile?.preferences?.theme]);

  // Apply text direction + lang attribute to <html> for RTL (Arabic) support.
  // Flexbox layouts throughout the app automatically visually reverse under
  // dir="rtl" per CSS spec (flex-direction: row is relative to writing
  // direction) — physical-direction utility spacing on a few elements may
  // not be pixel-mirrored, but overall reading/layout flow is correct.
  useEffect(() => {
    document.documentElement.dir = effectiveLanguage === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = effectiveLanguage;
  }, [effectiveLanguage]);

  function handleSetLanguage(language: 'en' | 'ar') {
    try {
      localStorage.setItem('veda_preferred_language', language);
    } catch {
      // ignore storage failures — the in-memory state still updates below
    }
    setPreAuthLanguage(language);
    if (state?.profile?.id) {
      handleUpdateProfile({
        preferences: {
          ...state.profile.preferences,
          language,
        },
      });
    }
  }

  // --- AUTH + CLOUD HYDRATION ---
  // Supabase (profiles + user_app_state tables) is the single source of
  // truth. localStorage is only a fast-boot cache: we paint it immediately
  // if present, then overwrite with the authoritative server data.
  useEffect(() => {
    const unsubscribe = initSupabaseAuthListener(async (user) => {
      if (!user) {
        setState(null);
        setAuthStatus('unauthenticated');
        return;
      }

      const cached = loadCachedAppState(user.id);
      if (cached) setState(cached);

      const [profileRow, blob] = await Promise.all([
        fetchProfile(user.id),
        fetchAppStateBlob(user.id),
      ]);

      // Read fresh from localStorage rather than the preAuthLanguage React
      // state closure (this effect only runs once on mount, so that closure
      // could be stale if the language was changed just before signing up).
      let preferredLanguage: 'en' | 'ar' = 'en';
      try {
        preferredLanguage = (localStorage.getItem('veda_preferred_language') as 'en' | 'ar') || 'en';
      } catch {
        // ignore
      }
      const freshProfileSeed = { id: user.id, preferences: { language: preferredLanguage } } as Partial<UserProfile> & {
        id: string;
      };

      const base: AppState =
        blob && Object.keys(blob).length > 0
          ? ({ ...getInitialCleanState(freshProfileSeed), ...(blob as AppState) } as AppState)
          : cached || getInitialCleanState(freshProfileSeed);

      if (!profileRow) {
        console.error(
          'Could not load the authoritative profile from Supabase for this user — failing closed to Free rather than trusting any cached/default trial data. If this persists, check that the 0001/0002 migrations have been run and that RLS/grants on public.profiles are correct.'
        );
      }

      let hydrated: AppState = {
        ...base,
        profile: profileRow
          ? mergeAuthoritativeProfile(base.profile, profileRow)
          : {
              ...base.profile,
              id: user.id,
              tier: 'free',
              hasPaidSubscription: false,
              trialStartedAt: undefined,
              trialDecision: 'pending',
            },
        hasCompletedOnboarding: !!profileRow?.hasCompletedOnboarding,
      };

      // Apply a pending tier/billing preference if one was stashed before
      // auth (see OnboardingFlow's stashPendingTierChoice). This is a nice-
      // to-have personalization, never a gate: whether or not it's found,
      // an authenticated session always proceeds straight into the app on
      // the next render — see the render gates below, which no longer have
      // a "show onboarding again" branch for authenticated users.
      try {
        const pendingRaw = sessionStorage.getItem(PENDING_TIER_CHOICE_KEY);
        if (pendingRaw) {
          sessionStorage.removeItem(PENDING_TIER_CHOICE_KEY);
          const pending = JSON.parse(pendingRaw) as {
            tier: SubscriptionTier;
            billing?: SubscriptionBilling;
          };
          hydrated = {
            ...hydrated,
            profile: {
              ...hydrated.profile,
              tier: pending.tier,
              billing: pending.billing || hydrated.profile.billing,
              subscriptionBilling: pending.billing || hydrated.profile.subscriptionBilling,
            },
          };
          if (pending.tier === 'free') {
            declineTrialOnServer();
          }
        }
      } catch {
        // malformed/unavailable pending choice — harmless, defaults apply
      }
      if (!hydrated.hasCompletedOnboarding) {
        hydrated.hasCompletedOnboarding = true;
        updateOwnBasicProfile(user.id, { hasCompletedOnboarding: true });
      }

      setState(hydrated);
      saveCachedAppState(hydrated);
      setAuthStatus('authenticated');
    });
    return () => unsubscribe();
  }, []);

  // Request browser geolocation once if default
  useEffect(() => {
    if (state && navigator.geolocation && !state.profile.location) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          handleUpdateCoordinates({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            city: 'My Location',
            country: '',
          });
        },
        () => {
          // Default fallback already set
        }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!state]);

  // --- STATE MUTATION HANDLERS (local cache immediately, cloud debounced) ---

  function updateState(updater: (prev: AppState) => AppState) {
    setState((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      saveCachedAppState(next);
      if (next.profile?.id) {
        pushAppStateBlobDebounced(next.profile.id, next);
      }
      return next;
    });
  }

  function handleUpdateProfile(updated: Partial<UserProfile>) {
    updateState((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        ...updated,
        preferences: {
          ...prev.profile.preferences,
          ...(updated.preferences || {}),
        },
      },
    }));
    if (state?.profile?.id && (updated.fullName !== undefined || updated.avatarUrl !== undefined)) {
      updateOwnBasicProfile(state.profile.id, {
        fullName: updated.fullName,
        avatarUrl: updated.avatarUrl,
      });
    }
  }

  function handleToggleTheme(theme: ThemeMode) {
    updateState((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        preferences: {
          ...prev.profile.preferences,
          theme,
        },
      },
    }));
  }

  // Called after the PayPal button's onApprove flow has already been
  // verified and written to `profiles` by the server. We simply re-pull the
  // authoritative row rather than ever setting premium status ourselves.
  async function handleSubscribed() {
    if (!state?.profile?.id) return;
    const profileRow = await fetchProfile(state.profile.id);
    if (profileRow) {
      updateState((prev) => ({ ...prev, profile: mergeAuthoritativeProfile(prev.profile, profileRow) }));
    }
  }

  async function handleSwitchToFree() {
    if (!state?.profile?.id) return;
    await declineTrialOnServer();
    const profileRow = await fetchProfile(state.profile.id);
    if (profileRow) {
      updateState((prev) => ({ ...prev, profile: mergeAuthoritativeProfile(prev.profile, profileRow) }));
    }
  }

  async function handleSignOut() {
    const uid = state?.profile?.id;
    await signOutUser();
    if (uid) clearCachedAppState(uid);
    setState(null);
    setActiveTab('home');
    setAuthStatus('unauthenticated');
  }

  function handleTogglePrayer(dateStr: string, prayer: PrayerName) {
    updateState((prev) => {
      const currentLogs = prev.prayerLogs[dateStr] || {
        Fajr: false,
        Sunrise: false,
        Dhuhr: false,
        Asr: false,
        Maghrib: false,
        Isha: false,
      };

      const updatedLogs = {
        ...currentLogs,
        [prayer]: !currentLogs[prayer],
      };

      return {
        ...prev,
        prayerLogs: {
          ...prev.prayerLogs,
          [dateStr]: updatedLogs,
        },
      };
    });
  }

  function handleUpdateCoordinates(coords: {
    latitude: number;
    longitude: number;
    city: string;
    country: string;
  }) {
    updateState((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        location: coords,
      },
    }));
  }

  // Tasks & Study Handlers
  function handleAddTask(task: Omit<StudyTask, 'id' | 'createdAt'>) {
    const newTask: StudyTask = {
      ...task,
      id: `task_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    updateState((prev) => ({
      ...prev,
      tasks: [newTask, ...prev.tasks],
    }));
  }

  function handleToggleTask(taskId: string) {
    updateState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              completed: !t.completed,
              completedAt: !t.completed ? new Date().toISOString() : undefined,
            }
          : t
      ),
    }));
  }

  function handleDeleteTask(taskId: string) {
    updateState((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== taskId),
    }));
  }

  function handleAddSubject(name: string) {
    const colors = ['#2563eb', '#16a34a', '#d97706', '#9333ea', '#dc2626', '#0891b2'];
    const newSub = {
      id: `sub_${Date.now()}`,
      name,
      color: colors[(state?.subjects.length || 0) % colors.length],
    };
    updateState((prev) => ({
      ...prev,
      subjects: [...prev.subjects, newSub],
    }));
  }

  function handleAddDocument(doc: Omit<StudyDocument, 'id' | 'uploadedAt'>) {
    const newDoc: StudyDocument = {
      ...doc,
      id: `doc_${Date.now()}`,
      uploadedAt: new Date().toISOString(),
    };
    updateState((prev) => ({
      ...prev,
      documents: [newDoc, ...prev.documents],
    }));
  }

  function handleDeleteDocument(docId: string) {
    updateState((prev) => ({
      ...prev,
      documents: prev.documents.filter((d) => d.id !== docId),
    }));
  }

  function handleAddExam(exam: Omit<ExamGoal, 'id'>) {
    const newExam: ExamGoal = {
      ...exam,
      id: `exam_${Date.now()}`,
    };
    updateState((prev) => ({
      ...prev,
      exams: [newExam, ...prev.exams],
    }));
  }

  function handleAddFlashcard(fc: Omit<StudyFlashcard, 'id' | 'createdAt'>) {
    const newFc: StudyFlashcard = {
      ...fc,
      id: `fc_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    updateState((prev) => ({
      ...prev,
      flashcards: [newFc, ...prev.flashcards],
    }));
  }

  function handleSaveFocusSession(session: FocusSession) {
    updateState((prev) => ({
      ...prev,
      focusSessions: [session, ...prev.focusSessions],
    }));
  }

  // Finance Handlers
  function handleAddExpense(expense: Omit<ExpenseItem, 'id' | 'createdAt'>) {
    const newExp: ExpenseItem = {
      ...expense,
      id: `exp_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    updateState((prev) => ({
      ...prev,
      expenses: [newExp, ...prev.expenses],
    }));
  }

  function handleDeleteExpense(id: string) {
    updateState((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((e) => e.id !== id),
    }));
  }

  function handleAddSavingsGoal(goal: Omit<SavingsGoal, 'id'>) {
    const newGoal: SavingsGoal = {
      ...goal,
      id: `sg_${Date.now()}`,
    };
    updateState((prev) => ({
      ...prev,
      savingsGoals: [newGoal, ...prev.savingsGoals],
    }));
  }

  function handleUpdateMonthlyBudget(amount: number) {
    updateState((prev) => ({
      ...prev,
      monthlyBudget: amount,
      profile: {
        ...prev.profile,
        preferences: {
          ...prev.profile.preferences,
          monthlyBudget: amount,
        },
      },
    }));
  }

  // Goals & Habits Handlers
  function handleAddGoal(goal: Omit<Goal, 'id' | 'createdAt'>) {
    const newGoal: Goal = {
      ...goal,
      id: `goal_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    updateState((prev) => ({
      ...prev,
      goals: [newGoal, ...prev.goals],
    }));
  }

  function handleDeleteGoal(id: string) {
    updateState((prev) => ({
      ...prev,
      goals: prev.goals.filter((g) => g.id !== id),
    }));
  }

  function handleToggleMilestone(goalId: string, milestoneIndex: number) {
    updateState((prev) => ({
      ...prev,
      goals: prev.goals.map((g) => {
        if (g.id !== goalId) return g;
        const updatedMilestones = g.milestones.map((m, idx) =>
          idx === milestoneIndex ? { ...m, completed: !m.completed } : m
        );
        const completedCount = updatedMilestones.filter((m) => m.completed).length;
        const progressPercent =
          updatedMilestones.length > 0
            ? Math.round((completedCount / updatedMilestones.length) * 100)
            : 0;

        return {
          ...g,
          milestones: updatedMilestones,
          progressPercent,
          completed: progressPercent === 100,
        };
      }),
    }));
  }

  function handleAddHabit(habit: Omit<Habit, 'id' | 'streakCount' | 'completedDates'>) {
    const newHabit: Habit = {
      ...habit,
      id: `habit_${Date.now()}`,
      streakCount: 0,
      completedDates: [],
    };
    updateState((prev) => ({
      ...prev,
      habits: [...prev.habits, newHabit],
    }));
  }

  function handleToggleHabitDay(habitId: string, dateStr: string) {
    updateState((prev) => ({
      ...prev,
      habits: prev.habits.map((h) => {
        if (h.id !== habitId) return h;
        const currentDates = Array.isArray(h.completedDates) ? h.completedDates : [];
        const exists = currentDates.includes(dateStr);
        const newDates = exists
          ? currentDates.filter((d) => d !== dateStr)
          : [...currentDates, dateStr];

        return {
          ...h,
          completedDates: newDates,
          streakCount: newDates.length,
          streak: newDates.length,
        };
      }),
    }));
  }

  function handleDeleteHabit(habitId: string) {
    updateState((prev) => ({
      ...prev,
      habits: prev.habits.filter((h) => h.id !== habitId),
    }));
  }

  // Notes Handlers
  function handleAddNote(note: Omit<QuickNote, 'id' | 'createdAt'>) {
    const newNote: QuickNote = {
      ...note,
      id: `note_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    updateState((prev) => ({
      ...prev,
      notes: [newNote, ...prev.notes],
    }));
  }

  function handleDeleteNote(id: string) {
    updateState((prev) => ({
      ...prev,
      notes: prev.notes.filter((n) => n.id !== id),
    }));
  }

  function handleUpdateNote(id: string, updates: Partial<QuickNote>) {
    updateState((prev) => ({
      ...prev,
      notes: prev.notes.map((n) =>
        n.id === id
          ? {
              ...n,
              ...updates,
              updatedAt: new Date().toISOString(),
            }
          : n
      ),
    }));
  }

  function handleRecordWeeklyReportGenerated() {
    const timestamp = new Date().toISOString();
    updateState((prev) => ({
      ...prev,
      lastWeeklyReportGeneratedAt: timestamp,
    }));
  }

  // Quran reading progress — persisted through the same cloud-synced state
  // as everything else, so it follows the account across devices.
  function handleUpdateQuranProgress(page: number, totalPages: number) {
    updateState((prev) => ({
      ...prev,
      quranLastRead: {
        ...prev.quranLastRead,
        page,
        updatedAt: new Date().toISOString(),
      },
      khatmahProgress:
        totalPages > 0
          ? Math.max(prev.khatmahProgress || 0, Math.round((page / totalPages) * 100))
          : prev.khatmahProgress,
    }));
  }

  // Handles the "already authenticated, just finishing welcome/tier choice"
  // path (skipAuthStep). The fresh-auth path (signup/signin/Google) is
  // handled by the hydration effect above via the stashed sessionStorage
  // choice — this only acts when `state` already exists, so the two paths
  // can never conflict, only harmlessly overlap.
  async function handleCompleteOnboarding(data: { tier: SubscriptionTier; billing?: SubscriptionBilling }) {
    if (!state?.profile?.id) return;
    const uid = state.profile.id;

    updateState((prev) => ({
      ...prev,
      hasCompletedOnboarding: true,
      profile: {
        ...prev.profile,
        tier: data.tier,
        billing: data.billing || prev.profile.billing,
        subscriptionBilling: data.billing || prev.profile.subscriptionBilling,
      },
    }));
    updateOwnBasicProfile(uid, { hasCompletedOnboarding: true });

    if (data.tier === 'free') {
      await declineTrialOnServer();
      const profileRow = await fetchProfile(uid);
      if (profileRow) {
        updateState((prev) => ({ ...prev, profile: mergeAuthoritativeProfile(prev.profile, profileRow) }));
      }
    }
  }

  // --- RENDER GATES ---

  if (authStatus === 'checking') {
    return <SplashScreen />;
  }

  // No real account signed in — a real account is required to use the app.
  if (authStatus === 'unauthenticated' || !state) {
    return (
      <LanguageProvider language={preAuthLanguage} onLanguageChange={handleSetLanguage}>
        <OnboardingFlow onComplete={handleCompleteOnboarding} />
      </LanguageProvider>
    );
  }

  // Any authenticated session goes straight into the app — never back to
  // a welcome/onboarding screen, regardless of hasCompletedOnboarding.

  return (
    <LanguageProvider language={effectiveLanguage} onLanguageChange={handleSetLanguage}>
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors pb-safe-nav md:pb-8">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        state={state}
        onOpenFocus={() => setIsFocusOpen(true)}
        onOpenAskVeda={() => setIsAskVedaOpen(true)}
        onOpenReport={() => setIsReportOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenPremium={() => setIsPremiumOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onSignOut={handleSignOut}
        onToggleTheme={handleToggleTheme}
      />

      {/* 14-Day Free Trial Alert / Status Banner */}
      <TrialBanner
        profile={state.profile}
        onOpenPremium={() => setIsPremiumOpen(true)}
      />

      {/* Main Tab Routing */}
      <main>
        {activeTab === 'home' && (
          <HomeTab
            state={state}
            onSelectTab={setActiveTab}
            onTogglePrayer={handleTogglePrayer}
            onToggleTask={handleToggleTask}
            onOpenFocus={() => setIsFocusOpen(true)}
            onOpenPremium={() => setIsPremiumOpen(true)}
            onOpenAskVeda={() => setIsAskVedaOpen(true)}
          />
        )}

        {activeTab === 'study' && (
          <StudyTab
            state={state}
            onAddTask={handleAddTask}
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
            onAddSubject={handleAddSubject}
            onAddDocument={handleAddDocument}
            onDeleteDocument={handleDeleteDocument}
            onAddExam={handleAddExam}
            onAddFlashcard={handleAddFlashcard}
            onOpenFocus={() => setIsFocusOpen(true)}
            onOpenPremium={() => setIsPremiumOpen(true)}
          />
        )}

        {activeTab === 'islamic' && (
          <IslamicTab
            state={state}
            onTogglePrayer={handleTogglePrayer}
            onUpdateCoordinates={handleUpdateCoordinates}
            onOpenReport={() => setIsReportOpen(true)}
            onOpenPremium={() => setIsPremiumOpen(true)}
            onOpenAskVeda={() => setIsAskVedaOpen(true)}
            onUpdateQuranProgress={handleUpdateQuranProgress}
          />
        )}

        {activeTab === 'finance' && (
          <FinanceTab
            state={state}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
            onAddSavingsGoal={handleAddSavingsGoal}
            onUpdateMonthlyBudget={handleUpdateMonthlyBudget}
            onOpenReport={() => setIsReportOpen(true)}
            onOpenPremium={() => setIsPremiumOpen(true)}
          />
        )}

        {activeTab === 'goals' && (
          <GoalsTab
            state={state}
            onAddGoal={handleAddGoal}
            onDeleteGoal={handleDeleteGoal}
            onToggleMilestone={handleToggleMilestone}
            onAddHabit={handleAddHabit}
            onToggleHabitDay={handleToggleHabitDay}
            onDeleteHabit={handleDeleteHabit}
          />
        )}

        {activeTab === 'notes' && (
          <NotesTab
            state={state}
            onAddNote={handleAddNote}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
            onOpenPremium={() => setIsPremiumOpen(true)}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            state={state}
            onUpdateProfile={handleUpdateProfile}
            onToggleTheme={handleToggleTheme}
            onOpenReport={() => setIsReportOpen(true)}
            onOpenPremium={() => setIsPremiumOpen(true)}
            onOpenAuth={() => setIsAuthOpen(true)}
            onSignOut={handleSignOut}
          />
        )}
      </main>

      {/* Mobile Bottom Dock */}
      <BottomNav activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Global Modals & Drawers */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={() => {
          // The auth-state listener handles hydration; nothing else to do.
          setIsAuthOpen(false);
        }}
      />

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        state={state}
        onUpdateProfile={handleUpdateProfile}
        onOpenPremium={() => setIsPremiumOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onSignOut={handleSignOut}
      />

      <PremiumModal
        isOpen={isPremiumOpen}
        onClose={() => setIsPremiumOpen(false)}
        state={state}
        onSubscribed={handleSubscribed}
        onSwitchToFree={handleSwitchToFree}
      />

      <FocusModal
        isOpen={isFocusOpen}
        onClose={() => setIsFocusOpen(false)}
        state={state}
        onSaveSession={handleSaveFocusSession}
      />

      <WeeklyReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        state={state}
        onOpenPremium={() => setIsPremiumOpen(true)}
        onReportGenerated={handleRecordWeeklyReportGenerated}
      />

      <AskVedaDrawer
        isOpen={isAskVedaOpen}
        onClose={() => setIsAskVedaOpen(false)}
        state={state}
        onOpenPremium={() => setIsPremiumOpen(true)}
      />
    </div>
    </LanguageProvider>
  );
}

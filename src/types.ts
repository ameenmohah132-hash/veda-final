export type SubscriptionTier = 'free' | 'premium';
export type SubscriptionBilling = 'monthly' | 'yearly';
export type ThemeMode = 'light' | 'dark' | 'system';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  tier: SubscriptionTier;
  billing?: SubscriptionBilling;
  subscriptionBilling?: SubscriptionBilling;
  hasPaidSubscription?: boolean;
  // PayPal subscription linkage — written only by the server (service role),
  // never by the client. Source of truth for premium access.
  paypalSubscriptionId?: string;
  subscriptionStatus?: 'APPROVAL_PENDING' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'EXPIRED' | null;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  installedAt?: string;
  trialStartedAt?: string;
  trialDurationDays?: number; // 14
  trialDecision?: 'pending' | 'subscribed' | 'free';
  joinedAt: string;
  location?: {
    city: string;
    country: string;
    latitude: number;
    longitude: number;
  };
  preferences: {
    theme: ThemeMode;
    language: 'en' | 'ar';
    currency: string;
    prayerCalculationMethod: string;
    asrJuristic: 'standard' | 'hanafi' | 'Standard' | 'Hanafi';
    soundEnabled: boolean;
    pomodoroWorkMinutes: number;
    pomodoroBreakMinutes: number;
    hijriAdjustment?: number;
    monthlyBudget?: number;
  };
}

export type PrayerName = 'Fajr' | 'Sunrise' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';

export interface PrayerTimesData {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  nextPrayer: PrayerName;
  nextPrayerTime: string;
  timeRemaining: string; // e.g. "01:42:15"
  hijriDate: {
    day: number;
    monthName: string;
    monthArabic: string;
    year: number;
    formatted: string;
  };
}

export interface PrayerLog {
  date: string; // YYYY-MM-DD
  prayers: Record<PrayerName, boolean>;
}

export interface StudySubject {
  id: string;
  name: string;
  color?: string;
  colorHex?: string;
  createdAt?: string;
}

export interface StudyTask {
  id: string;
  subjectId: string;
  title: string;
  deadline?: string;
  priority: 'low' | 'medium' | 'high';
  estimatedMinutes?: number;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
}

export interface StudyDocument {
  id: string;
  subjectId: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
  fileDataUrl?: string;
  extractedText?: string;
  uploadedAt: string;
  tags?: string[];
  favorite?: boolean;
}

export interface StudyFlashcard {
  id: string;
  subjectId: string;
  front: string;
  back: string;
  mastered?: boolean;
  createdAt: string;
}

export interface StudyQuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface ExamGoal {
  id: string;
  subjectId: string;
  title: string;
  examDate?: string;
  date?: string;
  topics: string[];
  dailyStudyMinutes?: number;
  targetScore?: number;
  completedTopics?: string[];
}

export type ExpenseCategory =
  | 'food'
  | 'books_supplies'
  | 'tuition'
  | 'rent_housing'
  | 'transport'
  | 'tech_software'
  | 'charity_sadaqah'
  | 'entertainment'
  | 'other'
  | 'Food'
  | 'Transport'
  | 'Shopping'
  | 'Education'
  | 'Bills'
  | 'Health'
  | 'Worship'
  | 'Other';

export interface ExpenseItem {
  id: string;
  amount: number;
  category: ExpenseCategory;
  description?: string;
  note?: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
}

export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount?: number;
  savedAmount?: number;
  targetDate?: string;
}

export interface HabitItem {
  id: string;
  name?: string;
  title?: string;
  frequency?: 'daily' | 'weekly';
  category?: 'worship' | 'study' | 'health' | 'personal';
  history?: Record<string, boolean>; // date string YYYY-MM-DD -> boolean
  completedDates?: string[];
  streak?: number;
  streakCount?: number;
  createdAt?: string;
}
export type Habit = HabitItem;

export interface GoalItem {
  id: string;
  title: string;
  category?: 'academic' | 'spiritual' | 'financial' | 'health' | 'personal';
  description?: string;
  deadline?: string;
  targetDate?: string;
  progress?: number; // 0 to 100
  progressPercent?: number;
  completed?: boolean;
  milestones: { id?: string; title: string; completed: boolean }[];
  createdAt: string;
}
export type Goal = GoalItem;

export interface FocusSession {
  id: string;
  durationMinutes: number;
  startedAt: string;
  endedAt: string;
  taskTitle?: string;
  subjectName?: string;
  completed: boolean;
}

export type NoteTag = 'Personal' | 'Work' | 'Study';

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  tag?: NoteTag;
  category?: 'reflection' | 'study' | 'idea' | 'meeting';
  createdAt?: string;
  updatedAt?: string;
  tags?: string[];
}
export type QuickNote = NoteItem;

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  content: string;
  mood?: string;
  gratitude?: string;
}

export interface AdhkarItem {
  id: string;
  category: 'morning' | 'evening' | 'after_prayer' | 'sleep';
  arabic: string;
  transliteration: string;
  translation: string;
  targetCount: number;
  currentCount: number;
  reference?: string;
}

export interface QuranSurahInfo {
  number: number;
  nameArabic: string;
  nameEnglish: string;
  translationEnglish: string;
  ayahCount: number;
  revelationType: 'Meccan' | 'Medinan';
}

export interface QuranAyah {
  numberInSurah: number;
  textArabic: string;
  textEnglish: string;
  audioUrl?: string;
}

export interface AppState {
  profile: UserProfile;
  subjects: StudySubject[];
  tasks: StudyTask[];
  documents: StudyDocument[];
  flashcards: StudyFlashcard[];
  exams: ExamGoal[];
  expenses: ExpenseItem[];
  monthlyBudget: number;
  savingsGoals: SavingsGoal[];
  habits: HabitItem[];
  goals: GoalItem[];
  focusSessions: FocusSession[];
  notes: NoteItem[];
  journals: JournalEntry[];
  prayerLogs: Record<string, Record<PrayerName, boolean>>;
  quranLastRead: {
    surah: number;
    ayah: number;
    page?: number; // 1-indexed page in the bundled mushaf PDF (public/quran/mushaf.pdf)
    updatedAt: string;
  };
  adhkarProgress: Record<string, Record<string, number>>; // date -> adhkarId -> count
  tasbihCount: number;
  tasbihGoal: number;
  khatmahProgress: number; // 0-100, percentage of the mushaf read (furthest page reached / total pages)
  lastWeeklyReportGeneratedAt?: string; // ISO date of last generated weekly PDF report
  hasCompletedOnboarding?: boolean;
}

export const PREMIUM_FEATURES = {
  AI_DAILY_PLAN: 'AI Daily Plan & Brief',
  AI_STUDY_PLANNER: 'AI Study & Exam Planner',
  STUDY_VAULT_UNLIMITED: 'Unlimited Study Vault Storage',
  AI_DOCUMENT_ANALYSIS: 'Ask Study Document AI',
  AI_FLASHCARDS_QUIZZES: 'AI Quiz & Flashcards Generator',
  ADVANCED_PRAYER_ANALYTICS: 'Advanced Worship & Prayer Analytics',
  ADVANCED_QIBLA: 'Advanced Precision Qibla Sensors',
  AI_FINANCE_INSIGHTS: 'AI Spending Patterns & Budget Allocator',
  WEEKLY_PDF_REPORT: 'Weekly Executive Performance PDF Report',
  AI_FOCUS_HEATMAP: 'Focus Time Patterns & Heatmap',
  GLOBAL_SEARCH: 'Universal Cross-Tab Search',
} as const;

export function isFeatureAllowed(tier: SubscriptionTier, _feature: keyof typeof PREMIUM_FEATURES): boolean {
  if (tier === 'premium') return true;
  return false;
}

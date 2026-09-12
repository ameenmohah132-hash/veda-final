import { useState, useEffect } from 'react';
import { GlassCard, GlassButton, VedaLogo } from '../ui/LiquidGlass';
import { useLanguage } from '../../lib/LanguageContext';
import { AppState, PrayerName } from '../../types';
import { getSubscriptionDetails } from '../../lib/subscription';
import { calculatePrayerTimes } from '../../lib/islamic';
import {
  Sparkles,
  CheckCircle2,
  Circle,
  Timer,
  BookOpen,
  Compass,
  DollarSign,
  Target,
  ArrowRight,
  Clock,
  Flame,
  Plus,
  Lock,
} from 'lucide-react';

interface HomeTabProps {
  state: AppState;
  onSelectTab: (tab: string) => void;
  onTogglePrayer: (date: string, prayer: PrayerName) => void;
  onToggleTask: (taskId: string) => void;
  onOpenFocus: () => void;
  onOpenPremium: () => void;
  onOpenAskVeda: () => void;
}

export function HomeTab({
  state,
  onSelectTab,
  onTogglePrayer,
  onToggleTask,
  onOpenFocus,
  onOpenPremium,
  onOpenAskVeda,
}: HomeTabProps) {
  const { t, language } = useLanguage();
  const [todayDateStr, setTodayDateStr] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [aiBrief, setAiBrief] = useState<string | null>(null);
  const [aiSchedule, setAiSchedule] = useState<{ time: string; title: string; tag: string }[] | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const sub = getSubscriptionDetails(state.profile);
  const isPremium = sub.isPremiumActive;

  useEffect(() => {
    const today = new Date();
    setTodayDateStr(today.toISOString().split('T')[0]);

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const coords = state.profile.location || {
    latitude: 3.139,
    longitude: 101.6869,
    city: 'Location',
    country: '',
  };

  const prayerData = calculatePrayerTimes(
    currentTime,
    coords,
    state.profile.preferences.prayerCalculationMethod,
    state.profile.preferences.asrJuristic?.toLowerCase() === 'hanafi' ? 'hanafi' : 'standard'
  );

  // Prayer logs for today
  const todayPrayers = state.prayerLogs[todayDateStr] || {
    Fajr: false,
    Sunrise: false,
    Dhuhr: false,
    Asr: false,
    Maghrib: false,
    Isha: false,
  };

  const obligatoryPrayers: PrayerName[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  const completedPrayersCount = obligatoryPrayers.filter((p) => todayPrayers[p]).length;

  // Study tasks
  const pendingTasks = state.tasks.filter((t) => !t.completed);
  const completedTasksToday = state.tasks.filter((t) => t.completed).length;

  // Expenses
  const todayExpenses = (state.expenses || [])
    .filter((e) => e.date === todayDateStr)
    .reduce((sum, e) => sum + e.amount, 0);
  const monthlyTotal = (state.expenses || []).reduce((sum, e) => sum + e.amount, 0);

  // Focus
  const todayFocusMinutes = (state.focusSessions || [])
    .filter((s) => (s.startedAt || '').startsWith(todayDateStr))
    .reduce((sum, s) => sum + s.durationMinutes, 0);
  const todayFocusSessions = (state.focusSessions || []).filter((s) =>
    (s.startedAt || '').startsWith(todayDateStr)
  ).length;

  // Dynamic Greeting based on current hour
  const currentHour = currentTime.getHours();
  let greeting = t('greeting.morning');
  if (currentHour >= 12 && currentHour < 17) greeting = t('greeting.afternoon');
  else if (currentHour >= 17) greeting = t('greeting.evening');

  // Fetch AI Plan if Premium and not yet loaded
  useEffect(() => {
    if (isPremium && !aiBrief && !loadingAi) {
      setLoadingAi(true);
      fetch('/api/gemini/daily-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userContext: {
            name: state.profile.fullName,
            pendingTasks: pendingTasks.map((t) => t.title),
            nextPrayer: prayerData.nextPrayer,
            timeRemaining: prayerData.timeRemaining,
            todayFocusMinutes,
            todayExpenses,
            language,
          },
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.brief) setAiBrief(data.brief);
          if (data.schedule) setAiSchedule(data.schedule);
        })
        .catch(() => {
          setAiBrief(
            language === 'ar'
              ? 'أعطِ الأولوية لمهامك الأكاديمية الرئيسية خلال ساعات الصباح عالية الطاقة، مع أخذ فترات راحة واعية متزامنة مع صلواتك اليومية.'
              : 'Prioritize your key academic tasks during high-energy morning hours, taking mindful breaks aligned with your daily prayers.'
          );
        })
        .finally(() => setLoadingAi(false));
    }
  }, [isPremium]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Top Greeting & Hijri Date */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            {greeting}, {state.profile.fullName.split(' ')[0] || t('common.friend')}.
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-2">
            <span>
              {currentTime.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <span>•</span>
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {prayerData.hijriDate.formatted}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <GlassButton
            variant="glass"
            size="sm"
            onClick={onOpenFocus}
            className="text-xs font-semibold"
          >
            <Timer className="w-3.5 h-3.5" />
            {t('home.startFocusTimer')}
          </GlassButton>
          <GlassButton
            variant="accent"
            size="sm"
            onClick={onOpenAskVeda}
            className="text-xs font-semibold"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {t('nav.askVeda')}
          </GlassButton>
        </div>
      </div>

      {/* PREMIUM AI DAILY BRIEF / TEASER */}
      {isPremium ? (
        <GlassCard
          variant="elevated"
          className="p-5 sm:p-6 border border-zinc-200/80 dark:border-white/15 relative overflow-hidden"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="flex items-center justify-center w-5 h-5 rounded-md bg-zinc-900 text-white dark:bg-white dark:text-zinc-950">
              <Sparkles className="w-3 h-3" />
            </span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
              {t('home.aiDailyIntelligence')}
            </h3>
          </div>

          <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
            {aiBrief || (
              <span className="text-zinc-400 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                {t('home.aiOrganizing')}
              </span>
            )}
          </p>

          {aiSchedule && aiSchedule.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-3 border-t border-black/5 dark:border-white/5">
              {aiSchedule.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 text-xs"
                >
                  <span className="text-[11px] font-bold text-zinc-400 block">{item.time}</span>
                  <span className="font-semibold text-zinc-900 dark:text-white text-xs block mt-0.5 truncate">
                    {item.title}
                  </span>
                  <span className="inline-block mt-1 text-[11px] uppercase font-bold px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 text-zinc-500">
                    {item.tag}
                  </span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      ) : (
        <GlassCard
          variant="subtle"
          className="p-4 sm:p-5 flex items-center justify-between gap-4 border-dashed border-zinc-300 dark:border-zinc-700"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5 text-zinc-400">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                {t('home.aiBriefLocked')}
                <span className="text-[11px] px-1.5 py-0.2 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold">
                  {t('report.premiumBadge')}
                </span>
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {t('home.aiBriefLockedDesc')}
              </p>
            </div>
          </div>

          <GlassButton
            variant="glass"
            size="sm"
            onClick={onOpenPremium}
            className="text-xs shrink-0"
          >
            {t('home.explorePlan')}
          </GlassButton>
        </GlassCard>
      )}

      {/* TODAY'S OVERVIEW METRICS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Next Prayer Countdown Card */}
        <GlassCard
          variant="elevated"
          hoverEffect
          className="p-4 sm:p-5 flex flex-col justify-between cursor-pointer"
          onClick={() => onSelectTab('islamic')}
        >
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-2">
              <span className="font-semibold uppercase tracking-wider text-[11px]">{t('home.nextPrayer')}</span>
              <Compass className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
                {prayerData.nextPrayer}
              </h3>
              <span className="text-xs text-zinc-400 font-medium">{prayerData.nextPrayerTime}</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-xs">
            <span className="text-zinc-500">{t('home.startsIn')}</span>
            <span className="font-bold text-zinc-900 dark:text-white tabular-nums">
              {prayerData.timeRemaining}
            </span>
          </div>
        </GlassCard>

        {/* Study Tasks Card */}
        <GlassCard
          variant="subtle"
          hoverEffect
          className="p-4 sm:p-5 flex flex-col justify-between cursor-pointer"
          onClick={() => onSelectTab('study')}
        >
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-2">
              <span className="font-semibold uppercase tracking-wider text-[11px]">{t('home.studyTasks')}</span>
              <BookOpen className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
                {pendingTasks.length}
              </h3>
              <span className="text-xs text-zinc-400">{t('home.remaining')}</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-xs">
            <span className="text-zinc-500">{t('home.completed')}</span>
            <span className="font-bold text-zinc-900 dark:text-white">
              {completedTasksToday} {t('home.done')}
            </span>
          </div>
        </GlassCard>

        {/* Focus Work Card */}
        <GlassCard
          variant="subtle"
          hoverEffect
          className="p-4 sm:p-5 flex flex-col justify-between cursor-pointer"
          onClick={onOpenFocus}
        >
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-2">
              <span className="font-semibold uppercase tracking-wider text-[11px]">{t('home.focusMinutes')}</span>
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
                {todayFocusMinutes}m
              </h3>
              <span className="text-xs text-zinc-400">{t('home.today')}</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-xs">
            <span className="text-zinc-500">{t('home.deepWork')}</span>
            <span className="font-bold text-zinc-900 dark:text-white">
              {todayFocusSessions} {t('home.intervals')}
            </span>
          </div>
        </GlassCard>

        {/* Finance Spending Card */}
        <GlassCard
          variant="subtle"
          hoverEffect
          className="p-4 sm:p-5 flex flex-col justify-between cursor-pointer"
          onClick={() => onSelectTab('finance')}
        >
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-2">
              <span className="font-semibold uppercase tracking-wider text-[11px]">{t('home.expenses')}</span>
              <DollarSign className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-baseline gap-1">
              <h3 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
                {state.profile.preferences?.currency || '$'} {todayExpenses.toFixed(0)}
              </h3>
              <span className="text-xs text-zinc-400">{t('common.today').toLowerCase()}</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-xs">
            <span className="text-zinc-500">{t('home.monthlyTotal')}</span>
            <span className="font-bold text-zinc-900 dark:text-white">
              {state.profile.preferences?.currency || '$'} {monthlyTotal.toFixed(0)}
            </span>
          </div>
        </GlassCard>
      </div>

      {/* TWO COLUMN WORKSPACE: PRAYERS & STUDY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Daily Prayers & Worship Checklist */}
        <div className="lg:col-span-5 space-y-4">
          <GlassCard variant="subtle" className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-zinc-500" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                  {t('home.todaysPrayers')} ({completedPrayersCount}/5)
                </h3>
              </div>
              <button
                onClick={() => onSelectTab('islamic')}
                className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1 font-medium"
              >
                {t('home.fullTab')} <ArrowRight className="w-3 h-3 rtl:rotate-180" />
              </button>
            </div>

            <div className="space-y-2">
              {obligatoryPrayers.map((prayer) => {
                const isChecked = !!todayPrayers[prayer];
                const timeStr = prayerData[prayer.toLowerCase() as keyof typeof prayerData] as string;
                const isNext = prayerData.nextPrayer === prayer;

                return (
                  <div
                    key={prayer}
                    onClick={() => onTogglePrayer(todayDateStr, prayer)}
                    className={`flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer select-none border ${
                      isNext
                        ? 'bg-black/[0.04] dark:bg-white/[0.08] border-black/15 dark:border-white/20'
                        : 'bg-black/[0.01] dark:bg-white/[0.02] border-black/5 dark:border-white/5 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {isChecked ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-zinc-300 dark:text-zinc-600 shrink-0" />
                      )}
                      <div>
                        <span
                          className={`text-xs font-bold block ${
                            isChecked
                              ? 'line-through text-zinc-400 dark:text-zinc-500'
                              : 'text-zinc-900 dark:text-white'
                          }`}
                        >
                          {prayer}
                        </span>
                        {isNext && (
                          <span className="text-[11px] font-semibold text-zinc-500">
                            {t('home.upcomingIn')} {prayerData.timeRemaining}
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 tabular-nums">
                      {timeStr}
                    </span>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>

        {/* Right Column: Priority Study Tasks & Active Goals */}
        <div className="lg:col-span-7 space-y-4">
          <GlassCard variant="subtle" className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-zinc-500" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                  {t('home.todaysPriorities')}
                </h3>
              </div>
              <button
                onClick={() => onSelectTab('study')}
                className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1 font-medium"
              >
                {t('home.studyVault')} <ArrowRight className="w-3 h-3 rtl:rotate-180" />
              </button>
            </div>

            {state.tasks.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-black/10 dark:border-white/10 rounded-2xl">
                <BookOpen className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
                  {t('home.nothingPlanned')}
                </h4>
                <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                  {t('home.addTasksPrompt')}
                </p>
                <GlassButton
                  variant="glass"
                  size="sm"
                  onClick={() => onSelectTab('study')}
                  className="mt-3 text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t('home.addFirstTask')}
                </GlassButton>
              </div>
            ) : (
              <div className="space-y-2.5">
                {state.tasks.slice(0, 5).map((task) => {
                  const subject = state.subjects.find((s) => s.id === task.subjectId);
                  return (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-black/[0.01] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          onClick={() => onToggleTask(task.id)}
                          className="shrink-0 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                        >
                          {task.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Circle className="w-4 h-4" />
                          )}
                        </button>
                        <div className="min-w-0">
                          <span
                            className={`text-xs font-semibold block truncate ${
                              task.completed
                                ? 'line-through text-zinc-400 dark:text-zinc-500'
                                : 'text-zinc-900 dark:text-white'
                            }`}
                          >
                            {task.title}
                          </span>
                          <span className="text-[11px] text-zinc-400">
                            {subject?.name || t('home.general')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {task.priority === 'high' && (
                          <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400">
                            {t('home.priorityHigh')}
                          </span>
                        )}
                        <GlassButton
                          variant="ghost"
                          size="sm"
                          onClick={onOpenFocus}
                          className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                          title={t('home.launchPomodoro')}
                        >
                          <Timer className="w-3.5 h-3.5" />
                        </GlassButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

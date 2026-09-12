import React, { useState } from 'react';
import { GlassButton, GlassCard } from '../ui/LiquidGlass';
import { useLanguage } from '../../lib/LanguageContext';
import { AppState, Goal, Habit } from '../../types';
import {
  Target,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Flame,
  Calendar,
  Check,
  TrendingUp,
} from 'lucide-react';

interface GoalsTabProps {
  state: AppState;
  onAddGoal: (goal: Omit<Goal, 'id' | 'createdAt'>) => void;
  onDeleteGoal: (id: string) => void;
  onToggleMilestone: (goalId: string, milestoneIndex: number) => void;
  onAddHabit: (habit: Omit<Habit, 'id' | 'streakCount' | 'completedDates'>) => void;
  onToggleHabitDay: (habitId: string, dateStr: string) => void;
  onDeleteHabit: (habitId: string) => void;
}

export function GoalsTab({
  state,
  onAddGoal,
  onDeleteGoal,
  onToggleMilestone,
  onAddHabit,
  onToggleHabitDay,
  onDeleteHabit,
}: GoalsTabProps) {
  const { t } = useLanguage();

  function goalCategoryLabel(cat: string): string {
    const map: Record<string, string> = {
      academic: t('goals.cat.academic'),
      spiritual: t('goals.cat.spiritual'),
      financial: t('goals.cat.financial'),
      health: t('goals.cat.health'),
      personal: t('goals.cat.personal'),
    };
    return map[cat] || cat;
  }
  // Goal Form
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalCategory, setGoalCategory] = useState<Goal['category']>('academic');
  const [goalDeadline, setGoalDeadline] = useState('');
  const [goalMilestonesStr, setGoalMilestonesStr] = useState('');

  // Habit Form
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [habitName, setHabitName] = useState('');
  const [habitFrequency, setHabitFrequency] = useState<'daily' | 'weekly'>('daily');

  // Past 7 days dates
  const daysArray: { dateStr: string; dayLabel: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'narrow' });
    daysArray.push({ dateStr, dayLabel });
  }

  function handleCreateGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!goalTitle.trim()) return;

    const milestones = goalMilestonesStr
      .split('\n')
      .map((m) => m.trim())
      .filter(Boolean)
      .map((title) => ({ title, completed: false }));

    onAddGoal({
      title: goalTitle.trim(),
      category: goalCategory,
      targetDate: goalDeadline || undefined,
      milestones,
      progressPercent: 0,
      completed: false,
    });

    setGoalTitle('');
    setGoalMilestonesStr('');
    setShowAddGoal(false);
  }

  function handleCreateHabit(e: React.FormEvent) {
    e.preventDefault();
    if (!habitName.trim()) return;

    onAddHabit({
      name: habitName.trim(),
      frequency: habitFrequency,
    });

    setHabitName('');
    setShowAddHabit(false);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2.5">
            <Target className="w-6 h-6" />
            {t('page.goals.heading')}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {t('goals.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <GlassButton
            variant="primary"
            size="sm"
            onClick={() => setShowAddGoal(!showAddGoal)}
            className="text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('goals.newGoal')}
          </GlassButton>
        </div>
      </div>

      {/* NEW GOAL FORM */}
      {showAddGoal && (
        <GlassCard variant="elevated" className="p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white mb-3">
            {t('goals.createTitle')}
          </h3>
          <form onSubmit={handleCreateGoal} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
                  {t('goals.goalTitle')}
                </label>
                <input
                  type="text"
                  required
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  placeholder={t('goals.goalTitlePlaceholder')}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
                  {t('goals.category')}
                </label>
                <select
                  value={goalCategory}
                  onChange={(e) => setGoalCategory(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white"
                >
                  <option value="academic">{t('goals.cat.academic')}</option>
                  <option value="spiritual">{t('goals.cat.spiritual')}</option>
                  <option value="financial">{t('goals.cat.financial')}</option>
                  <option value="health">{t('goals.cat.health')}</option>
                  <option value="personal">{t('goals.cat.personal')}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
                {t('goals.milestonesLabel')}
              </label>
              <textarea
                rows={3}
                value={goalMilestonesStr}
                onChange={(e) => setGoalMilestonesStr(e.target.value)}
                placeholder={t('goals.milestonesPlaceholder')}
                className="w-full px-3 py-2 text-xs rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2">
              <GlassButton size="sm" variant="ghost" onClick={() => setShowAddGoal(false)}>
                {t('goals.cancel')}
              </GlassButton>
              <GlassButton size="sm" variant="primary" type="submit">
                {t('goals.saveGoal')}
              </GlassButton>
            </div>
          </form>
        </GlassCard>
      )}

      {/* HABIT TRACKER SECTION */}
      <GlassCard variant="subtle" className="p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              {t('goals.habitTrackerTitle')}
            </h3>
            <p className="text-xs text-zinc-400">{t('goals.habitTrackerDesc')}</p>
          </div>

          <GlassButton
            variant="glass"
            size="sm"
            onClick={() => setShowAddHabit(!showAddHabit)}
            className="text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('goals.addHabit')}
          </GlassButton>
        </div>

        {showAddHabit && (
          <form
            onSubmit={handleCreateHabit}
            className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03]"
          >
            <input
              type="text"
              required
              value={habitName}
              onChange={(e) => setHabitName(e.target.value)}
              placeholder={t('goals.habitPlaceholder')}
              className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10"
            />
            <GlassButton size="sm" variant="primary" type="submit">
              {t('goals.save')}
            </GlassButton>
            <GlassButton size="sm" variant="ghost" onClick={() => setShowAddHabit(false)}>
              {t('goals.cancel')}
            </GlassButton>
          </form>
        )}

        {state.habits.length === 0 ? (
          <p className="text-xs text-zinc-400 py-4 text-center">
            {t('goals.noHabits')}
          </p>
        ) : (
          <div className="space-y-3">
            {state.habits.map((habit) => {
              const habitName = habit.name || habit.title || t('goals.habitDefault');
              const streak = habit.streakCount ?? habit.streak ?? 0;
              const dates = Array.isArray(habit.completedDates) ? habit.completedDates : [];
              return (
                <div
                  key={habit.id}
                  className="p-3.5 rounded-xl bg-black/[0.01] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-xs font-bold text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-md">
                      <Flame className="w-3.5 h-3.5" />
                      <span>{streak}d</span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
                        {habitName}
                      </h4>
                      <span className="text-[11px] text-zinc-400 capitalize">
                        {habit.frequency === 'weekly' ? t('goals.weekly') : t('goals.daily')}
                      </span>
                    </div>
                  </div>

                  {/* 7 Day Matrix */}
                  <div className="flex items-center gap-2">
                    {daysArray.map(({ dateStr, dayLabel }) => {
                      const isDone = dates.includes(dateStr);
                      return (
                        <button
                          key={dateStr}
                          onClick={() => onToggleHabitDay(habit.id, dateStr)}
                          className={`w-7 h-7 rounded-lg text-[11px] font-bold flex items-center justify-center transition-all cursor-pointer ${
                            isDone
                              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                              : 'bg-black/5 dark:bg-white/5 text-zinc-400 hover:bg-black/10'
                          }`}
                          title={`${dateStr}: ${isDone ? t('goals.completed') : t('goals.notCompleted')}`}
                        >
                          {isDone ? <Check className="w-3.5 h-3.5" /> : dayLabel}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => onDeleteHabit(habit.id)}
                      className="p-1 text-zinc-300 hover:text-red-500 ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>

      {/* STRATEGIC GOALS LIST */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
          {t('goals.activeGoals')} ({state.goals.length})
        </h3>

        {state.goals.length === 0 ? (
          <GlassCard variant="subtle" className="p-12 text-center">
            <Target className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
              {t('goals.noGoalsTitle')}
            </h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
              {t('goals.noGoalsDesc')}
            </p>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {state.goals.map((g) => {
              const totalM = g.milestones.length;
              const doneM = g.milestones.filter((m) => m.completed).length;
              const pct = totalM > 0 ? Math.round((doneM / totalM) * 100) : 0;

              return (
                <GlassCard key={g.id} variant="subtle" className="p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 text-zinc-500">
                        {goalCategoryLabel(g.category)}
                      </span>
                      <button
                        onClick={() => onDeleteGoal(g.id)}
                        className="text-zinc-300 hover:text-red-500 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{g.title}</h4>

                    {/* Progress Bar */}
                    <div className="w-full bg-black/5 dark:bg-white/10 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div
                        className="h-full bg-zinc-900 dark:bg-white rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-zinc-400 mt-1 block">
                      {pct}% {t('goals.completedMilestones')} ({doneM}/{totalM} {t('goals.milestonesSuffix')})
                    </span>

                    {/* Milestones list */}
                    {totalM > 0 && (
                      <div className="mt-4 space-y-1.5 pt-3 border-t border-black/5 dark:border-white/5">
                        {g.milestones.map((m, mIdx) => (
                          <div
                            key={mIdx}
                            onClick={() => onToggleMilestone(g.id, mIdx)}
                            className="flex items-center gap-2 text-xs cursor-pointer select-none"
                          >
                            {m.completed ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            ) : (
                              <Circle className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600 shrink-0" />
                            )}
                            <span
                              className={
                                m.completed
                                  ? 'line-through text-zinc-400'
                                  : 'text-zinc-700 dark:text-zinc-300'
                              }
                            >
                              {m.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

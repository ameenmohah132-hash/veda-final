import React, { useState } from 'react';
import { GlassButton, GlassCard, VedaLogo } from '../ui/LiquidGlass';
import { useLanguage } from '../../lib/LanguageContext';
import { AppState, ExpenseCategory, ExpenseItem, SavingsGoal } from '../../types';
import { getSubscriptionDetails } from '../../lib/subscription';
import {
  DollarSign,
  Plus,
  Trash2,
  TrendingUp,
  Sparkles,
  Lock,
  PieChart,
  Target,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';

interface FinanceTabProps {
  state: AppState;
  onAddExpense: (expense: Omit<ExpenseItem, 'id' | 'createdAt'>) => void;
  onDeleteExpense: (id: string) => void;
  onAddSavingsGoal: (goal: Omit<SavingsGoal, 'id'>) => void;
  onUpdateMonthlyBudget: (amount: number) => void;
  onOpenReport: () => void;
  onOpenPremium: () => void;
}

export function FinanceTab({
  state,
  onAddExpense,
  onDeleteExpense,
  onAddSavingsGoal,
  onUpdateMonthlyBudget,
  onOpenReport,
  onOpenPremium,
}: FinanceTabProps) {
  const { t, language } = useLanguage();

  function categoryLabel(cat: string): string {
    const map: Record<string, string> = {
      food: t('finance.cat.food'),
      books_supplies: t('finance.cat.books'),
      tuition: t('finance.cat.tuition'),
      rent_housing: t('finance.cat.housing'),
      transport: t('finance.cat.transport'),
      tech_software: t('finance.cat.tech'),
      charity_sadaqah: t('finance.cat.charity'),
      entertainment: t('finance.cat.entertainment'),
      other: t('finance.cat.other'),
    };
    return map[cat] || cat.replace('_', ' ');
  }
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('food');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Savings goal form
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [savedAmount, setSavedAmount] = useState('');

  // Budget editing state
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');

  // AI Insights state
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const sub = getSubscriptionDetails(state.profile);
  const isPremium = sub.isPremiumActive;
  const currency = state.profile.preferences?.currency || 'USD';
  const budget = state.monthlyBudget || state.profile.preferences?.monthlyBudget || 1000;

  const totalSpent = state.expenses.reduce((sum, e) => sum + e.amount, 0);
  const remainingBudget = Math.max(0, budget - totalSpent);
  const percentUsed = budget > 0 ? Math.min(100, (totalSpent / budget) * 100) : 0;

  // Category totals
  const categoryTotals = state.expenses.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
    return acc;
  }, {} as Record<string, number>);

  function handleCreateExpense(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0 || !description.trim()) return;

    onAddExpense({
      amount: parsed,
      category,
      description: description.trim(),
      date,
    });

    setAmount('');
    setDescription('');
  }

  async function handleGetAiInsights() {
    setLoadingAi(true);
    try {
      const res = await fetch('/api/gemini/finance-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenses: state.expenses,
          monthlyBudget: budget,
          currency,
          language,
        }),
      });
      const data = await res.json();
      if (Array.isArray(data.insights)) {
        let text = data.insights.map((ins: string) => `• ${ins}`).join('\n\n');
        if (data.alert) text = `⚠️ ${data.alert}\n\n` + text;
        if (data.suggestedAllocation) {
          const allocLabel = language === 'ar' ? 'التوزيع المقترح' : 'Suggested Allocation';
          const essentialsLabel = language === 'ar' ? 'أساسيات' : 'Essentials';
          const savingsLabel = language === 'ar' ? 'ادخار' : 'Savings';
          const discretionaryLabel = language === 'ar' ? 'اختياري' : 'Discretionary';
          text += `\n\n${allocLabel}: ${data.suggestedAllocation.essentials || '50%'} ${essentialsLabel}, ${data.suggestedAllocation.savings || '30%'} ${savingsLabel}, ${data.suggestedAllocation.discretionary || '20%'} ${discretionaryLabel}`;
        }
        setAiInsights(text);
      } else {
        setAiInsights(data.analysis || data.message || (language === 'ar' ? 'صحة الميزانية تبدو مستقرة.' : 'Budget health looks stable.'));
      }
    } catch (_e) {
      setAiInsights(language === 'ar' ? 'تعذّر إنشاء التحليلات في الوقت الحالي.' : 'Could not generate insights right now.');
    } finally {
      setLoadingAi(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2.5">
            <DollarSign className="w-6 h-6" />
            {t('page.finance.heading')}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {t('finance.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isPremium ? (
            <GlassButton
              variant="accent"
              size="sm"
              onClick={handleGetAiInsights}
              disabled={loadingAi}
              className="text-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {loadingAi ? t('finance.analyzing') : t('finance.aiAudit')}
            </GlassButton>
          ) : (
            <GlassButton
              variant="glass"
              size="sm"
              onClick={onOpenPremium}
              className="text-xs border-dashed"
            >
              <Lock className="w-3.5 h-3.5 text-zinc-400" />
              {t('finance.aiAuditLocked')}
            </GlassButton>
          )}

          <GlassButton
            variant="glass"
            size="sm"
            onClick={onOpenReport}
            className="text-xs font-semibold"
          >
            {t('finance.weeklyReport')}
          </GlassButton>
        </div>
      </div>

      {/* Overview Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassCard variant="elevated" className="p-5">
          <span className="text-[11px] uppercase font-bold text-zinc-400 tracking-wider">
            {t('finance.totalSpent')}
          </span>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white mt-1">
            {currency} {totalSpent.toFixed(2)}
          </h3>
          <p className="text-xs text-zinc-400 mt-1">{state.expenses.length} {t('finance.recordedEntries')}</p>
        </GlassCard>

        <GlassCard variant="subtle" className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-bold text-zinc-400 tracking-wider">
              {t('finance.monthlyBudget')}
            </span>
            {!isEditingBudget ? (
              <button
                onClick={() => {
                  setBudgetInput(budget.toString());
                  setIsEditingBudget(true);
                }}
                className="text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-white underline cursor-pointer"
              >
                {t('finance.edit')}
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    const parsed = parseFloat(budgetInput);
                    if (!isNaN(parsed) && parsed >= 0) {
                      onUpdateMonthlyBudget(parsed);
                    }
                    setIsEditingBudget(false);
                  }}
                  className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  {t('finance.save')}
                </button>
                <button
                  onClick={() => setIsEditingBudget(false)}
                  className="text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                >
                  {t('finance.cancel')}
                </button>
              </div>
            )}
          </div>
          {isEditingBudget ? (
            <div className="mt-2 flex items-center gap-1.5">
              <span className="text-sm font-bold text-zinc-500">{currency}</span>
              <input
                type="number"
                step="10"
                min="0"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                autoFocus
                className="w-full px-2 py-1 text-sm font-bold rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white"
              />
            </div>
          ) : (
            <h3 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white mt-1">
              {currency} {budget.toFixed(2)}
            </h3>
          )}
          <div className="w-full bg-zinc-900/5 dark:bg-white/10 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                percentUsed > 90
                  ? 'bg-red-500'
                  : percentUsed > 70
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(percentUsed, 100)}%` }}
            />
          </div>
          <span className="text-[11px] text-zinc-400 mt-1 block">
            {percentUsed.toFixed(0)}% {t('finance.percentUtilized')}
          </span>
        </GlassCard>

        <GlassCard variant="subtle" className="p-5">
          <span className="text-[11px] uppercase font-bold text-zinc-400 tracking-wider">
            {t('finance.remainingAllowance')}
          </span>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white mt-1">
            {currency} {remainingBudget.toFixed(2)}
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            {remainingBudget > 0 ? t('finance.withinTarget') : t('finance.limitReached')}
          </p>
        </GlassCard>
      </div>

      {/* AI INSIGHTS CARD IF GENERATED */}
      {aiInsights && (
        <GlassCard variant="elevated" className="p-5 border border-black/10 dark:border-white/15">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-zinc-900 dark:text-white" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
              {t('finance.aiAuditTitle')}
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
            {aiInsights}
          </p>
        </GlassCard>
      )}

      {/* TWO COLUMN: LOG EXPENSE & RECENT TRANSACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Log Expense Form */}
        <div className="lg:col-span-5 space-y-4">
          <GlassCard variant="subtle" className="p-5">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              {t('finance.quickLog')}
            </h3>

            <form onSubmit={handleCreateExpense} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
                  {t('finance.amount')} ({currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
                  {t('finance.category')}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white"
                >
                  <option value="food">{t('finance.cat.food')}</option>
                  <option value="books_supplies">{t('finance.cat.books')}</option>
                  <option value="tuition">{t('finance.cat.tuition')}</option>
                  <option value="rent_housing">{t('finance.cat.housing')}</option>
                  <option value="transport">{t('finance.cat.transport')}</option>
                  <option value="tech_software">{t('finance.cat.tech')}</option>
                  <option value="charity_sadaqah">{t('finance.cat.charity')}</option>
                  <option value="entertainment">{t('finance.cat.entertainment')}</option>
                  <option value="other">{t('finance.cat.other')}</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
                  {t('finance.descriptionMerchant')}
                </label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('finance.descriptionPlaceholder')}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 mb-1">{t('finance.date')}</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white"
                />
              </div>

              <GlassButton type="submit" variant="primary" size="md" className="w-full text-xs">
                {t('finance.saveExpense')}
              </GlassButton>
            </form>
          </GlassCard>

          {/* Category Breakdown list */}
          <GlassCard variant="subtle" className="p-5">
            <h4 className="text-xs font-bold text-zinc-900 dark:text-white mb-3">
              {t('finance.categoryDistribution')}
            </h4>
            {Object.keys(categoryTotals).length === 0 ? (
              <p className="text-xs text-zinc-400">{t('finance.noCategoryData')}</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(categoryTotals).map(([cat, val]) => (
                  <div key={cat} className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500 capitalize">{categoryLabel(cat)}</span>
                    <span className="font-semibold text-zinc-900 dark:text-white">
                      {currency} {val.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Recent Transactions List */}
        <div className="lg:col-span-7 space-y-4">
          <GlassCard variant="subtle" className="p-5">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-4">
              {t('finance.recentTransactions')} ({state.expenses.length})
            </h3>

            {state.expenses.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-black/10 dark:border-white/10 rounded-2xl">
                <DollarSign className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
                  {t('finance.noExpenses')}
                </h4>
                <p className="text-xs text-zinc-400 mt-1">
                  {t('finance.noExpensesDesc')}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {state.expenses.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-black/[0.01] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 flex items-center justify-between gap-3"
                  >
                    <div>
                      <span className="text-xs font-bold text-zinc-900 dark:text-white block truncate">
                        {item.description}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        {item.date} •{' '}
                        <span className="capitalize">{categoryLabel(item.category)}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-extrabold text-zinc-900 dark:text-white tabular-nums">
                        -{currency} {item.amount.toFixed(2)}
                      </span>
                      <button
                        onClick={() => onDeleteExpense(item.id)}
                        className="text-zinc-300 hover:text-red-500 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

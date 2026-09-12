import { useState } from 'react';
import { GlassButton, GlassCard, VedaLogo } from './ui/LiquidGlass';
import { AppState } from '../types';
import { getSubscriptionDetails } from '../lib/subscription';
import { downloadWeeklyReportPDF, getWeeklyReportStatus } from '../lib/pdfReport';
import { useLanguage } from '../lib/LanguageContext';
import {
  X,
  FileDown,
  Sparkles,
  CheckCircle2,
  Lock,
  Compass,
  GraduationCap,
  DollarSign,
  Clock,
  CalendarCheck,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

interface WeeklyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  onOpenPremium: () => void;
  onReportGenerated?: () => void;
}

export function WeeklyReportModal({
  isOpen,
  onClose,
  state,
  onOpenPremium,
  onReportGenerated,
}: WeeklyReportModalProps) {
  const { t } = useLanguage();
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const sub = getSubscriptionDetails(state.profile);
  const isPremium = sub.isPremiumActive;

  if (!isOpen) return null;

  const reportStatus = getWeeklyReportStatus(state.lastWeeklyReportGeneratedAt);
  const isAlreadyGeneratedThisWeek = isPremium && !reportStatus.canGenerate;

  function handleGenerateAndDownload() {
    if (!isPremium) {
      onClose();
      onOpenPremium();
      return;
    }

    setDownloading(true);
    setDownloadSuccess(false);

    setTimeout(() => {
      downloadWeeklyReportPDF(state);
      if (reportStatus.canGenerate) {
        onReportGenerated?.();
      }
      setDownloading(false);
      setDownloadSuccess(true);
    }, 400);
  }

  // Calculate live stats for preview
  const totalTasks = state.tasks.length;
  const completedTasks = state.tasks.filter((t) => t.completed).length;
  const totalFocusMin = state.focusSessions.reduce((a, s) => a + s.durationMinutes, 0);
  const totalSpent = state.expenses.reduce((a, s) => a + s.amount, 0);
  const currency = state.profile.preferences?.currency || 'USD';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 dark:bg-black/75 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <GlassCard
        variant="elevated"
        className="w-full max-w-lg p-6 sm:p-8 relative overflow-hidden border border-black/10 dark:border-white/15 my-6"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-900/5 dark:hover:bg-white/5 transition-colors"
          aria-label={t('common.close')}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center shadow-md shrink-0">
            <VedaLogo size={24} className="text-white dark:text-zinc-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white">
                {t('report.title')}
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-zinc-900 text-white dark:bg-white dark:text-zinc-950">
                {t('report.premiumBadge')}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t('report.subtitle')}
            </p>
          </div>
        </div>

        {/* Once a Week Quota Status Indicator */}
        {isPremium && (
          <div
            className={`mb-5 p-3.5 rounded-2xl text-xs border transition-all ${
              isAlreadyGeneratedThisWeek
                ? 'bg-amber-500/10 border-amber-500/25 text-amber-900 dark:text-amber-200'
                : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-900 dark:text-emerald-200'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {isAlreadyGeneratedThisWeek ? (
                <CalendarCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs">
                    {isAlreadyGeneratedThisWeek
                      ? t('report.quotaUsed')
                      : t('report.quotaAvailable')}
                  </span>
                  <span
                    className={`text-[11px] font-bold px-1.5 py-0.2 rounded uppercase ${
                      isAlreadyGeneratedThisWeek
                        ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300'
                        : 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                    }`}
                  >
                    {isAlreadyGeneratedThisWeek ? t('report.onceWeekLimit') : t('report.readyToGenerate')}
                  </span>
                </div>
                <p className="text-[11px] opacity-90 leading-relaxed">
                  {isAlreadyGeneratedThisWeek ? (
                    <>
                      {t('report.generatedOnPrefix')}{' '}
                      <span className="font-semibold">{reportStatus.lastGeneratedDateFormatted}</span>.{' '}
                      {t('report.nextOpensPrefix')}{' '}
                      <span className="font-semibold">{reportStatus.nextAvailableDateFormatted}</span> ({t('report.inSuffix')}{' '}
                      {reportStatus.daysRemaining} {reportStatus.daysRemaining === 1 ? t('report.day') : t('report.days')}).
                    </>
                  ) : (
                    t('report.quotaExplain')
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* PDF Document Preview Card */}
        <div className="mb-6 p-4 rounded-2xl bg-zinc-100/70 dark:bg-black/40 border border-black/[0.06] dark:border-white/[0.08] relative">
          <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5 mb-3">
            <div className="flex items-center gap-2">
              <VedaLogo size={14} />
              <span className="text-xs font-bold text-zinc-900 dark:text-white">
                Veda Weekly Report.pdf
              </span>
            </div>
            <span className="text-[11px] text-zinc-400">
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          {/* Section preview grid */}
          <div className="grid grid-cols-2 gap-2.5 text-xs mb-3">
            <div className="p-2.5 rounded-xl bg-white/70 dark:bg-zinc-900/70 border border-black/5 dark:border-white/5">
              <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 text-[11px] mb-1">
                <Compass className="w-3.5 h-3.5" />
                <span>{t('report.worshipTracking')}</span>
              </div>
              <p className="font-bold text-zinc-900 dark:text-white">
                {Object.keys(state.prayerLogs).length} {t('report.daysLoggedSuffix')}
              </p>
              <p className="text-[11px] text-zinc-400">{t('report.prayerNames')}</p>
            </div>

            <div className="p-2.5 rounded-xl bg-white/70 dark:bg-zinc-900/70 border border-black/5 dark:border-white/5">
              <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 text-[11px] mb-1">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>{t('report.studyVault')}</span>
              </div>
              <p className="font-bold text-zinc-900 dark:text-white">
                {completedTasks}/{totalTasks} {t('report.tasksSuffix')}
              </p>
              <p className="text-[11px] text-zinc-400">{state.documents.length} {t('report.vaultDocuments')}</p>
            </div>

            <div className="p-2.5 rounded-xl bg-white/70 dark:bg-zinc-900/70 border border-black/5 dark:border-white/5">
              <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 text-[11px] mb-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{t('report.deepWorkFocus')}</span>
              </div>
              <p className="font-bold text-zinc-900 dark:text-white">{totalFocusMin} {t('report.minutesSuffix')}</p>
              <p className="text-[11px] text-zinc-400">
                {state.focusSessions.length} {t('report.pomodoroIntervals')}
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-white/70 dark:bg-zinc-900/70 border border-black/5 dark:border-white/5">
              <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 text-[11px] mb-1">
                <DollarSign className="w-3.5 h-3.5" />
                <span>{t('report.financeBudget')}</span>
              </div>
              <p className="font-bold text-zinc-900 dark:text-white">
                {currency} {totalSpent.toFixed(0)}
              </p>
              <p className="text-[11px] text-zinc-400">{state.expenses.length} {t('report.recordedEntries')}</p>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 text-[11px] text-zinc-600 dark:text-zinc-300">
            <span className="font-semibold text-zinc-900 dark:text-white">{t('report.includesLabel')}</span>{' '}
            {t('report.includesText')}
          </div>
        </div>

        {/* Action Button & Quota Controls */}
        {isPremium ? (
          <div className="space-y-2">
            {isAlreadyGeneratedThisWeek ? (
              <GlassButton
                variant="glass"
                size="lg"
                className="w-full gap-2 text-sm font-semibold py-3 border-black/10 dark:border-white/10"
                disabled={downloading}
                onClick={handleGenerateAndDownload}
              >
                <RotateCcw className="w-4 h-4" />
                {downloading ? t('report.downloading') : t('report.redownload')}
              </GlassButton>
            ) : (
              <GlassButton
                variant="primary"
                size="lg"
                className="w-full gap-2 text-sm font-semibold py-3 shadow-xl"
                disabled={downloading}
                onClick={handleGenerateAndDownload}
              >
                <FileDown className="w-4 h-4" />
                {downloading ? t('report.compiling') : t('report.generateDownload')}
              </GlassButton>
            )}

            {downloadSuccess && (
              <p className="text-center text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center justify-center gap-1.5 mt-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {t('report.downloadSuccess')}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <GlassButton
              variant="primary"
              size="lg"
              className="w-full gap-2 text-sm font-semibold py-3 shadow-xl"
              onClick={() => {
                onClose();
                onOpenPremium();
              }}
            >
              <Sparkles className="w-4 h-4" />
              {t('report.unlockCta')}
            </GlassButton>
            <p className="text-center text-xs text-zinc-400">
              {t('report.justPriceCancel')}
            </p>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

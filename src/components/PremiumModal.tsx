import { useState } from 'react';
import { GlassButton, GlassCard, VedaLogo } from './ui/LiquidGlass';
import { AppState } from '../types';
import { getSubscriptionDetails } from '../lib/subscription';
import { PayPalSubscribeButton } from './PayPalSubscribeButton';
import { useLanguage } from '../lib/LanguageContext';
import {
  X,
  Sparkles,
  CheckCircle2,
  FileText,
  Compass,
  TrendingUp,
  Clock,
  BookOpen,
  Brain,
  Zap,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  onSubscribed: () => void;
  onSwitchToFree?: () => void;
}

// Single paid plan — there is no annual option.
const MONTHLY_PRICE = 4.17;

export function PremiumModal({
  isOpen,
  onClose,
  state,
  onSubscribed,
  onSwitchToFree,
}: PremiumModalProps) {
  const [payPalError, setPayPalError] = useState<string | null>(null);
  const { t } = useLanguage();

  if (!isOpen) return null;

  const sub = getSubscriptionDetails(state.profile);

  function handlePaymentSuccess() {
    try {
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#ffffff', '#a1a1aa', '#27272a', '#e4e4e7', '#34d399'],
      });
    } catch (_e) {}
    onSubscribed();
    onClose();
  }

  function handleChooseFree() {
    if (onSwitchToFree) {
      onSwitchToFree();
    }
    onClose();
  }

  const features = [
    { icon: <Brain className="w-4 h-4" />, title: t('premium.feat1.title'), desc: t('premium.feat1.desc') },
    { icon: <BookOpen className="w-4 h-4" />, title: t('premium.feat2.title'), desc: t('premium.feat2.desc') },
    { icon: <FileText className="w-4 h-4" />, title: t('premium.feat3.title'), desc: t('premium.feat3.desc') },
    { icon: <Compass className="w-4 h-4" />, title: t('premium.feat4.title'), desc: t('premium.feat4.desc') },
    { icon: <TrendingUp className="w-4 h-4" />, title: t('premium.feat5.title'), desc: t('premium.feat5.desc') },
    { icon: <Clock className="w-4 h-4" />, title: t('premium.feat6.title'), desc: t('premium.feat6.desc') },
    { icon: <Zap className="w-4 h-4" />, title: t('premium.feat7.title'), desc: t('premium.feat7.desc') },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 dark:bg-black/75 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <GlassCard
        variant="elevated"
        className="w-full max-w-xl p-5 sm:p-8 relative overflow-hidden border border-black/10 dark:border-white/15 my-6"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rtl:right-auto rtl:left-4 w-9 h-9 flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-900/5 dark:hover:bg-white/5 transition-colors"
          aria-label={t('common.close')}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center flex flex-col items-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center mb-3 shadow-lg shadow-black/10 dark:shadow-white/5">
            <VedaLogo size={26} className="text-white dark:text-zinc-950" />
          </div>

          {sub.status === 'paid_premium' ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-semibold mb-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {t('premium.activeMember')}
            </div>
          ) : sub.status === 'trial_active' ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              {t('premium.trialBadgePrefix')} ({sub.daysRemaining} {t('premium.daysLeftSuffix')})
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              {t('premium.plansLabel')}
            </div>
          )}

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            {sub.status === 'trial_active'
              ? t('premium.titleTrialActive')
              : sub.status === 'trial_expired'
              ? t('premium.titleTrialExpired')
              : t('premium.titleDefault')}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-md">
            {sub.status === 'trial_active'
              ? t('premium.subtitleTrialActive')
              : sub.status === 'trial_expired'
              ? t('premium.subtitleTrialExpired')
              : t('premium.subtitleDefault')}
          </p>
        </div>

        {/* 14-Day Free Trial Progress Bar (if in active trial) */}
        {sub.isTrial && (
          <div className="mb-5 p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/25">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {t('premium.trialProgress')}
              </span>
              <span className="font-bold text-amber-800 dark:text-amber-300">
                {sub.daysRemaining} {sub.daysRemaining === 1 ? t('premium.dayRemainingShort') : t('premium.daysRemainingShort')}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(8, sub.progressPercent)}%` }}
              />
            </div>
            <p className="text-[11px] text-amber-700 dark:text-amber-300/80 mt-2 leading-relaxed">
              {t('premium.fullAccessPrefix')} <strong>{t('premium.fullAccessBold')}</strong>{' '}
              {t('premium.fullAccessSuffix')}
            </p>
          </div>
        )}

        {/* Trial Expired Alert (if trial elapsed) */}
        {sub.status === 'trial_expired' && (
          <div className="mb-5 p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-black/10 dark:border-white/10">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
                  {t('premium.trialEndedTitle')}
                </h4>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                  {t('premium.trialEndedPrefix')} <strong>{t('premium.trialEndedBold')}</strong>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Price Card */}
        <div className="mb-5 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-black/[0.06] dark:border-white/[0.08]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{t('premium.planName')}</p>
              <p className="text-xl font-bold text-zinc-900 dark:text-white mt-0.5">
                ${MONTHLY_PRICE.toFixed(2)} <span className="text-xs font-normal text-zinc-500">{t('premium.perMonth')}</span>
              </p>
            </div>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
              {t('premium.cancelAnytime')}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2.5 pt-2.5 border-t border-black/5 dark:border-white/5 leading-relaxed">
            {t('premium.cancelDetail')}
          </p>
        </div>

        {/* Feature List */}
        <div className="space-y-2.5 mb-5 max-h-48 overflow-y-auto pr-1">
          {features.map((f, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.03] dark:border-white/[0.03]"
            >
              <div className="p-1.5 rounded-lg bg-black/5 dark:bg-white/5 text-zinc-800 dark:text-zinc-200 mt-0.5 shrink-0">
                {f.icon}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                  {f.title}
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                </h4>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed mt-0.5">
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Safety Guarantee */}
        <div className="mb-5 p-3 rounded-xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2.5 text-emerald-800 dark:text-emerald-300 text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>{t('premium.dataSafetyTitle')}</strong> {t('premium.dataSafetyBody')}
          </span>
        </div>

        {/* CTA */}
        <div className="space-y-2">
          {sub.status === 'paid_premium' ? (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {t('premium.activeSubTitle')}
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1.5">
                {t('premium.manageInPayPalNote')}
              </p>
              <a
                href="https://www.paypal.com/myaccount/autopay/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-zinc-900 dark:text-white hover:underline"
              >
                {t('premium.manageInPayPal')} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ) : (
            <>
              {payPalError && (
                <div className="mb-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
                  {payPalError}
                </div>
              )}
              <PayPalSubscribeButton
                onSuccess={handlePaymentSuccess}
                onError={(msg) => setPayPalError(msg)}
              />
            </>
          )}

          {sub.status !== 'paid_premium' && (
            <div className="flex items-center justify-center pt-1">
              <button
                type="button"
                onClick={handleChooseFree}
                className="text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors py-1.5"
              >
                {sub.status === 'trial_expired' ? t('premium.continueFree') : t('premium.keepFree')}
              </button>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

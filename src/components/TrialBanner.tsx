import { GlassCard } from './ui/LiquidGlass';
import { UserProfile } from '../types';
import { getSubscriptionDetails } from '../lib/subscription';
import { useLanguage } from '../lib/LanguageContext';
import { Sparkles, ArrowRight, ShieldCheck, Clock, AlertCircle } from 'lucide-react';

interface TrialBannerProps {
  profile?: UserProfile;
  onOpenPremium: () => void;
}

export function TrialBanner({ profile, onOpenPremium }: TrialBannerProps) {
  const sub = getSubscriptionDetails(profile);
  const { t } = useLanguage();

  // If user is paid premium or already permanently chose free with dismissed trial, no top banner needed
  if (sub.status === 'paid_premium' || sub.status === 'free_plan') {
    return null;
  }

  if (sub.isTrial) {
    return (
      <div className="bg-amber-500/10 dark:bg-amber-500/[0.12] border-b border-amber-500/20 py-2.5 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span className="font-semibold">
              {t('trialBanner.activeTitle')}
            </span>
            <span className="text-amber-800 dark:text-amber-300">
              {sub.daysRemaining} {sub.daysRemaining === 1 ? t('trialBanner.dayRemaining') : t('trialBanner.daysRemaining')}
            </span>
          </div>

          <button
            onClick={onOpenPremium}
            className="flex items-center gap-1 text-[11px] font-bold text-amber-900 dark:text-amber-100 hover:underline bg-white/60 dark:bg-black/40 px-2.5 py-1 rounded-lg border border-amber-500/30 transition-all hover:scale-105"
          >
            <span>{t('trialBanner.viewBenefits')}</span>
            <ArrowRight className="w-3 h-3 rtl:rotate-180" />
          </button>
        </div>
      </div>
    );
  }

  if (sub.isExpired) {
    return (
      <div className="bg-zinc-900 text-white dark:bg-zinc-800 border-b border-white/10 py-2.5 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              {t('trialBanner.expiredMessage')}
            </span>
          </div>

          <button
            onClick={onOpenPremium}
            className="flex items-center gap-1 text-[11px] font-bold bg-white text-zinc-950 px-3 py-1 rounded-lg shadow-sm hover:bg-zinc-100 transition-all"
          >
            <span>{t('trialBanner.choosePlan')}</span>
            <ArrowRight className="w-3 h-3 rtl:rotate-180" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}

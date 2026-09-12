import React, { useState, useRef } from 'react';
import { GlassButton, GlassCard, VedaLogo } from './ui/LiquidGlass';
import { LegalModal } from './LegalModal';
import { useLanguage } from '../lib/LanguageContext';
import {
  SubscriptionTier,
  SubscriptionBilling,
  UserProfile,
} from '../types';
import {
  signInWithEmailPassword,
  signUpWithEmailPassword,
} from '../lib/supabase';
import {
  Sparkles,
  Check,
  ArrowRight,
  ArrowLeft,
  Compass,
  GraduationCap,
  Clock,
  DollarSign,
  Zap,
  CheckCircle2,
  Mail,
  Lock,
  User as UserIcon,
  ShieldCheck,
  FileText,
  TrendingUp,
} from 'lucide-react';

interface OnboardingFlowProps {
  onComplete: (profileData: {
    tier: SubscriptionTier;
    billing?: SubscriptionBilling;
  }) => void;
  initialTier?: SubscriptionTier;
  /** True when a real Supabase session already exists (e.g. fresh signup or
   * a returning user who hasn't finished the welcome flow) — skips the
   * sign-in step entirely instead of asking them to authenticate twice. */
  skipAuthStep?: boolean;
}

const PENDING_TIER_CHOICE_KEY = 'veda_pending_tier_choice';

export function OnboardingFlow({ onComplete, initialTier = 'free', skipAuthStep = false }: OnboardingFlowProps) {
  const [step, setStep] = useState<'welcome' | 'tier' | 'signin'>('welcome');
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>(initialTier);

  // Sign In / Sign Up Form State
  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [legalDoc, setLegalDoc] = useState<'terms' | 'privacy' | null>(null);
  // Same rationale as AuthModal: `loading` commits asynchronously, so a fast
  // double-click can fire two requests before the button visually disables.
  // That alone is enough to trip Supabase's email rate limit.
  const isSubmittingRef = useRef(false);
  const { language, setLanguage, t } = useLanguage();

  // Single paid plan — there is no annual option.
  const monthlyPrice = 4.17;

  function stashPendingTierChoice() {
    try {
      sessionStorage.setItem(
        PENDING_TIER_CHOICE_KEY,
        JSON.stringify({ tier: selectedTier, billing: selectedTier === 'premium' ? 'monthly' : undefined })
      );
    } catch {
      // ignore storage failures — the tier choice just won't be re-applied
    }
  }

  // Handle Sign In / Up — only ever proceeds on a REAL, verified Supabase
  // session. Any error is shown to the user, never silently bypassed. The
  // tier choice is stashed the same way as the Google path so App.tsx's
  // post-auth hydration effect is the single place that applies it —
  // avoiding a race between this callback and that hydration.
  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    if (!email) {
      setErrorMsg('Please enter your email address');
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);
    setErrorMsg(null);
    stashPendingTierChoice();

    try {
      if (authMode === 'signup') {
        if (!password || password.length < 6) {
          setErrorMsg('Password must be at least 6 characters');
          return;
        }
        if (!agreedToTerms) {
          setErrorMsg('Please agree to the Terms of Service and Privacy Policy to continue.');
          return;
        }
        const displayName = fullName.trim() || email.split('@')[0];
        const { session, error } = await signUpWithEmailPassword(email, password, displayName);
        if (error) {
          setErrorMsg(error);
          return;
        }
        if (!session) {
          setErrorMsg('Please check your email to confirm your account, then sign in.');
          return;
        }
        onComplete({
          tier: selectedTier,
          billing: selectedTier === 'premium' ? 'monthly' : undefined,
        });
        return;
      }

      // Sign in
      if (!password) {
        setErrorMsg('Please enter your password');
        return;
      }
      const { user, error } = await signInWithEmailPassword(email, password);
      if (error) {
        setErrorMsg(error);
        return;
      }
      if (!user) {
        setErrorMsg('Sign in failed. Please try again.');
        return;
      }
      onComplete({
        tier: selectedTier,
        billing: selectedTier === 'premium' ? 'monthly' : undefined,
      });
    } finally {
      isSubmittingRef.current = false;
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-zinc-50 dark:bg-zinc-950 overflow-y-auto">
      {/* Background ambient decorative shapes */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 sm:w-[600px] h-96 sm:h-[600px] bg-zinc-200/50 dark:bg-zinc-900/50 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-2xl relative my-auto py-6">
        {/* ========================================================================= */}
        {/* STEP 1: WELCOME SCREEN                                                    */}
        {/* ========================================================================= */}
        {step === 'welcome' && (
          <GlassCard
            variant="elevated"
            className="w-full p-6 sm:p-10 border border-black/10 dark:border-white/15 animate-fadeIn relative"
          >
            {/* Language Toggle */}
            <div className="absolute top-4 right-4 rtl:right-auto rtl:left-4 flex items-center gap-1 p-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/5 dark:border-white/5 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  language === 'en'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLanguage('ar')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  language === 'ar'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                العربية
              </button>
            </div>

            {/* Brand Logo & Title */}
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center shadow-2xl mb-4 transition-transform hover:scale-105 duration-300">
                <VedaLogo size={38} className="text-white dark:text-zinc-950" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-black/5 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 text-xs font-semibold mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                Next-Gen Islamic & Executive System
              </div>

              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
                {t('onboarding.welcomeTitle')}
              </h1>
              <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 mt-2 max-w-md leading-relaxed">
                The unified, intelligent operating system designed for life, academics, worship, and wealth.
              </p>
            </div>

            {/* 4 Core Pillars Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-900/[0.06] dark:border-white/[0.07] flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-zinc-900/[0.06] dark:bg-white/[0.08] text-zinc-700 dark:text-zinc-200 flex items-center justify-center shrink-0">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-[13px] font-bold text-zinc-900 dark:text-white">{t('ob.pillar1.title')}</h2>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    {t('ob.pillar1.desc')}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-900/[0.06] dark:border-white/[0.07] flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-veda-accent/10 text-veda-accent dark:text-veda-accent-dark flex items-center justify-center shrink-0">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-[13px] font-bold text-zinc-900 dark:text-white">{t('ob.pillar2.title')}</h2>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    {t('ob.pillar2.desc')}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-900/[0.06] dark:border-white/[0.07] flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-zinc-900/[0.06] dark:bg-white/[0.08] text-zinc-700 dark:text-zinc-200 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-[13px] font-bold text-zinc-900 dark:text-white">{t('ob.pillar3.title')}</h2>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    {t('ob.pillar3.desc')}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-900/[0.06] dark:border-white/[0.07] flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-[13px] font-bold text-zinc-900 dark:text-white">{t('ob.pillar4.title')}</h2>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    {t('ob.pillar4.desc')}
                  </p>
                </div>
              </div>
            </div>

            {/* Step Navigation */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-black/5 dark:border-white/5">
              <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
                <span className="w-6 h-6 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center text-[11px] font-bold">
                  1
                </span>
                <span>{t('ob.step1of3')}</span>
              </div>

              <GlassButton
                variant="primary"
                size="lg"
                onClick={() => setStep('tier')}
                className="w-full sm:w-auto px-8 gap-2 font-semibold text-sm py-3"
              >
                <span>{t('ob.getStarted')}</span>
                <ArrowRight className="w-4 h-4" />
              </GlassButton>
            </div>
          </GlassCard>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: TIER SELECTION                                                    */}
        {/* ========================================================================= */}
        {step === 'tier' && (
          <GlassCard
            variant="elevated"
            className="w-full p-6 sm:p-9 border border-black/10 dark:border-white/15 animate-fadeIn relative"
          >
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setStep('welcome')}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{t('ob.back')}</span>
              </button>

              <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
                <span className="w-6 h-6 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center text-[11px] font-bold">
                  2
                </span>
                <span>{t('ob.step2of3')}</span>
              </div>
            </div>

            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                {t('ob.chooseTierTitle')}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-md mx-auto">
                {t('ob.chooseTierDesc')}
              </p>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* FREE TIER CARD */}
              <div
                onClick={() => setSelectedTier('free')}
                className={`cursor-pointer rounded-2xl p-5 border transition-all relative flex flex-col justify-between ${
                  selectedTier === 'free'
                    ? 'bg-white/90 dark:bg-zinc-900/90 border-zinc-900 dark:border-white ring-2 ring-zinc-900/10 dark:ring-white/10 shadow-lg'
                    : 'bg-white/40 dark:bg-zinc-900/40 border-black/5 dark:border-white/5 hover:border-black/20 dark:hover:border-white/20'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-zinc-900 dark:text-white">{t('ob.freePlanName')}</span>
                    {selectedTier === 'free' && (
                      <span className="w-5 h-5 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <div className="mb-4">
                    <span className="text-2xl font-bold text-zinc-900 dark:text-white">$0</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400"> {t('ob.freeForever')}</span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                    {t('ob.freeDesc')}
                  </p>

                  <div className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span>{t('ob.freeFeat1')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span>{t('ob.freeFeat2')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span>{t('ob.freeFeat3')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span>{t('ob.freeFeat4')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span>{t('ob.freeFeat5')}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedTier('free');
                    setStep('signin');
                  }}
                  className={`mt-6 w-full py-2.5 rounded-xl font-semibold text-xs transition-all ${
                    selectedTier === 'free'
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                      : 'bg-black/5 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 hover:bg-black/10 dark:hover:bg-white/10'
                  }`}
                >
                  {t('ob.selectFreePlan')}
                </button>
              </div>

              {/* PREMIUM TIER CARD */}
              <div
                onClick={() => setSelectedTier('premium')}
                className={`cursor-pointer rounded-2xl p-5 border transition-all relative flex flex-col justify-between ${
                  selectedTier === 'premium'
                    ? 'bg-white/95 dark:bg-zinc-900/95 border-zinc-900 dark:border-white ring-2 ring-zinc-900/20 dark:ring-white/20 shadow-xl'
                    : 'bg-white/40 dark:bg-zinc-900/40 border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20'
                }`}
              >
                {/* Badge */}
                <div className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[11px] font-bold shadow-md flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  {t('ob.trialBadge')}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-zinc-900 dark:text-white">{t('ob.premiumPlanName')}</span>
                    {selectedTier === 'premium' && (
                      <span className="w-5 h-5 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <div className="mb-2">
                    <span className="text-2xl font-bold text-zinc-900 dark:text-white">
                      $0
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {' '}
                      for 14 days, then ${monthlyPrice}/mo
                    </span>
                  </div>
                  <div className="mb-4 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-800 dark:text-amber-300 text-[11px] font-semibold">
                    <span>{t('ob.fullPremiumFree')}</span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                    {t('ob.premiumDesc')}
                  </p>

                  <div className="space-y-2 text-xs text-zinc-800 dark:text-zinc-200">
                    <div className="flex items-center gap-2 font-medium">
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>{t('ob.premiumFeat1')}</span>
                    </div>
                    <div className="flex items-center gap-2 font-medium">
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>{t('ob.premiumFeat2')}</span>
                    </div>
                    <div className="flex items-center gap-2 font-medium">
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>{t('ob.premiumFeat3')}</span>
                    </div>
                    <div className="flex items-center gap-2 font-medium">
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>{t('ob.premiumFeat4')}</span>
                    </div>
                    <div className="flex items-center gap-2 font-medium">
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>{t('ob.premiumFeat5')}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedTier('premium');
                    setStep('signin');
                  }}
                  className={`mt-6 w-full py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-1.5 ${
                    selectedTier === 'premium'
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-md'
                      : 'bg-black/5 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 hover:bg-black/10 dark:hover:bg-white/10'
                  }`}
                >
                  <span>{t('ob.selectPremiumPlan')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Step Navigation */}
            <div className="flex items-center justify-between pt-4 border-t border-black/5 dark:border-white/5">
              <button
                type="button"
                onClick={() => setStep('welcome')}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5"
              >
                {t('ob.previousStep')}
              </button>

              <GlassButton
                variant="primary"
                size="md"
                onClick={() => {
                  if (skipAuthStep) {
                    onComplete({
                      tier: selectedTier,
                      billing: selectedTier === 'premium' ? 'monthly' : undefined,
                    });
                  } else {
                    setStep('signin');
                  }
                }}
                className="gap-2 font-semibold text-xs px-6 py-2.5"
              >
                <span>{skipAuthStep ? t('onboarding.startUsing') : t('onboarding.continueToSignIn')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </GlassButton>
            </div>
          </GlassCard>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: SIGN IN / ACCOUNT SETUP                                           */}
        {/* ========================================================================= */}
        {step === 'signin' && (
          <GlassCard
            variant="elevated"
            className="w-full p-6 sm:p-9 border border-black/10 dark:border-white/15 animate-fadeIn relative"
          >
            <div className="flex items-center justify-between mb-5">
              <button
                onClick={() => setStep('tier')}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{t('ob.backToPlans')}</span>
              </button>

              <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
                <span className="w-6 h-6 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center text-[11px] font-bold">
                  3
                </span>
                <span>{t('ob.step3of3')}</span>
              </div>
            </div>

            {/* Selected Tier Banner */}
            <div className="mb-5 p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-black/5 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center text-xs font-bold">
                  {selectedTier === 'premium' ? <Sparkles className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-900 dark:text-white capitalize">
                    {selectedTier === 'premium' ? t('onboarding.premium') : t('onboarding.free')} {t('ob.tierSelected')}
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {selectedTier === 'premium'
                      ? `$${monthlyPrice}/mo after your 14-day trial`
                      : t('ob.freeForeverAccess')}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep('tier')}
                className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 hover:underline"
              >
                {t('ob.changePlan')}
              </button>
            </div>

            <div className="text-center mb-5">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                {authMode === 'signup' ? t('ob.createAccountTitle') : t('ob.signInTitle')}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {authMode === 'signup'
                  ? t('ob.createAccountDesc')
                  : t('ob.signInDesc')}
              </p>
            </div>

            {authMode === 'signup' && (
              <p className="text-center text-[10.5px] text-zinc-400 mb-3">
                By continuing, you agree to our{' '}
                <button type="button" onClick={() => setLegalDoc('terms')} className="underline hover:text-zinc-600 dark:hover:text-zinc-200">
                  Terms
                </button>{' '}
                &amp;{' '}
                <button type="button" onClick={() => setLegalDoc('privacy')} className="underline hover:text-zinc-600 dark:hover:text-zinc-200">
                  Privacy Policy
                </button>
              </p>
            )}

            {/* Messages */}
            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
                {errorMsg}
              </div>
            )}

            {/* Email & Password Form */}
            <form onSubmit={handleAuthSubmit} className="space-y-3">
              {authMode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Zaid Rahman"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-white/50 dark:bg-zinc-800/50 text-zinc-900 dark:text-white text-xs placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-white/50 dark:bg-zinc-800/50 text-zinc-900 dark:text-white text-xs placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-white/50 dark:bg-zinc-800/50 text-zinc-900 dark:text-white text-xs placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all"
                  />
                </div>
              </div>

              {authMode === 'signup' && (
                <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 accent-zinc-900 dark:accent-white shrink-0"
                  />
                  <span className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                    I agree to Veda's{' '}
                    <button
                      type="button"
                      onClick={() => setLegalDoc('terms')}
                      className="font-semibold text-zinc-900 dark:text-white hover:underline"
                    >
                      Terms of Service
                    </button>{' '}
                    and{' '}
                    <button
                      type="button"
                      onClick={() => setLegalDoc('privacy')}
                      className="font-semibold text-zinc-900 dark:text-white hover:underline"
                    >
                      Privacy Policy
                    </button>
                    .
                  </span>
                </label>
              )}

              <GlassButton
                type="submit"
                variant="primary"
                size="lg"
                disabled={loading || (authMode === 'signup' && !agreedToTerms)}
                className="w-full py-3 text-xs sm:text-sm font-semibold mt-2"
              >
                {loading
                  ? 'Processing...'
                  : authMode === 'signup'
                  ? `Create Account (${selectedTier.toUpperCase()})`
                  : `Sign In to Veda (${selectedTier.toUpperCase()})`}
              </GlassButton>
            </form>

            {/* Auth Switcher */}
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setAuthMode(authMode === 'signup' ? 'signin' : 'signup')}
                className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                {authMode === 'signup'
                  ? 'Already have an account? Sign In'
                  : "Don't have an account yet? Create One"}
              </button>
            </div>
          </GlassCard>
        )}
      </div>
      <LegalModal isOpen={legalDoc !== null} onClose={() => setLegalDoc(null)} document={legalDoc || 'terms'} />
    </div>
  );
}
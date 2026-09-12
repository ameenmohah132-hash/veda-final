import React, { useState, useRef } from 'react';
import { GlassButton, GlassCard, VedaLogo } from './ui/LiquidGlass';
import { LegalModal } from './LegalModal';
import { useLanguage } from '../lib/LanguageContext';
import {
  signInWithEmailPassword,
  signUpWithEmailPassword,
  sendMagicLink,
} from '../lib/supabase';
import { X, Mail, Lock, User as UserIcon, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'magic'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [legalDoc, setLegalDoc] = useState<'terms' | 'privacy' | null>(null);
  const { t } = useLanguage();
  // Guards against rapid double-clicks firing two requests before the
  // `loading` state (which commits asynchronously) has actually disabled
  // the button — this is what was letting a fast double-click send Supabase
  // two signup/magic-link/password-reset requests in the same instant,
  // which is enough on its own to trip Supabase's email rate limit.
  const isSubmittingRef = useRef(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    if (!email) {
      setErrorMsg(t('auth.errorEnterEmail'));
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (mode === 'magic') {
        const { error } = await sendMagicLink(email);
        if (error) {
          setErrorMsg(error);
        } else {
          setSuccessMsg(t('auth.magicLinkSent'));
        }
        return;
      }

      if (mode === 'signup') {
        if (!password || password.length < 6) {
          setErrorMsg(t('auth.errorPasswordLength'));
          return;
        }
        if (!agreedToTerms) {
          setErrorMsg(t('auth.errorAgreeTerms'));
          return;
        }
        const { user, session, error } = await signUpWithEmailPassword(email, password, fullName || email.split('@')[0]);
        if (error) {
          setErrorMsg(error);
          return;
        }
        if (session) {
          setSuccessMsg(t('auth.accountCreated'));
          setTimeout(() => {
            onSuccess(user);
            onClose();
          }, 800);
        } else {
          setSuccessMsg(t('auth.accountCreatedConfirm'));
        }
        return;
      }

      // Sign in
      if (!password) {
        setErrorMsg(t('auth.errorEnterPassword'));
        return;
      }
      const { user, error } = await signInWithEmailPassword(email, password);
      if (error) {
        setErrorMsg(error);
        return;
      }
      setSuccessMsg(t('auth.signedInSuccess'));
      if (user) {
        setTimeout(() => {
          onSuccess(user);
          onClose();
        }, 500);
      }
    } finally {
      isSubmittingRef.current = false;
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-md animate-fadeIn">
      <GlassCard
        variant="elevated"
        className="w-full max-w-md p-6 sm:p-8 relative overflow-hidden border border-black/10 dark:border-white/15"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rtl:right-auto rtl:left-4 w-9 h-9 flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-900/5 dark:hover:bg-white/5 transition-colors"
          aria-label={t('common.close')}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center mb-6">
          <VedaLogo size={42} className="mb-3" />
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            {mode === 'signin'
              ? t('auth.welcomeBack')
              : mode === 'signup'
              ? t('auth.createAccount')
              : t('auth.magicLinkTitle')}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs">
            {mode === 'signin'
              ? t('auth.subtitleSignin')
              : mode === 'signup'
              ? t('auth.subtitleSignup')
              : t('auth.subtitleMagic')}
          </p>
        </div>

        {mode === 'signup' && (
          <p className="text-center text-[10.5px] text-zinc-400 mb-3">
            {t('auth.byContinuingGoogle')}{' '}
            <button type="button" onClick={() => setLegalDoc('terms')} className="underline hover:text-zinc-600 dark:hover:text-zinc-200">
              {t('auth.termsShort')}
            </button>{' '}
            {t('auth.and')}{' '}
            <button type="button" onClick={() => setLegalDoc('privacy')} className="underline hover:text-zinc-600 dark:hover:text-zinc-200">
              {t('settings.privacyPolicy')}
            </button>
          </p>
        )}

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                {t('auth.fullNameLabel')}
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 rtl:left-auto rtl:right-3 top-2.5 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t('auth.fullNamePlaceholder')}
                  className="w-full pl-9 pr-3 rtl:pl-3 rtl:pr-9 py-2 rounded-xl text-sm bg-black/[0.03] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              {t('auth.emailAddress')}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 rtl:left-auto rtl:right-3 top-2.5 w-4 h-4 text-zinc-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.emailPlaceholder')}
                dir="ltr"
                className="w-full pl-9 pr-3 rtl:pl-3 rtl:pr-9 py-2 rounded-xl text-sm bg-black/[0.03] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white text-left rtl:text-right"
              />
            </div>
          </div>

          {mode !== 'magic' && (
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                {t('auth.password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 rtl:left-auto rtl:right-3 top-2.5 w-4 h-4 text-zinc-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  dir="ltr"
                  className="w-full pl-9 pr-3 rtl:pl-3 rtl:pr-9 py-2 rounded-xl text-sm bg-black/[0.03] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white text-left rtl:text-right"
                />
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 accent-zinc-900 dark:accent-white shrink-0"
              />
              <span className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                {t('auth.agreeToTerms')}{' '}
                <button
                  type="button"
                  onClick={() => setLegalDoc('terms')}
                  className="font-semibold text-zinc-900 dark:text-white hover:underline"
                >
                  {t('settings.termsOfService')}
                </button>{' '}
                <button
                  type="button"
                  onClick={() => setLegalDoc('privacy')}
                  className="font-semibold text-zinc-900 dark:text-white hover:underline"
                >
                  {t('settings.privacyPolicy')}
                </button>
              </span>
            </label>
          )}

          <GlassButton
            type="submit"
            variant="primary"
            size="md"
            disabled={loading || (mode === 'signup' && !agreedToTerms)}
            className="w-full mt-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-spin" />
                {t('auth.pleaseWait')}
              </span>
            ) : mode === 'signin' ? (
              t('auth.signIn')
            ) : mode === 'signup' ? (
              t('auth.createAccountBtn')
            ) : (
              t('auth.sendMagicLink')
            )}
          </GlassButton>
        </form>

        {/* Switchers */}
        <div className="mt-5 pt-4 border-t border-black/5 dark:border-white/5 flex flex-col gap-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
          {mode === 'signin' ? (
            <>
              <p>
                {t('auth.noAccount')}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMsg(null);
                  }}
                  className="text-zinc-900 dark:text-white font-semibold hover:underline"
                >
                  {t('auth.createOne')}
                </button>
              </p>
              <button
                type="button"
                onClick={() => {
                  setMode('magic');
                  setErrorMsg(null);
                }}
                className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                {t('auth.magicLinkPrompt')}
              </button>
            </>
          ) : mode === 'signup' ? (
            <p>
              {t('auth.haveAccount')}{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMsg(null);
                }}
                className="text-zinc-900 dark:text-white font-semibold hover:underline"
              >
                {t('auth.signIn')}
              </button>
            </p>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMsg(null);
              }}
              className="text-zinc-900 dark:text-white font-semibold hover:underline"
            >
              {t('auth.backToSignIn')}
            </button>
          )}
        </div>
      </GlassCard>
      <LegalModal isOpen={legalDoc !== null} onClose={() => setLegalDoc(null)} document={legalDoc || 'terms'} />
    </div>
  );
}
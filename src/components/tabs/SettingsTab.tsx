import { useState } from 'react';
import { GlassButton, GlassCard, VedaLogo } from '../ui/LiquidGlass';
import { LegalModal } from '../LegalModal';
import { useLanguage } from '../../lib/LanguageContext';
import { AppState, ThemeMode, UserProfile } from '../../types';
import { getSubscriptionDetails } from '../../lib/subscription';
import { signOutUser } from '../../lib/supabase';
import {
  Settings,
  User,
  Globe,
  Sun,
  Moon,
  Laptop,
  Compass,
  FileText,
  Download,
  Trash2,
  Sparkles,
  LogOut,
  Scale,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  RotateCcw,
} from 'lucide-react';

interface SettingsTabProps {
  state: AppState;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onToggleTheme: (theme: ThemeMode) => void;
  onOpenReport: () => void;
  onOpenPremium: () => void;
  onOpenAuth: () => void;
  onSignOut: () => void;
}

export function SettingsTab({
  state,
  onUpdateProfile,
  onToggleTheme,
  onOpenReport,
  onOpenPremium,
  onOpenAuth,
  onSignOut,
}: SettingsTabProps) {
  const isGuest = state.profile.id === 'guest_user' || !state.profile.email;
  const [legalDoc, setLegalDoc] = useState<'terms' | 'privacy' | null>(null);
  const { language, setLanguage, t } = useLanguage();
  const sub = getSubscriptionDetails(state.profile);
  const prefs = state.profile.preferences;

  const [calcMethod, setCalcMethod] = useState(prefs.prayerCalculationMethod || 'Muslim World League');
  const [asrMethod, setAsrMethod] = useState(prefs.asrJuristic || 'Standard');
  const [hijriOffset, setHijriOffset] = useState(prefs.hijriAdjustment || 0);
  const [currency, setCurrency] = useState(prefs.currency || 'USD');
  const [pomoWork, setPomoWork] = useState(prefs.pomodoroWorkMinutes || 25);
  const [pomoBreak, setPomoBreak] = useState(prefs.pomodoroBreakMinutes || 5);
  const [savedFeedback, setSavedFeedback] = useState(false);

  function handleSavePreferences() {
    onUpdateProfile({
      preferences: {
        ...prefs,
        prayerCalculationMethod: calcMethod,
        asrJuristic: asrMethod,
        hijriAdjustment: hijriOffset,
        currency,
        pomodoroWorkMinutes: pomoWork,
        pomodoroBreakMinutes: pomoBreak,
      },
    });
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  }

  function handleExportJSON() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `veda_backup_${new Date().toISOString().split('T')[0]}.json`);
    dlAnchorElem.click();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2.5">
            <Settings className="w-6 h-6" />
            {t('settings.title')}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {t('settings.subtitle')}
          </p>
        </div>

        <GlassButton
          variant="primary"
          size="sm"
          onClick={handleSavePreferences}
          className="text-xs"
        >
          {savedFeedback ? (
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> {t('settings.saved')}
            </span>
          ) : (
            t('settings.savePreferences')
          )}
        </GlassButton>
      </div>

      {/* ACCOUNT & SUBSCRIPTION SECTION */}
      <GlassCard variant="elevated" className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center font-bold text-lg">
              {state.profile.fullName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                {state.profile.fullName}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-zinc-400">
                  {state.profile.email || t('settings.localGuestProfile')}
                </span>
                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                <button
                  type="button"
                  onClick={onOpenPremium}
                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded cursor-pointer ${
                    sub.status === 'paid_premium'
                      ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950'
                      : sub.status === 'trial_active'
                      ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30'
                      : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}
                >
                  {sub.badgeLabel}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isGuest ? (
              <GlassButton variant="primary" size="sm" onClick={onOpenAuth} className="text-xs">
                <User className="w-3.5 h-3.5" />
                {t('nav.signIn')}
              </GlassButton>
            ) : (
              <GlassButton
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await signOutUser();
                  onSignOut();
                }}
                className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20"
              >
                <LogOut className="w-3.5 h-3.5" />
                {t('settings.signOut')}
              </GlassButton>
            )}

            <GlassButton variant="glass" size="sm" onClick={onOpenPremium} className="text-xs">
              <Sparkles className="w-3.5 h-3.5" />
              {sub.status === 'paid_premium' ? t('settings.managePlan') : sub.status === 'trial_active' ? t('settings.manageTrial') : t('trial.upgrade')}
            </GlassButton>
          </div>
        </div>
      </GlassCard>

      {/* APPEARANCE */}
      <GlassCard variant="subtle" className="p-6 space-y-4">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{t('settings.appearance')}</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'light', label: t('settings.themeLight'), icon: Sun },
            { id: 'dark', label: t('settings.themeDark'), icon: Moon },
            { id: 'system', label: t('settings.themeSystem'), icon: Laptop },
          ].map((item) => {
            const Icon = item.icon;
            const active = prefs.theme === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onToggleTheme(item.id as ThemeMode)}
                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                  active
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-black/20 shadow-sm'
                    : 'bg-black/[0.02] dark:bg-white/[0.03] border-black/5 text-zinc-600 dark:text-zinc-400 hover:bg-black/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-xs font-semibold">{item.label}</span>
              </button>
            );
          })}
        </div>
      </GlassCard>

      {/* LANGUAGE */}
      <GlassCard variant="subtle" className="p-6 space-y-4">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <Globe className="w-4 h-4" />
          {t('settings.language')}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: 'en' as const, label: t('settings.languageEnglish'), native: 'English' },
            { id: 'ar' as const, label: t('settings.languageArabic'), native: 'العربية' },
          ].map((item) => {
            const active = language === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setLanguage(item.id)}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  active
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-black/20 shadow-sm'
                    : 'bg-black/[0.02] dark:bg-white/[0.03] border-black/5 text-zinc-600 dark:text-zinc-400 hover:bg-black/5'
                }`}
              >
                <span className="text-sm font-semibold">{item.native}</span>
                <span className="text-[11px] opacity-70">{item.label}</span>
              </button>
            );
          })}
        </div>
      </GlassCard>

      {/* PRAYER & ISLAMIC CALCULATIONS */}
      <GlassCard variant="subtle" className="p-6 space-y-4">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <Compass className="w-4 h-4" />
          {t('settings.prayerCalcTitle')}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-500 mb-1">
              {t('settings.calcAuthority')}
            </label>
            <select
              value={calcMethod}
              onChange={(e) => setCalcMethod(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white"
            >
              <option value="Muslim World League">Muslim World League (MWL - 18°/17°)</option>
              <option value="ISNA">ISNA (North America - 15°/15°)</option>
              <option value="Egyptian General Authority of Survey">Egyptian General Authority of Survey (19.5°/17.5°)</option>
              <option value="Umm Al-Qura University, Makkah">Umm Al-Qura University, Makkah (18.5°/90 min)</option>
              <option value="University of Islamic Sciences, Karachi">University of Islamic Sciences, Karachi (18°/18°)</option>
              <option value="Institute of Geophysics, University of Tehran">Tehran (17.7°/14°)</option>
              <option value="Gulf Region">Gulf Region (19.5°/90 min)</option>
              <option value="Majlis Ugama Islam Singapura, Singapore">MUIS Singapore</option>
              <option value="Union des Organisations Islamiques de France">France (UOIF - 12°/12°)</option>
              <option value="Diyanet İşleri Başkanlığı, Turkey">Diyanet (Turkey - 18°/17°)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-500 mb-1">
              {t('settings.asrJuristicMethod')}
            </label>
            <select
              value={asrMethod}
              onChange={(e) => setAsrMethod(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white"
            >
              <option value="Standard">{t('settings.asrStandardOption')}</option>
              <option value="Hanafi">{t('settings.asrHanafiOption')}</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-500 mb-1">
            {t('settings.hijriOffset')}
          </label>
          <div className="flex items-center gap-2">
            {[-2, -1, 0, 1, 2].map((offset) => (
              <button
                key={offset}
                onClick={() => setHijriOffset(offset)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                  hijriOffset === offset
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                    : 'bg-black/5 dark:bg-white/5 text-zinc-600 dark:text-zinc-300'
                }`}
              >
                {offset === 0 ? t('settings.exact') : `${offset > 0 ? '+' : ''}${offset} ${t('settings.dayUnit')}`}
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* CURRENCY & FOCUS INTERVALS */}
      <GlassCard variant="subtle" className="p-6 space-y-4">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{t('settings.financeFocusTitle')}</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-500 mb-1">
              {t('settings.defaultCurrency')}
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="MYR">MYR (RM)</option>
              <option value="SAR">SAR (﷼)</option>
              <option value="AED">AED (د.إ)</option>
              <option value="IDR">IDR (Rp)</option>
              <option value="SGD">SGD (S$)</option>
              <option value="TRY">TRY (₺)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-500 mb-1">
              {t('settings.pomodoroMinutes')}
            </label>
            <input
              type="number"
              min={5}
              max={120}
              value={pomoWork}
              onChange={(e) => setPomoWork(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-500 mb-1">
              {t('settings.breakMinutes')}
            </label>
            <input
              type="number"
              min={1}
              max={30}
              value={pomoBreak}
              onChange={(e) => setPomoBreak(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white"
            />
          </div>
        </div>
      </GlassCard>

      {/* WEEKLY PDF REPORT & BACKUP */}
      <GlassCard variant="subtle" className="p-6 space-y-4">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{t('settings.dataIntelligenceTitle')}</h3>

        <div className="flex flex-wrap gap-3">
          <GlassButton variant="glass" size="sm" onClick={onOpenReport} className="text-xs">
            <FileText className="w-3.5 h-3.5" />
            {t('settings.generateWeeklyPdf')}
          </GlassButton>

          <GlassButton variant="glass" size="sm" onClick={handleExportJSON} className="text-xs">
            <Download className="w-3.5 h-3.5" />
            {t('settings.exportBackup')}
          </GlassButton>
        </div>
      </GlassCard>

      {/* LEGAL */}
      <GlassCard variant="subtle" className="p-6 space-y-4">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{t('settings.legal')}</h3>
        <div className="flex flex-wrap gap-3">
          <GlassButton variant="glass" size="sm" onClick={() => setLegalDoc('terms')} className="text-xs">
            <Scale className="w-3.5 h-3.5" />
            {t('settings.termsOfService')}
          </GlassButton>
          <GlassButton variant="glass" size="sm" onClick={() => setLegalDoc('privacy')} className="text-xs">
            <ShieldCheck className="w-3.5 h-3.5" />
            {t('settings.privacyPolicy')}
          </GlassButton>
        </div>
      </GlassCard>

      <LegalModal isOpen={legalDoc !== null} onClose={() => setLegalDoc(null)} document={legalDoc || 'terms'} />
    </div>
  );
}

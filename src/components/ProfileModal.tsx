import { useState } from 'react';
import { GlassButton, GlassCard, VedaLogo } from './ui/LiquidGlass';
import { AppState, UserProfile } from '../types';
import { getSubscriptionDetails } from '../lib/subscription';
import { signOutUser } from '../lib/supabase';
import { useLanguage } from '../lib/LanguageContext';
import {
  X,
  User,
  ShieldCheck,
  Calendar,
  Sparkles,
  LogOut,
  MapPin,
  CheckCircle2,
  HardDrive,
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onOpenPremium: () => void;
  onOpenAuth: () => void;
  onSignOut: () => void;
}

export function ProfileModal({
  isOpen,
  onClose,
  state,
  onUpdateProfile,
  onOpenPremium,
  onOpenAuth,
  onSignOut,
}: ProfileModalProps) {
  const { t } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(state.profile.fullName);
  const [currency, setCurrency] = useState(state.profile.preferences.currency || 'USD');
  const isGuest = state.profile.id === 'guest_user' || !state.profile.email;
  const sub = getSubscriptionDetails(state.profile);

  if (!isOpen) return null;

  function handleSave() {
    onUpdateProfile({
      fullName,
      preferences: {
        ...state.profile.preferences,
        currency,
      },
    });
    setEditing(false);
  }

  async function handleLogout() {
    await signOutUser();
    onSignOut();
    onClose();
  }

  const joinDateStr = new Date(state.profile.joinedAt).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-md animate-fadeIn">
      <GlassCard
        variant="elevated"
        className="w-full max-w-md p-6 sm:p-7 relative overflow-hidden border border-black/10 dark:border-white/15"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-900/5 dark:hover:bg-white/5 transition-colors"
          aria-label={t('common.close')}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            {state.profile.avatarUrl ? (
              <img
                src={state.profile.avatarUrl}
                alt={state.profile.fullName}
                className="w-14 h-14 rounded-2xl object-cover border border-black/10 dark:border-white/15"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center font-bold text-lg shadow-md">
                {state.profile.fullName.slice(0, 2).toUpperCase() || 'VE'}
              </div>
            )}
            {sub.isPremiumActive && (
              <div
                title={sub.isTrial ? t('profile.trialActiveTitle') : t('profile.premiumMember')}
                className="absolute -bottom-1 -right-1 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 p-1 rounded-lg shadow-sm"
              >
                <Sparkles className="w-3 h-3 text-amber-400 dark:text-amber-500" />
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                {state.profile.fullName || t('profile.vedaUser')}
              </h2>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {state.profile.email || 'Guest / Local Profile'}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  onClose();
                  onOpenPremium();
                }}
                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-md cursor-pointer hover:opacity-90 transition-opacity ${
                  sub.status === 'paid_premium'
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                    : sub.status === 'trial_active'
                    ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30'
                    : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                }`}
              >
                {sub.badgeLabel}
              </button>
              {isGuest && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenAuth();
                  }}
                  className="text-[11px] text-zinc-600 dark:text-zinc-300 font-medium underline hover:text-black dark:hover:text-white"
                >
                  {t('nav.signIn')}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Profile Stats Matrix */}
        <div className="grid grid-cols-3 gap-2.5 mb-5 text-center">
          <div className="p-2.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
            <p className="text-[11px] uppercase font-semibold text-zinc-400">{t('profile.studyTasks')}</p>
            <p className="text-base font-bold text-zinc-900 dark:text-white mt-0.5">
              {state.tasks.length}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
            <p className="text-[11px] uppercase font-semibold text-zinc-400">{t('profile.focusMinutes')}</p>
            <p className="text-base font-bold text-zinc-900 dark:text-white mt-0.5">
              {state.focusSessions.reduce((a, s) => a + s.durationMinutes, 0)}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
            <p className="text-[11px] uppercase font-semibold text-zinc-400">{t('profile.vaultFiles')}</p>
            <p className="text-base font-bold text-zinc-900 dark:text-white mt-0.5">
              {state.documents.length}
            </p>
          </div>
        </div>

        {/* Details List */}
        <div className="space-y-2.5 text-xs mb-6">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02]">
            <span className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
              <Calendar className="w-3.5 h-3.5" />
              {t('profile.memberSince')}
            </span>
            <span className="font-medium text-zinc-900 dark:text-white">{joinDateStr}</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02]">
            <span className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
              <MapPin className="w-3.5 h-3.5" />
              {t('profile.prayerLocation')}
            </span>
            <span className="font-medium text-zinc-900 dark:text-white">
              {state.profile.location?.city || t('profile.autoDetected')}
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02]">
            <span className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
              <HardDrive className="w-3.5 h-3.5" />
              {t('profile.cloudDatabase')}
            </span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {t('profile.supabaseConnected')}
            </span>
          </div>
        </div>

        {/* Edit fields if active */}
        {editing ? (
          <div className="space-y-3 mb-5 p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.05]">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                {t('profile.displayName')}
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg text-xs bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                {t('profile.currency')}
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg text-xs bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="MYR">MYR (RM)</option>
                <option value="SAR">SAR (﷼)</option>
                <option value="AED">AED (د.إ)</option>
                <option value="IDR">IDR (Rp)</option>
                <option value="SGD">SGD (S$)</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <GlassButton size="sm" variant="ghost" onClick={() => setEditing(false)}>
                {t('common.cancel')}
              </GlassButton>
              <GlassButton size="sm" variant="primary" onClick={handleSave}>
                {t('profile.saveChanges')}
              </GlassButton>
            </div>
          </div>
        ) : (
          <div className="flex gap-2 mb-4">
            <GlassButton
              variant="glass"
              size="sm"
              className="flex-1"
              onClick={() => setEditing(true)}
            >
              {t('profile.editPreferences')}
            </GlassButton>
            {sub.status !== 'paid_premium' && (
              <GlassButton
                variant="primary"
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => {
                  onClose();
                  onOpenPremium();
                }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                {sub.status === 'trial_active' ? t('trial.manage') : t('trial.upgrade')}
              </GlassButton>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-4 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
            <VedaLogo size={14} />
            <span>Veda v2.4</span>
          </div>

          {!isGuest ? (
            <GlassButton
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-500/15 border border-red-500/20"
            >
              <LogOut className="w-3.5 h-3.5" />
              {t('settings.signOut')}
            </GlassButton>
          ) : (
            <GlassButton
              variant="primary"
              size="sm"
              onClick={() => {
                onClose();
                onOpenAuth();
              }}
              className="text-xs font-semibold"
            >
              <User className="w-3.5 h-3.5" />
              {t('nav.signIn')}
            </GlassButton>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

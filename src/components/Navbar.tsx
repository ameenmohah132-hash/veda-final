import { useState, useRef, useEffect } from 'react';
import { GlassButton, VedaLogo } from './ui/LiquidGlass';
import { AppState, ThemeMode } from '../types';
import { getSubscriptionDetails } from '../lib/subscription';
import { signOutUser } from '../lib/supabase';
import { useLanguage } from '../lib/LanguageContext';
import {
  Sparkles,
  Timer,
  Sun,
  Moon,
  Laptop,
  FileText,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Settings as SettingsIcon,
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  state: AppState;
  onOpenFocus: () => void;
  onOpenAskVeda: () => void;
  onOpenReport: () => void;
  onOpenProfile: () => void;
  onOpenPremium: () => void;
  onOpenAuth: () => void;
  onSignOut?: () => void;
  onToggleTheme: (mode: ThemeMode) => void;
}

export function Navbar({
  activeTab,
  onSelectTab,
  state,
  onOpenFocus,
  onOpenAskVeda,
  onOpenReport,
  onOpenProfile,
  onOpenPremium,
  onOpenAuth,
  onSignOut,
  onToggleTheme,
}: NavbarProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isGuest = state.profile.id === 'guest_user' || !state.profile.email;
  const sub = getSubscriptionDetails(state.profile);
  const currentTheme = state.profile.preferences?.theme || 'system';
  const { t } = useLanguage();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleLogout() {
    setUserMenuOpen(false);
    await signOutUser();
    onSignOut?.();
  }

  const navItems = [
    { id: 'home', label: t('nav.home') },
    { id: 'study', label: t('nav.study') },
    { id: 'islamic', label: t('nav.islamic') },
    { id: 'finance', label: t('nav.finance') },
    { id: 'goals', label: t('nav.goals') },
    { id: 'notes', label: t('nav.notes') },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-black/[0.06] dark:border-white/[0.08] bg-white/75 dark:bg-zinc-950/75 backdrop-blur-xl transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => onSelectTab('home')}
            className="flex items-center gap-2.5 group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <VedaLogo size={20} className="text-white dark:text-zinc-950" />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-bold text-base tracking-tight text-zinc-900 dark:text-white leading-none">
                Veda
              </span>
              <span className="text-[11px] tracking-wide text-zinc-400 font-medium leading-tight mt-0.5">
                Life &amp; Faith
              </span>
            </div>
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    active
                      ? 'bg-black/5 dark:bg-white/10 text-zinc-900 dark:text-white'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-black/[0.02] dark:hover:bg-white/[0.03]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Global Focus Timer Pill */}
          <button
            onClick={onOpenFocus}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] border border-black/5 dark:border-white/5 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition-all active:scale-95"
            title="Open Focus Pomodoro Timer"
          >
            <Timer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Focus</span>
          </button>

          {/* Ask Veda AI Button */}
          <button
            onClick={onOpenAskVeda}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-veda-accent hover:bg-indigo-700 dark:bg-veda-accent-dark dark:hover:bg-indigo-300 text-white dark:text-zinc-950 text-xs font-semibold shadow-sm shadow-indigo-600/20 transition-all active:scale-95"
            title="Ask Veda AI Assistant"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('nav.askVeda')}</span>
          </button>

          {/* Weekly PDF Report */}
          <button
            onClick={onOpenReport}
            className="hidden sm:flex items-center justify-center w-10 h-10 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-900/5 dark:hover:bg-white/5 transition-colors"
            title="Weekly Performance PDF Report"
          >
            <FileText className="w-4 h-4" />
          </button>

          {/* Theme Mode Toggle */}
          <button
            onClick={() => {
              const nextMode: ThemeMode =
                currentTheme === 'light' ? 'dark' : currentTheme === 'dark' ? 'system' : 'light';
              onToggleTheme(nextMode);
            }}
            className="flex items-center justify-center w-10 h-10 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-900/5 dark:hover:bg-white/5 transition-colors"
            title={`Theme: ${currentTheme}`}
          >
            {currentTheme === 'light' ? (
              <Sun className="w-4 h-4" />
            ) : currentTheme === 'dark' ? (
              <Moon className="w-4 h-4" />
            ) : (
              <Laptop className="w-4 h-4" />
            )}
          </button>

          {/* Premium Badge / 14-Day Free Trial / Upgrade */}
          {sub.status === 'paid_premium' ? (
            <span
              onClick={onOpenPremium}
              className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 cursor-pointer shadow-xs hover:opacity-90 transition-opacity"
            >
              ★ PREMIUM
            </span>
          ) : sub.status === 'trial_active' ? (
            <button
              onClick={onOpenPremium}
              className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-all shadow-xs cursor-pointer"
              title="14-Day Free Trial Active - Click to Manage"
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>14d Trial ({sub.daysRemaining}d left)</span>
            </button>
          ) : (
            <GlassButton
              variant="glass"
              size="sm"
              onClick={onOpenPremium}
              className="hidden lg:flex items-center gap-1 text-[11px] font-bold border-zinc-300 dark:border-zinc-700"
            >
              <Sparkles className="w-3 h-3" />
              Get Premium
            </GlassButton>
          )}

          {/* User Profile Avatar / Sign In */}
          {isGuest ? (
            <GlassButton
              variant="primary"
              size="sm"
              onClick={onOpenAuth}
              className="text-xs font-semibold px-3 py-1.5"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('nav.signIn')}</span>
            </GlassButton>
          ) : (
            <div className="relative flex items-center gap-1.5" ref={menuRef}>
              <button
                onClick={() => setUserMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] border border-black/5 dark:border-white/5 transition-all cursor-pointer"
                title="Account Menu"
              >
                {state.profile.avatarUrl ? (
                  <img
                    src={state.profile.avatarUrl}
                    alt={state.profile.fullName}
                    className="w-6 h-6 rounded-lg object-cover border border-black/10 dark:border-white/10"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center font-bold text-xs">
                    {state.profile.fullName.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 hidden sm:inline max-w-[90px] truncate">
                  {state.profile.fullName.split(' ')[0]}
                </span>
                <ChevronDown className="w-3 h-3 text-zinc-400" />
              </button>

              {/* Direct Quick Sign Out Button */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-500/15 border border-transparent hover:border-red-500/20 text-xs font-semibold transition-all active:scale-95 cursor-pointer"
                title={t('nav.signOut')}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{t('nav.signOut')}</span>
              </button>

              {/* User Dropdown Menu */}
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 p-2 rounded-2xl bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 shadow-xl z-50 animate-fadeIn space-y-1">
                  <div className="px-3 py-2 border-b border-black/5 dark:border-white/5">
                    <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                      {state.profile.fullName}
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                      {state.profile.email || 'Veda User'}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      onOpenProfile();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5 hover:text-zinc-950 dark:hover:text-white text-left transition-colors cursor-pointer"
                  >
                    <SettingsIcon className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{t('nav.profilePreferences')}</span>
                  </button>

                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      onOpenPremium();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5 hover:text-zinc-950 dark:hover:text-white text-left transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>{sub.isPremiumActive ? 'Manage Subscription' : 'Upgrade Plan'}</span>
                  </button>

                  <div className="pt-1 border-t border-black/5 dark:border-white/5">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-500/15 text-left transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{t('nav.signOut')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
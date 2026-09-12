import { Home, BookOpen, Compass, DollarSign, Target, Settings } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';

interface BottomNavProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

export function BottomNav({ activeTab, onSelectTab }: BottomNavProps) {
  const { t } = useLanguage();
  const tabs = [
    { id: 'home', label: t('nav.home'), icon: Home },
    { id: 'study', label: t('nav.study'), icon: BookOpen },
    { id: 'islamic', label: t('nav.islamic'), icon: Compass },
    { id: 'finance', label: t('nav.finance'), icon: DollarSign },
    { id: 'goals', label: t('nav.goals'), icon: Target },
    { id: 'settings', label: t('nav.settings'), icon: Settings },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/92 dark:bg-zinc-950/92 backdrop-blur-xl border-t border-zinc-900/[0.07] dark:border-white/[0.08] px-1 flex items-stretch justify-around safe-area-bottom">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className="relative flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] py-1.5"
          >
            {active && (
              <span className="absolute top-0 h-0.5 w-8 rounded-full bg-zinc-900 dark:bg-white" />
            )}
            <Icon
              className={`w-5 h-5 transition-colors ${
                active
                  ? 'text-zinc-950 dark:text-white stroke-[2.25px]'
                  : 'text-zinc-400 dark:text-zinc-500 stroke-[1.75px]'
              }`}
            />
            <span
              className={`text-[10.5px] leading-none transition-colors ${
                active
                  ? 'text-zinc-950 dark:text-white font-semibold'
                  : 'text-zinc-400 dark:text-zinc-500 font-medium'
              }`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

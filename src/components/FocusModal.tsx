import { useState, useEffect, useRef } from 'react';
import { GlassButton, GlassCard, VedaLogo } from './ui/LiquidGlass';
import { AppState, FocusSession } from '../types';
import { sound } from '../lib/audio';
import { useLanguage } from '../lib/LanguageContext';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Minimize2,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface FocusModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  onSaveSession: (session: FocusSession) => void;
}

export function FocusModal({ isOpen, onClose, state, onSaveSession }: FocusModalProps) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<'work' | 'short_break' | 'long_break'>('work');
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [secondsRemaining, setSecondsRemaining] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedTaskTitle, setSelectedTaskTitle] = useState<string>('');
  const [startTime, setStartTime] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize time when mode changes
  useEffect(() => {
    let mins = 25;
    if (mode === 'work') mins = state.profile.preferences.pomodoroWorkMinutes || 25;
    else if (mode === 'short_break') mins = state.profile.preferences.pomodoroBreakMinutes || 5;
    else if (mode === 'long_break') mins = 15;

    setDurationMinutes(mins);
    setSecondsRemaining(mins * 60);
    setIsActive(false);
  }, [mode, state.profile.preferences]);

  // Timer Tick
  useEffect(() => {
    if (isActive) {
      if (!startTime) setStartTime(new Date().toISOString());
      timerRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleCompleteSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive]);

  function handleCompleteSession() {
    setIsActive(false);
    if (soundEnabled) {
      sound.playChime();
    }
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch (_e) {}

    const session: FocusSession = {
      id: `focus_${Date.now()}`,
      durationMinutes: durationMinutes,
      startedAt: startTime || new Date().toISOString(),
      endedAt: new Date().toISOString(),
      taskTitle: selectedTaskTitle || t('focus.deepFocusSessionDefault'),
      completed: true,
    };
    onSaveSession(session);
  }

  function handleReset() {
    setIsActive(false);
    setSecondsRemaining(durationMinutes * 60);
  }

  if (!isOpen) return null;

  const totalSeconds = durationMinutes * 60;
  const progress = totalSeconds > 0 ? ((totalSeconds - secondsRemaining) / totalSeconds) * 100 : 0;
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 dark:bg-black/70 backdrop-blur-md animate-fadeIn">
      <GlassCard
        variant="elevated"
        className="w-full max-w-md p-6 sm:p-8 relative overflow-hidden border border-black/10 dark:border-white/15 text-center"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs">
            <VedaLogo size={18} />
            <span className="font-semibold text-zinc-900 dark:text-white">{t('focus.globalFocus')}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? t('focus.chimeSoundEnabled') : t('focus.muted')}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-900/5 dark:hover:bg-white/5"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-900/5 dark:hover:bg-white/5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex justify-center mb-6">
          <div className="p-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/5 dark:border-white/5 flex items-center gap-1 text-xs">
            <button
              onClick={() => setMode('work')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                mode === 'work'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500'
              }`}
            >
              {t('focus.mode25')}
            </button>
            <button
              onClick={() => setMode('short_break')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                mode === 'short_break'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500'
              }`}
            >
              {t('focus.mode5break')}
            </button>
            <button
              onClick={() => setMode('long_break')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                mode === 'long_break'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500'
              }`}
            >
              {t('focus.mode15longbreak')}
            </button>
          </div>
        </div>

        {/* Circular Progress & Time Display */}
        <div className="relative w-48 h-48 mx-auto flex items-center justify-center mb-6">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="44"
              className="text-black/5 dark:text-white/10 stroke-current"
              strokeWidth="6"
              fill="none"
            />
            <circle
              cx="50"
              cy="50"
              r="44"
              className="text-zinc-900 dark:text-white stroke-current transition-all duration-500 ease-linear"
              strokeWidth="6"
              strokeDasharray="276.46"
              strokeDashoffset={276.46 - (276.46 * progress) / 100}
              strokeLinecap="round"
              fill="none"
            />
          </svg>

          <div className="absolute flex flex-col items-center">
            <span className="text-4xl font-extrabold tracking-tighter text-zinc-900 dark:text-white tabular-nums">
              {timeFormatted}
            </span>
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-widest mt-1">
              {mode === 'work' ? t('focus.deepWork') : t('focus.rest')}
            </span>
          </div>
        </div>

        {/* Link with Study Task */}
        {state.tasks.length > 0 && (
          <div className="mb-5 text-left">
            <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1 flex items-center gap-1.5">
              <BookOpen className="w-3 h-3" />
              {t('focus.associateTask')}
            </label>
            <select
              value={selectedTaskTitle}
              onChange={(e) => setSelectedTaskTitle(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl text-xs bg-black/[0.03] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white"
            >
              <option value="">{t('focus.generalSession')}</option>
              {state.tasks
                .filter((t) => !t.completed)
                .map((t) => (
                  <option key={t.id} value={t.title}>
                    {t.title}
                  </option>
                ))}
            </select>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          <GlassButton
            variant="ghost"
            size="md"
            onClick={handleReset}
            title={t('focus.resetTimer')}
            className="p-3"
          >
            <RotateCcw className="w-4 h-4 text-zinc-500" />
          </GlassButton>

          <GlassButton
            variant="primary"
            size="lg"
            onClick={() => setIsActive(!isActive)}
            className="px-8 shadow-lg"
          >
            {isActive ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                {t('focus.pause')}
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                {t('focus.startFocus')}
              </>
            )}
          </GlassButton>

          <GlassButton
            variant="ghost"
            size="md"
            onClick={onClose}
            title={t('focus.minimize')}
            className="p-3"
          >
            <Minimize2 className="w-4 h-4 text-zinc-500" />
          </GlassButton>
        </div>

        {/* Today's Focus Stats */}
        <div className="mt-6 pt-4 border-t border-black/5 dark:border-white/5 flex items-center justify-around text-xs text-zinc-500">
          <div>
            <span className="block text-[11px] uppercase font-semibold text-zinc-400">
              {t('focus.todaysMinutes')}
            </span>
            <span className="font-bold text-zinc-900 dark:text-white text-sm">
              {state.focusSessions.reduce((a, s) => a + s.durationMinutes, 0)} {t('focus.minAbbrev')}
            </span>
          </div>
          <div className="h-6 w-px bg-black/5 dark:bg-white/5" />
          <div>
            <span className="block text-[11px] uppercase font-semibold text-zinc-400">
              {t('focus.completedSessions')}
            </span>
            <span className="font-bold text-zinc-900 dark:text-white text-sm">
              {state.focusSessions.filter((s) => s.completed).length}
            </span>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

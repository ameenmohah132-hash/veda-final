import { useState } from 'react';
import { GlassButton, GlassCard, VedaLogo } from './ui/LiquidGlass';
import { AppState } from '../types';
import { useLanguage } from '../lib/LanguageContext';
import {
  X,
  Send,
  Sparkles,
  Compass,
  GraduationCap,
  Clock,
  DollarSign,
  Bot,
  User as UserIcon,
} from 'lucide-react';

interface AskVedaDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  onOpenPremium: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'veda';
  text: string;
  timestamp: string;
}

export function AskVedaDrawer({
  isOpen,
  onClose,
  state,
  onOpenPremium,
}: AskVedaDrawerProps) {
  const { language, t } = useLanguage();
  const [mode, setMode] = useState<'general' | 'islamic'>('general');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'veda',
      text: t('askveda.welcomeMessage'),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const quickPrompts =
    mode === 'islamic'
      ? [
          t('askveda.prompt.islamic1'),
          t('askveda.prompt.islamic2'),
          t('askveda.prompt.islamic3'),
          t('askveda.prompt.islamic4'),
        ]
      : [
          t('askveda.prompt.general1'),
          t('askveda.prompt.general2'),
          t('askveda.prompt.general3'),
          t('askveda.prompt.general4'),
        ];

  async function handleSend(promptText?: string) {
    const textToSend = promptText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/gemini/ask-veda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          mode,
          context: {
            user: state.profile.fullName,
            tier: state.profile.tier,
            tasksCount: state.tasks.length,
            focusMinutes: state.focusSessions.reduce((a, s) => a + s.durationMinutes, 0),
            expensesTotal: state.expenses.reduce((a, s) => a + s.amount, 0),
            language,
          },
        }),
      });

      const data = await response.json();
      const vedaMsg: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        sender: 'veda',
        text: data.reply || t('askveda.fallbackReply'),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, vedaMsg]);
    } catch (_err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_${Date.now() + 1}`,
          sender: 'veda',
          text: t('askveda.errorReply'),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md h-full bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border-l border-black/10 dark:border-white/10 shadow-2xl flex flex-col justify-between">
        {/* Header */}
        <div className="p-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-veda-accent dark:bg-veda-accent-dark text-white dark:text-zinc-950 flex items-center justify-center">
              <VedaLogo size={18} className="text-white dark:text-zinc-950" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{t('nav.askVeda')}</h3>
                <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-veda-accent/10 text-veda-accent dark:text-veda-accent-dark">
                  {t('askveda.aiIntelligence')}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">{t('askveda.contextGuide')}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-900/5 dark:hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="px-4 py-2 bg-black/[0.02] dark:bg-white/[0.02] border-b border-black/5 dark:border-white/5 flex items-center justify-between text-xs">
          <span className="text-zinc-400 font-medium">{t('askveda.assistantMode')}</span>
          <div className="flex gap-1 bg-black/5 dark:bg-white/5 p-0.5 rounded-lg">
            <button
              onClick={() => setMode('general')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                mode === 'general'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
              }`}
            >
              {t('askveda.lifeStudy')}
            </button>
            <button
              onClick={() => setMode('islamic')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                mode === 'islamic'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
              }`}
            >
              {t('askveda.faithWorship')}
            </button>
          </div>
        </div>

        {/* Chat History */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'veda' && (
                <div className="w-7 h-7 rounded-lg bg-veda-accent dark:bg-veda-accent-dark text-white dark:text-zinc-950 flex items-center justify-center shrink-0 mt-0.5">
                  <VedaLogo size={14} className="text-white dark:text-zinc-950" />
                </div>
              )}
              <div
                className={`max-w-[82%] p-3 rounded-2xl text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-tr-xs'
                    : 'bg-black/[0.04] dark:bg-white/[0.06] text-zinc-900 dark:text-zinc-100 rounded-tl-xs border border-black/5 dark:border-white/5'
                }`}
              >
                <p className="whitespace-pre-wrap">{m.text}</p>
                <span className="block text-[11px] mt-1.5 opacity-50 text-right">
                  {m.timestamp}
                </span>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-zinc-400 p-2">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              <span>{t('askveda.reflecting')}</span>
            </div>
          )}
        </div>

        {/* Quick Prompts */}
        <div className="px-4 py-2 border-t border-black/5 dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.01]">
          <p className="text-[11px] uppercase font-semibold text-zinc-400 mb-1.5">
            {t('askveda.suggestedPrompts')}
          </p>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {quickPrompts.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 text-[11px] transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3 border-t border-black/5 dark:border-white/5 flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              mode === 'islamic'
                ? t('askveda.placeholderIslamic')
                : t('askveda.placeholderGeneral')
            }
            className="flex-1 px-3 py-2 text-xs rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
          />
          <GlassButton
            type="submit"
            variant="accent"
            size="sm"
            disabled={!input.trim() || loading}
            className="shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </GlassButton>
        </form>
      </div>
    </div>
  );
}

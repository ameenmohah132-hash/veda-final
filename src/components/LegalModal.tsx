import { GlassCard } from './ui/LiquidGlass';
import { PRIVACY_POLICY_SECTIONS, LEGAL_LAST_UPDATED } from '../legal/privacyPolicyContent';
import { TERMS_OF_SERVICE_SECTIONS } from '../legal/termsContent';
import { X, Scale, ShieldCheck } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: 'terms' | 'privacy';
}

export function LegalModal({ isOpen, onClose, document }: LegalModalProps) {
  if (!isOpen) return null;

  const isTerms = document === 'terms';
  const sections = isTerms ? TERMS_OF_SERVICE_SECTIONS : PRIVACY_POLICY_SECTIONS;
  const title = isTerms ? 'Terms of Service' : 'Privacy Policy';
  const Icon = isTerms ? Scale : ShieldCheck;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-md animate-fadeIn">
      <GlassCard
        variant="elevated"
        className="w-full sm:max-w-2xl max-h-[88vh] sm:max-h-[80vh] rounded-t-3xl sm:rounded-3xl flex flex-col border border-black/10 dark:border-white/15"
      >
        <div className="flex items-center justify-between p-5 border-b border-black/5 dark:border-white/5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-zinc-900/[0.06] dark:bg-white/[0.08] text-zinc-700 dark:text-zinc-200 flex items-center justify-center">
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white">{title}</h2>
              <p className="text-[11px] text-zinc-400">Last updated {LEGAL_LAST_UPDATED}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-900/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 sm:p-6 space-y-5">
          {sections.map((section) => (
            <div key={section.heading}>
              <h3 className="text-xs font-bold text-zinc-900 dark:text-white mb-1.5">{section.heading}</h3>
              {section.body.map((para, i) => (
                <p key={i} className="text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-300 mb-2">
                  {para}
                </p>
              ))}
            </div>
          ))}
          <p className="text-[11px] text-zinc-400 pt-2 border-t border-black/5 dark:border-white/5">
            This document is a general template and does not constitute legal advice. Bracketed placeholders (e.g.
            [Legal Entity Name], [Support Email]) should be completed, and this document reviewed by a qualified
            lawyer, before relying on it.
          </p>
        </div>
      </GlassCard>
    </div>
  );
}

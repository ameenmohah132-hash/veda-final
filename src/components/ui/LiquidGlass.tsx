import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'subtle' | 'elevated' | 'sunken' | 'accent';
  hoverEffect?: boolean;
}

export function GlassCard({
  children,
  className = '',
  variant = 'subtle',
  hoverEffect = false,
  ...props
}: GlassCardProps) {
  // Blur is used deliberately and sparingly -- heavy backdrop-blur on every
  // nested card is what makes an interface read as an AI template. Cards
  // now lean on a solid-enough fill + a precise hairline + a soft shadow
  // for depth, reserving stronger blur for fixed chrome (nav bars, sheets).
  const variantStyles = {
    subtle:
      'bg-white/90 dark:bg-zinc-900/80 backdrop-blur-sm border border-zinc-900/[0.07] dark:border-white/[0.08] shadow-[0_1px_2px_rgb(0,0,0,0.04)] dark:shadow-[0_1px_2px_rgb(0,0,0,0.3)]',
    elevated:
      'bg-white dark:bg-zinc-900 backdrop-blur-sm border border-zinc-900/[0.08] dark:border-white/[0.1] shadow-[0_8px_24px_-4px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_24px_-4px_rgb(0,0,0,0.5)]',
    sunken:
      'bg-zinc-100/80 dark:bg-black/30 border border-zinc-900/[0.04] dark:border-white/[0.05]',
    accent:
      'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-lg shadow-zinc-900/10 dark:shadow-black/30',
  };

  const hoverClass = hoverEffect
    ? 'transition-all duration-200 hover:border-zinc-900/15 dark:hover:border-white/20 hover:shadow-[0_12px_28px_-6px_rgb(0,0,0,0.1)] dark:hover:shadow-[0_12px_28px_-6px_rgb(0,0,0,0.55)] active:scale-[0.995]'
    : '';

  return (
    <div
      className={`rounded-2xl ${variantStyles[variant]} ${hoverClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'glass' | 'danger' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function GlassButton({
  variant = 'glass',
  size = 'md',
  children,
  className = '',
  ...props
}: GlassButtonProps) {
  const base =
    'inline-flex items-center justify-center font-semibold transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none rounded-xl active:scale-[0.97]';

  // sm/md are still comfortably tappable (>=36px) for icon-only contexts;
  // anything meant as a primary mobile tap target should add `tap-target`.
  const sizes = {
    sm: 'px-3 py-2 text-[13px] gap-1.5 min-h-[36px]',
    md: 'px-4 py-2.5 text-sm gap-2 min-h-[40px]',
    lg: 'px-5 py-3 text-[15px] gap-2.5 min-h-[48px]',
  };

  const variants = {
    primary:
      'bg-zinc-900 hover:bg-black text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 shadow-sm shadow-black/10 dark:shadow-black/40',
    secondary:
      'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100',
    ghost:
      'bg-transparent hover:bg-zinc-900/5 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300',
    glass:
      'bg-white dark:bg-zinc-900 border border-zinc-900/10 dark:border-white/12 text-zinc-900 dark:text-zinc-100 hover:border-zinc-900/20 dark:hover:border-white/20 hover:bg-zinc-50 dark:hover:bg-zinc-800 shadow-sm',
    // Reserved for AI-adjacent actions (Ask Veda, generate, etc.) so those
    // moments carry the brand accent instead of blending into neutral UI.
    accent:
      'bg-veda-accent hover:bg-indigo-700 dark:bg-veda-accent-dark dark:hover:bg-indigo-300 text-white dark:text-zinc-950 shadow-sm shadow-indigo-600/25',
    danger:
      'bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20',
  };

  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function VedaLogo({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <div className={`relative flex items-center justify-center select-none shrink-0 ${className}`} style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Official Veda 3-Pill Emblem */}
        <line x1="27" y1="23" x2="45" y2="61" stroke="currentColor" strokeWidth="15.5" strokeLinecap="round" />
        <line x1="73" y1="23" x2="56" y2="58" stroke="currentColor" strokeWidth="15.5" strokeLinecap="round" />
        <line x1="39" y1="76" x2="66" y2="70" stroke="currentColor" strokeWidth="14" strokeLinecap="round" />
      </svg>
    </div>
  );
}

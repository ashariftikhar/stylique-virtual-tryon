import { classNameMerge } from '@/lib/utils';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Loader2,
  LucideIcon,
} from 'lucide-react';
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg';

const buttonVariants: Record<Variant, string> = {
  primary:
    'border-transparent bg-white text-black shadow-[0_16px_34px_rgba(255,255,255,0.08)] hover:bg-zinc-200',
  secondary:
    'border-white/10 bg-zinc-900/80 text-zinc-100 hover:border-white/20 hover:bg-zinc-800',
  ghost:
    'border-transparent bg-transparent text-zinc-400 hover:bg-white/[0.06] hover:text-white',
  danger:
    'border-red-500/25 bg-red-950/40 text-red-200 hover:border-red-400/40 hover:bg-red-900/40',
  success:
    'border-emerald-500/25 bg-emerald-950/40 text-emerald-200 hover:border-emerald-400/40 hover:bg-emerald-900/40',
};

const buttonSizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-sm',
};

export function Button({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  isLoading = false,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
}) {
  return (
    <button
      className={classNameMerge(
        'inline-flex items-center justify-center gap-2 rounded-lg border font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-white/25',
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={classNameMerge(
        'h-11 w-full rounded-lg border border-white/10 bg-black/35 px-3 text-sm text-white placeholder:text-zinc-600 transition focus:border-white/25 focus:outline-none focus:ring-2 focus:ring-white/10 disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className = '',
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={classNameMerge(
        'w-full rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-sm text-white placeholder:text-zinc-600 transition focus:border-white/25 focus:outline-none focus:ring-2 focus:ring-white/10 disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  );
}

export function Card({
  children,
  className = '',
  ...props
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={classNameMerge(
        'rounded-lg border border-white/10 bg-zinc-950/70 p-5 shadow-[0_22px_60px_rgba(0,0,0,0.28)]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'danger'
  | 'warning'
  | 'teal'
  | 'muted';

const badgeVariants: Record<BadgeVariant, string> = {
  default: 'border-white/10 bg-white/[0.06] text-zinc-300',
  primary: 'border-fuchsia-400/25 bg-fuchsia-500/10 text-fuchsia-200',
  success: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200',
  danger: 'border-red-400/25 bg-red-500/10 text-red-200',
  warning: 'border-amber-400/25 bg-amber-500/10 text-amber-200',
  teal: 'border-teal-400/25 bg-teal-500/10 text-teal-200',
  muted: 'border-white/10 bg-zinc-900/70 text-zinc-500',
};

export function Badge({
  children,
  variant = 'default',
  className = '',
}: {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={classNameMerge(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]',
        badgeVariants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className = '',
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={classNameMerge(
        'flex flex-col gap-4 border-b border-white/10 pb-6 md:flex-row md:items-end md:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#ff8ab0]">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-black tracking-tight text-white md:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  accent = 'white',
  trend,
  className = '',
}: {
  label: string;
  value: ReactNode;
  detail?: string;
  icon?: LucideIcon;
  accent?: 'white' | 'teal' | 'rose' | 'amber' | 'emerald';
  trend?: string;
  className?: string;
}) {
  const accents = {
    white: 'text-white bg-white/10 border-white/10',
    teal: 'text-teal-200 bg-teal-500/10 border-teal-400/20',
    rose: 'text-rose-200 bg-rose-500/10 border-rose-400/20',
    amber: 'text-amber-200 bg-amber-500/10 border-amber-400/20',
    emerald: 'text-emerald-200 bg-emerald-500/10 border-emerald-400/20',
  };

  return (
    <Card className={classNameMerge('relative overflow-hidden p-5', className)}>
      <div className="absolute right-0 top-0 h-24 w-24 bg-white/[0.035] blur-2xl" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">{label}</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-white">{value}</p>
          {detail && <p className="mt-2 text-xs leading-5 text-zinc-500">{detail}</p>}
          {trend && (
            <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-teal-300">
              <ArrowUpRight className="h-3.5 w-3.5" />
              {trend}
            </p>
          )}
        </div>
        {Icon && (
          <div className={classNameMerge('rounded-lg border p-2.5', accents[accent])}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </Card>
  );
}

export function AlertBanner({
  tone = 'warning',
  title,
  children,
  action,
  className = '',
}: {
  tone?: 'warning' | 'success' | 'danger' | 'info';
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const styles = {
    warning: 'border-amber-400/25 bg-amber-500/10 text-amber-100',
    success: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100',
    danger: 'border-red-400/25 bg-red-500/10 text-red-100',
    info: 'border-teal-400/25 bg-teal-500/10 text-teal-100',
  };
  const Icon = tone === 'success' ? CheckCircle2 : AlertTriangle;

  return (
    <div className={classNameMerge('rounded-lg border p-4', styles[tone], className)}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{title}</p>
          {children && <div className="mt-1 text-sm leading-6 opacity-80">{children}</div>}
          {action && <div className="mt-3 flex flex-wrap gap-2">{action}</div>}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={classNameMerge('flex min-h-64 flex-col items-center justify-center text-center', className)}>
      <div className="mb-4 rounded-lg border border-white/10 bg-white/[0.04] p-3 text-zinc-400">
        <Icon className="h-7 w-7" />
      </div>
      <p className="text-base font-bold text-white">{title}</p>
      {description && <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={classNameMerge('animate-pulse rounded-lg bg-white/[0.07]', className)} />;
}

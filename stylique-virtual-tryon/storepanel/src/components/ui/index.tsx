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
    'border-transparent bg-[#161616] text-[#161616] shadow-[0_14px_30px_rgba(22,22,22,0.14)] hover:bg-[#2b3431]',
  secondary:
    'border-[#161616]/10 bg-white text-[#161616] shadow-[0_10px_24px_rgba(22,22,22,0.06)] hover:border-[#161616]/18 hover:bg-[#f2f6f4]',
  ghost:
    'border-transparent bg-transparent text-[#66736f] hover:bg-[#edf4f1] hover:text-[#161616]',
  danger:
    'border-red-500/20 bg-red-50 text-red-700 hover:border-red-500/30 hover:bg-red-100',
  success:
    'border-emerald-500/20 bg-emerald-50 text-emerald-700 hover:border-emerald-500/30 hover:bg-emerald-100',
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
        'inline-flex items-center justify-center gap-2 rounded-lg border font-semibold transition duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#0f9f91]/18',
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
        'h-11 w-full rounded-lg border border-[#161616]/10 bg-white px-3 text-sm text-[#161616] placeholder:text-[#8a9692] shadow-[0_8px_18px_rgba(22,22,22,0.04)] transition duration-200 focus:border-[#0f9f91]/45 focus:outline-none focus:ring-2 focus:ring-[#0f9f91]/12 disabled:cursor-not-allowed disabled:opacity-60',
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
        'w-full rounded-lg border border-[#161616]/10 bg-white px-3 py-3 text-sm text-[#161616] placeholder:text-[#8a9692] shadow-[0_8px_18px_rgba(22,22,22,0.04)] transition duration-200 focus:border-[#0f9f91]/45 focus:outline-none focus:ring-2 focus:ring-[#0f9f91]/12 disabled:cursor-not-allowed disabled:opacity-60',
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
        'rounded-lg border border-[#161616]/10 bg-white p-5 shadow-[0_18px_44px_rgba(22,22,22,0.07)]',
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
  default: 'border-[#161616]/10 bg-[#f2f6f4] text-[#4f5d58]',
  primary: 'border-[#e84d78]/20 bg-[#e84d78]/10 text-[#b92e58]',
  success: 'border-emerald-500/20 bg-emerald-50 text-emerald-700',
  danger: 'border-red-500/20 bg-red-50 text-red-700',
  warning: 'border-amber-500/22 bg-amber-50 text-amber-700',
  teal: 'border-[#0f9f91]/20 bg-[#0f9f91]/10 text-[#08786e]',
  muted: 'border-[#161616]/10 bg-[#f5f8f6] text-[#66736f]',
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
        'flex flex-col gap-4 border-b border-[#161616]/10 pb-6 md:flex-row md:items-end md:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#e84d78]">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-black tracking-tight text-[#161616] md:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-[#66736f]">{description}</p>}
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
    white: 'text-[#161616] bg-[#f2f6f4] border-[#161616]/10',
    teal: 'text-[#08786e] bg-[#0f9f91]/10 border-[#0f9f91]/20',
    rose: 'text-[#b92e58] bg-[#e84d78]/10 border-[#e84d78]/20',
    amber: 'text-amber-700 bg-amber-50 border-amber-500/20',
    emerald: 'text-emerald-700 bg-emerald-50 border-emerald-500/20',
  };

  return (
    <Card className={classNameMerge('relative overflow-hidden p-5', className)}>
      <div className="absolute right-0 top-0 h-24 w-24 bg-[#0f9f91]/5 blur-2xl" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#66736f]">{label}</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-[#161616]">{value}</p>
          {detail && <p className="mt-2 text-xs leading-5 text-[#66736f]">{detail}</p>}
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
    warning: 'border-amber-500/20 bg-amber-50 text-amber-800',
    success: 'border-emerald-500/20 bg-emerald-50 text-emerald-800',
    danger: 'border-red-500/20 bg-red-50 text-red-800',
    info: 'border-[#0f9f91]/20 bg-[#0f9f91]/10 text-[#08786e]',
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
      <div className="mb-4 rounded-lg border border-[#161616]/10 bg-[#f2f6f4] p-3 text-[#66736f]">
        <Icon className="h-7 w-7" />
      </div>
      <p className="text-base font-bold text-[#161616]">{title}</p>
      {description && <p className="mt-2 max-w-md text-sm leading-6 text-[#66736f]">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={classNameMerge('animate-pulse rounded-lg bg-[#e7efeb]', className)} />;
}

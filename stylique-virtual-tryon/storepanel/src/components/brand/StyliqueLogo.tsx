import { classNameMerge } from '@/lib/utils';

type StyliqueLogoProps = {
  compact?: boolean;
  className?: string;
  markClassName?: string;
  label?: string;
};

export function StyliqueMark({ className = '' }: { className?: string }) {
  return (
    <div
      className={classNameMerge(
        'relative grid h-9 w-9 place-items-center overflow-hidden rounded-lg border border-white/15 bg-[#f7f3ed] shadow-[0_18px_45px_rgba(0,0,0,0.3)]',
        className,
      )}
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_22%,rgba(255,92,138,0.34),transparent_34%),radial-gradient(circle_at_78%_74%,rgba(20,184,166,0.22),transparent_38%)]" />
      <div className="absolute inset-[5px] rounded-md border border-black/10" />
      <span className="relative text-[19px] font-black leading-none tracking-[0.02em] text-[#111111]">
        S
      </span>
      <span className="absolute bottom-1 left-1 h-1 w-1 rounded-full bg-[#ff5c8a]" />
      <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[#14b8a6]" />
    </div>
  );
}

export function StyliqueLogo({
  compact = false,
  className = '',
  markClassName = '',
  label = 'Store Atelier',
}: StyliqueLogoProps) {
  return (
    <div className={classNameMerge('flex items-center gap-3', className)} aria-label="Stylique">
      <StyliqueMark className={markClassName} />
      {!compact && (
        <div className="min-w-0">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-white">Stylique</p>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
            {label}
          </p>
        </div>
      )}
    </div>
  );
}

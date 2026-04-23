import Image from 'next/image';
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
        'relative grid h-9 w-9 place-items-center overflow-hidden rounded-lg border border-[#161616]/10 bg-white shadow-[0_14px_34px_rgba(22,22,22,0.12)]',
        className,
      )}
      aria-hidden="true"
    >
      <Image
        src="/stylique-logo.png"
        alt=""
        fill
        sizes="36px"
        className="object-contain p-[2px]"
      />
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
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#161616]">Stylique</p>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#66736f]">
            {label}
          </p>
        </div>
      )}
    </div>
  );
}

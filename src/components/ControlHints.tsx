import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react'
import type { ReactNode } from 'react'

const cap = 'grid h-6 w-6 place-items-center rounded-lg bg-[#122d45] text-white shadow-[0_2px_0_rgba(18,45,69,0.35)] sm:h-7 sm:w-7'

function Hint({ keys, label }: { keys: ReactNode[]; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex gap-1">
        {keys.map((icon, i) => (
          <span key={i} className={cap}>
            {icon}
          </span>
        ))}
      </div>
      <p className="text-center text-[9px] font-semibold uppercase leading-tight tracking-[0.08em] text-[#334155] sm:text-[10px]">{label}</p>
    </div>
  )
}

/** Compact floating control reference, docked to the right edge and kept clear of the track. */
export function ControlHints() {
  return (
    <div
      aria-label="Controls"
      className="pointer-events-none absolute right-2 top-[128px] z-10 sm:right-4 md:top-1/2 md:-translate-y-1/2"
      style={{ marginRight: 'env(safe-area-inset-right)' }}
    >
      <div className="flex w-[84px] flex-col gap-2.5 rounded-2xl border border-white/70 bg-white/60 p-2 opacity-90 shadow-[0_8px_28px_rgba(18,45,69,0.14)] backdrop-blur-md sm:w-[96px] sm:p-2.5">
        <Hint keys={[<ArrowLeft key="l" size={14} strokeWidth={2.6} />, <ArrowRight key="r" size={14} strokeWidth={2.6} />]} label="Switch lane" />
        <div className="h-px bg-[#122d45]/10" />
        <Hint keys={[<ArrowUp key="u" size={14} strokeWidth={2.6} />]} label="Jump" />
        <div className="h-px bg-[#122d45]/10" />
        <Hint keys={[<ArrowDown key="d" size={14} strokeWidth={2.6} />]} label="Slide" />
      </div>
    </div>
  )
}

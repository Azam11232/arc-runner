import { motion } from 'framer-motion'
import { Pause, Volume2, VolumeX } from 'lucide-react'
import type { HudSnapshot } from '@/game/constants'
import { CoinIcon } from './Icons'

interface HudProps {
  hud: HudSnapshot
  best: number
  muted: boolean
  onPause: () => void
  onToggleMute: () => void
}

const fmt = (n: number) => n.toLocaleString('en-US')

const glass =
  'bg-white/75 backdrop-blur-md border border-white/70 shadow-[0_8px_28px_rgba(18,45,69,0.14)]'

export function Hud({ hud, best, muted, onPause, onToggleMute }: HudProps) {
  const shownBest = Math.max(best, hud.score)
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 px-3 sm:px-5"
      style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
    >
      <div className={`${glass} rounded-3xl px-4 py-2.5 sm:px-5 sm:py-3`}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6b6580]">Score</p>
        <p className="display text-3xl font-bold leading-none tabular-nums text-[#122d45] sm:text-4xl">{fmt(hud.score)}</p>
        <p className="mt-1.5 text-[11px] font-medium tabular-nums text-[#6b6580]">Best {fmt(shownBest)}</p>
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className={`${glass} flex items-center gap-2 rounded-full py-1.5 pl-2 pr-4`}>
          <CoinIcon size={26} />
          <motion.span
            key={hud.coins}
            initial={{ scale: 1.35 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 18 }}
            className="display min-w-[1.5ch] text-xl font-bold tabular-nums text-[#122d45]"
          >
            {fmt(hud.coins)}
          </motion.span>
        </div>
        <div className={`${glass} rounded-full px-3.5 py-1 text-xs font-semibold tabular-nums text-[#334155]`}>
          {fmt(hud.distance)} m
        </div>
      </div>

      <div className="pointer-events-auto flex flex-col gap-2">
        <button
          type="button"
          onClick={onPause}
          aria-label="Pause"
          className={`${glass} grid h-11 w-11 place-items-center rounded-full text-[#122d45] transition active:scale-95 hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#85b1ed]`}
        >
          <Pause size={20} strokeWidth={2.4} />
        </button>
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? 'Unmute' : 'Mute'}
          className={`${glass} grid h-11 w-11 place-items-center rounded-full text-[#122d45] transition active:scale-95 hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#85b1ed]`}
        >
          {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
        </button>
      </div>
    </div>
  )
}

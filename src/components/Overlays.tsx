import { AnimatePresence, motion } from 'framer-motion'
import { Home, Pause, Play, RotateCcw, Trophy, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { FinishedRun } from '@/game/useGame'
import { ArcMark, CoinIcon } from './Icons'

const fmt = (n: number) => n.toLocaleString('en-US')

const panel =
  'pointer-events-auto w-full max-w-sm rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_24px_70px_rgba(18,45,69,0.26)] backdrop-blur-xl sm:p-6'
const primaryBtn =
  'flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#122d45] text-base font-semibold text-white shadow-[0_10px_24px_rgba(18,45,69,0.3)] transition hover:bg-[#1061a6] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#85b1ed]'
const ghostBtn =
  'flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-[#122d45]/12 bg-white/70 text-sm font-semibold text-[#122d45] transition hover:bg-white active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#85b1ed]'

export function MainMenu({ best, lifetimeCoins, onPlay }: { best: number; lifetimeCoins: number; onPlay: () => void }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 flex flex-col items-center justify-between px-4"
      style={{ paddingTop: 'max(28px, env(safe-area-inset-top))', paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
    >
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 22 }} className="text-center">
        <div className="mx-auto mb-3 flex w-fit items-center gap-2 rounded-full border border-white/70 bg-white/70 py-1 pl-1 pr-3 backdrop-blur-md">
          <ArcMark size={24} />
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#334155]">Arc Network</span>
        </div>
        <h1 className="display text-balance text-5xl font-bold leading-[0.95] text-[#122d45] drop-shadow-[0_2px_0_rgba(255,255,255,0.8)] sm:text-7xl">
          ARC
          <br />
          <span className="bg-gradient-to-r from-[#1061a6] via-[#2a73ff] to-[#35c8ee] bg-clip-text text-transparent">RUNNER</span>
        </h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 24, delay: 0.1 }}
        className={panel}
      >
        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-[#f5f5f8]/90 px-3.5 py-2.5">
            <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6b6580]">
              <Trophy size={12} /> Best score
            </p>
            <p className="display text-2xl font-bold tabular-nums text-[#122d45]">{fmt(best)}</p>
          </div>
          <div className="rounded-2xl bg-[#f5f5f8]/90 px-3.5 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6b6580]">Coins banked</p>
            <p className="display flex items-center gap-1.5 text-2xl font-bold tabular-nums text-[#122d45]">
              <CoinIcon size={20} />
              {fmt(lifetimeCoins)}
            </p>
          </div>
        </div>
        <button type="button" onClick={onPlay} className={primaryBtn} autoFocus>
          <Play size={20} fill="currentColor" /> Play
        </button>
        <p className="mt-3 text-center text-xs text-[#6b6580] text-pretty">On touch screens, swipe anywhere. Press P to pause, R to restart.</p>
      </motion.div>
    </div>
  )
}

export function Countdown({ value }: { value: number | null }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
      <AnimatePresence mode="wait">
        {value !== null && (
          <motion.div
            key={value}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.6, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 20 }}
            className="display text-[120px] font-bold leading-none text-white drop-shadow-[0_6px_0_#1061a6] sm:text-[160px]"
          >
            {value === 0 ? 'GO' : value}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface PauseProps {
  muted: boolean
  onResume: () => void
  onRestart: () => void
  onMenu: () => void
  onToggleMute: () => void
}

export function PauseMenu({ muted, onResume, onRestart, onMenu, onToggleMute }: PauseProps) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex items-center justify-center bg-[#122d45]/35 px-4 backdrop-blur-[3px]">
      <motion.div initial={{ scale: 0.94, y: 12 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }} className={panel}>
        <div className="mb-4 flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#122d45] text-white">
            <Pause size={18} />
          </div>
          <h2 className="display text-2xl font-bold text-[#122d45]">Paused</h2>
        </div>
        <button type="button" onClick={onResume} className={primaryBtn} autoFocus>
          <Play size={20} fill="currentColor" /> Resume
        </button>
        <div className="mt-2.5 flex gap-2.5">
          <button type="button" onClick={onRestart} className={ghostBtn}>
            <RotateCcw size={16} /> Restart
          </button>
          <button type="button" onClick={onMenu} className={ghostBtn}>
            <Home size={16} /> Menu
          </button>
          <button type="button" onClick={onToggleMute} className={`${ghostBtn} !flex-none w-12`} aria-label={muted ? 'Unmute' : 'Mute'}>
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

interface GameOverProps {
  run: FinishedRun
  best: number
  onRestart: () => void
  onMenu: () => void
  onPortraitCanvas: (canvas: HTMLCanvasElement | null) => void
}

export function GameOver({ run, best, onRestart, onMenu, onPortraitCanvas }: GameOverProps) {
  const portrait = useRef<HTMLCanvasElement>(null)

  // The 3D canvas draws the defeated runner into this small canvas inside the card.
  useEffect(() => {
    onPortraitCanvas(portrait.current)
    return () => onPortraitCanvas(null)
  }, [onPortraitCanvas])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 flex items-center justify-center px-4"
    >
      <motion.div initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }} className={panel}>
        <div className="h-1 w-full rounded-full bg-gradient-to-r from-[#85b1ed] via-[#2a73ff] to-[#59e6ff]" />
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6b6580]">Run over</p>
            <p className="display mt-1 truncate text-5xl font-bold leading-none tabular-nums text-[#122d45] sm:text-6xl">{fmt(run.score)}</p>
            {run.isBest ? (
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#1a8047]/12 px-2.5 py-1 text-xs font-semibold text-[#1a8047]">
                <Trophy size={13} /> New best
              </span>
            ) : (
              <p className="mt-2 text-sm tabular-nums text-[#6b6580]">Best {fmt(best)}</p>
            )}
          </div>
          <div className="relative h-[118px] w-[118px] shrink-0 overflow-hidden rounded-3xl bg-gradient-to-b from-[#eef4fc] to-[#d9e6f8] ring-1 ring-white/80 sm:h-[136px] sm:w-[136px]">
            <canvas ref={portrait} aria-hidden="true" className="h-full w-full" />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <Stat label="Distance" value={`${fmt(run.distance)} m`} />
          <Stat label="Coins" value={fmt(run.coins)} icon />
          <Stat label="Time" value={`${Math.floor(run.seconds)}s`} />
        </div>

        <button type="button" onClick={onRestart} className={`${primaryBtn} mt-5`} autoFocus>
          <RotateCcw size={19} /> Run again
        </button>
        <div className="mt-2.5 flex">
          <button type="button" onClick={onMenu} className={ghostBtn}>
            <Home size={16} /> Main menu
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: boolean }) {
  return (
    <div className="rounded-2xl bg-[#f5f5f8]/90 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6b6580]">{label}</p>
      <p className="display mt-0.5 flex items-center gap-1 text-lg font-bold tabular-nums text-[#122d45]">
        {icon && <CoinIcon size={16} />}
        {value}
      </p>
    </div>
  )
}

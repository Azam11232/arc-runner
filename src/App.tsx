import { AnimatePresence } from 'framer-motion'
import { ControlHints } from '@/components/ControlHints'
import { Hud } from '@/components/Hud'
import { Countdown, GameOver, MainMenu, PauseMenu } from '@/components/Overlays'
import { useGame } from '@/game/useGame'

export default function App() {
  const { hostRef, state, hud, countdown, finished, best, lifetimeCoins, muted, error, start, pause, resume, toMenu, toggleMute, setPortraitCanvas } = useGame()
  const inRun = state === 'playing' || state === 'countdown' || state === 'paused' || state === 'dying'

  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#dfeeff]">
      <div ref={hostRef} className="absolute inset-0 touch-none" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 42%, rgba(255,255,255,0) 52%, rgba(18,45,69,0.2) 100%), linear-gradient(180deg, rgba(255,244,220,0.08) 0%, rgba(255,255,255,0) 35%, rgba(42,115,255,0.06) 100%)',
        }}
      />

      {error && (
        <div className="absolute inset-0 grid place-items-center bg-white/90 p-6 text-center">
          <div className="max-w-sm">
            <h2 className="display text-2xl font-bold text-[#122d45]">3D graphics unavailable</h2>
            <p className="mt-2 text-sm text-[#6b6580] text-pretty">
              Arc Runner needs WebGL. Enable hardware acceleration in your browser and refresh. ({error})
            </p>
          </div>
        </div>
      )}

      {inRun && (
        <Hud hud={hud} best={best} muted={muted} onPause={pause} onToggleMute={toggleMute} />
      )}

      {state !== 'over' && !error && <ControlHints />}

      {state === 'menu' && !error && <MainMenu best={best} lifetimeCoins={lifetimeCoins} onPlay={start} />}
      {state === 'countdown' && <Countdown value={countdown} />}
      {state === 'playing' && countdown === 0 && <Countdown value={countdown} />}

      <AnimatePresence>
        {state === 'paused' && (
          <PauseMenu key="pause" muted={muted} onResume={resume} onRestart={start} onMenu={toMenu} onToggleMute={toggleMute} />
        )}
        {state === 'over' && finished && <GameOver key="over" run={finished} best={best} onRestart={start} onMenu={toMenu} onPortraitCanvas={setPortraitCanvas} />}
      </AnimatePresence>
    </div>
  )
}

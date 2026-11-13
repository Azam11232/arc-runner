import { useCallback, useEffect, useRef, useState } from 'react'
import { GameEngine } from './engine'
import { HIGH_SCORE_KEY, type GameState, type HudSnapshot, type RunResult, STATS_KEY } from './constants'

const MUTE_KEY = 'arc-runner:muted'

function readNumber(key: string) {
  try {
    const raw = window.localStorage.getItem(key)
    const n = raw ? Number(raw) : 0
    return Number.isFinite(n) ? n : 0
  } catch {
    return 0
  }
}

function writeValue(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Storage can be unavailable (private mode); the run still works.
  }
}

export interface FinishedRun extends RunResult {
  isBest: boolean
}

const EMPTY_HUD: HudSnapshot = { score: 0, distance: 0, coins: 0, speed: 0 }

export function useGame() {
  const hostRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<GameEngine | null>(null)
  const bestRef = useRef(0)
  const mutedRef = useRef(false)

  const [state, setState] = useState<GameState>('menu')
  const [hud, setHud] = useState<HudSnapshot>(EMPTY_HUD)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [finished, setFinished] = useState<FinishedRun | null>(null)
  const [best, setBest] = useState(() => readNumber(HIGH_SCORE_KEY))
  const [lifetimeCoins, setLifetimeCoins] = useState(() => readNumber(STATS_KEY))
  const [muted, setMuted] = useState(() => readNumber(MUTE_KEY) === 1)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    bestRef.current = readNumber(HIGH_SCORE_KEY)
    mutedRef.current = readNumber(MUTE_KEY) === 1
    let engine: GameEngine
    try {
      engine = new GameEngine(host, {
        onState: setState,
        onHud: setHud,
        onCountdown: setCountdown,
        onGameOver: (result) => {
          const isBest = result.score > bestRef.current
          if (isBest) {
            bestRef.current = result.score
            writeValue(HIGH_SCORE_KEY, String(result.score))
            setBest(result.score)
          }
          const total = readNumber(STATS_KEY) + result.coins
          writeValue(STATS_KEY, String(total))
          setLifetimeCoins(total)
          setFinished({ ...result, isBest })
        },
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unable to start the 3D renderer.'
      queueMicrotask(() => setError(message))
      return
    }
    engine.setMuted(mutedRef.current)
    engineRef.current = engine
    return () => {
      engine.dispose()
      engineRef.current = null
    }
  }, [])

  const start = useCallback(() => {
    setFinished(null)
    engineRef.current?.startRun()
  }, [])
  const pause = useCallback(() => engineRef.current?.pause(), [])
  const resume = useCallback(() => engineRef.current?.resume(), [])
  const toMenu = useCallback(() => {
    setFinished(null)
    engineRef.current?.toMenu()
  }, [])
  const setPortraitCanvas = useCallback((canvas: HTMLCanvasElement | null) => engineRef.current?.setPortraitCanvas(canvas), [])
  const toggleMute = useCallback(() => {
    const next = !mutedRef.current
    mutedRef.current = next
    writeValue(MUTE_KEY, next ? '1' : '0')
    setMuted(next)
    engineRef.current?.setMuted(next)
  }, [])

  return { hostRef, state, hud, countdown, finished, best, lifetimeCoins, muted, error, start, pause, resume, toMenu, toggleMute, setPortraitCanvas }
}

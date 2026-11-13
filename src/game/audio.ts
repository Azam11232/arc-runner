type Tone = { freq: number; end?: number; dur: number; type?: OscillatorType; gain?: number; delay?: number }

export class GameAudio {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  muted = false

  private ensure() {
    if (this.ctx) return this.ctx
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    this.ctx = new Ctor()
    this.master = this.ctx.createGain()
    this.master.gain.value = 0.28
    this.master.connect(this.ctx.destination)
    return this.ctx
  }

  unlock() {
    const ctx = this.ensure()
    if (ctx && ctx.state === 'suspended') void ctx.resume()
  }

  private play(tones: Tone[]) {
    if (this.muted) return
    const ctx = this.ensure()
    if (!ctx || !this.master || ctx.state !== 'running') return
    const now = ctx.currentTime
    for (const t of tones) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const start = now + (t.delay ?? 0)
      osc.type = t.type ?? 'sine'
      osc.frequency.setValueAtTime(t.freq, start)
      if (t.end) osc.frequency.exponentialRampToValueAtTime(t.end, start + t.dur)
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(t.gain ?? 0.5, start + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + t.dur)
      osc.connect(gain)
      gain.connect(this.master)
      osc.start(start)
      osc.stop(start + t.dur + 0.02)
    }
  }

  coin(combo: number) {
    const base = 880 * Math.pow(1.0595, Math.min(combo, 12))
    this.play([
      { freq: base, dur: 0.09, type: 'triangle', gain: 0.4 },
      { freq: base * 1.5, dur: 0.14, type: 'sine', gain: 0.3, delay: 0.05 },
    ])
  }

  jump() {
    this.play([{ freq: 320, end: 640, dur: 0.16, type: 'sine', gain: 0.35 }])
  }

  slide() {
    this.play([{ freq: 520, end: 180, dur: 0.22, type: 'sawtooth', gain: 0.12 }])
  }

  switchLane() {
    this.play([{ freq: 260, end: 360, dur: 0.07, type: 'triangle', gain: 0.16 }])
  }

  crash() {
    this.play([
      { freq: 160, end: 40, dur: 0.5, type: 'sawtooth', gain: 0.5 },
      { freq: 90, end: 30, dur: 0.6, type: 'square', gain: 0.25 },
    ])
  }

  tick() {
    this.play([{ freq: 660, dur: 0.1, type: 'sine', gain: 0.3 }])
  }

  go() {
    this.play([{ freq: 990, dur: 0.22, type: 'triangle', gain: 0.35 }])
  }
}

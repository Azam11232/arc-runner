import * as THREE from 'three'

export function makeCanvas(w: number, h: number) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas is not available')
  return { canvas, ctx }
}

export function toTexture(canvas: HTMLCanvasElement, repeat = false, srgb = true) {
  const texture = new THREE.CanvasTexture(canvas)
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  if (repeat) {
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
  }
  return texture
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export function makeSkyTexture() {
  const { canvas, ctx } = makeCanvas(8, 512)
  const g = ctx.createLinearGradient(0, 0, 0, 512)
  g.addColorStop(0, '#2f7be8')
  g.addColorStop(0.25, '#5b9cf2')
  g.addColorStop(0.42, '#9cc4f7')
  g.addColorStop(0.55, '#d3e5fb')
  g.addColorStop(1, '#d3e5fb')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 8, 512)
  return toTexture(canvas)
}

export function makeGlowTexture() {
  const { canvas, ctx } = makeCanvas(128, 128)
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.25, 'rgba(190,230,255,0.7)')
  g.addColorStop(0.6, 'rgba(120,190,255,0.18)')
  g.addColorStop(1, 'rgba(120,190,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  return toTexture(canvas)
}

/** Ground-floor storefront strip. One tile = 8 columns x ~7 units tall. */
export function makePodiumTexture() {
  const W = 256
  const H = 128
  const { canvas, ctx } = makeCanvas(W, H)
  ctx.fillStyle = '#e9eef6'
  ctx.fillRect(0, 0, W, H)
  const cols = 4
  const cw = W / cols
  for (let c = 0; c < cols; c++) {
    const x = c * cw
    const g = ctx.createLinearGradient(0, 30, 0, H - 6)
    g.addColorStop(0, '#2c4a73')
    g.addColorStop(0.55, '#7fb2e8')
    g.addColorStop(1, '#ffe9bd')
    ctx.fillStyle = g
    ctx.fillRect(x + 5, 30, cw - 10, H - 36)
    ctx.fillStyle = 'rgba(255,255,255,0.22)'
    ctx.beginPath()
    ctx.moveTo(x + 5, 30)
    ctx.lineTo(x + 28, 30)
    ctx.lineTo(x + 8, H - 6)
    ctx.lineTo(x + 5, H - 6)
    ctx.fill()
    ctx.fillStyle = '#122d45'
    ctx.fillRect(x + cw / 2 - 1, 30, 2, H - 36)
  }
  ctx.fillStyle = '#2a73ff'
  ctx.fillRect(0, 18, W, 8)
  ctx.fillStyle = '#59e6ff'
  ctx.fillRect(0, 26, W, 2)
  ctx.fillStyle = '#122d45'
  ctx.fillRect(0, 0, 4, 4)
  return toTexture(canvas, true)
}

export function makePlazaTexture() {
  const { canvas, ctx } = makeCanvas(256, 256)
  ctx.fillStyle = '#c5d5ea'
  ctx.fillRect(0, 0, 256, 256)
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const v = Math.floor(Math.random() * 14)
      ctx.fillStyle = `rgb(${192 + v},${210 + v},${233 + Math.floor(v / 2)})`
      ctx.fillRect(x * 64 + 2, y * 64 + 2, 60, 60)
    }
  }
  ctx.strokeStyle = 'rgba(95,125,170,0.35)'
  ctx.lineWidth = 3
  for (let i = 0; i <= 4; i++) {
    ctx.beginPath()
    ctx.moveTo(i * 64, 0)
    ctx.lineTo(i * 64, 256)
    ctx.moveTo(0, i * 64)
    ctx.lineTo(256, i * 64)
    ctx.stroke()
  }
  return toTexture(canvas, true)
}

export interface TrainLivery {
  body: string
  stripe: string
  accent: string
}

export const TRAIN_LIVERIES: TrainLivery[] = [
  { body: '#2063e6', stripe: '#f4f8ff', accent: '#59e6ff' },
  { body: '#c6d0de', stripe: '#e23a52', accent: '#2a73ff' },
  { body: '#d3304a', stripe: '#f4f8ff', accent: '#59e6ff' },
  { body: '#eef3fa', stripe: '#2a73ff', accent: '#e23a52' },
]

/** Side panel of a train carriage; repeats every 12 world units. */
export function makeTrainSideTexture(livery: TrainLivery) {
  const W = 1024
  const H = 230
  const { canvas, ctx } = makeCanvas(W, H)
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, livery.body)
  bg.addColorStop(0.5, livery.body)
  bg.addColorStop(1, 'rgba(0,0,0,0.0)')
  ctx.fillStyle = livery.body
  ctx.fillRect(0, 0, W, H)
  const shade = ctx.createLinearGradient(0, 0, 0, H)
  shade.addColorStop(0, 'rgba(255,255,255,0.22)')
  shade.addColorStop(0.45, 'rgba(255,255,255,0)')
  shade.addColorStop(1, 'rgba(0,0,0,0.22)')
  ctx.fillStyle = shade
  ctx.fillRect(0, 0, W, H)

  // Livery stripes
  ctx.fillStyle = livery.stripe
  ctx.fillRect(0, 168, W, 26)
  ctx.fillStyle = livery.accent
  ctx.fillRect(0, 160, W, 6)

  const winGlass = (x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = '#e7eef8'
    roundRect(ctx, x - 5, y - 5, w + 10, h + 10, 14)
    ctx.fill()
    const g = ctx.createLinearGradient(0, y, 0, y + h)
    g.addColorStop(0, '#0e2a52')
    g.addColorStop(0.55, '#1d5a96')
    g.addColorStop(1, '#79c6e8')
    ctx.fillStyle = g
    roundRect(ctx, x, y, w, h, 10)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.32)'
    ctx.beginPath()
    ctx.moveTo(x + w * 0.15, y)
    ctx.lineTo(x + w * 0.4, y)
    ctx.lineTo(x + w * 0.15, y + h)
    ctx.lineTo(x, y + h)
    ctx.lineTo(x, y + h * 0.4)
    ctx.closePath()
    ctx.fill()
  }

  // Door, then four windows
  const doorW = 140
  ctx.fillStyle = 'rgba(0,0,0,0.18)'
  roundRect(ctx, 16, 24, doorW - 8, 132, 8)
  ctx.fill()
  winGlass(24, 34, 50, 100)
  winGlass(90, 34, 50, 100)
  ctx.fillStyle = livery.accent
  ctx.fillRect(16, 20, doorW - 8, 5)
  for (let i = 0; i < 4; i++) winGlass(doorW + 24 + i * 214, 36, 160, 92)

  void bg
  return toTexture(canvas, true)
}

export function makeContainerTexture(base: string, band: string) {
  const { canvas, ctx } = makeCanvas(256, 256)
  ctx.fillStyle = base
  ctx.fillRect(0, 0, 256, 256)
  for (let x = 10; x < 256; x += 16) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)'
    ctx.fillRect(x, 22, 6, 212)
    ctx.fillStyle = 'rgba(255,255,255,0.22)'
    ctx.fillRect(x + 6, 22, 3, 212)
  }
  ctx.fillStyle = band
  ctx.fillRect(0, 0, 256, 20)
  ctx.fillRect(0, 236, 256, 20)
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.fillRect(0, 20, 256, 3)
  ctx.fillRect(0, 233, 256, 3)
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  roundRect(ctx, 68, 100, 120, 54, 8)
  ctx.fill()
  ctx.fillStyle = base
  ctx.font = '700 40px "Space Grotesk", Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('CARGO', 128, 128)
  return toTexture(canvas, true)
}

export function makeHazardTexture(a: string, b: string) {
  const { canvas, ctx } = makeCanvas(256, 64)
  ctx.fillStyle = a
  ctx.fillRect(0, 0, 256, 64)
  ctx.fillStyle = b
  for (let i = -2; i < 10; i++) {
    ctx.beginPath()
    ctx.moveTo(i * 32, 64)
    ctx.lineTo(i * 32 + 16, 64)
    ctx.lineTo(i * 32 + 48, 0)
    ctx.lineTo(i * 32 + 32, 0)
    ctx.closePath()
    ctx.fill()
  }
  return toTexture(canvas, true)
}

export function makeBillboardTexture(label: string, from: string, to: string) {
  const { canvas, ctx } = makeCanvas(512, 256)
  const g = ctx.createLinearGradient(0, 0, 512, 256)
  g.addColorStop(0, from)
  g.addColorStop(1, to)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 512, 256)
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'
  ctx.lineWidth = 6
  ctx.strokeRect(10, 10, 492, 236)
  ctx.fillStyle = '#ffffff'
  ctx.font = '700 92px "Space Grotesk", "DM Sans", Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, 256, 128)
  return toTexture(canvas)
}


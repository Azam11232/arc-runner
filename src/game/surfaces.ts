import { makeCanvas, roundRect, toTexture } from './textures'

// ---------- USDC coin face ----------

/** Face of the collectible token: the USDC mark (dollar S with side arcs) on a glossy blue disc. */
export function makeCoinFaceTexture() {
  const size = 1024
  const { canvas, ctx } = makeCanvas(size, size)
  const c = size / 2
  const bg = ctx.createRadialGradient(c - 150, c - 190, 20, c, c, c)
  bg.addColorStop(0, '#5fb0ff')
  bg.addColorStop(0.5, '#2f86e0')
  bg.addColorStop(1, '#1b5db0')
  ctx.fillStyle = bg
  ctx.beginPath()
  ctx.arc(c, c, c - 2, 0, Math.PI * 2)
  ctx.fill()

  // Fine concentric guilloche rings
  ctx.strokeStyle = 'rgba(255,255,255,0.10)'
  ctx.lineWidth = 3
  for (let r = 330; r < 490; r += 16) {
    ctx.beginPath()
    ctx.arc(c, c, r, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 26
  ctx.beginPath()
  ctx.arc(c, c, c - 34, 0, Math.PI * 2)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(10,50,110,0.35)'
  ctx.lineWidth = 8
  ctx.beginPath()
  ctx.arc(c, c, c - 62, 0, Math.PI * 2)
  ctx.stroke()

  const drawMark = (color: string, ox: number, oy: number) => {
    ctx.strokeStyle = color
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    // Side arcs
    ctx.lineWidth = 64
    ctx.beginPath()
    ctx.arc(c + ox, c + oy, 330, Math.PI * 0.77, Math.PI * 1.23)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(c + ox, c + oy, 330, -Math.PI * 0.23, Math.PI * 0.23)
    ctx.stroke()
    // Dollar S
    ctx.lineWidth = 58
    ctx.beginPath()
    ctx.arc(c + ox, c - 112 + oy, 112, -0.61, Math.PI / 2, true)
    ctx.arc(c + ox, c + 112 + oy, 112, -Math.PI / 2, 2.53, false)
    ctx.stroke()
    // Vertical bar
    ctx.lineWidth = 40
    ctx.beginPath()
    ctx.moveTo(c + ox, c - 262 + oy)
    ctx.lineTo(c + ox, c + 262 + oy)
    ctx.stroke()
  }
  drawMark('rgba(8,40,95,0.45)', 0, 14)
  drawMark('#ffffff', 0, 0)

  // Soft gloss
  const gloss = ctx.createLinearGradient(0, 0, size, size)
  gloss.addColorStop(0.08, 'rgba(255,255,255,0)')
  gloss.addColorStop(0.28, 'rgba(255,255,255,0.28)')
  gloss.addColorStop(0.42, 'rgba(255,255,255,0)')
  ctx.fillStyle = gloss
  ctx.beginPath()
  ctx.arc(c, c, c - 2, 0, Math.PI * 2)
  ctx.fill()
  return toTexture(canvas)
}

export function makeSparkleTexture() {
  const { canvas, ctx } = makeCanvas(64, 64)
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 30)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.2, 'rgba(190,235,255,0.55)')
  g.addColorStop(1, 'rgba(120,200,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.moveTo(32, 0)
  ctx.quadraticCurveTo(34, 30, 64, 32)
  ctx.quadraticCurveTo(34, 34, 32, 64)
  ctx.quadraticCurveTo(30, 34, 0, 32)
  ctx.quadraticCurveTo(30, 30, 32, 0)
  ctx.fill()
  return toTexture(canvas)
}

// ---------- Railway ----------

export function makeGravelTexture() {
  const { canvas, ctx } = makeCanvas(256, 256)
  ctx.fillStyle = '#34496c'
  ctx.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 3600; i++) {
    const t = Math.random()
    ctx.fillStyle = t < 0.42 ? 'rgba(14,26,48,0.6)' : t < 0.85 ? 'rgba(84,110,150,0.5)' : 'rgba(150,178,214,0.42)'
    const s = 1.5 + Math.random() * 3.5
    ctx.beginPath()
    ctx.ellipse(Math.random() * 256, Math.random() * 256, s, s * 0.7, Math.random() * 3, 0, Math.PI * 2)
    ctx.fill()
  }
  return toTexture(canvas, true)
}

// ---------- Facades ----------

export type FacadeKind = 'glassDeep' | 'glassSilver' | 'glassTeal' | 'whiteFin'

const STYLE: Record<FacadeKind, { frame: string; top: string; bottom: string }> = {
  glassDeep: { frame: '#16243a', top: '#6c9fe6', bottom: '#12356d' },
  glassSilver: { frame: '#8a98ad', top: '#cfe0f5', bottom: '#5f7fae' },
  glassTeal: { frame: '#1c3446', top: '#86dbea', bottom: '#176a86' },
  whiteFin: { frame: '#e6ecf5', top: '#5d8fd6', bottom: '#14336a' },
}

/** One tile = 8 columns x 16 floors. */
export function makeFacadeTexture(kind: FacadeKind) {
  const W = 256
  const H = 512
  const { canvas, ctx } = makeCanvas(W, H)
  const s = STYLE[kind]
  const cols = 8
  const rows = 16
  const cw = W / cols
  const ch = H / rows
  ctx.fillStyle = s.frame
  ctx.fillRect(0, 0, W, H)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cw
      const y = r * ch
      const inset = kind === 'whiteFin' ? 7 : 2
      const g = ctx.createLinearGradient(0, y, 0, y + ch)
      g.addColorStop(0, s.top)
      g.addColorStop(1, s.bottom)
      ctx.globalAlpha = 0.72 + Math.random() * 0.28
      ctx.fillStyle = g
      if (kind === 'whiteFin') {
        roundRect(ctx, x + inset, y + 6, cw - inset * 2, ch - 12, 2)
        ctx.fill()
      } else {
        ctx.fillRect(x + inset, y + 3, cw - inset * 2, ch - 6)
      }
      ctx.globalAlpha = 1
      if (Math.random() < 0.12) {
        ctx.fillStyle = 'rgba(255,238,200,0.35)'
        ctx.fillRect(x + inset, y + 3, cw - inset * 2, ch - 6)
      }
    }
    // Floor slab
    ctx.fillStyle = kind === 'whiteFin' ? 'rgba(150,170,200,0.55)' : 'rgba(205,222,245,0.4)'
    ctx.fillRect(0, r * ch + ch - 3, W, 3)
  }
  if (kind === 'whiteFin') {
    ctx.fillStyle = 'rgba(120,140,170,0.55)'
    for (let c = 0; c <= cols; c++) ctx.fillRect(c * cw - 1, 0, 2, H)
  } else {
    // Mullion highlights
    ctx.fillStyle = 'rgba(190,215,245,0.35)'
    for (let c = 0; c <= cols; c++) ctx.fillRect(c * cw, 0, 1, H)
  }
  // Soft sky reflections drifting across the glass
  if (kind !== 'whiteFin') {
    for (let i = 0; i < 5; i++) {
      const x = Math.random() * W
      const y = Math.random() * H
      const g = ctx.createRadialGradient(x, y, 0, x, y, 90 + Math.random() * 60)
      g.addColorStop(0, 'rgba(255,255,255,0.22)')
      g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)
    }
    const sheen = ctx.createLinearGradient(0, 0, W, H * 0.6)
    sheen.addColorStop(0.25, 'rgba(255,255,255,0)')
    sheen.addColorStop(0.45, 'rgba(255,255,255,0.18)')
    sheen.addColorStop(0.62, 'rgba(255,255,255,0)')
    ctx.fillStyle = sheen
    ctx.fillRect(0, 0, W, H)
  }
  ctx.fillStyle = s.frame
  ctx.fillRect(0, 0, 3, 3)
  return toTexture(canvas, true)
}

// ---------- Fabrics (map + bump) ----------

export function makePufferTextures(base: string, seam: string) {
  const map = makeCanvas(256, 256)
  const bump = makeCanvas(256, 256)
  const band = 64
  for (let i = 0; i < 4; i++) {
    const y = i * band
    const g = map.ctx.createLinearGradient(0, y, 0, y + band)
    g.addColorStop(0, seam)
    g.addColorStop(0.18, base)
    g.addColorStop(0.5, '#ffffff22')
    g.addColorStop(0.82, base)
    g.addColorStop(1, seam)
    map.ctx.fillStyle = base
    map.ctx.fillRect(0, y, 256, band)
    map.ctx.fillStyle = g
    map.ctx.fillRect(0, y, 256, band)
    const b = bump.ctx.createLinearGradient(0, y, 0, y + band)
    b.addColorStop(0, '#202020')
    b.addColorStop(0.5, '#f0f0f0')
    b.addColorStop(1, '#202020')
    bump.ctx.fillStyle = b
    bump.ctx.fillRect(0, y, 256, band)
  }
  // vertical stitch
  map.ctx.fillStyle = 'rgba(0,0,0,0.12)'
  for (let x = 0; x < 256; x += 64) map.ctx.fillRect(x, 0, 2, 256)
  return { map: toTexture(map.canvas, true), bump: toTexture(bump.canvas, true, false) }
}

export function makeRibTextures(base: string) {
  const map = makeCanvas(128, 128)
  const bump = makeCanvas(128, 128)
  map.ctx.fillStyle = base
  map.ctx.fillRect(0, 0, 128, 128)
  bump.ctx.fillStyle = '#808080'
  bump.ctx.fillRect(0, 0, 128, 128)
  for (let x = 0; x < 128; x += 8) {
    map.ctx.fillStyle = 'rgba(0,0,0,0.22)'
    map.ctx.fillRect(x + 5, 0, 3, 128)
    bump.ctx.fillStyle = '#e8e8e8'
    bump.ctx.fillRect(x, 0, 5, 128)
  }
  return { map: toTexture(map.canvas, true), bump: toTexture(bump.canvas, true, false) }
}

export function makeTwillTextures(base: string) {
  const map = makeCanvas(128, 128)
  const bump = makeCanvas(128, 128)
  map.ctx.fillStyle = base
  map.ctx.fillRect(0, 0, 128, 128)
  bump.ctx.fillStyle = '#707070'
  bump.ctx.fillRect(0, 0, 128, 128)
  map.ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  bump.ctx.strokeStyle = '#d0d0d0'
  map.ctx.lineWidth = 2
  bump.ctx.lineWidth = 2
  for (let i = -128; i < 256; i += 6) {
    for (const cx of [map.ctx, bump.ctx]) {
      cx.beginPath()
      cx.moveTo(i, 0)
      cx.lineTo(i + 128, 128)
      cx.stroke()
    }
  }
  return { map: toTexture(map.canvas, true), bump: toTexture(bump.canvas, true, false) }
}

// ---------- Obstacle warning signs ----------

function hazardBand(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, a: string, b: string, step = 36) {
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  ctx.fillStyle = a
  ctx.fillRect(x, y, w, h)
  ctx.fillStyle = b
  for (let i = -h; i < w + h; i += step * 2) {
    ctx.beginPath()
    ctx.moveTo(x + i, y + h)
    ctx.lineTo(x + i + step, y + h)
    ctx.lineTo(x + i + step + h, y)
    ctx.lineTo(x + i + h, y)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

function chevron(ctx: CanvasRenderingContext2D, cx: number, cy: number, half: number, up: boolean, color: string, width: number) {
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineJoin = 'miter'
  ctx.lineCap = 'butt'
  ctx.beginPath()
  const d = up ? 1 : -1
  ctx.moveTo(cx - half, cy + d * half * 0.55)
  ctx.lineTo(cx, cy - d * half * 0.55)
  ctx.lineTo(cx + half, cy + d * half * 0.55)
  ctx.stroke()
}

/** Low ground barrier: orange/black ends, yellow centre panel with upward chevrons (jump). */
export function makeJumpSignTexture() {
  const W = 512
  const H = 128
  const { canvas, ctx } = makeCanvas(W, H)
  ctx.fillStyle = '#ff6a00'
  ctx.fillRect(0, 0, W, H)
  hazardBand(ctx, 0, 0, 150, H, '#ff6a00', '#10151f')
  hazardBand(ctx, W - 150, 0, 150, H, '#ff6a00', '#10151f')
  ctx.fillStyle = '#ffc400'
  ctx.fillRect(150, 0, W - 300, H)
  ctx.fillStyle = '#10151f'
  ctx.fillRect(150, 0, 5, H)
  ctx.fillRect(W - 155, 0, 5, H)
  for (let i = 0; i < 3; i++) chevron(ctx, W / 2, 98 - i * 30, 46, true, '#10151f', 15)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, 6)
  ctx.fillRect(0, H - 6, W, 6)
  return toTexture(canvas, false)
}

/** Overhead bar: yellow/black hazard bands with SLIDE panel and downward chevrons. */
export function makeSlideSignTexture() {
  const W = 512
  const H = 290
  const { canvas, ctx } = makeCanvas(W, H)
  ctx.fillStyle = '#ffc400'
  ctx.fillRect(0, 0, W, H)
  hazardBand(ctx, 0, 0, W, 50, '#ffc400', '#10151f', 30)
  hazardBand(ctx, 0, H - 50, W, 50, '#ffc400', '#10151f', 30)
  ctx.fillStyle = '#10151f'
  roundRect(ctx, 24, 66, W - 48, H - 132, 14)
  ctx.fill()
  for (const x of [78, W - 78]) {
    for (let i = 0; i < 2; i++) chevron(ctx, x, 112 + i * 38, 34, false, '#ffc400', 13)
  }
  ctx.fillStyle = '#ffc400'
  ctx.font = '800 82px "Space Grotesk", Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('SLIDE', W / 2, H / 2)
  return toTexture(canvas, false)
}

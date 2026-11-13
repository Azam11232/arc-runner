import * as THREE from 'three'
import { getCoinParts, getMats } from './models'

const FADE_IN_FROM = -92
const FADE_IN_SPAN = 33
const COLLECT_TIME = 0.22
const COIN_SCALE = 1.2
const SHRINK_FROM = 1.5
const SHRINK_END = 4

interface Slot {
  active: boolean
  collecting: boolean
  x: number
  y: number
  z: number
  rot: number
  t: number
  sx: number
  sy: number
  sz: number
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

/** Pooled, instanced USDC coins: four draw calls for every coin on screen. */
export class CoinField {
  readonly group = new THREE.Group()
  private slots: Slot[] = []
  private rim: THREE.InstancedMesh
  private face: THREE.InstancedMesh
  private ring: THREE.InstancedMesh
  private halo: THREE.InstancedMesh
  private time = 0
  private readonly m = new THREE.Matrix4()
  private readonly q = new THREE.Quaternion()
  private readonly e = new THREE.Euler()
  private readonly p = new THREE.Vector3()
  private readonly s = new THREE.Vector3()
  private readonly out = new THREE.Vector3()

  constructor(private max = 72) {
    const parts = getCoinParts()
    const mats = getMats()
    this.rim = new THREE.InstancedMesh(parts.rim, mats.coinRim, max)
    this.face = new THREE.InstancedMesh(parts.face, mats.coinFace, max)
    this.ring = new THREE.InstancedMesh(parts.ring, mats.coinRing, max)
    this.halo = new THREE.InstancedMesh(parts.halo, mats.coinHalo, max)
    for (const im of [this.rim, this.face, this.ring, this.halo]) {
      im.frustumCulled = false
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      this.group.add(im)
    }
    this.rim.castShadow = true
    this.halo.renderOrder = 3
    for (let i = 0; i < max; i++) {
      this.slots.push({ active: false, collecting: false, x: 0, y: 1, z: 0, rot: 0, t: 0, sx: 0, sy: 0, sz: 0 })
    }
    this.hideAll()
  }

  private hideAll() {
    this.m.makeScale(0, 0, 0)
    for (let i = 0; i < this.max; i++) {
      this.rim.setMatrixAt(i, this.m)
      this.face.setMatrixAt(i, this.m)
      this.ring.setMatrixAt(i, this.m)
      this.halo.setMatrixAt(i, this.m)
    }
    this.flag()
  }

  private flag() {
    this.rim.instanceMatrix.needsUpdate = true
    this.face.instanceMatrix.needsUpdate = true
    this.ring.instanceMatrix.needsUpdate = true
    this.halo.instanceMatrix.needsUpdate = true
  }

  reset() {
    for (const s of this.slots) {
      s.active = false
      s.collecting = false
    }
    this.hideAll()
  }

  place(x: number, y: number, z: number) {
    const slot = this.slots.find((c) => !c.active)
    if (!slot) return
    slot.active = true
    slot.collecting = false
    slot.x = x
    slot.y = y
    slot.z = z
    slot.rot = Math.random() * Math.PI
    slot.t = 0
  }

  /** Check pickups against the player; picked coins fly up and shrink. */
  collect(px: number, py: number, sliding: boolean, onCollect: (pos: THREE.Vector3) => void) {
    const cy = py + (sliding ? 0.35 : 0.9)
    for (const c of this.slots) {
      if (!c.active || c.collecting) continue
      if (Math.abs(c.x - px) < 0.85 && Math.abs(c.z) < 1.0 && Math.abs(c.y - cy) < 1.1) {
        c.collecting = true
        c.t = 0
        c.sx = c.x
        c.sy = c.y
        c.sz = c.z
        onCollect(this.out.set(c.x, c.y, c.z))
      }
    }
  }

  update(dt: number, speed: number) {
    this.time += dt
    getMats().coinFace.emissiveIntensity = 0.4 + Math.sin(this.time * 4) * 0.1
    const move = speed * dt
    for (let i = 0; i < this.max; i++) {
      const c = this.slots[i]
      if (!c.active) continue

      let scale = 1
      let glow = 1
      if (c.collecting) {
        c.t += dt / COLLECT_TIME
        if (c.t >= 1) {
          c.active = false
          c.collecting = false
          this.m.makeScale(0, 0, 0)
          this.rim.setMatrixAt(i, this.m)
          this.face.setMatrixAt(i, this.m)
          this.ring.setMatrixAt(i, this.m)
          this.halo.setMatrixAt(i, this.m)
          continue
        }
        // Stay put at constant size: a quick spin and small lift while the glow collapses.
        // Never moves toward the camera, so it can't block the view down the track.
        const k = easeOut(c.t)
        c.x = c.sx
        c.y = c.sy + 0.45 * k
        c.z = c.sz
        c.rot += dt * (14 + 10 * c.t)
        glow = 1 - c.t
      } else {
        c.z += move
        c.rot += dt * 4.2
        // Missed coins shrink away just behind the runner instead of ballooning past the camera
        if (c.z > SHRINK_FROM) scale = Math.max(0, 1 - (c.z - SHRINK_FROM) / (SHRINK_END - SHRINK_FROM))
        if (c.z > SHRINK_END) {
          c.active = false
          this.m.makeScale(0, 0, 0)
          this.rim.setMatrixAt(i, this.m)
          this.face.setMatrixAt(i, this.m)
          this.ring.setMatrixAt(i, this.m)
          this.halo.setMatrixAt(i, this.m)
          continue
        }
      }

      const sink = c.collecting ? 0 : Math.min(1, Math.max(0, (FADE_IN_FROM - c.z) / FADE_IN_SPAN))
      const bob = c.collecting ? 0 : Math.sin(this.time * 3 + c.x * 2 + i) * 0.06
      this.p.set(c.x, c.y - 4 * sink + bob, c.z)
      this.e.set(Math.sin(this.time * 2 + i) * 0.1, c.rot, Math.sin(this.time * 1.7 + i * 1.3) * 0.07)
      this.q.setFromEuler(this.e)
      this.s.setScalar(scale * COIN_SCALE)
      this.m.compose(this.p, this.q, this.s)
      this.rim.setMatrixAt(i, this.m)
      this.face.setMatrixAt(i, this.m)
      this.ring.setMatrixAt(i, this.m)

      const pulse = glow * (0.92 + Math.sin(this.time * 5 + i * 1.7) * 0.08) * scale * COIN_SCALE
      this.s.setScalar(pulse)
      this.q.identity()
      this.m.compose(this.p, this.q, this.s)
      this.halo.setMatrixAt(i, this.m)
    }
    this.flag()
  }
}

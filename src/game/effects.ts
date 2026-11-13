import * as THREE from 'three'
import { makeSparkleTexture } from './surfaces'

interface Particle {
  mesh: THREE.Mesh
  vel: THREE.Vector3
  life: number
  max: number
}

interface Ring {
  mesh: THREE.Mesh
  life: number
}

const MAX_PARTICLES = 110
const MAX_RINGS = 8
const MAX_SPARKS = 40

interface Spark {
  sprite: THREE.Sprite
  vel: THREE.Vector3
  life: number
  max: number
  spin: number
}

export class Effects {
  readonly group = new THREE.Group()
  private particles: Particle[] = []
  private rings: Ring[] = []
  private sparks: Spark[] = []
  private sparkCursor = 0
  private cursor = 0
  private ringCursor = 0

  constructor() {
    const geo = new THREE.OctahedronGeometry(0.08, 0)
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: [0xffffff, 0x8fe3ff, 0x2f84dc][i % 3], transparent: true, opacity: 0 })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.visible = false
      this.group.add(mesh)
      this.particles.push({ mesh, vel: new THREE.Vector3(), life: 0, max: 1 })
    }
    const tex = makeSparkleTexture()
    for (let i = 0; i < MAX_SPARKS; i++) {
      const mat = new THREE.SpriteMaterial({ map: tex, color: i % 2 ? 0xffffff : 0xbfe9ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0, fog: false })
      const sprite = new THREE.Sprite(mat)
      sprite.visible = false
      this.group.add(sprite)
      this.sparks.push({ sprite, vel: new THREE.Vector3(), life: 0, max: 1, spin: 0 })
    }
    const ringGeo = new THREE.RingGeometry(0.35, 0.45, 32)
    for (let i = 0; i < MAX_RINGS; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0x4da6ff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
      const mesh = new THREE.Mesh(ringGeo, mat)
      mesh.visible = false
      this.group.add(mesh)
      this.rings.push({ mesh, life: 0 })
    }
  }

  burst(pos: THREE.Vector3, count: number, power = 4, up = 2) {
    for (let i = 0; i < count; i++) {
      const p = this.particles[this.cursor]
      this.cursor = (this.cursor + 1) % MAX_PARTICLES
      p.mesh.position.copy(pos)
      const a = Math.random() * Math.PI * 2
      const s = (0.4 + Math.random()) * power
      p.vel.set(Math.cos(a) * s, up + Math.random() * power * 0.6, Math.sin(a) * s * 0.2)
      p.max = 0.35 + Math.random() * 0.35
      p.life = p.max
      p.mesh.visible = true
      p.mesh.scale.setScalar(0.7 + Math.random() * 0.8)
    }
  }

  sparkles(pos: THREE.Vector3, count: number) {
    for (let i = 0; i < count; i++) {
      const sp = this.sparks[this.sparkCursor]
      this.sparkCursor = (this.sparkCursor + 1) % MAX_SPARKS
      const a = Math.random() * Math.PI * 2
      const s = 1.4 + Math.random() * 2.4
      sp.sprite.position.copy(pos)
      sp.vel.set(Math.cos(a) * s, 1 + Math.random() * 2, Math.sin(a) * s * 0.15)
      sp.max = 0.45 + Math.random() * 0.35
      sp.life = sp.max
      sp.spin = (Math.random() - 0.5) * 8
      sp.sprite.visible = true
    }
  }

  ring(pos: THREE.Vector3) {
    const r = this.rings[this.ringCursor]
    this.ringCursor = (this.ringCursor + 1) % MAX_RINGS
    r.mesh.position.copy(pos)
    r.life = 0.35
    r.mesh.visible = true
  }

  update(dt: number) {
    for (const p of this.particles) {
      if (p.life <= 0) continue
      p.life -= dt
      if (p.life <= 0) {
        p.mesh.visible = false
        continue
      }
      p.vel.y -= 14 * dt
      p.mesh.position.addScaledVector(p.vel, dt)
      p.mesh.rotation.x += dt * 8
      p.mesh.rotation.y += dt * 6
      ;(p.mesh.material as THREE.MeshBasicMaterial).opacity = Math.min(1, (p.life / p.max) * 1.5)
    }
    for (const sp of this.sparks) {
      if (sp.life <= 0) continue
      sp.life -= dt
      if (sp.life <= 0) {
        sp.sprite.visible = false
        continue
      }
      const k = sp.life / sp.max
      sp.vel.multiplyScalar(1 - dt * 2.2)
      sp.sprite.position.addScaledVector(sp.vel, dt)
      const size = 0.24 * Math.sin(Math.PI * (1 - k)) + 0.05
      sp.sprite.scale.set(size, size, 1)
      sp.sprite.material.rotation += sp.spin * dt
      sp.sprite.material.opacity = Math.min(1, k * 2)
    }
    for (const r of this.rings) {
      if (r.life <= 0) continue
      r.life -= dt
      if (r.life <= 0) {
        r.mesh.visible = false
        continue
      }
      const k = 1 - r.life / 0.35
      r.mesh.scale.setScalar(0.5 + k * 1.2)
      ;(r.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.55
    }
  }
}

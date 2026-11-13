import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { bakeGroup } from './merge'
import {
  attachLogo,
  buildBackpack,
  buildForearm,
  buildHip,
  buildShin,
  buildShoe,
  buildThigh,
  buildTorso,
  buildUpperArm,
  createMats,
  mk,
  type Mats,
} from './mascotParts'

export interface MascotPose {
  speed: number
  onGround: boolean
  vy: number
  sliding: boolean
  lean: number
  mode: 'run' | 'dead' | 'defeated'
}

interface Pose {
  pelvisY: number
  pitch: number
  spinePitch: number
  spineYaw: number
  pelvisYaw: number
  headPitch: number
  thighL: number
  thighR: number
  kneeL: number
  kneeR: number
  footL: number
  footR: number
  shL: number
  shR: number
  splayL: number
  splayR: number
  elL: number
  elR: number
}

const damp = (cur: number, target: number, lambda: number, dt: number) => cur + (target - cur) * (1 - Math.exp(-lambda * dt))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

function mixPose(a: Pose, b: Pose, t: number): Pose {
  const out = { ...a }
  for (const k of Object.keys(a) as (keyof Pose)[]) out[k] = lerp(a[k], b[k], t)
  return out
}

const POSE_SLIDE: Pose = {
  pelvisY: 0.38, pitch: 1.45, spinePitch: -0.25, spineYaw: 0, pelvisYaw: 0, headPitch: -0.95,
  thighL: 0.05, thighR: -0.02, kneeL: 0.3, kneeR: 0.15, footL: 0.1, footR: 0.05,
  shL: -1.1, shR: 0.9, splayL: 0.35, splayR: 0.35, elL: 0.3, elR: 0.5,
}
const POSE_DEAD: Pose = {
  pelvisY: 0.4, pitch: 1.25, spinePitch: 0, spineYaw: 0, pelvisYaw: 0, headPitch: -0.3,
  thighL: 0.9, thighR: -0.1, kneeL: 0.4, kneeR: 0.1, footL: -0.2, footR: 0,
  shL: 2.7, shR: 2.2, splayL: 0.7, splayR: 0.7, elL: 0.2, elR: 0.3,
}
const POSE_DEFEATED: Pose = {
  pelvisY: 0.76, pitch: 0.2, spinePitch: 0.32, spineYaw: -0.12, pelvisYaw: 0.1, headPitch: 0.3,
  thighL: 0.1, thighR: -0.06, kneeL: 0.16, kneeR: 0.12, footL: 0, footR: 0,
  shL: 0.18, shR: 2.1, splayL: 0.12, splayR: -0.5, elL: 0.12, elR: 0.9,
}
const POSE_SHOCK: Pose = {
  pelvisY: 0.8, pitch: -0.07, spinePitch: -0.08, spineYaw: 0, pelvisYaw: 0, headPitch: -0.08,
  thighL: 0.06, thighR: -0.04, kneeL: 0.1, kneeR: 0.08, footL: 0, footR: 0,
  shL: 0.7, shR: 0.7, splayL: 0.45, splayR: 0.45, elL: 0.8, elR: 0.8,
}
const POSE_RISE: Pose = {
  pelvisY: 0.81, pitch: -0.1, spinePitch: -0.05, spineYaw: 0.1, pelvisYaw: -0.05, headPitch: 0.12,
  thighL: 1.3, thighR: -0.25, kneeL: 1.4, kneeR: 0.9, footL: 0.2, footR: 0.5,
  shL: 2.3, shR: 1.9, splayL: 0.3, splayR: 0.3, elL: 0.4, elR: 0.6,
}
const POSE_FALL: Pose = {
  pelvisY: 0.82, pitch: 0.02, spinePitch: 0, spineYaw: 0, pelvisYaw: 0, headPitch: 0.05,
  thighL: 0.55, thighR: -0.15, kneeL: 0.35, kneeR: 0.25, footL: 0, footR: 0.1,
  shL: 1.3, shR: 1.5, splayL: 0.6, splayR: 0.6, elL: 0.3, elR: 0.35,
}

/** "Kai": an original streetwear courier with a quiff, puffer bomber, joggers and tech sneakers. */
export class Mascot {
  readonly root = new THREE.Group()
  private rig = new THREE.Group()
  private spine = new THREE.Group()
  private headG = new THREE.Group()
  private thigh: THREE.Group[] = []
  private knee: THREE.Group[] = []
  private foot: THREE.Group[] = []
  private shoulder: THREE.Group[] = []
  private elbow: THREE.Group[] = []
  private eyes: THREE.Group[] = []
  private brows: THREE.Mesh[] = []
  private smile: THREE.Mesh
  private frown: THREE.Mesh
  private mouthOpen: THREE.Group
  private sweat: THREE.Mesh
  private tear: THREE.Mesh
  private stars: THREE.Group
  private quiff = new THREE.Group()
  private phase = 0
  private time = 0
  private blink = 2.5
  private wAir = 0
  private wSlide = 0
  private wDead = 0
  private wDef = 0
  private defT = 0
  private shrugW = 0
  private shockW = 0
  private sighW = 0
  private inhaleW = 0
  private wLand = 0
  private wasAir = false
  private yaw = 0
  private face = { brow: 0, tiltL: -0.18, tiltR: 0.18, open: 0, eye: 1, frown: 0 }

  constructor() {
    const m = createMats()
    this.root.add(this.rig)
    this.rig.scale.setScalar(0.78)
    this.buildBody(m)
    this.buildHead(m)
    const base = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/'
    this.spine.add(buildBackpack(m))
    // The supplied Arc logo is attached to the jacket back (spine child) so it moves with the torso
    const logoSlot = new THREE.Group()
    this.spine.add(logoSlot)
    attachLogo(logoSlot, `${base}arc-logo.png`)
    this.smile = this.faceParts.smile
    this.frown = this.faceParts.frown
    this.mouthOpen = this.faceParts.open
    this.sweat = this.faceParts.sweat
    this.tear = this.faceParts.tear
    this.stars = this.faceParts.stars
  }

  private faceParts!: { smile: THREE.Mesh; frown: THREE.Mesh; open: THREE.Group; sweat: THREE.Mesh; tear: THREE.Mesh; stars: THREE.Group }

  private buildBody(m: Mats) {
    for (const s of [-1, 1]) {
      const thigh = new THREE.Group()
      thigh.position.set(s * 0.095, -0.02, 0)
      thigh.add(buildThigh(m, s))
      const knee = new THREE.Group()
      knee.position.y = -0.44
      knee.add(buildShin(m, s))
      const foot = new THREE.Group()
      foot.position.y = -0.44
      foot.add(buildShoe(m, s))
      knee.add(foot)
      thigh.add(knee)
      this.rig.add(thigh)
      this.thigh.push(thigh)
      this.knee.push(knee)
      this.foot.push(foot)
    }
    this.rig.add(buildHip(m))
    this.spine.position.y = 0.06
    this.rig.add(this.spine)
    this.spine.add(buildTorso(m))
    for (const s of [-1, 1]) {
      const sh = new THREE.Group()
      sh.position.set(s * 0.245, 0.5, 0)
      sh.add(buildUpperArm(m))
      const el = new THREE.Group()
      el.position.y = -0.31
      el.add(buildForearm(m, s))
      sh.add(el)
      this.spine.add(sh)
      this.shoulder.push(sh)
      this.elbow.push(el)
    }
  }

  private buildHead(m: Mats) {
    const head = this.headG
    head.position.set(0, 0.9, 0)
    head.scale.setScalar(1.08)
    this.spine.add(head)

    const h = new THREE.Group()
    h.add(mk(new THREE.SphereGeometry(0.21, 36, 28), m.skin, 0, 0, 0, 0.95, 1.04, 1))
    h.add(mk(new THREE.SphereGeometry(0.13, 22, 16), m.skin, 0, -0.1, -0.055, 1.05, 0.8, 0.95))
    for (const s of [-1, 1]) {
      h.add(mk(new THREE.SphereGeometry(0.062, 14, 10), m.skin, s * 0.1, -0.07, -0.12))
      h.add(mk(new THREE.SphereGeometry(0.045, 12, 10), m.skin, s * 0.2, -0.01, 0.02, 0.5, 1.1, 0.85))
      h.add(mk(new THREE.SphereGeometry(0.02, 10, 8), m.cyan, s * 0.226, -0.005, 0.02, 0.6, 1, 1))
      h.add(mk(new THREE.SphereGeometry(0.037, 12, 10), m.blush, s * 0.118, -0.058, -0.17, 1, 0.8, 0.3))
      for (const [fx, fy] of [[0.1, -0.035], [0.13, -0.045], [0.115, -0.07]] as const) {
        h.add(mk(new THREE.SphereGeometry(0.0055, 6, 5), m.freckle, s * fx, fy, -0.2))
      }
      // Sideburn / fade
      h.add(mk(new THREE.SphereGeometry(0.05, 10, 8), m.hair, s * 0.185, 0.04, -0.045, 0.4, 1.1, 0.75))
    }
    h.add(mk(new THREE.SphereGeometry(0.031, 12, 10), m.skin, 0, -0.045, -0.207, 1, 0.9, 1.1))
    // Hair: crown, back of head, side fade
    h.add(mk(new THREE.SphereGeometry(0.222, 32, 18, 0, Math.PI * 2, 0, 1.02), m.hair, 0, 0.03, 0.01, 0.97, 1.03, 1.04))
    h.add(mk(new THREE.SphereGeometry(0.222, 28, 16, 0, Math.PI, 0.9, 1.15), m.hair, 0, 0.02, 0.02, 0.97, 1.0, 1.02))
    bakeGroup(h, { cast: true })
    head.add(h)

    // Animated quiff
    this.quiff.position.set(0, 0.2, -0.08)
    const swoop = mk(new THREE.SphereGeometry(0.1, 16, 12), m.hair, 0, 0.04, -0.03, 1.25, 0.62, 1.55)
    swoop.rotation.x = -0.5
    this.quiff.add(swoop)
    for (const [qx, qz, sc] of [[-0.075, 0.02, 0.8], [0.08, 0.03, 0.85], [0, 0.12, 0.9]] as const) {
      this.quiff.add(mk(new THREE.SphereGeometry(0.075, 12, 10), m.hair, qx, 0.01, qz, sc, 0.6, 1.1))
    }
    const streak = mk(new THREE.SphereGeometry(0.07, 12, 8), m.streak, 0.055, 0.075, -0.06, 0.22, 0.5, 1.5)
    streak.rotation.x = -0.5
    this.quiff.add(streak)
    for (let i = 0; i < 3; i++) {
      const strand = mk(new THREE.ConeGeometry(0.022, 0.1, 6), m.hair, (i - 1) * 0.06, 0.07, -0.12 - i * 0.005)
      strand.rotation.x = -1.25
      this.quiff.add(strand)
    }
    bakeGroup(this.quiff, { cast: true })
    head.add(this.quiff)

    // Face
    for (const s of [-1, 1]) {
      const eye = new THREE.Group()
      eye.position.set(s * 0.083, 0.02, -0.19)
      eye.add(mk(new THREE.SphereGeometry(0.056, 18, 14), m.eyeWhite, 0, 0, 0, 1, 1.12, 0.5))
      eye.add(mk(new THREE.SphereGeometry(0.037, 16, 12), m.irisOuter, 0, -0.002, -0.015, 1, 1, 0.5))
      eye.add(mk(new THREE.SphereGeometry(0.027, 14, 10), m.irisInner, 0, -0.002, -0.02, 1, 1, 0.5))
      eye.add(mk(new THREE.SphereGeometry(0.015, 10, 8), m.dark, 0, -0.002, -0.025, 1, 1, 0.5))
      eye.add(mk(new THREE.SphereGeometry(0.0115, 8, 6), m.highlight, 0.013, 0.016, -0.031))
      eye.add(mk(new THREE.SphereGeometry(0.006, 8, 6), m.highlight, -0.011, -0.013, -0.031))
      const lash = mk(new THREE.CapsuleGeometry(0.004, 0.06, 3, 6), m.dark, 0, 0.062, -0.012)
      lash.rotation.z = Math.PI / 2
      eye.add(lash)
      const flick = mk(new THREE.CapsuleGeometry(0.0035, 0.022, 3, 6), m.dark, s * 0.034, 0.06, -0.012)
      flick.rotation.z = s * -0.9
      eye.add(flick)
      bakeGroup(eye, { cast: false })
      head.add(eye)
      this.eyes.push(eye)
      const brow = mk(new THREE.CapsuleGeometry(0.0125, 0.058, 4, 8), m.hair, s * 0.083, 0.092, -0.195)
      brow.rotation.z = Math.PI / 2
      head.add(brow)
      this.brows.push(brow)
    }
    const smile = mk(new THREE.TorusGeometry(0.05, 0.012, 8, 20, Math.PI), m.lip, 0, -0.082, -0.203)
    smile.rotation.z = Math.PI
    head.add(smile)
    for (const s of [-1, 1]) smile.add(mk(new THREE.SphereGeometry(0.013, 8, 6), m.lip, s * 0.05, 0, 0))
    const frown = mk(new THREE.TorusGeometry(0.042, 0.012, 8, 20, Math.PI), m.lip, 0, -0.118, -0.202)
    frown.visible = false
    head.add(frown)

    const open = new THREE.Group()
    open.position.set(0, -0.1, -0.196)
    open.add(mk(new THREE.SphereGeometry(0.042, 16, 12), m.lip, 0, 0, 0, 1.2, 1, 0.4))
    open.add(mk(new THREE.SphereGeometry(0.026, 10, 8), new THREE.MeshStandardMaterial({ color: 0xe86a7a, roughness: 0.6 }), 0, -0.014, -0.004, 1.2, 0.7, 0.4))
    open.add(mk(new RoundedBoxGeometry(0.06, 0.014, 0.012, 2, 0.004), m.white, 0, 0.026, -0.012))
    bakeGroup(open, { cast: false })
    open.visible = false
    head.add(open)

    const sweat = mk(new THREE.SphereGeometry(0.024, 12, 10), m.sweat, 0.19, 0.12, -0.1, 1, 1.3, 1)
    sweat.add(mk(new THREE.ConeGeometry(0.02, 0.05, 10), m.sweat, 0, 0.04, 0, 1, 1, 1))
    sweat.visible = false
    head.add(sweat)
    const tear = mk(new THREE.SphereGeometry(0.014, 8, 6), m.sweat, -0.1, -0.03, -0.205, 1, 1.4, 0.7)
    tear.visible = false
    head.add(tear)

    const stars = new THREE.Group()
    stars.position.y = 0.34
    for (let i = 0; i < 4; i++) {
      const st = mk(new THREE.OctahedronGeometry(0.03, 0), i % 2 ? m.gold : m.cyan)
      st.castShadow = false
      stars.add(st)
    }
    stars.visible = false
    head.add(stars)
    this.faceParts = { smile, frown, open, sweat, tear, stars }
  }

  private runPose(speed: number): Pose {
    const p = this.phase
    const s = Math.sin(p)
    const c = Math.cos(p)
    const lean = -0.12 - clamp(speed, 0, 40) * 0.004
    const thighL = 0.2 + 0.95 * s
    const thighR = 0.2 - 0.95 * s
    const kneeL = 0.35 + 0.95 * Math.max(0, c)
    const kneeR = 0.35 + 0.95 * Math.max(0, -c)
    return {
      pelvisY: 0.795 - 0.033 * Math.cos(2 * p),
      pitch: lean,
      spinePitch: -0.05,
      spineYaw: 0.18 * s,
      pelvisYaw: -0.12 * s,
      headPitch: -(lean - 0.05) * 0.85,
      thighL, thighR, kneeL, kneeR,
      footL: (kneeL - thighL) * 0.6,
      footR: (kneeR - thighR) * 0.6,
      shL: -0.8 * s, shR: 0.8 * s,
      splayL: 0.1, splayR: 0.1,
      elL: 1.3 - 0.35 * s,
      elR: 1.3 + 0.35 * s,
    }
  }

  update(dt: number, pose: MascotPose) {
    this.time += dt
    const freq = 6.5 + pose.speed * 0.24
    this.phase += dt * freq
    const dead = pose.mode === 'dead'
    const defeated = pose.mode === 'defeated'
    const grounded = pose.onGround || pose.sliding || dead || defeated

    // Landing squash on touchdown
    const airNow = !grounded
    if (this.wasAir && !airNow && !pose.sliding) this.wLand = 1
    this.wasAir = airNow
    this.wLand = Math.max(0, this.wLand - dt * 6)

    this.wAir = damp(this.wAir, airNow ? 1 : 0, 16, dt)
    this.wSlide = damp(this.wSlide, pose.sliding && !dead && !defeated ? 1 : 0, 16, dt)
    this.wDead = damp(this.wDead, dead ? 1 : 0, dead ? 14 : 4, dt)
    this.wDef = damp(this.wDef, defeated ? 1 : 0, 3.2, dt)

    let target = this.runPose(pose.speed)
    const air = mixPose(POSE_FALL, POSE_RISE, clamp(pose.vy / 10 + 0.5, 0, 1))
    target = mixPose(target, air, this.wAir)
    target = mixPose(target, POSE_SLIDE, this.wSlide)
    target = mixPose(target, POSE_DEAD, this.wDead)
    const breathe = Math.sin(this.time * 2.2)
    // Defeated reaction: shock, then a 9 s loop of
    // inhale + sigh with head and shoulders dropping, facepalm with sweat wipe, and a disappointed shrug.
    this.defT = defeated ? this.defT + dt : 0
    const ss = (lo: number, hi: number, x: number) => {
      const k = clamp((x - lo) / (hi - lo), 0, 1)
      return k * k * (3 - 2 * k)
    }
    const bump = (lo: number, hi: number, x: number) => Math.sin(Math.PI * clamp((x - lo) / (hi - lo), 0, 1))
    const shock = 1 - ss(1.5, 2.1, this.defT)
    const t = Math.max(0, this.defT - 2.0) % 9
    const wFace = ss(1.8, 2.5, t) * (1 - ss(5.0, 5.6, t))
    const wShrug = ss(5.7, 6.3, t) * (1 - ss(7.5, 8.1, t))
    const wipe = t > 3.0 && t < 4.1 ? Math.sin((t - 3.0) * 15) * Math.sin((Math.PI * (t - 3.0)) / 1.1) : 0
    const inhale = bump(0.1, 0.9, t)
    const sigh = bump(0.9, 2.0, t) + bump(4.9, 5.9, t) * 0.8
    this.shrugW = wShrug
    this.shockW = shock
    this.sighW = sigh
    this.inhaleW = inhale
    const H = POSE_DEFEATED
    const loop: Pose = {
      ...H,
      pitch: H.pitch + breathe * 0.02 + sigh * 0.05,
      spinePitch: H.spinePitch + breathe * 0.025 - wShrug * 0.18 - inhale * 0.07 + sigh * 0.1,
      headPitch: H.headPitch + Math.sin(this.time * 1.3) * 0.04 + (1 - wFace - wShrug) * 0.1 - wShrug * 0.2 + sigh * 0.12,
      shR: 0.15 + (H.shR - 0.15) * wFace + (0.6 - 0.15) * wShrug,
      elR: 0.12 + (H.elR - 0.12) * wFace + (1.35 - 0.12) * wShrug + Math.sin(this.time * 3) * 0.05 * wFace,
      splayR: 0.12 + (H.splayR - 0.12) * wFace + (0.55 - 0.12) * wShrug + wipe * 0.22,
      shL: 0.18 + (0.6 - 0.18) * wShrug,
      elL: 0.12 + (1.35 - 0.12) * wShrug,
      splayL: 0.12 + (0.55 - 0.12) * wShrug,
    }
    const idle = mixPose(loop, POSE_SHOCK, shock)
    target = mixPose(target, idle, this.wDef)
    target = { ...target, pelvisY: target.pelvisY - this.wLand * 0.07, kneeL: target.kneeL + this.wLand * 0.5, kneeR: target.kneeR + this.wLand * 0.5 }

    const roll = pose.lean
    const sway = Math.sin(this.phase) * 0.035 * (1 - this.wAir) * (1 - this.wSlide) * (1 - this.wDef)
    this.rig.position.y = target.pelvisY
    this.rig.rotation.set(target.pitch, target.pelvisYaw, roll + sway)
    this.spine.rotation.set(target.spinePitch, target.spineYaw, -roll * 0.35 - sway * 0.6)
    this.headG.rotation.set(target.headPitch, pose.lean * 1.4 - target.spineYaw * 0.8 + (Math.sin(this.time * 1.6) * 0.08 * (1 - this.shrugW) + Math.sin(this.time * 5) * 0.2 * this.shrugW) * this.wDef * (1 - this.shockW), -roll * 0.3 + sway * 0.4 + this.shrugW * 0.18 * this.wDef)
    this.thigh[0].rotation.set(target.thighL, 0, 0.03)
    this.thigh[1].rotation.set(target.thighR, 0, -0.03)
    this.knee[0].rotation.x = -target.kneeL
    this.knee[1].rotation.x = -target.kneeR
    this.foot[0].rotation.x = target.footL
    this.foot[1].rotation.x = target.footR
    this.shoulder[0].rotation.set(target.shL, 0, -target.splayL)
    this.shoulder[1].rotation.set(target.shR, 0, target.splayR)
    this.elbow[0].rotation.x = target.elL
    this.elbow[1].rotation.x = target.elR
    // Shoulders droop when sad and lift in the shrug
    const shoulderLift = this.wDef * ((this.shrugW * 0.05 - 0.025 + Math.sin(this.time * 2.2) * 0.008 + this.inhaleW * 0.03 - this.sighW * 0.035) * (1 - this.shockW) + this.shockW * 0.045)
    this.shoulder[0].position.y = 0.5 + shoulderLift
    this.shoulder[1].position.y = 0.5 + shoulderLift

    this.animateFace(dt, pose, dead, defeated)

    // Quiff secondary motion
    this.quiff.rotation.x = Math.sin(this.phase * 2 - 0.6) * 0.08 * (1 - this.wDef) + (this.wAir > 0.5 ? -0.18 : 0) + this.wDef * 0.25
    this.quiff.rotation.z = -pose.lean * 1.2
    this.yaw = damp(this.yaw, pose.lean * 1.8, 12, dt)
    this.root.rotation.y = this.yaw
  }

  private animateFace(dt: number, pose: MascotPose, dead: boolean, defeated: boolean) {
    const f = this.face
    const airborne = this.wAir > 0.5
    const sliding = this.wSlide > 0.5
    let goalBrow = 0
    let goalL = -0.18
    let goalR = 0.18
    let goalOpen = 0
    let goalFrown = 0
    let eyeGoal = 1
    if (dead) {
      goalBrow = 0.025; goalL = 0.35; goalR = -0.35; goalOpen = 1; eyeGoal = 0.2
    } else if (defeated) {
      if (this.shockW > 0.5) {
        goalBrow = 0.045; goalL = 0; goalR = 0; goalOpen = 0.95; eyeGoal = 1.4
      } else {
        goalBrow = 0.012; goalL = 0.5; goalR = -0.4; goalFrown = 1
        eyeGoal = this.shrugW > 0.5 || this.sighW > 0.5 ? 0.55 : 1.12
      }
    } else if (airborne) {
      goalBrow = 0.03; goalL = 0; goalR = 0; goalOpen = 0.8
    } else if (sliding) {
      goalL = 0.2; goalR = 0.05; eyeGoal = 0.65
    }
    f.brow = damp(f.brow, goalBrow, 14, dt)
    f.tiltL = damp(f.tiltL, goalL, 14, dt)
    f.tiltR = damp(f.tiltR, goalR, 14, dt)
    f.open = damp(f.open, goalOpen, 18, dt)
    f.frown = damp(f.frown, goalFrown, 10, dt)
    this.blink -= dt
    if (this.blink < 0.1 && !dead) eyeGoal = Math.min(eyeGoal, 0.08)
    if (this.blink < 0) this.blink = (defeated ? 1.2 : 2) + Math.random() * 2.2
    f.eye = damp(f.eye, eyeGoal, 40, dt)
    for (const e of this.eyes) e.scale.set(1, f.eye, 1)
    const wobble = defeated ? Math.sin(this.time * 7) * 0.006 : 0
    this.brows[0].position.y = 0.092 + f.brow + wobble
    this.brows[1].position.y = 0.092 + f.brow - wobble
    this.brows[0].rotation.z = Math.PI / 2 + f.tiltL
    this.brows[1].rotation.z = Math.PI / 2 + f.tiltR
    const showFrown = f.frown > 0.5
    this.smile.visible = f.open < 0.2 && !showFrown
    this.frown.visible = showFrown && f.open < 0.2
    this.frown.scale.set(1 + Math.sin(this.time * 6) * 0.05, 1 + Math.sin(this.time * 5) * 0.12, 1)
    this.mouthOpen.visible = f.open >= 0.2
    this.mouthOpen.scale.set(1, 0.35 + f.open * 1.0, 1)

    // Comic extras: sweat drop, tear, dizzy stars
    this.sweat.visible = defeated && this.wDef > 0.5 && this.shockW < 0.6
    this.sweat.position.y = 0.12 - ((this.time * 0.08) % 0.1)
    this.tear.visible = defeated && this.wDef > 0.6 && this.shockW < 0.4
    this.stars.visible = (dead || defeated) && this.wDef < 0.98
    if (this.stars.visible) {
      this.stars.children.forEach((st, i) => {
        const a = this.time * 4 + (i * Math.PI) / 2
        st.position.set(Math.cos(a) * 0.3, Math.sin(this.time * 3 + i) * 0.03, Math.sin(a) * 0.3)
        st.rotation.y = a
      })
    }
    void pose
  }
}

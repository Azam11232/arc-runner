import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { LANE_WIDTH } from './constants'
import { bakeGroup } from './merge'
import { makeCoinFaceTexture, makeJumpSignTexture, makeSlideSignTexture } from './surfaces'
import {
  makeContainerTexture,
  makeGlowTexture,
  makeHazardTexture,
  makeTrainSideTexture,
  TRAIN_LIVERIES,
} from './textures'

const geoCache = new Map<string, THREE.BufferGeometry>()

export function rbox(w: number, h: number, d: number, r = 0.08) {
  const key = `${w}|${h}|${d}|${r}`
  let g = geoCache.get(key)
  if (!g) {
    g = new RoundedBoxGeometry(w, h, d, 3, r)
    geoCache.set(key, g)
  }
  return g
}

export function box(w: number, h: number, d: number) {
  const key = `b${w}|${h}|${d}`
  let g = geoCache.get(key)
  if (!g) {
    g = new THREE.BoxGeometry(w, h, d)
    geoCache.set(key, g)
  }
  return g
}

const std = (color: number, roughness = 0.4, metalness = 0.1) => new THREE.MeshStandardMaterial({ color, roughness, metalness })

function buildMaterials() {
  const orange = makeHazardTexture('#ff7a1a', '#ffffff')
  orange.repeat.set(3, 1)
  const hazard = makeHazardTexture('#16202e', '#ffc21a')
  hazard.repeat.set(3, 1)
  const glow = makeGlowTexture()
  const containers = [
    makeContainerTexture('#ff6a00', '#10151f'),
    makeContainerTexture('#d3304a', '#ffc400'),
    makeContainerTexture('#8499b4', '#ffb020'),
  ]
  const coinFace = makeCoinFaceTexture()
  return {
    white: std(0xf4f8ff, 0.35),
    silver: std(0xcfd8e5, 0.22, 0.9),
    gunmetal: std(0x2a3547, 0.35, 0.7),
    navy: std(0x14284a, 0.4, 0.4),
    blue: std(0x2a73ff, 0.3, 0.2),
    wheel: std(0x8d9bb0, 0.25, 0.95),
    trainGlass: new THREE.MeshStandardMaterial({ color: 0x0b1f3d, roughness: 0.08, metalness: 0.7, emissive: 0x1a6fb0, emissiveIntensity: 0.4 }),
    cyan: new THREE.MeshBasicMaterial({ color: 0x59e6ff }),
    headlight: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    redLamp: new THREE.MeshBasicMaterial({ color: 0xff3b4e }),
    amberLamp: new THREE.MeshBasicMaterial({ color: 0xffb020 }),
    redSteady: new THREE.MeshBasicMaterial({ color: 0xff3b4e }),
    barrierStripe: new THREE.MeshStandardMaterial({ map: orange, roughness: 0.45, metalness: 0.05 }),
    jumpSign: new THREE.MeshStandardMaterial({ map: makeJumpSignTexture(), roughness: 0.4, metalness: 0.1 }),
    slideSign: new THREE.MeshStandardMaterial({ map: makeSlideSignTexture(), roughness: 0.4, metalness: 0.1 }),
    contact: new THREE.MeshBasicMaterial({ color: 0x050b18, transparent: true, opacity: 0.38, depthWrite: false }),
    glowAmber: new THREE.SpriteMaterial({ map: glow, color: 0xffb020, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.9, fog: false }),
    glowRed: new THREE.SpriteMaterial({ map: glow, color: 0xff3b4e, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.9, fog: false }),
    gateStripe: new THREE.MeshStandardMaterial({ map: hazard, roughness: 0.45, metalness: 0.1 }),
    containers: containers.map((t) => new THREE.MeshStandardMaterial({ map: t, roughness: 0.45, metalness: 0.35 })),
    headGlow: new THREE.SpriteMaterial({ map: glow, color: 0xdff2ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.9, fog: false }),
    coinRim: new THREE.MeshStandardMaterial({ color: 0xf2f7ff, metalness: 1, roughness: 0.14 }),
    coinFace: new THREE.MeshPhysicalMaterial({
      map: coinFace,
      emissive: 0xffffff,
      emissiveMap: coinFace,
      emissiveIntensity: 0.42,
      roughness: 0.22,
      metalness: 0.25,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
    }),
    coinRing: new THREE.MeshBasicMaterial({ color: 0xa8ecff }),
    coinHalo: new THREE.MeshBasicMaterial({ map: glow, color: 0x4da6ff, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false }),
  }
}

type Mats = ReturnType<typeof buildMaterials>
let mats: Mats | null = null
export function getMats(): Mats {
  if (!mats) mats = buildMaterials()
  return mats
}

const trainBodyMats = new Map<number, THREE.MeshStandardMaterial>()
const trainSideMats = new Map<string, THREE.MeshStandardMaterial>()

function trainBodyMat(variant: number) {
  let m = trainBodyMats.get(variant)
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: new THREE.Color(TRAIN_LIVERIES[variant].body), roughness: 0.28, metalness: 0.6, envMapIntensity: 1.2 })
    trainBodyMats.set(variant, m)
  }
  return m
}

function trainSideMat(variant: number, length: number) {
  const key = `${variant}|${length}`
  let m = trainSideMats.get(key)
  if (!m) {
    const tex = makeTrainSideTexture(TRAIN_LIVERIES[variant])
    tex.repeat.set((length - 0.8) / 12, 1)
    m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.28, metalness: 0.5, envMapIntensity: 1.1 })
    trainSideMats.set(key, m)
  }
  return m
}

const mesh = (g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) => {
  const o = new THREE.Mesh(g, m)
  o.position.set(x, y, z)
  return o
}

const protoCache = new Map<string, THREE.Group>()
function cloned(key: string, build: () => THREE.Group) {
  let proto = protoCache.get(key)
  if (!proto) {
    proto = build()
    protoCache.set(key, proto)
  }
  return proto.clone()
}

/** Train front faces +z (towards the player). */
export function createTrain(length: number, variant: number) {
  const v = ((variant % 4) + 4) % 4
  return cloned(`train|${v}|${length}`, () => {
    const m = getMats()
    const g = new THREE.Group()
    const front = length / 2
    const livery = TRAIN_LIVERIES[v]
    g.add(mesh(rbox(2, 2.8, length, 0.32), trainBodyMat(v), 0, 1.75, 0))
    for (const sx of [-1, 1]) {
      const side = mesh(new THREE.PlaneGeometry(length - 0.8, 2.6), trainSideMat(v, length), sx * 1.011, 1.78, 0)
      side.rotation.y = sx * (Math.PI / 2)
      g.add(side)
    }
    // Roof, AC units, pantograph
    g.add(mesh(rbox(1.7, 0.2, length - 1.4, 0.08), m.silver, 0, 3.2, 0))
    g.add(mesh(rbox(1.2, 0.28, 1.8, 0.07), m.white, 0, 3.4, -length * 0.22))
    g.add(mesh(rbox(1.2, 0.28, 1.8, 0.07), m.white, 0, 3.4, length * 0.2))
    g.add(mesh(box(0.08, 0.08, 1.1), m.gunmetal, 0.35, 3.34, 0))
    g.add(mesh(box(0.08, 0.08, 1.1), m.gunmetal, -0.35, 3.34, 0))
    // Undercarriage + bogies
    g.add(mesh(box(1.8, 0.3, length - 1), m.gunmetal, 0, 0.45, 0))
    for (const bz of [-length * 0.3, length * 0.3]) {
      g.add(mesh(box(1.5, 0.18, 2), m.navy, 0, 0.36, bz))
      for (const wx of [-0.82, 0.82]) {
        for (const wz of [-0.6, 0.6]) {
          const wheel = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.12, 14), m.wheel, wx, 0.3, bz + wz)
          wheel.rotation.z = Math.PI / 2
          g.add(wheel)
        }
      }
    }
    // Cab front
    g.add(mesh(rbox(1.84, 1.14, 0.08, 0.04), m.silver, 0, 2.55, front + 0.02))
    g.add(mesh(rbox(1.7, 1.0, 0.1, 0.05), m.trainGlass, 0, 2.55, front + 0.045))
    g.add(mesh(box(1.2, 0.07, 0.05), m.cyan, 0, 3.07, front + 0.05))
    g.add(mesh(box(0.8, 0.14, 0.04), m.cyan, 0, 1.95, front + 0.04))
    g.add(mesh(box(2.02, 0.2, 0.06), coloredMat(livery.stripe), 0, 1.45, front + 0.02))
    g.add(mesh(box(2.02, 0.06, 0.07), coloredMat(livery.accent, true), 0, 1.6, front + 0.02))
    g.add(mesh(rbox(1.96, 0.36, 0.22, 0.08), m.gateStripe, 0, 0.68, front + 0.05))
    for (const sx of [-1, 1]) {
      g.add(mesh(new THREE.SphereGeometry(0.15, 14, 10), m.headlight, sx * 0.62, 1.05, front + 0.07))
      const ring = mesh(new THREE.TorusGeometry(0.16, 0.025, 8, 18), m.silver, sx * 0.62, 1.05, front + 0.05)
      g.add(ring)
      g.add(mesh(new THREE.SphereGeometry(0.06, 8, 6), m.redSteady, sx * 0.85, 0.72, front + 0.17))
    }
    bakeGroup(g, { cast: true, receive: false })
    for (const sx of [-1, 1]) {
      const spr = new THREE.Sprite(m.headGlow)
      spr.scale.set(1.5, 1.5, 1)
      spr.position.set(sx * 0.62, 1.05, front + 0.35)
      g.add(spr)
    }
    return g
  })
}

const colorMats = new Map<string, THREE.Material>()
function coloredMat(hex: string, basic = false) {
  const key = `${hex}|${basic}`
  let m = colorMats.get(key)
  if (!m) {
    m = basic ? new THREE.MeshBasicMaterial({ color: hex }) : new THREE.MeshStandardMaterial({ color: hex, roughness: 0.4, metalness: 0.3 })
    colorMats.set(key, m)
  }
  return m
}

const glowSprite = (mat: THREE.SpriteMaterial, x: number, y: number, z: number, size: number) => {
  const sp = new THREE.Sprite(mat)
  sp.position.set(x, y, z)
  sp.scale.set(size, size, 1)
  return sp
}

const contactShadow = (w: number, d: number) => {
  const geo = new THREE.PlaneGeometry(w, d)
  geo.rotateX(-Math.PI / 2)
  const o = new THREE.Mesh(geo, getMats().contact)
  o.position.y = 0.1
  return o
}

/** Low jumpable block: orange/black hazard body, yellow JUMP chevrons, steel brackets, beacons. */
export function createBarrier() {
  return cloned('barrier', () => {
    const m = getMats()
    const g = new THREE.Group()
    const w = LANE_WIDTH - 0.2
    g.add(mesh(rbox(w, 0.6, 0.66, 0.08), m.jumpSign, 0, 0.4, 0))
    g.add(mesh(rbox(w + 0.04, 0.13, 0.54, 0.04), m.gateStripe, 0, 0.76, 0))
    g.add(mesh(box(w + 0.1, 0.05, 0.8), m.gunmetal, 0, 0.03, 0))
    for (const sx of [-1, 1]) {
      g.add(mesh(rbox(0.12, 0.78, 0.72, 0.03), m.silver, sx * (w / 2), 0.42, 0))
      g.add(mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.26, 8), m.gunmetal, sx * 0.8, 0.95, 0))
      g.add(mesh(new THREE.SphereGeometry(0.13, 14, 10), sx > 0 ? m.amberLamp : m.redLamp, sx * 0.8, 1.14, 0))
    }
    g.add(mesh(box(w - 0.4, 0.04, 0.02), m.white, 0, 0.7, 0.34))
    bakeGroup(g, { cast: true })
    g.add(contactShadow(w + 0.6, 1.3))
    for (const sx of [-1, 1]) g.add(glowSprite(sx > 0 ? m.glowAmber : m.glowRed, sx * 0.8, 1.14, 0, 1.2))
    return g
  })
}

/** Overhead slide gate: tall steel posts, yellow/black SLIDE bar, red top lights, amber underlight. */
export function createGate() {
  return cloned('gate', () => {
    const m = getMats()
    const g = new THREE.Group()
    const w = LANE_WIDTH - 0.1
    for (const sx of [-1, 1]) {
      g.add(mesh(rbox(0.26, 2.9, 0.56, 0.05), m.gunmetal, sx * (w / 2 + 0.06), 1.45, 0))
      g.add(mesh(box(0.28, 0.9, 0.58), m.gateStripe, sx * (w / 2 + 0.06), 0.45, 0))
      g.add(mesh(box(0.05, 1.6, 0.06), m.cyan, sx * (w / 2 - 0.08), 1.7, 0.29))
      g.add(mesh(new THREE.SphereGeometry(0.14, 14, 10), m.redLamp, sx * (w / 2 + 0.06), 3.04, 0))
    }
    g.add(mesh(rbox(w, 1.35, 0.56, 0.08), m.slideSign, 0, 1.78, 0))
    g.add(mesh(rbox(w + 0.2, 0.12, 0.64, 0.04), m.silver, 0, 2.52, 0))
    g.add(mesh(box(w - 0.1, 0.08, 0.3), m.amberLamp, 0, 1.08, 0.08))
    bakeGroup(g, { cast: true })
    g.add(contactShadow(w + 0.8, 1.2))
    for (const sx of [-1, 1]) g.add(glowSprite(m.glowRed, sx * (w / 2 + 0.06), 3.04, 0, 1.4))
    g.add(glowSprite(m.glowAmber, 0, 1.0, 0.1, 2.2))
    return g
  })
}

/** Dangerous cargo block: stacked hazard-banded containers with beacons. */
export function createCrate(variant = 0) {
  const v = ((variant % 3) + 3) % 3
  return cloned(`crate|${v}`, () => {
    const m = getMats()
    const g = new THREE.Group()
    g.add(mesh(rbox(2, 1.28, 2.2, 0.05), m.containers[v], 0, 0.66, 0))
    g.add(mesh(rbox(2, 1.28, 2.2, 0.05), m.containers[(v + 1) % 3], 0, 1.96, 0))
    g.add(mesh(box(2.06, 0.2, 2.26), m.gateStripe, 0, 0.12, 0))
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        for (const y of [0.04, 1.33, 2.62]) g.add(mesh(box(0.16, 0.12, 0.16), m.gunmetal, sx * 0.97, y, sz * 1.07))
        g.add(mesh(box(0.06, 2.6, 0.06), m.silver, sx * 1.02, 1.3, sz * 1.12))
      }
    }
    g.add(mesh(box(2.06, 0.1, 2.26), m.gateStripe, 0, 2.64, 0))
    g.add(mesh(new THREE.SphereGeometry(0.17, 14, 10), m.amberLamp, 0, 2.84, 0))
    bakeGroup(g, { cast: true })
    g.add(contactShadow(2.8, 3))
    g.add(glowSprite(m.glowAmber, 0, 2.84, 0, 1.4))
    return g
  })
}

// ---------- Coins ----------

export interface CoinParts {
  rim: THREE.BufferGeometry
  face: THREE.BufferGeometry
  ring: THREE.BufferGeometry
  halo: THREE.BufferGeometry
}

let coinParts: CoinParts | null = null

export function getCoinParts(): CoinParts {
  if (coinParts) return coinParts
  const profile = [
    [0.335, 0.08], [0.4, 0.08], [0.458, 0.056], [0.486, 0.0], [0.458, -0.056], [0.4, -0.08], [0.335, -0.08], [0.335, 0.08],
  ].map(([r, y]) => new THREE.Vector2(r, y))
  const rim = new THREE.LatheGeometry(profile, 120)
  // Reeded (knurled) outer edge
  const pos = rim.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const r = Math.hypot(x, z)
    if (r > 0.45) {
      const k = 1 + 0.012 * Math.cos(Math.atan2(z, x) * 90)
      pos.setXYZ(i, x * k, pos.getY(i), z * k)
    }
  }
  rim.computeVertexNormals()
  rim.rotateX(Math.PI / 2)
  const faceFront = new THREE.CircleGeometry(0.34, 64).translate(0, 0, 0.066)
  const faceBack = new THREE.CircleGeometry(0.34, 64).rotateY(Math.PI).translate(0, 0, -0.066)
  const face = mergeGeometries([faceFront, faceBack], false)
  const ringFront = new THREE.TorusGeometry(0.336, 0.01, 6, 64).translate(0, 0, 0.07)
  const ringBack = new THREE.TorusGeometry(0.336, 0.01, 6, 64).translate(0, 0, -0.07)
  const ring = mergeGeometries([ringFront, ringBack], false)
  coinParts = { rim, face, ring, halo: new THREE.PlaneGeometry(2.1, 2.1) }
  return coinParts
}

/** A standalone coin mesh group (used for large floating landmarks). */
export function createCoin() {
  const m = getMats()
  const p = getCoinParts()
  const g = new THREE.Group()
  g.add(new THREE.Mesh(p.rim, m.coinRim), new THREE.Mesh(p.face, m.coinFace), new THREE.Mesh(p.ring, m.coinRing))
  return g
}

/** Drives blinking warning lamps. */
export function tickModels(time: number) {
  const m = getMats()
  const a = Math.floor(time * 3) % 2 === 0
  m.amberLamp.color.setHex(a ? 0xffb020 : 0x6b4308)
  m.redLamp.color.setHex(a ? 0x6b1620 : 0xff3b4e)
  m.glowAmber.opacity = a ? 0.95 : 0.15
  m.glowRed.opacity = a ? 0.15 : 0.95
}

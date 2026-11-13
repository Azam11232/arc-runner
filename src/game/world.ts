import * as THREE from 'three'
import { LANE_WIDTH, SEGMENT_COUNT, SEGMENT_LENGTH } from './constants'
import { bakeGroup } from './merge'
import { box, createCoin, createTrain, getMats, rbox } from './models'
import { type FacadeKind, makeFacadeTexture, makeGravelTexture } from './surfaces'
import { makeBillboardTexture, makePlazaTexture, makePodiumTexture } from './textures'

const L = SEGMENT_LENGTH
const rand = (a: number, b: number) => a + Math.random() * (b - a)
const pick = <T,>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)]
const TILE_W = 14.4
const TILE_H = 57.6

interface Segment {
  group: THREE.Group
  coins: THREE.Object3D[]
}

interface SideTrain {
  group: THREE.Group
  rel: number
  wait: number
  active: boolean
}

function setUv(geo: THREE.BufferGeometry, from: number, count: number, su: number, sv: number, ou: number) {
  const uv = geo.attributes.uv
  for (let i = from; i < from + count; i++) uv.setXY(i, uv.getX(i) * su + ou, uv.getY(i) * sv)
}

function flatUv(geo: THREE.BufferGeometry, from: number, count: number) {
  const uv = geo.attributes.uv
  for (let i = from; i < from + count; i++) uv.setXY(i, 0.012, 0.012)
}

const TINTS: [number, number, number][] = [
  [1, 1, 1],
  [0.86, 0.94, 1],
  [0.78, 0.88, 1],
  [0.9, 1, 1],
  [0.7, 0.8, 0.95],
  [1, 0.97, 0.92],
]

function tint(geo: THREE.BufferGeometry) {
  const t = pick(TINTS)
  const n = geo.attributes.position.count
  const arr = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) arr.set(t, i * 3)
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3))
  return geo
}

/** Box with facade UVs scaled to real-world size so panes keep a constant scale. */
function facadeBox(w: number, h: number, d: number, tileH = TILE_H) {
  const geo = new THREE.BoxGeometry(w, h, d)
  const ou = Math.random()
  setUv(geo, 0, 8, d / TILE_W, h / tileH, ou)
  setUv(geo, 16, 8, w / TILE_W, h / tileH, ou)
  flatUv(geo, 8, 8)
  return tint(geo)
}

function facadeCylinder(r: number, h: number) {
  const geo = new THREE.CylinderGeometry(r, r, h, 28, 1)
  const side = 29 * 2
  setUv(geo, 0, side, (Math.PI * 2 * r) / TILE_W, h / TILE_H, Math.random())
  flatUv(geo, side, geo.attributes.uv.count - side)
  return tint(geo)
}

function makeWorldMats() {
  const plaza = makePlazaTexture()
  plaza.repeat.set(22, 5)
  const gravel = makeGravelTexture()
  gravel.repeat.set(4, 10)
  const std = (color: number, roughness = 0.5, metalness = 0.05) => new THREE.MeshStandardMaterial({ color, roughness, metalness })
  return {
    plaza: new THREE.MeshBasicMaterial({ map: plaza }),
    bed: new THREE.MeshStandardMaterial({ map: gravel, roughness: 0.85, metalness: 0.05 }),
    sleeper: std(0x8a9bb4, 0.5, 0.3),
    trough: std(0x4c5d78, 0.5, 0.4),
    railBed: std(0x131f36, 0.9),
    block: std(0xdde6f3, 0.55),
    blockDark: std(0x6f86a8, 0.6),
    rail: std(0xe6eefa, 0.18, 0.9),
    plat: std(0xeef3fa, 0.55),
    safety: std(0xffc21a, 0.6),
    wood: std(0xb08358, 0.7),
    trunk: std(0x5b4636, 0.9),
    leaf: std(0x3fae7c, 0.8),
    leaf2: std(0x6fcb9a, 0.8),
    lamp: new THREE.MeshBasicMaterial({ color: 0xfff3d0 }),
  }
}


export class World {
  readonly group = new THREE.Group()
  private segments: Segment[] = []
  private sideTrains: SideTrain[] = []
  private facade: Record<FacadeKind, THREE.MeshStandardMaterial>
  private podium: THREE.MeshStandardMaterial
  private mats: ReturnType<typeof makeWorldMats>
  private billboards: THREE.MeshBasicMaterial[]

  constructor() {
    const mk = (kind: FacadeKind, glass: boolean) =>
      new THREE.MeshStandardMaterial({ map: makeFacadeTexture(kind), roughness: glass ? 0.14 : 0.6, metalness: glass ? 0.5 : 0.05, vertexColors: true })
    this.facade = { glassDeep: mk('glassDeep', true), glassSilver: mk('glassSilver', true), glassTeal: mk('glassTeal', true), whiteFin: mk('whiteFin', false) }
    this.podium = new THREE.MeshStandardMaterial({ map: makePodiumTexture(), roughness: 0.4, metalness: 0.15 })
    this.mats = makeWorldMats()
    this.billboards = [
      new THREE.MeshBasicMaterial({ map: makeBillboardTexture('ARC', '#1c5fd8', '#35c8ee') }),
      new THREE.MeshBasicMaterial({ map: makeBillboardTexture('USDC', '#2775ca', '#6db4f7') }),
      new THREE.MeshBasicMaterial({ map: makeBillboardTexture('RUN', '#122d45', '#2a73ff') }),
    ]

    for (let i = 0; i < SEGMENT_COUNT; i++) {
      const seg = this.buildSegment(i)
      seg.group.position.z = 60 - i * L
      this.segments.push(seg)
      this.group.add(seg.group)
    }

    for (const side of [-1, 1]) {
      for (let k = 0; k < 2; k++) {
        const train = createTrain(24, k + (side > 0 ? 1 : 0) + 1)
        train.position.x = side * 10
        train.visible = false
        this.group.add(train)
        this.sideTrains.push({ group: train, rel: 0, wait: rand(0.5, 4) + k * 3, active: false })
      }
    }
  }

  private buildSegment(index: number): Segment {
    const m = getMats()
    const w = this.mats
    const group = new THREE.Group()
    const recv = new THREE.Group()
    const stat = new THREE.Group()
    const coins: THREE.Object3D[] = []

    const put = (parent: THREE.Group, geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, ry = 0) => {
      const o = new THREE.Mesh(geo, mat)
      o.position.set(x, y, z)
      o.rotation.y = ry
      parent.add(o)
      return o
    }

    // Plaza ground
    const ground = put(stat, new THREE.PlaneGeometry(176, L), w.plaza, 0, -0.05, 0)
    ground.rotation.x = -Math.PI / 2

    // Track bed, rails, lane lines
    put(recv, box(9.6, 0.2, L), w.bed, 0, -0.1, 0)
    for (const lane of [-1, 0, 1]) {
      for (const dx of [-0.62, 0.62]) {
        put(recv, box(0.1, 0.14, L), w.rail, lane * LANE_WIDTH + dx, 0.08, 0)
        put(recv, box(0.36, 0.03, L), w.railBed, lane * LANE_WIDTH + dx, 0.015, 0)
        put(stat, box(0.025, 0.02, L), m.cyan, lane * LANE_WIDTH + dx * 0.9, 0.152, 0)
      }
    }
    for (const x of [-LANE_WIDTH * 1.5, -LANE_WIDTH * 0.5, LANE_WIDTH * 0.5, LANE_WIDTH * 1.5]) {
      // Concrete cable trough between lanes with a cyan light strip
      put(recv, rbox(0.24, 0.12, L - 0.1, 0.03), w.trough, x, 0.05, 0)
      put(stat, box(0.07, 0.02, L - 0.3), m.cyan, x, 0.115, 0)
    }

    const perLane = Math.floor(L / 1.2)
    const sleepers = new THREE.InstancedMesh(rbox(2.0, 0.08, 0.3, 0.025), w.sleeper, perLane * 3)
    const dummy = new THREE.Object3D()
    let si = 0
    for (const lane of [-1, 0, 1]) {
      for (let k = 0; k < perLane; k++) {
        dummy.position.set(lane * LANE_WIDTH, 0.03, -L / 2 + k * 1.2 + 0.6)
        dummy.updateMatrix()
        sleepers.setMatrixAt(si++, dummy.matrix)
      }
    }
    sleepers.receiveShadow = true
    group.add(sleepers)

    for (const side of [-1, 1]) {
      // Platform, safety edge, railing
      put(recv, box(3, 0.6, L), w.plat, side * 6.2, 0.3, 0)
      put(recv, box(0.3, 0.02, L), w.safety, side * 4.95, 0.61, 0)
      put(stat, box(0.1, 0.04, L), m.cyan, side * 4.78, 0.62, 0)
      for (let bz = -L / 2 + 2; bz < L / 2; bz += 4) {
        put(recv, rbox(0.32, 0.14, 3.7, 0.04), (bz / 4) % 2 === 0 ? w.block : w.blockDark, side * 4.98, 0.66, bz + 0.1)
      }
      for (const bz of [-L / 2 + 5, L / 2 - 5]) {
        put(recv, rbox(0.55, 0.75, 3, 0.1), w.block, side * 8.7, 0.37, bz)
        put(stat, box(0.5, 0.05, 2.6), m.cyan, side * 8.7, 0.77, bz)
      }
      put(stat, box(0.06, 0.06, L), m.silver, side * 7.55, 1.1, 0)
      for (let pz = -L / 2 + 2; pz < L / 2; pz += 5) put(stat, box(0.07, 0.5, 0.07), m.silver, side * 7.55, 0.85, pz)

      // Street lights
      for (const pz of [-L / 4, L / 4]) {
        put(stat, new THREE.CylinderGeometry(0.06, 0.1, 6.4, 10), m.gunmetal, side * 7.2, 3.2, pz)
        put(stat, new THREE.CylinderGeometry(0.16, 0.2, 0.3, 10), m.gunmetal, side * 7.2, 0.75, pz)
        const arm = put(stat, box(1.6, 0.08, 0.08), m.gunmetal, side * 6.5, 6.4, pz)
        arm.rotation.z = side * 0.06
        put(stat, rbox(0.7, 0.1, 0.26, 0.04), w.lamp, side * 5.8, 6.28, pz)
        put(stat, rbox(0.8, 0.06, 0.32, 0.03), m.white, side * 5.8, 6.4, pz)
      }

      // Benches + planters on the platform
      for (const bz of [-9, 11]) {
        put(stat, box(0.45, 0.08, 1.5), w.wood, side * 6.6, 0.95, bz)
        put(stat, box(0.08, 0.5, 1.5), w.wood, side * 6.85, 1.2, bz)
        for (const lz of [-0.6, 0.6]) put(stat, box(0.08, 0.35, 0.08), m.gunmetal, side * 6.6, 0.77, bz + lz)
      }
      for (const pz of [-1, 6]) {
        put(stat, rbox(0.9, 0.55, 0.9, 0.08), m.white, side * 6.7, 0.87, pz)
        put(stat, new THREE.SphereGeometry(0.55, 8, 6), pick([w.leaf, w.leaf2]), side * 6.7, 1.5, pz)
      }

      // Side track + fence
      put(recv, box(3.2, 0.14, L), w.bed, side * 10, -0.03, 0)
      for (const dx of [-0.7, 0.7]) put(recv, box(0.1, 0.14, L), w.rail, side * 10 + dx, 0.08, 0)
      put(stat, box(0.06, 0.9, L), m.gunmetal, side * 8.2, 0.45, 0)

      // Plaza trees
      for (const tz of [-L / 2 + 4, L / 2 - 8]) {
        const tx = side * rand(13, 14.5)
        put(stat, new THREE.CylinderGeometry(0.12, 0.2, 2.4, 7), w.trunk, tx, 1.2, tz)
        put(stat, new THREE.SphereGeometry(1.5, 8, 6), pick([w.leaf, w.leaf2]), tx, 3.4, tz, 0).scale.set(1, 0.9, 1)
        put(stat, new THREE.SphereGeometry(1.05, 8, 6), pick([w.leaf, w.leaf2]), tx + 0.7, 4.3, tz + 0.3)
      }

      // Billboard
      if ((index + (side > 0 ? 1 : 0)) % 3 === 0) {
        const bz = rand(-8, 8)
        const bx = side * 12.4
        put(stat, box(0.25, 5.2, 0.25), m.gunmetal, bx + side * 0.5, 2.6, bz - 2.2)
        put(stat, box(0.25, 5.2, 0.25), m.gunmetal, bx + side * 0.5, 2.6, bz + 2.2)
        put(stat, box(0.3, 3.1, 6.6), m.gunmetal, bx + side * 0.3, 6.4, bz)
        const board = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 2.8), this.billboards[(index + (side > 0 ? 1 : 0)) % 3])
        board.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2
        board.position.set(bx, 6.4, bz)
        group.add(board)
      }

      // Skyline: three bands of towers
      for (const band of [0, 1, 2]) {
        let z = -L / 2 + rand(0, 3)
        const step = band === 2 ? 1.6 : 1
        while (z < L / 2) {
          const bw = rand(7, 13)
          const bd = rand(9, 15)
          const h = band === 0 ? rand(20, 46) : band === 1 ? rand(42, 92) : rand(80, 140)
          const x = side * (band === 0 ? rand(17, 20) + bw / 2 : band === 1 ? rand(31, 38) + bw / 2 : rand(54, 66) + bw / 2)
          this.addTower(stat, x, z + bd / 2, bw, h, bd, band, side)
          z += (bd + rand(2, 7)) * step
        }
      }
    }

    // Overhead line gantry
    const gz = -L / 2 + 3
    for (const sx of [-1, 1]) {
      put(stat, box(0.2, 7.6, 0.2), m.gunmetal, sx * 5.5, 3.8, gz)
      put(stat, box(0.5, 0.2, 0.5), m.gunmetal, sx * 5.5, 0.3, gz)
    }
    put(stat, box(11.4, 0.18, 0.22), m.gunmetal, 0, 7.5, gz)
    put(stat, box(11.4, 0.1, 0.1), m.silver, 0, 6.9, gz)
    for (const sx of [-1, 1]) {
      const brace = put(stat, box(0.09, 1.9, 0.09), m.gunmetal, sx * 5.0, 6.7, gz)
      brace.rotation.z = sx * 0.75
      put(stat, box(0.5, 0.08, 0.3), m.cyan, sx * 5.5, 7.62, gz)
    }
    for (const lx of [-LANE_WIDTH, 0, LANE_WIDTH]) {
      put(stat, box(0.035, 0.035, L), m.silver, lx, 6.3, 0)
      put(stat, box(0.02, 0.6, 0.02), m.silver, lx, 6.6, gz)
    }
    put(stat, box(0.05, 0.05, L), m.gunmetal, 0, 6.85, 0)

    // Arc gate over the track: lit truss with radial struts and pylons
    if (index % 2 === 0) {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(8.2, 0.15, 10, 64, Math.PI), m.cyan)
      stat.add(arch)
      const outer = new THREE.Mesh(new THREE.TorusGeometry(8.2, 0.3, 8, 64, Math.PI), m.silver)
      outer.scale.set(1, 1, 0.5)
      outer.position.z = -0.12
      stat.add(outer)
      const inner = new THREE.Mesh(new THREE.TorusGeometry(7.3, 0.1, 8, 64, Math.PI), m.gunmetal)
      stat.add(inner)
      for (let i = 1; i < 28; i++) {
        const a = (i / 28) * Math.PI
        const strut = new THREE.Mesh(box(0.07, 0.9, 0.07), m.gunmetal)
        strut.position.set(Math.cos(a) * 7.75, Math.sin(a) * 7.75, 0)
        strut.rotation.z = a - Math.PI / 2
        stat.add(strut)
      }
      for (const sx of [-1, 1]) {
        put(stat, rbox(0.9, 1.2, 0.9, 0.1), m.gunmetal, sx * 8.2, 0.6, 0)
        put(stat, box(0.1, 1.0, 0.1), m.cyan, sx * 8.2, 0.7, -0.46)
      }
    }

    // Floating coin landmark
    const big = createCoin()
    big.scale.setScalar(rand(5, 7.5))
    big.position.set((index % 2 === 0 ? -1 : 1) * rand(26, 34), rand(22, 34), rand(-L / 2, L / 2))
    group.add(big)
    coins.push(big)

    bakeGroup(recv, { cast: false, receive: true })
    bakeGroup(stat, { cast: false, receive: false })
    group.add(recv, stat)
    for (const part of [...recv.children, ...stat.children]) {
      part.updateMatrix()
      part.matrixAutoUpdate = false
    }
    return { group, coins }
  }

  private addTower(parent: THREE.Group, x: number, z: number, w: number, h: number, d: number, band: number, side: number) {
    const m = getMats()
    const kinds: FacadeKind[] = ['glassDeep', 'glassDeep', 'glassDeep', 'glassSilver', 'glassSilver', 'glassTeal', 'whiteFin', 'whiteFin']
    const kind = pick(kinds)
    const fac = this.facade[kind]
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, px: number, py: number, pz: number) => {
      const o = new THREE.Mesh(geo, mat)
      o.position.set(px, py, pz)
      parent.add(o)
    }

    const podiumH = band === 2 ? 0 : 7
    if (podiumH > 0) {
      const pg = facadeBox(w + 1.6, podiumH, d + 1.6, 7)
      add(pg, this.podium, x, podiumH / 2, z)
      add(box(w + 1.9, 0.3, d + 1.9), m.white, x, podiumH + 0.15, z)
      add(box(w + 1.75, 0.07, d + 1.75), m.cyan, x, podiumH - 0.1, z)
    }

    const round = band < 2 && Math.random() < 0.22
    const shaftH = h - podiumH
    if (round) {
      const r = Math.min(w, d) * 0.5
      add(facadeCylinder(r, shaftH), fac, x, podiumH + shaftH / 2, z)
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r + 0.05, 0.14, 8, 28), m.cyan)
      ring.rotation.x = Math.PI / 2
      ring.position.set(x, h, z)
      parent.add(ring)
    } else {
      const tiered = Math.random() < 0.45
      const mainH = tiered ? shaftH * 0.72 : shaftH
      add(facadeBox(w, mainH, d), fac, x, podiumH + mainH / 2, z)
      for (let ly = podiumH + 14; ly < podiumH + mainH - 4; ly += 18) add(box(w + 0.3, 0.22, d + 0.3), m.silver, x, ly, z)
      let topY = podiumH + mainH
      if (tiered) {
        const tw = w * 0.74
        const td = d * 0.74
        const th = shaftH - mainH
        add(facadeBox(tw, th, td), fac, x, topY + th / 2, z)
        add(box(w + 0.2, 0.4, d + 0.2), m.white, x, topY + 0.2, z)
        topY += th
      }
      // Roof details
      const rw = (tiered ? w * 0.74 : w) * 0.9
      const rd = (tiered ? d * 0.74 : d) * 0.9
      add(box(rw + 0.2, 0.3, rd + 0.2), m.cyan, x, topY + 0.15, z)
      add(box(rw * 0.4, 1.8, rd * 0.4), m.gunmetal, x - rw * 0.15, topY + 1.2, z)
      if (Math.random() < 0.5) {
        const sh = rand(4, 11)
        add(new THREE.CylinderGeometry(0.07, 0.2, sh, 6), m.silver, x + rw * 0.2, topY + sh / 2, z)
        add(new THREE.SphereGeometry(0.16, 8, 6), m.redLamp, x + rw * 0.2, topY + sh, z)
      }
      // Vertical LED edge on the corners facing the track
      if (band < 2) {
        const ex = x - side * (w / 2 + 0.05)
        for (const ez of [-d / 2, d / 2]) add(box(0.14, mainH * 0.9, 0.14), m.cyan, ex, podiumH + mainH * 0.5, z + ez)
      }
    }
  }

  update(dt: number, speed: number) {
    const move = speed * dt
    for (const seg of this.segments) {
      seg.group.position.z += move
      if (seg.group.position.z - L / 2 > 80) seg.group.position.z -= SEGMENT_COUNT * L
      for (const c of seg.coins) c.rotation.y += dt * 0.7
    }

    for (const st of this.sideTrains) {
      if (!st.active) {
        st.wait -= dt
        if (st.wait <= 0) {
          st.active = true
          const away = Math.random() < 0.5
          st.rel = away ? -rand(45, 60) : rand(50, 70)
          st.group.rotation.y = away ? Math.PI : 0
          st.group.position.z = away ? 12 : -180
          st.group.visible = true
        }
        continue
      }
      st.group.position.z += (speed + st.rel) * dt
      const away = st.rel < 0
      const out = away ? st.group.position.z < -190 : st.group.position.z > 60
      if (out) {
        st.active = false
        st.group.visible = false
        st.wait = rand(2, 7)
      }
    }
  }
}

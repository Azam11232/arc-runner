import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { bakeGroup } from './merge'
import { makePufferTextures, makeRibTextures, makeTwillTextures } from './surfaces'

const rb = (w: number, h: number, d: number, r = 0.02) => new RoundedBoxGeometry(w, h, d, 3, r)

export function mk(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(geo, mat)
  m.position.set(x, y, z)
  m.scale.set(sx, sy, sz)
  m.castShadow = true
  return m
}

function fabric(maps: { map: THREE.Texture; bump: THREE.Texture }, rx: number, ry: number, rough: number, bumpScale: number, metal = 0.04) {
  maps.map.repeat.set(rx, ry)
  maps.bump.repeat.set(rx, ry)
  return new THREE.MeshStandardMaterial({ map: maps.map, bumpMap: maps.bump, bumpScale, roughness: rough, metalness: metal })
}

export function createMats() {
  const std = (color: number, roughness = 0.5, metalness = 0.03) => new THREE.MeshStandardMaterial({ color, roughness, metalness })
  return {
    skin: std(0xd89a6e, 0.52),
    lip: std(0x9a3b45, 0.45),
    hair: std(0x2a1a12, 0.38, 0.12),
    streak: new THREE.MeshStandardMaterial({ color: 0x35d6ff, roughness: 0.3, emissive: 0x0f7fa8, emissiveIntensity: 0.6 }),
    pufferTorso: fabric(makePufferTextures('#2a6df0', '#1a47b3'), 3, 1.5, 0.4, 1.6),
    pufferSleeve: fabric(makePufferTextures('#2a6df0', '#1a47b3'), 2, 1, 0.4, 1.4),
    rib: fabric(makeRibTextures('#14284a'), 6, 1, 0.8, 1.2),
    ribWhite: fabric(makeRibTextures('#eef3fa'), 6, 1, 0.8, 1.2),
    twill: fabric(makeTwillTextures('#222f4d'), 3, 3, 0.7, 0.8),
    white: std(0xf4f8ff, 0.45),
    hoodie: std(0xf1f5fb, 0.85),
    navy: std(0x14284a, 0.5, 0.1),
    blue: std(0x2a6df0, 0.4, 0.06),
    cyan: new THREE.MeshBasicMaterial({ color: 0x59e6ff }),
    dark: new THREE.MeshBasicMaterial({ color: 0x1a0f0c }),
    eyeWhite: std(0xffffff, 0.18),
    irisOuter: std(0x7a4f2a, 0.2),
    irisInner: std(0x3b2416, 0.2),
    highlight: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    blush: new THREE.MeshStandardMaterial({ color: 0xf08a8a, roughness: 0.8, transparent: true, opacity: 0.7 }),
    freckle: std(0x8a5535, 0.8),
    leather: std(0xffffff, 0.28, 0.04),
    shoeMesh: std(0x213a66, 0.7),
    shoeBlue: std(0x2a73ff, 0.35, 0.1),
    foam: std(0xeaf1fb, 0.55),
    tread: std(0x0f1c33, 0.9),
    silver: std(0xd6dfeb, 0.25, 0.9),
    sweat: new THREE.MeshStandardMaterial({ color: 0x8fe3ff, roughness: 0.1, transparent: true, opacity: 0.85, emissive: 0x2a9fd0, emissiveIntensity: 0.4 }),
    gold: new THREE.MeshBasicMaterial({ color: 0xffd23f }),
  }
}
export type Mats = ReturnType<typeof createMats>

export function buildThigh(m: Mats, s: number) {
  const g = new THREE.Group()
  g.add(mk(new THREE.CapsuleGeometry(0.088, 0.3, 6, 14), m.twill, 0, -0.22, 0))
  g.add(mk(new THREE.BoxGeometry(0.012, 0.36, 0.036), m.cyan, s * 0.087, -0.22, 0))
  g.add(mk(new THREE.BoxGeometry(0.012, 0.36, 0.036), m.white, s * 0.082, -0.22, -0.045))
  g.add(mk(new THREE.TorusGeometry(0.07, 0.008, 6, 14, Math.PI), m.hoodie, 0, -0.39, -0.03))
  return bakeGroup(g, { cast: true })
}

export function buildShin(m: Mats, s: number) {
  const g = new THREE.Group()
  g.add(mk(new THREE.CapsuleGeometry(0.068, 0.27, 6, 14), m.twill, 0, -0.22, 0))
  g.add(mk(new THREE.BoxGeometry(0.01, 0.28, 0.03), m.cyan, s * 0.066, -0.22, 0))
  const cuff = mk(new THREE.TorusGeometry(0.072, 0.024, 8, 18), m.ribWhite, 0, -0.41, 0)
  cuff.rotation.x = Math.PI / 2
  g.add(cuff)
  return bakeGroup(g, { cast: true })
}

/** Chunky tech sneaker. Toe points to -z. */
export function buildShoe(m: Mats, s: number) {
  const g = new THREE.Group()
  // Outsole with tread blocks
  g.add(mk(rb(0.128, 0.018, 0.33, 0.008), m.tread, 0, -0.089, -0.045))
  for (let i = 0; i < 7; i++) g.add(mk(new THREE.BoxGeometry(0.1, 0.01, 0.022), m.tread, 0, -0.1, -0.16 + i * 0.045))
  // Two-layer foam midsole with glowing line
  g.add(mk(rb(0.134, 0.034, 0.335, 0.014), m.foam, 0, -0.065, -0.045))
  g.add(mk(rb(0.138, 0.022, 0.3, 0.01), m.leather, 0, -0.04, -0.04))
  g.add(mk(new THREE.BoxGeometry(0.142, 0.007, 0.24), m.cyan, 0, -0.052, -0.04))
  // Heel air unit
  const air = mk(new THREE.CapsuleGeometry(0.014, 0.05, 4, 8), m.cyan, s * 0.068, -0.06, 0.09)
  air.rotation.x = Math.PI / 2
  g.add(air)
  // Upper
  g.add(mk(rb(0.118, 0.085, 0.24, 0.035), m.leather, 0, -0.005, -0.015))
  g.add(mk(new THREE.SphereGeometry(0.06, 18, 12), m.leather, 0, -0.022, -0.15, 1, 0.78, 1.3))
  g.add(mk(new THREE.SphereGeometry(0.052, 14, 10), m.shoeMesh, 0, 0.0, -0.135, 0.95, 0.5, 1.0))
  // Side overlay panel + swoosh arc
  g.add(mk(rb(0.012, 0.07, 0.15, 0.005), m.shoeBlue, s * 0.06, -0.01, -0.02))
  const arc = mk(new THREE.TorusGeometry(0.055, 0.009, 6, 16, Math.PI * 0.9), m.cyan, s * 0.068, -0.012, -0.02)
  arc.rotation.set(0, Math.PI / 2, 0.25)
  g.add(arc)
  // Heel counter + pull tab + padded collar
  g.add(mk(rb(0.118, 0.07, 0.07, 0.02), m.shoeBlue, 0, 0.0, 0.085))
  g.add(mk(rb(0.03, 0.04, 0.012, 0.004), m.cyan, 0, 0.04, 0.125))
  const collar = mk(new THREE.TorusGeometry(0.052, 0.02, 8, 16), m.navy, 0, 0.042, 0.03)
  collar.rotation.x = Math.PI / 2
  collar.scale.set(1.05, 1.4, 1)
  g.add(collar)
  // Tongue + lace grid
  const tongue = mk(rb(0.07, 0.06, 0.022, 0.008), m.navy, 0, 0.05, -0.055)
  tongue.rotation.x = -0.55
  g.add(tongue)
  for (let i = 0; i < 4; i++) {
    const z = -0.085 + i * 0.03
    const y = 0.04 - i * 0.012
    for (const dir of [-1, 1]) {
      const lace = mk(new THREE.BoxGeometry(0.075, 0.006, 0.01), m.white, 0, y + 0.008, z)
      lace.rotation.set(-0.45, 0, dir * 0.4)
      g.add(lace)
    }
    for (const sx of [-1, 1]) g.add(mk(new THREE.SphereGeometry(0.007, 6, 5), m.silver, sx * 0.04, y, z))
  }
  return bakeGroup(g, { cast: true })
}

export function buildTorso(m: Mats) {
  const g = new THREE.Group()
  g.add(mk(new THREE.CapsuleGeometry(0.17, 0.27, 8, 24), m.pufferTorso, 0, 0.3, 0, 1.38, 1, 0.84))
  // Hoodie hem peeking below the jacket, then ribbed jacket hem
  const hoodHem = mk(new THREE.TorusGeometry(0.165, 0.028, 8, 28), m.hoodie, 0, -0.035, 0, 1.4, 0.86, 1)
  hoodHem.rotation.x = Math.PI / 2
  g.add(hoodHem)
  const hem = mk(new THREE.TorusGeometry(0.17, 0.036, 8, 28), m.rib, 0, 0.01, 0, 1.38, 0.84, 1)
  hem.rotation.x = Math.PI / 2
  g.add(hem)
  // High ribbed collar + hoodie neckline
  for (const [y, mat, r] of [[0.62, m.rib, 0.09], [0.66, m.rib, 0.082]] as const) {
    const c = mk(new THREE.TorusGeometry(r, 0.034, 8, 22), mat, 0, y, 0)
    c.rotation.x = Math.PI / 2
    g.add(c)
  }
  g.add(mk(new THREE.SphereGeometry(0.11, 14, 10), m.hoodie, 0, 0.665, 0.105, 1.3, 0.8, 0.9))
  // Zip, pull and pockets
  g.add(mk(new THREE.BoxGeometry(0.02, 0.5, 0.012), m.white, 0, 0.33, -0.142))
  g.add(mk(new THREE.BoxGeometry(0.014, 0.05, 0.016), m.cyan, 0, 0.57, -0.148))
  for (const sx of [-1, 1]) {
    const flap = mk(rb(0.12, 0.07, 0.026, 0.01), m.navy, sx * 0.1, 0.17, -0.127)
    flap.rotation.z = sx * 0.12
    g.add(flap)
    g.add(mk(new THREE.BoxGeometry(0.1, 0.008, 0.01), m.cyan, sx * 0.1, 0.2, -0.14))
    g.add(mk(new THREE.SphereGeometry(0.082, 14, 10), m.white, sx * 0.235, 0.5, 0))
    g.add(mk(new THREE.BoxGeometry(0.035, 0.34, 0.022), m.white, sx * 0.1, 0.38, -0.127))
    const lace = mk(new THREE.CapsuleGeometry(0.006, 0.12, 3, 6), m.hoodie, sx * 0.035, 0.5, -0.15)
    g.add(lace)
    g.add(mk(new THREE.CapsuleGeometry(0.008, 0.02, 3, 6), m.cyan, sx * 0.035, 0.42, -0.15))
  }
  // Neck
  g.add(mk(new THREE.CylinderGeometry(0.055, 0.065, 0.14, 14), m.skin, 0, 0.72, 0))
  // Headphones around the neck
  const hp = mk(new THREE.TorusGeometry(0.108, 0.026, 8, 22), m.white, 0, 0.67, -0.01)
  hp.rotation.x = Math.PI / 2
  g.add(hp)
  for (const sx of [-1, 1]) {
    const cup = mk(new THREE.CylinderGeometry(0.056, 0.056, 0.046, 18), m.white, sx * 0.108, 0.62, -0.065)
    cup.rotation.z = Math.PI / 2
    g.add(cup)
    const disc = mk(new THREE.CylinderGeometry(0.032, 0.032, 0.05, 14), m.cyan, sx * 0.108, 0.62, -0.065)
    disc.rotation.z = Math.PI / 2
    g.add(disc)
  }
  return bakeGroup(g, { cast: true })
}

export function buildUpperArm(m: Mats) {
  const g = new THREE.Group()
  g.add(mk(new THREE.CapsuleGeometry(0.062, 0.2, 6, 14), m.pufferSleeve, 0, -0.16, 0))
  return bakeGroup(g, { cast: true })
}

export function buildForearm(m: Mats, s: number) {
  const g = new THREE.Group()
  g.add(mk(new THREE.CapsuleGeometry(0.054, 0.17, 6, 14), m.pufferSleeve, 0, -0.13, 0))
  const cuff = mk(new THREE.TorusGeometry(0.054, 0.024, 8, 16), m.rib, 0, -0.235, 0)
  cuff.rotation.x = Math.PI / 2
  g.add(cuff)
  g.add(mk(new THREE.BoxGeometry(0.01, 0.12, 0.02), m.cyan, s * 0.054, -0.12, 0))
  g.add(mk(new THREE.SphereGeometry(0.058, 16, 12), m.skin, 0, -0.295, 0, 0.95, 1.1, 1))
  g.add(mk(new THREE.SphereGeometry(0.026, 10, 8), m.skin, -s * 0.048, -0.265, -0.025))
  return bakeGroup(g, { cast: true })
}

export function buildHip(m: Mats) {
  const g = new THREE.Group()
  g.add(mk(new THREE.SphereGeometry(0.17, 22, 16), m.twill, 0, 0.02, 0, 1.15, 0.8, 0.85))
  const band = mk(new THREE.TorusGeometry(0.16, 0.02, 8, 24), m.ribWhite, 0, 0.1, 0, 1.15, 0.85, 1)
  band.rotation.x = Math.PI / 2
  g.add(band)
  return bakeGroup(g, { cast: true })
}

/** Compact backpack worn low on the back, leaving the upper jacket back free for the logo. */
export function buildBackpack(m: Mats) {
  const group = new THREE.Group()
  group.position.set(0, 0.14, 0.2)
  group.scale.set(0.82, 0.6, 0.85)
  group.add(mk(rb(0.36, 0.46, 0.16, 0.05), m.navy, 0, 0.02, 0))
  group.add(mk(rb(0.37, 0.14, 0.17, 0.05), m.blue, 0, 0.2, 0))
  group.add(mk(new THREE.BoxGeometry(0.22, 0.01, 0.012), m.cyan, 0, 0.12, 0.085))
  group.add(mk(rb(0.3, 0.1, 0.05, 0.02), m.navy, 0, -0.14, 0.095))
  for (const sx of [-1, 1]) group.add(mk(new THREE.CapsuleGeometry(0.035, 0.18, 4, 8), m.shoeMesh, sx * 0.19, -0.06, 0))
  bakeGroup(group, { cast: true })
  return group
}

// Torso shell used by the jacket (see buildTorso): a capsule scaled (1.38, 1, 0.84).
const TORSO = { cy: 0.3, half: 0.135, r: 0.17, sx: 1.38, sz: 0.84 }

/** Z of the jacket's back surface at torso-local (x, y). */
export function jacketBackZ(x: number, y: number) {
  const dy = Math.max(0, Math.abs(y - TORSO.cy) - TORSO.half)
  const reff = Math.sqrt(Math.max(0, TORSO.r * TORSO.r - dy * dy))
  const ux = x / TORSO.sx
  return Math.sqrt(Math.max(0, reff * reff - ux * ux)) * TORSO.sz
}

/** A flat patch bent to hug the jacket back, so the logo sits on the fabric instead of floating. */
function jacketPatch(w: number, h: number, cy: number, lift: number) {
  const geo = new THREE.PlaneGeometry(w, h, 24, 12)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = cy + pos.getY(i)
    pos.setXYZ(i, x, y, jacketBackZ(x, y) + lift)
  }
  geo.computeVertexNormals()
  return geo
}

/** Loads the supplied Arc logo image (unaltered) onto the upper back of the jacket. Does nothing if the file is absent. */
export function attachLogo(slot: THREE.Object3D, url: string) {
  new THREE.TextureLoader().load(
    url,
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace
      tex.anisotropy = 8
      const img = tex.image as { width: number; height: number }
      const aspect = img.width / img.height
      const maxW = 0.24
      const maxH = 0.22
      let w = maxW
      let h = w / aspect
      if (h > maxH) {
        h = maxH
        w = h * aspect
      }
      let lum = 0.5
      try {
        const c = document.createElement('canvas')
        c.width = 32
        c.height = 32
        const ctx = c.getContext('2d')
        if (ctx) {
          ctx.drawImage(tex.image, 0, 0, 32, 32)
          const data = ctx.getImageData(0, 0, 32, 32).data
          let sum = 0
          let n = 0
          for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] > 128) {
              sum += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255
              n++
            }
          }
          if (n > 0) lum = sum / n
        }
      } catch {
        lum = 0.5
      }
      const plateColor = lum > 0.6 ? 0x0e1f3d : 0xf4f8ff
      const cy = 0.45
      const plate = new THREE.Mesh(jacketPatch(w + 0.04, h + 0.04, cy, 0.004), new THREE.MeshStandardMaterial({ color: plateColor, roughness: 0.55 }))
      const logoMesh = new THREE.Mesh(
        jacketPatch(w, h, cy, 0.008),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
      )
      slot.add(plate, logoMesh)
    },
    undefined,
    () => {
      // No logo file supplied yet: leave the slot empty rather than drawing a substitute.
    },
  )
}

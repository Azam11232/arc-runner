import * as THREE from 'three'
import {
  DESPAWN_Z,
  laneX,
  type ObstacleKind,
  PLAYER_HALF_D,
  PLAYER_HALF_W,
  PLAYER_HEIGHT,
  PLAYER_SLIDE_HEIGHT,
  SPAWN_Z,
} from './constants'
import { CoinField } from './coins'
import { createBarrier, createCrate, createGate, createTrain } from './models'

const TRAIN_BOOST = 0.15
const FADE_IN_FROM = -92
const FADE_IN_SPAN = 33

type Cell = ObstacleKind | null

interface Row {
  cells: Cell[]
  depth: number
  route: number
  trainLen: number
  variant: number
}

interface Obstacle {
  kind: ObstacleKind
  group: THREE.Group
  x: number
  halfW: number
  halfL: number
  yMin: number
  yMax: number
  boost: number
}

const pick = <T,>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)]

export class Spawner {
  readonly group = new THREE.Group()
  private obstacles: Obstacle[] = []
  private coins = new CoinField()
  private countdown = 0
  private pending: Row | null = null
  private lastRoute = 0

  constructor() {
    this.group.add(this.coins.group)
  }

  reset(grace = 40) {
    for (const o of this.obstacles) this.group.remove(o.group)
    this.obstacles = []
    this.coins.reset()
    this.countdown = grace
    this.pending = null
    this.lastRoute = 0
  }

  private genRow(difficulty: number): Row {
    const route = Math.max(-1, Math.min(1, this.lastRoute + pick([-1, 0, 0, 1])))
    this.lastRoute = route
    const cells: Cell[] = [null, null, null]
    const pr = Math.random()
    if (pr < 0.1 + 0.14 * difficulty) cells[route + 1] = 'barrier'
    else if (pr < 0.2 + 0.24 * difficulty) cells[route + 1] = 'gate'

    const pBlock = 0.3 + 0.45 * difficulty
    const kinds: ObstacleKind[] = ['train', 'train', 'train', 'crate', 'barrier', 'barrier', 'gate']
    for (let i = 0; i < 3; i++) {
      if (i === route + 1) continue
      if (Math.random() < pBlock) cells[i] = pick(kinds)
    }
    const trainLen = Math.random() < 0.5 ? 10 : 14
    let depth = 2
    for (const c of cells) {
      if (c === 'train') depth = Math.max(depth, trainLen)
      else if (c === 'crate') depth = Math.max(depth, 2.4)
    }
    return { cells, depth, route, trainLen, variant: Math.floor(Math.random() * 3) }
  }

  private spawnRow(row: Row) {
    row.cells.forEach((cell, i) => {
      if (!cell) return
      const x = laneX(i - 1)
      let group: THREE.Group
      let o: Obstacle
      switch (cell) {
        case 'train':
          group = createTrain(row.trainLen, row.variant + i)
          o = { kind: cell, group, x, halfW: 0.98, halfL: row.trainLen / 2, yMin: 0, yMax: 3.3, boost: TRAIN_BOOST }
          break
        case 'barrier':
          group = createBarrier()
          o = { kind: cell, group, x, halfW: 1, halfL: 0.3, yMin: 0, yMax: 0.95, boost: 0 }
          break
        case 'gate':
          group = createGate()
          o = { kind: cell, group, x, halfW: 1.1, halfL: 0.3, yMin: 1.06, yMax: 2.5, boost: 0 }
          break
        default:
          group = createCrate(i + row.variant)
          o = { kind: cell, group, x, halfW: 1, halfL: 1.1, yMin: 0, yMax: 2.6, boost: 0 }
      }
      group.position.set(x, 0, -SPAWN_Z)
      this.group.add(group)
      this.obstacles.push(o)
    })
  }

  private placeCoin(x: number, y: number, z: number) {
    this.coins.place(x, y, z)
  }

  private spawnCoins(row: Row, next: Row, centerDist: number) {
    const x = laneX(row.route)
    const cell = row.cells[row.route + 1]
    const rowZ = -SPAWN_Z
    if (cell === 'barrier') {
      for (let k = -1; k <= 1; k++) this.placeCoin(x, 1.7 + (1 - Math.abs(k)) * 0.7, rowZ + k * 1.9)
    } else if (cell === 'gate') {
      for (let k = -1; k <= 1; k++) this.placeCoin(x, 0.7, rowZ + k * 1.9)
    }
    const nextCell = next.cells[row.route + 1]
    const start = rowZ - row.depth / 2 - 2.5
    let end = rowZ - centerDist + next.depth / 2 + 3
    if (nextCell === 'train') end += 20
    const span = start - end
    if (span < 4.5) return
    const count = Math.min(9, Math.floor(span / 2.2) + 1)
    for (let k = 0; k < count; k++) this.placeCoin(x, 1.05, start - k * 2.2)
  }

  update(dt: number, speed: number, difficulty: number, spawning: boolean) {
    const move = speed * dt
    if (spawning) {
      this.countdown -= move
      if (this.countdown <= 0) {
        const row = this.pending ?? this.genRow(difficulty)
        const next = this.genRow(difficulty)
        this.pending = next
        const anyTrain = row.cells.includes('train') || next.cells.includes('train')
        const gapTime = 1.4 - 0.55 * difficulty
        const gap = Math.max(gapTime * speed, anyTrain ? 23 : 16)
        const centerDist = row.depth / 2 + gap + next.depth / 2
        this.spawnRow(row)
        this.spawnCoins(row, next, centerDist)
        this.countdown += centerDist
      }
    }

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i]
      const z = (o.group.position.z += (speed + o.boost * speed) * dt)
      const fade = Math.min(1, Math.max(0, (FADE_IN_FROM - z) / FADE_IN_SPAN))
      o.group.position.y = -4.5 * fade
      if (z - o.halfL > DESPAWN_Z) {
        this.group.remove(o.group)
        this.obstacles.splice(i, 1)
      }
    }
    this.coins.update(dt, speed)
  }

  /** Returns the obstacle the player is hitting, if any. */
  collide(px: number, py: number, sliding: boolean): Obstacle | null {
    const top = py + (sliding ? PLAYER_SLIDE_HEIGHT : PLAYER_HEIGHT) - 0.08
    const bottom = py + 0.06
    for (const o of this.obstacles) {
      const z = o.group.position.z
      if (Math.abs(z) > o.halfL + PLAYER_HALF_D) continue
      if (Math.abs(px - o.x) > o.halfW + PLAYER_HALF_W - 0.05) continue
      if (bottom < o.yMax && top > o.yMin) return o
    }
    return null
  }

  collectCoins(px: number, py: number, sliding: boolean, onCollect: (pos: THREE.Vector3) => void) {
    this.coins.collect(px, py, sliding, onCollect)
  }
}

import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { GameAudio } from './audio'
import {
  BASE_SPEED,
  COIN_SCORE,
  type GameState,
  type HudSnapshot,
  FAST_FALL_VELOCITY,
  GRAVITY,
  JUMP_VELOCITY,
  laneX,
  MAX_SPEED,
  MENU_SPEED,
  type RunResult,
  SLIDE_TIME,
} from './constants'
import { Effects } from './effects'
import { Mascot } from './mascot'
import { tickModels } from './models'
import { Spawner } from './obstacles'
import { makeGlowTexture, makeSkyTexture } from './textures'
import { World } from './world'

export interface EngineCallbacks {
  onState: (state: GameState) => void
  onHud: (hud: HudSnapshot) => void
  onCountdown: (value: number | null) => void
  onGameOver: (result: RunResult) => void
}

const COUNTDOWN_STEP = 0.6
const damp = (cur: number, target: number, lambda: number, dt: number) => cur + (target - cur) * (1 - Math.exp(-lambda * dt))
const ease = (t: number) => t * t * (3 - 2 * t)

export class GameEngine {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(62, 1, 0.1, 320)
  private world = new World()
  private spawner = new Spawner()
  private effects = new Effects()
  private mascot = new Mascot()
  private shadow: THREE.Mesh
  private audio = new GameAudio()
  private raf = 0
  private last = 0
  private disposed = false
  private resizeObserver: ResizeObserver

  private state: GameState = 'menu'
  private speed = 0
  private camBlend = 0
  private shake = 0
  private stateTimer = 0
  private countdownValue = 0

  // Run state
  private lane = 0
  private x = 0
  private y = 0
  private vy = 0
  private slideTimer = 0
  private slideQueued = false
  private jumpBuffer = 0
  private distance = 0
  private coins = 0
  private combo = 0
  private comboTimer = 0
  private elapsed = 0
  private hudTimer = 0
  private knock = 0
  private xv = 0
  private camX = 0
  private camLookX = 0
  private camYOff = 0
  private fovKick = 0
  private worldTime = 0
  private sun: THREE.DirectionalLight
  private pixelRatio = 1
  private maxPixelRatio = 1
  private frameAvg = 1 / 60
  private qualityTimer = 0
  private dtS = 1 / 60
  private portraitScene = new THREE.Scene()
  private portraitCam = new THREE.PerspectiveCamera(30, 0.8, 0.1, 40)
  private portraitCanvas: HTMLCanvasElement | null = null
  private portraitBlob: THREE.Mesh
  private dimScene = new THREE.Scene()
  private dimCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private dimMat = new THREE.MeshBasicMaterial({ color: 0x0b1830, transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false })
  private dimLevel = 0

  private pointer: { id: number; x: number; y: number } | null = null
  private readonly camPos = new THREE.Vector3()
  private readonly camLook = new THREE.Vector3()
  private readonly tmp = new THREE.Vector3()

  constructor(private host: HTMLElement, private cb: EngineCallbacks) {
    const coarse = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768
    this.maxPixelRatio = Math.min(window.devicePixelRatio || 1, coarse ? 1.6 : 2)
    this.pixelRatio = this.maxPixelRatio
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(this.pixelRatio)
    this.renderer.toneMapping = THREE.NeutralToneMapping
    this.renderer.toneMappingExposure = 1.02
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.renderer.domElement.style.display = 'block'
    this.renderer.domElement.style.width = '100%'
    this.renderer.domElement.style.height = '100%'
    host.appendChild(this.renderer.domElement)

    const sky = makeSkyTexture()
    this.scene.background = sky
    this.scene.fog = new THREE.Fog(0xc9dbf2, 34, 190)
    const pmrem = new THREE.PMREMGenerator(this.renderer)
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    this.scene.environmentIntensity = 0.75
    pmrem.dispose()

    this.scene.add(new THREE.HemisphereLight(0xdbeaff, 0x9fb3d1, 0.85))
    this.sun = new THREE.DirectionalLight(0xfff1dc, 2.8)
    this.sun.position.set(-12, 26, 10)
    this.sun.target.position.set(0, 0, -8)
    this.sun.castShadow = true
    const mapSize = coarse ? 1024 : 2048
    this.sun.shadow.mapSize.set(mapSize, mapSize)
    const sc = this.sun.shadow.camera
    sc.left = -15
    sc.right = 15
    sc.top = 38
    sc.bottom = -32
    sc.near = 5
    sc.far = 90
    this.sun.shadow.bias = -0.0004
    this.sun.shadow.normalBias = 0.04
    this.scene.add(this.sun, this.sun.target)
    // Separate scene used to draw the runner as a cut-out above the Game Over scorecard
    this.portraitScene.environment = this.scene.environment
    this.portraitScene.environmentIntensity = 0.75
    this.portraitScene.add(new THREE.HemisphereLight(0xdbeaff, 0x6f86a8, 1.0))
    const key = new THREE.DirectionalLight(0xfff0e2, 3.0)
    key.position.set(-2.5, 3, -4)
    const rim = new THREE.DirectionalLight(0x59e6ff, 1.4)
    rim.position.set(3, 2.5, 3)
    this.portraitScene.add(key, rim)
    this.portraitBlob = new THREE.Mesh(
      new THREE.CircleGeometry(0.6, 28),
      new THREE.MeshBasicMaterial({ color: 0x050b18, transparent: true, opacity: 0.35, depthWrite: false }),
    )
    this.portraitBlob.rotation.x = -Math.PI / 2
    this.portraitBlob.position.y = 0.01
    this.portraitScene.add(this.portraitBlob)
    const dimQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.dimMat)
    dimQuad.frustumCulled = false
    this.dimScene.add(dimQuad)
    const fill = new THREE.DirectionalLight(0x9fc2ff, 0.7)
    fill.position.set(10, 6, 12)
    this.scene.add(fill)

    const sunGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: makeGlowTexture(), color: 0xfff0c8, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false, opacity: 0.9 }),
    )
    sunGlow.scale.set(190, 190, 1)
    sunGlow.position.set(-60, 75, -235)
    this.scene.add(sunGlow)

    this.scene.add(this.world.group, this.spawner.group, this.effects.group, this.mascot.root)

    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 24),
      new THREE.MeshBasicMaterial({ color: 0x0b1d3a, transparent: true, opacity: 0.2, depthWrite: false }),
    )
    this.shadow.rotation.x = -Math.PI / 2
    this.shadow.position.y = 0.05
    this.scene.add(this.shadow)

    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(host)
    this.resize()

    window.addEventListener('keydown', this.onKey)
    window.addEventListener('blur', this.onBlur)
    document.addEventListener('visibilitychange', this.onBlur)
    host.addEventListener('pointerdown', this.onPointerDown)
    host.addEventListener('pointermove', this.onPointerMove)
    host.addEventListener('pointerup', this.onPointerUp)
    host.addEventListener('pointercancel', this.onPointerUp)

    this.spawner.reset()
    this.updateCamera(1 / 60, true)
    this.last = performance.now()
    this.raf = requestAnimationFrame(this.loop)
  }

  // ---------- Public controls ----------

  startRun() {
    this.audio.unlock()
    this.resetRun()
    this.beginCountdown()
  }

  restart() {
    this.startRun()
  }

  pause() {
    if (this.state !== 'playing' && this.state !== 'countdown') return
    this.setState('paused')
    this.cb.onCountdown(null)
  }

  resume() {
    if (this.state !== 'paused') return
    this.audio.unlock()
    this.beginCountdown()
  }

  toMenu() {
    this.resetRun()
    this.cb.onCountdown(null)
    this.setState('menu')
  }

  setMuted(muted: boolean) {
    this.audio.muted = muted
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.resizeObserver.disconnect()
    window.removeEventListener('keydown', this.onKey)
    window.removeEventListener('blur', this.onBlur)
    document.removeEventListener('visibilitychange', this.onBlur)
    this.host.removeEventListener('pointerdown', this.onPointerDown)
    this.host.removeEventListener('pointermove', this.onPointerMove)
    this.host.removeEventListener('pointerup', this.onPointerUp)
    this.host.removeEventListener('pointercancel', this.onPointerUp)
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }

  // ---------- State ----------

  /** Canvas inside the Game Over card that receives the runner's upper-body portrait. */
  setPortraitCanvas(canvas: HTMLCanvasElement | null) {
    this.portraitCanvas = canvas
  }

  private setMascotPortrait(on: boolean) {
    if (on) this.portraitScene.add(this.mascot.root)
    else this.scene.add(this.mascot.root)
    this.shadow.visible = !on
  }

  /** Draw the defeated runner (transparent background) and copy it into the scorecard's canvas. */
  private renderPortraitToCanvas() {
    const c = this.portraitCanvas
    if (!c) return
    const cw = c.clientWidth
    const ch = c.clientHeight
    if (cw < 4 || ch < 4) return
    const renderer = this.renderer
    const pr = renderer.getPixelRatio()
    const bw = Math.round(cw * pr)
    const bh = Math.round(ch * pr)
    if (c.width !== bw || c.height !== bh) {
      c.width = bw
      c.height = bh
    }
    const ctx = c.getContext('2d')
    if (!ctx) return

    const m = this.mascot.root.position
    const aspect = cw / ch
    const dist = Math.max(2.9, 0.64 / (Math.tan((15 * Math.PI) / 180) * aspect))
    this.portraitCam.aspect = aspect
    this.portraitCam.position.set(m.x + 0.4 * (dist / 2.9), 1.45, m.z - dist)
    this.portraitCam.lookAt(m.x - 0.02, 1.3, m.z + 0.08)
    this.portraitCam.updateProjectionMatrix()

    const prevAlpha = renderer.getClearAlpha()
    renderer.setClearColor(0x000000, 0)
    renderer.setScissorTest(true)
    renderer.setScissor(0, 0, cw, ch)
    renderer.setViewport(0, 0, cw, ch)
    renderer.render(this.portraitScene, this.portraitCam)
    renderer.setScissorTest(false)
    renderer.setViewport(0, 0, this.host.clientWidth, this.host.clientHeight)
    renderer.setClearAlpha(prevAlpha)

    ctx.clearRect(0, 0, bw, bh)
    ctx.drawImage(renderer.domElement, 0, renderer.domElement.height - bh, bw, bh, 0, 0, bw, bh)
  }

  private renderOverlays() {
    this.dimLevel = damp(this.dimLevel, this.state === 'over' ? 0.5 : 0, 5, 1 / 60)
    if (this.dimLevel <= 0.01) return
    this.dimMat.opacity = this.dimLevel
    this.renderer.autoClear = false
    this.renderer.render(this.dimScene, this.dimCam)
    this.renderer.autoClear = true
  }

  private setState(next: GameState) {
    if (this.state === next) return
    this.state = next
    this.setMascotPortrait(next === 'over')
    this.cb.onState(next)
  }

  private resetRun() {
    this.lane = 0
    this.x = 0
    this.y = 0
    this.vy = 0
    this.slideTimer = 0
    this.slideQueued = false
    this.jumpBuffer = 0
    this.distance = 0
    this.coins = 0
    this.combo = 0
    this.comboTimer = 0
    this.elapsed = 0
    this.knock = 0
    this.xv = 0
    this.shake = 0
    this.mascot.root.position.z = 0
    this.spawner.reset()
    this.emitHud()
  }

  private beginCountdown() {
    this.countdownValue = 3
    this.stateTimer = COUNTDOWN_STEP
    this.setState('countdown')
    this.cb.onCountdown(3)
    this.audio.tick()
  }

  private emitHud() {
    this.cb.onHud(this.snapshot())
  }

  private snapshot(): HudSnapshot {
    return {
      score: Math.floor(this.distance * 2) + this.coins * COIN_SCORE,
      distance: Math.floor(this.distance),
      coins: this.coins,
      speed: this.speed,
    }
  }

  // ---------- Input ----------

  private get canSteer() {
    return this.state === 'playing' || this.state === 'countdown'
  }

  private moveLane(dir: -1 | 1) {
    if (!this.canSteer) return
    const next = Math.max(-1, Math.min(1, this.lane + dir))
    if (next === this.lane) return
    this.lane = next
    this.audio.switchLane()
  }

  private jump() {
    if (!this.canSteer) return
    if (this.y <= 0.001) {
      this.vy = JUMP_VELOCITY
      this.y = 0.001
      this.slideTimer = 0
      this.slideQueued = false
      this.audio.jump()
      this.effects.burst(this.tmp.set(this.x, 0.1, 0), 6, 2, 1)
    } else {
      this.jumpBuffer = 0.14
    }
  }

  private slide() {
    if (!this.canSteer) return
    if (this.y > 0.001) {
      this.vy = FAST_FALL_VELOCITY
      this.slideQueued = true
    } else {
      this.slideTimer = SLIDE_TIME
      this.audio.slide()
    }
  }

  private onKey = (e: KeyboardEvent) => {
    if (e.repeat && (e.code === 'Space' || e.code === 'Enter')) return
    if (e.target instanceof HTMLButtonElement && (e.code === 'Space' || e.code === 'Enter')) return
    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        this.moveLane(-1)
        break
      case 'ArrowRight':
      case 'KeyD':
        this.moveLane(1)
        break
      case 'ArrowUp':
      case 'KeyW':
        this.jump()
        break
      case 'ArrowDown':
      case 'KeyS':
        this.slide()
        break
      case 'Space':
        if (this.state === 'playing' || this.state === 'countdown') this.jump()
        else if (this.state === 'menu' || this.state === 'over') this.startRun()
        break
      case 'Enter':
        if (this.state === 'menu' || this.state === 'over') this.startRun()
        else if (this.state === 'paused') this.resume()
        break
      case 'KeyP':
      case 'Escape':
        if (this.state === 'paused') this.resume()
        else this.pause()
        break
      case 'KeyR':
        if (this.state !== 'menu' && this.state !== 'dying') this.restart()
        break
      default:
        return
    }
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault()
  }

  private onBlur = () => {
    if (document.hidden || !document.hasFocus()) this.pause()
  }

  private onPointerDown = (e: PointerEvent) => {
    this.audio.unlock()
    this.pointer = { id: e.pointerId, x: e.clientX, y: e.clientY }
  }

  private onPointerMove = (e: PointerEvent) => {
    const p = this.pointer
    if (!p || p.id !== e.pointerId) return
    const dx = e.clientX - p.x
    const dy = e.clientY - p.y
    const threshold = 26
    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return
    if (Math.abs(dx) > Math.abs(dy)) this.moveLane(dx > 0 ? 1 : -1)
    else if (dy < 0) this.jump()
    else this.slide()
    p.x = e.clientX
    p.y = e.clientY
  }

  private onPointerUp = (e: PointerEvent) => {
    if (this.pointer?.id === e.pointerId) this.pointer = null
  }

  // ---------- Loop ----------

  private resize() {
    const w = Math.max(1, this.host.clientWidth)
    const h = Math.max(1, this.host.clientHeight)
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  private loop = (now: number) => {
    if (this.disposed) return
    this.raf = requestAnimationFrame(this.loop)
    const dt = Math.min(0.05, Math.max(0.001, (now - this.last) / 1000))
    this.last = now
    this.dtS += (dt - this.dtS) * 0.4
    this.adaptQuality(dt)
    this.update(dt)
    if (this.state === 'over') this.renderPortraitToCanvas()
    this.renderer.render(this.scene, this.camera)
    this.renderOverlays()
  }

  /** Lower the render resolution (then shadows) if frames run long, to keep play smooth. */
  private adaptQuality(dt: number) {
    this.frameAvg += (dt - this.frameAvg) * 0.05
    this.qualityTimer += dt
    if (this.qualityTimer < 1.5) return
    this.qualityTimer = 0
    if (this.state === 'paused') return
    if (this.frameAvg > 0.026) {
      if (this.pixelRatio > 1) {
        this.pixelRatio = Math.max(1, this.pixelRatio - 0.25)
        this.renderer.setPixelRatio(this.pixelRatio)
        this.resize()
      } else if (this.sun.castShadow) {
        this.sun.castShadow = false
      }
      this.frameAvg = 1 / 60
    }
  }

  private difficulty() {
    return Math.min(1, this.elapsed / 110)
  }

  private update(dt: number) {
    const s = this.state
    if (s === 'paused') return

    // World speed target
    let target = MENU_SPEED
    if (s === 'countdown') target = 0
    else if (s === 'playing') target = BASE_SPEED + (MAX_SPEED - BASE_SPEED) * (1 - Math.exp(-this.elapsed / 75))
    else if (s === 'dying' || s === 'over') target = 0
    const lambda = s === 'dying' ? 3.2 : s === 'playing' ? 1.8 : 2.4
    this.speed = damp(this.speed, target, lambda, dt)
    if (this.speed < 0.02 && target === 0) this.speed = 0

    if (s === 'countdown') {
      this.stateTimer -= dt
      if (this.stateTimer <= 0) {
        this.countdownValue -= 1
        this.stateTimer = COUNTDOWN_STEP
        if (this.countdownValue <= 0) {
          this.cb.onCountdown(0)
          this.audio.go()
          this.setState('playing')
          window.setTimeout(() => {
            if (this.state === 'playing') this.cb.onCountdown(null)
          }, 500)
        } else {
          this.cb.onCountdown(this.countdownValue)
          this.audio.tick()
        }
      }
    }

    const frozen = s === 'countdown' && this.elapsed > 0
    const simDt = frozen ? 0 : dt
    const scroll = this.speed

    this.worldTime += dt
    tickModels(this.worldTime)
    this.world.update(simDt, scroll)
    this.spawner.update(simDt, scroll, this.difficulty(), s === 'playing')
    this.effects.update(dt)

    if (s === 'playing' || s === 'countdown' || s === 'dying' || s === 'over') this.updatePlayer(simDt)
    if (s === 'playing') {
      this.elapsed += dt
      this.distance += scroll * dt
      this.runChecks()
      this.hudTimer -= dt
      if (this.hudTimer <= 0) {
        this.hudTimer = 0.08
        this.emitHud()
      }
    }

    if (s === 'dying') {
      this.stateTimer -= dt
      this.knock = damp(this.knock, 0, 5, dt)
      this.mascot.root.position.z += this.knock * dt
      if (this.stateTimer <= 0) {
        this.setState('over')
        this.cb.onGameOver({ ...this.snapshot(), seconds: this.elapsed })
      }
    }

    this.comboTimer -= dt
    if (this.comboTimer <= 0) this.combo = 0

    this.animateMascot(this.dtS)
    this.updateCamera(this.dtS, false)
  }

  private updatePlayer(dt: number) {
    const targetX = laneX(this.lane)
    if (dt > 0) {
      const w = 22
      const steps = 2
      const h = dt / steps
      for (let i = 0; i < steps; i++) {
        this.xv += (w * w * (targetX - this.x) - 2 * w * this.xv) * h
        this.x += this.xv * h
      }
      if (Math.abs(this.x - targetX) < 0.002 && Math.abs(this.xv) < 0.05) {
        this.x = targetX
        this.xv = 0
      }
    }

    this.jumpBuffer -= dt
    if (this.y > 0 || this.vy > 0) {
      this.vy -= GRAVITY * dt
      this.y += this.vy * dt
      if (this.y <= 0) {
        this.y = 0
        this.vy = 0
        this.effects.burst(this.tmp.set(this.x, 0.1, 0), 5, 2, 1)
        if (this.slideQueued) {
          this.slideTimer = SLIDE_TIME
          this.slideQueued = false
          this.audio.slide()
        }
        if (this.jumpBuffer > 0) {
          this.jumpBuffer = 0
          this.jump()
        }
      }
    }
    if (this.slideTimer > 0) this.slideTimer -= dt
  }

  private get sliding() {
    return this.slideTimer > 0 && this.y <= 0.001
  }

  private runChecks() {
    const hit = this.spawner.collide(this.x, this.y, this.sliding)
    if (hit) {
      this.crash()
      return
    }
    this.spawner.collectCoins(this.x, this.y, this.sliding, (pos) => {
      this.coins += 1
      this.combo += 1
      this.comboTimer = 0.9
      this.audio.coin(this.combo)
      this.effects.burst(pos, 8, 2.4, 1.8)
      this.effects.sparkles(pos, 6)
      this.effects.ring(this.tmp.copy(pos))
      this.emitHud()
    })
  }

  private crash() {
    this.setState('dying')
    this.stateTimer = 1.1
    this.knock = 7
    this.slideQueued = false
    this.shake = 0.6
    this.slideTimer = 0
    this.audio.crash()
    this.effects.burst(this.tmp.set(this.x, 1, 0), 28, 6, 4)
    this.emitHud()
  }

  private animateMascot(dt: number) {
    const m = this.mascot
    const targetX = laneX(this.lane)
    const dx = targetX - this.x
    m.root.position.x = this.x
    m.root.position.y = this.y
    const mode = this.state === 'dying' ? 'dead' : this.state === 'over' ? 'defeated' : 'run'
    const poseSpeed = Math.max(this.speed, this.state === 'countdown' ? 9 : this.state === 'menu' ? MENU_SPEED : 0)
    m.update(dt, {
      speed: poseSpeed,
      onGround: this.y <= 0.001,
      vy: this.vy,
      sliding: this.sliding,
      lean: -dx * 0.14,
      mode,
    })
    const h = 1 / (1 + this.y * 0.55)
    this.shadow.position.x = this.x
    this.shadow.position.z = m.root.position.z
    this.shadow.scale.set(h * 0.9, h * 0.9, 1)
    ;(this.shadow.material as THREE.MeshBasicMaterial).opacity = 0.2 * h
  }

  private updateCamera(dt: number, snap: boolean) {
    const menuLike = this.state === 'menu'
    this.camBlend = snap ? 0 : damp(this.camBlend, menuLike ? 0 : 1, 3.2, dt)
    const e = ease(Math.min(1, Math.max(0, this.camBlend)))
    const portrait = this.camera.aspect < 0.85

    this.camX = snap ? this.x * 0.55 : damp(this.camX, this.x * 0.55, 5, dt)
    this.camLookX = snap ? this.x * 0.5 : damp(this.camLookX, this.x * 0.5, 6, dt)
    this.camYOff = snap ? 0 : damp(this.camYOff, this.y * 0.28, 4, dt)

    // Close chase camera: low and near, tilted down so the runner sits in the lower-middle of the screen
    const rigY = portrait ? 4.2 : 3.4
    const rigZ = portrait ? 6.2 : 5.3
    const pitch = portrait ? 0.244 : 0.227
    const look = 20
    const chaseY = rigY + this.camYOff
    const menuPos = this.tmp.set(portrait ? 1.7 : 2.7, portrait ? 2.3 : 1.7, portrait ? -4.8 : -3.4)
    const px = menuPos.x + (this.camX - menuPos.x) * e
    const py = menuPos.y + (chaseY - menuPos.y) * e
    const pz = menuPos.z + (rigZ - menuPos.z) * e
    const menuLy = portrait ? 1.2 : 1.05
    const chaseLy = chaseY - this.camYOff * 0.5 - Math.tan(pitch) * look
    const lx = this.camLookX * e
    const ly = menuLy + (chaseLy - menuLy) * e
    const lz = (rigZ - look) * e

    this.camPos.set(px, py, pz)
    this.camLook.set(lx, ly, lz)
    this.shake = damp(this.shake, 0, 4, dt)
    if (this.shake > 0.01) {
      this.camPos.x += (Math.random() - 0.5) * this.shake * 0.5
      this.camPos.y += (Math.random() - 0.5) * this.shake * 0.35
    }
    this.camera.position.copy(this.camPos)
    this.camera.lookAt(this.camLook)
    this.camera.rotateZ(Math.max(-0.04, Math.min(0.04, -this.xv * 0.003)) * e)

    this.fovKick = damp(this.fovKick, 0, 5, dt)
    const fov = (portrait ? 74 : 60) + Math.max(0, this.speed - BASE_SPEED) * 0.1 + this.fovKick
    if (Math.abs(this.camera.fov - fov) > 0.01) {
      this.camera.fov = damp(this.camera.fov, fov, 3, dt || 1 / 60)
      this.camera.updateProjectionMatrix()
    }
  }
}

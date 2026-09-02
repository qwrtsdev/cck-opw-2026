// GameScene.ts
import Phaser from 'phaser'
import { GAME_CONFIG } from '../config'
import { Player } from '../entities/Player'
import { SpawnManager } from '../systems/SpawnManager'
import { WeaponManager } from '../systems/WeaponManager'
import { EventBus } from '@/game/eventBus'

type StickVector = { x: number; y: number }
type StickPayload = { vector?: StickVector; distance: number } | null
type ControllerInput = {
  type: 'move' | 'face' | 'fire'
  payload: StickPayload | boolean
  playerId: string
  ts: number
}
type MoveVector = { x: number; y: number; magnitude: number } | null
type AimVector = { x: number; y: number } | null

function readStickVector(payload: StickPayload): { x: number; y: number } | null {
  if (!payload?.vector) return null

  const x = Number(payload.vector.x)
  const y = Number(payload.vector.y)

  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  return { x, y }
}

// Analog movement: pass the real nipplejs vector through instead of
// quantizing to 4 directions. nipplejs's y is bottom-up (positive = pushed
// up); Phaser world y is top-down, hence the flip so "push up" moves the
// sprite up on screen.
function moveVectorFromPayload(payload: StickPayload): MoveVector {
  const vector = readStickVector(payload)
  if (!vector) return null

  const magnitude = Math.min(1, Math.hypot(vector.x, vector.y))
  if (magnitude < 0.05) return null

  return { x: vector.x, y: -vector.y, magnitude }
}

// Analog aim: same treatment as movement, same y-flip.
function aimVectorFromPayload(payload: StickPayload): AimVector {
  const vector = readStickVector(payload)
  if (!vector) return null

  if (Math.abs(vector.x) < 0.001 && Math.abs(vector.y) < 0.001) return null
  return { x: vector.x, y: -vector.y }
}

export class GameScene extends Phaser.Scene {
  private player!: Player
  private spawnManager!: SpawnManager
  private weaponManager!: WeaponManager
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private WASD!: any
  private spaceKey!: Phaser.Input.Keyboard.Key

  private mouseX: number = 0
  private mouseY: number = 0
  private score: number = 0
  private kills: number = 0
  private startTime: number = 0
  private gameOver: boolean = false

  // Mobile controller state (set by EventBus, fed from Supabase broadcast)
  private mobileMove: MoveVector = null
  private mobileAim: AimVector = null
  private mobileFiring: boolean = false

  constructor() {
    super({ key: GAME_CONFIG.SCENES.GAME })
  }

  create() {
    console.log('GameScene create() called')

    this.physics.world.setBounds(0, 0, GAME_CONFIG.WORLD.WIDTH, GAME_CONFIG.WORLD.HEIGHT)
    this.cameras.main.setBounds(0, 0, GAME_CONFIG.WORLD.WIDTH, GAME_CONFIG.WORLD.HEIGHT)
    this.cameras.main.setZoom(GAME_CONFIG.CAMERA.ZOOM)

    this.createBackground()

    this.player = new Player(this, GAME_CONFIG.WORLD.WIDTH / 2, GAME_CONFIG.WORLD.HEIGHT / 2)
    console.log('Player created:', this.player)

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)

    this.cursors = this.input.keyboard!.createCursorKeys()
    this.WASD = this.input.keyboard!.addKeys('W,A,S,D')
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
      this.mouseX = worldPoint.x
      this.mouseY = worldPoint.y
    })

    this.spawnManager = new SpawnManager(this, this.player)
    this.weaponManager = new WeaponManager(this, this.player)

    // Launch UI scene for health bar and score display
    this.scene.launch(GAME_CONFIG.SCENES.UI)

    this.events.on('enemyKilled', (enemy: any, score: number) => {
      this.score += score
      this.kills++
      this.spawnManager.removeEnemy(enemy)
      this.spawnManager.dropLoot(enemy.x, enemy.y)
      this.events.emit('scoreChanged', this.score, this.kills)
    })

    this.events.on('playerDeath', () => this.handleGameOver())
    this.events.on('playerHealthChanged', (health: number, maxHealth: number) => {
      this.events.emit('healthChanged', health, maxHealth)
    })
    this.events.on('weaponChanged', (weaponName: string) => {
      this.events.emit('uiWeaponChanged', weaponName)
    })

    this.setupMobileControls()

    // Phaser does NOT call a class method named `shutdown()` for you — it
    // only fires the scene-systems 'shutdown' event. Wiring it explicitly
    // here is what actually makes cleanup run on scene stop/restart.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this)

    this.startTime = Date.now()
    this.weaponManager.setEnemies(this.spawnManager.getEnemies())
    this.spawnManager.spawnEnemy()
    this.events.emit('healthChanged', this.player.getHealth(), this.player.getMaxHealth())

    console.log('GameScene setup complete')
  }

  private createBackground() {
    const background = this.add.image(
      GAME_CONFIG.WORLD.WIDTH / 2,
      GAME_CONFIG.WORLD.HEIGHT / 2,
      'background'
    )

    const scaleX = GAME_CONFIG.WORLD.WIDTH / background.width
    const scaleY = GAME_CONFIG.WORLD.HEIGHT / background.height
    const scale = Math.max(scaleX, scaleY)

    background.setScale(scale)
    background.setOrigin(0.5, 0.5)
    background.setDepth(-10)

    console.log('Background created with scale:', scale)
  }

  private setupMobileControls() {
    // Listen on the shared EventBus (module-level, decoupled from
    // game.events) instead of this.game.events — see PhaserGame.tsx.
    EventBus.on('controller-input', this.handleControllerInput, this)
  }

  private handleControllerInput = (input: ControllerInput) => {
    if (this.gameOver) return

    switch (input.type) {
      case 'move':
        this.mobileMove = moveVectorFromPayload(input.payload as StickPayload)
        break

      case 'face':
        this.mobileAim = aimVectorFromPayload(input.payload as StickPayload)
        break

      case 'fire':
        this.mobileFiring = input.payload === true
        break
    }
  }

  update(_time: number, delta: number) {
    if (this.gameOver) return

    // Resolve effective aim target: mobile aim overrides mouse when active
    let aimX = this.mouseX
    let aimY = this.mouseY

    if (this.mobileAim) {
      const AIM_DIST = 1000
      aimX = this.player.x + this.mobileAim.x * AIM_DIST
      aimY = this.player.y + this.mobileAim.y * AIM_DIST
    }

    this.player.update(this.cursors, this.WASD, aimX, aimY, this.mobileMove)
    this.spawnManager.update(delta)
    this.weaponManager.update()

    // Fire: keyboard/mouse OR mobile right stick held
    if (this.spaceKey.isDown || this.input.activePointer.isDown || this.mobileFiring) {
      this.weaponManager.fire()
    }

    this.spawnManager.getEnemies().forEach(enemy => {
      if (enemy.active) {
        (enemy as any).update()
      }
    })

    this.spawnManager.getWeaponPickups().forEach(weapon => {
      if (weapon.active) {
        weapon.update()
      }
    })

    this.spawnManager.getHealthPickups().forEach(health => {
      if (health.active) {
        health.update()
      }
    })

    this.spawnManager.getWeaponPickups().forEach(weapon => {
      if (weapon.active) {
        const distance = Phaser.Math.Distance.Between(
          this.player.x, this.player.y,
          weapon.x, weapon.y
        )

        if (distance < 30) {
          const gunTexture = weapon.getGunTexture()
          this.player.switchGunVisual(gunTexture)
          this.events.emit('weaponPickedUp', gunTexture)
          weapon.destroy()
          this.spawnManager.removeWeaponPickup(weapon)
        }
      }
    })

    this.spawnManager.getHealthPickups().forEach(health => {
      if (health.active) {
        const distance = Phaser.Math.Distance.Between(
          this.player.x, this.player.y,
          health.x, health.y
        )

        if (distance < 30) {
          const healAmount = health.getHealAmount()
          this.player.heal(healAmount)
          this.events.emit('healthPickedUp', healAmount)
          health.destroy()
          this.spawnManager.removeHealthPickup(health)
        }
      }
    })

    this.weaponManager.setEnemies(this.spawnManager.getEnemies())

    const survivalTime = (Date.now() - this.startTime) / 1000
    const survivalScore = Math.floor(survivalTime * GAME_CONFIG.SCORING.SURVIVAL_POINTS_PER_SECOND)
    const totalScore = survivalScore + (this.kills * GAME_CONFIG.SCORING.KILL_MULTIPLIER)

    this.events.emit('scoreChanged', totalScore, this.kills, survivalTime)
  }

  private handleGameOver() {
    this.gameOver = true

    this.spawnManager.clearEnemies()

    const survivalTime = (Date.now() - this.startTime) / 1000
    const finalScore = Math.floor(
      survivalTime * GAME_CONFIG.SCORING.SURVIVAL_POINTS_PER_SECOND +
      this.kills * GAME_CONFIG.SCORING.KILL_MULTIPLIER
    )

    this.events.emit('gameOver', {
      score: finalScore,
      kills: this.kills,
      survivalTime: survivalTime
    })

    this.scene.stop(GAME_CONFIG.SCENES.UI)
    this.scene.start(GAME_CONFIG.SCENES.GAME_OVER, {
      score: finalScore,
      kills: this.kills,
      survivalTime: survivalTime
    })
  }

  private shutdown() {
    EventBus.off('controller-input', this.handleControllerInput, this)
  }

  getPlayer() {
    return this.player
  }
}
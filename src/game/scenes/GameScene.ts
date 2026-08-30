import Phaser from 'phaser'
import { GAME_CONFIG } from '../config'
import { Player } from '../entities/Player'
import { SpawnManager } from '../systems/SpawnManager'
import { WeaponManager } from '../systems/WeaponManager'

export class GameScene extends Phaser.Scene {
  private player!: Player
  private spawnManager!: SpawnManager
  private weaponManager!: WeaponManager
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private WASD!: any
  private spaceKey!: Phaser.Input.Keyboard.Key
  private weaponKeys!: any
  private mouseX: number = 0
  private mouseY: number = 0
  private score: number = 0
  private kills: number = 0
  private startTime: number = 0
  private gameOver: boolean = false

  constructor() {
    super({ key: GAME_CONFIG.SCENES.GAME })
  }

  create() {
    console.log('GameScene create() called')

    this.physics.world.setBounds(0, 0, GAME_CONFIG.WORLD.WIDTH, GAME_CONFIG.WORLD.HEIGHT)
    this.cameras.main.setBounds(0, 0, GAME_CONFIG.WORLD.WIDTH, GAME_CONFIG.WORLD.HEIGHT)

    this.createBackground()

    this.player = new Player(this, GAME_CONFIG.WORLD.WIDTH / 2, GAME_CONFIG.WORLD.HEIGHT / 2)
    console.log('Player created:', this.player)

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)

    this.cursors = this.input.keyboard!.createCursorKeys()
    this.WASD = this.input.keyboard!.addKeys('W,A,S,D')
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this.weaponKeys = this.input.keyboard!.addKeys('ONE,TWO,THREE,FOUR')

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
      this.mouseX = worldPoint.x
      this.mouseY = worldPoint.y
    })

    this.spawnManager = new SpawnManager(this, this.player)
    this.weaponManager = new WeaponManager(this, this.player)

    this.spaceKey.on('down', () => this.weaponManager.fire())
    this.weaponKeys.ONE.on('down', () => this.weaponManager.switchWeapon('DEBUG_RAY'))
    this.weaponKeys.TWO.on('down', () => this.weaponManager.switchWeapon('FIREWALL_BURST'))
    this.weaponKeys.THREE.on('down', () => this.weaponManager.switchWeapon('PACKET_STORM'))
    this.weaponKeys.FOUR.on('down', () => this.weaponManager.switchWeapon('COMPILER_BLADE'))

    this.events.on('enemyKilled', (enemy: any, score: number) => {
      this.score += score
      this.kills++
      this.spawnManager.removeEnemy(enemy)
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
    this.startTime = Date.now()
    this.weaponManager.setEnemies(this.spawnManager.getEnemies())
    this.spawnManager.spawnEnemy()
    this.events.emit('healthChanged', this.player.getHealth(), this.player.getMaxHealth())

    console.log('GameScene setup complete')
  }

  private createBackground() {
    // Use the provided background image
    const background = this.add.image(
      GAME_CONFIG.WORLD.WIDTH / 2,
      GAME_CONFIG.WORLD.HEIGHT / 2,
      'background'
    )
    
    // Scale the background to fit the world
    const scaleX = GAME_CONFIG.WORLD.WIDTH / background.width
    const scaleY = GAME_CONFIG.WORLD.HEIGHT / background.height
    const scale = Math.max(scaleX, scaleY)
    
    background.setScale(scale)
    background.setOrigin(0.5, 0.5)
    
    console.log('Background created with scale:', scale)
  }

  private setupMobileControls() {
    // Listen for mobile control events from Supabase real-time
    // This will be implemented when Supabase integration is added
    this.events.on('mobileInput', (input: { direction: string, action: string }) => {
      if (this.gameOver) return
      
      switch (input.direction) {
        case 'up':
          this.player.setVelocityY(-GAME_CONFIG.PLAYER.SPEED)
          break
        case 'down':
          this.player.setVelocityY(GAME_CONFIG.PLAYER.SPEED)
          break
        case 'left':
          this.player.setVelocityX(-GAME_CONFIG.PLAYER.SPEED)
          this.player.setFlipX(true)
          break
        case 'right':
          this.player.setVelocityX(GAME_CONFIG.PLAYER.SPEED)
          this.player.setFlipX(false)
          break
        case 'stop':
          this.player.setVelocity(0, 0)
          break
      }
      
      if (input.action === 'fire') {
        this.weaponManager.fire()
      }
    })
  }

  update(_time: number, delta: number) {
    if (this.gameOver) return

    this.player.update(this.cursors, this.WASD, this.mouseX, this.mouseY)
    this.spawnManager.update(delta)
    this.weaponManager.update()

    this.spawnManager.getEnemies().forEach(enemy => {
      if (enemy.active) {
        (enemy as any).update()
      }
    })

    // Update weapon pickups
    this.spawnManager.getWeaponPickups().forEach(weapon => {
      if (weapon.active) {
        weapon.update()
      }
    })

    // Check collision between player and weapon pickups
    this.spawnManager.getWeaponPickups().forEach(weapon => {
      if (weapon.active) {
        const distance = Phaser.Math.Distance.Between(
          this.player.x, this.player.y,
          weapon.x, weapon.y
        )
        
        if (distance < 30) {
          // Player picked up weapon
          const gunTexture = weapon.getGunTexture()
          this.player.switchGunVisual(gunTexture)
          
          // Show pickup message
          this.events.emit('weaponPickedUp', gunTexture)
          
          weapon.destroy()
          this.spawnManager.removeWeaponPickup(weapon)
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
    
    // Stop spawning
    this.spawnManager.clearEnemies()
    
    // Calculate final score
    const survivalTime = (Date.now() - this.startTime) / 1000
    const finalScore = Math.floor(
      survivalTime * GAME_CONFIG.SCORING.SURVIVAL_POINTS_PER_SECOND +
      this.kills * GAME_CONFIG.SCORING.KILL_MULTIPLIER
    )
    
    // Emit game over event
    this.events.emit('gameOver', {
      score: finalScore,
      kills: this.kills,
      survivalTime: survivalTime
    })
    
    // Switch to game over scene
    this.time.delayedCall(2000, () => {
      this.scene.stop(GAME_CONFIG.SCENES.UI)
      this.scene.start(GAME_CONFIG.SCENES.GAME_OVER, {
        score: finalScore,
        kills: this.kills,
        survivalTime: survivalTime
      })
    })
  }

  getPlayer() {
    return this.player
  }
}
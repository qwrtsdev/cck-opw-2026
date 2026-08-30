import Phaser from 'phaser'
import { GAME_CONFIG } from '../config'

type EnemyType = keyof typeof GAME_CONFIG.ENEMIES

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  private enemyType: EnemyType
  private health: number
  private maxHealth: number
  private damage: number
  private speed: number
  private behavior: string
  private player: Phaser.Physics.Arcade.Sprite
  private lastDamageTime: number = 0
  private damageCooldown: number = 1000 // 1 second between damage

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    type: EnemyType,
    player: Phaser.Physics.Arcade.Sprite
  ) {
    const config = GAME_CONFIG.ENEMIES[type]
    
    // All enemies use the same bug texture, just different colors
    super(scene, x, y, 'enemy_bug')
    
    this.enemyType = type
    this.health = config.health
    this.maxHealth = config.health
    this.damage = config.damage
    this.speed = config.speed
    this.behavior = config.behavior || 'chase'
    this.player = player
    
    scene.add.existing(this)
    scene.physics.add.existing(this)
    
    this.setCollideWorldBounds(true)
    this.setDisplaySize(config.size, config.size)
    
    // Apply color tint based on enemy type
    this.applyColorTint(config.color)
  }
  
  private applyColorTint(color: string) {
    switch (color) {
      case 'green':
        // No tint, use original color
        break
      case 'red':
        this.setTint(0xff0000)
        break
      case 'yellow':
        this.setTint(0xffff00)
        break
      case 'green2':
        this.setTint(0x00ff00)
        break
      case 'red2':
        this.setTint(0xff6600)
        break
      default:
        // No tint
        break
    }
  }

  update() {
    if (!this.active || !this.player.active) return

    // All enemies just chase the player (simple behavior)
    this.chasePlayer()
  }

  private chasePlayer() {
    const angle = Phaser.Math.Angle.Between(
      this.x, this.y,
      this.player.x, this.player.y
    )
    
    this.setVelocity(
      Math.cos(angle) * this.speed,
      Math.sin(angle) * this.speed
    )
  }

  takeDamage(amount: number) {
    if (!this.active) return

    this.health -= amount

    this.setTint(0xff0000)
    this.scene.time.delayedCall(100, () => {
      if (this.active) this.clearTint()
    })

    if (this.health <= 0) {
      this.die()
    }
  }

  applyDifficultyMultiplier(multiplier: number) {
    this.health = Math.max(1, Math.round(this.maxHealth * multiplier))
    this.maxHealth = this.health
    this.speed = Math.min(this.speed * 1.12, this.speed * 1.8)
  }

  damagePlayer() {
    const now = Date.now()
    if (now - this.lastDamageTime < this.damageCooldown) return

    this.lastDamageTime = now

    if ('takeDamage' in this.player) {
      (this.player as any).takeDamage(this.damage)
    }
  }

  die() {
    if (!this.active) return

    this.setActive(false)
    this.setVisible(false)
    if (this.body) this.body.enable = false

    if (this.behavior === 'split') {
      this.splitWorm()
    }

    const score = GAME_CONFIG.ENEMIES[this.enemyType].score
    this.scene.events.emit('enemyKilled', this, score, this.enemyType)
    this.destroy()
  }

  private splitWorm() {
    if (!this.scene) return
    
    const offset = 20
    const newWorm1 = new Enemy(
      this.scene,
      this.x + offset,
      this.y,
      'WORM',
      this.player
    )
    const newWorm2 = new Enemy(
      this.scene,
      this.x - offset,
      this.y,
      'WORM',
      this.player
    )
    
    // Reduce health of split worms
    newWorm1.health = this.maxHealth * 0.5
    newWorm2.health = this.maxHealth * 0.5
  }

  getScore() {
    return GAME_CONFIG.ENEMIES[this.enemyType].score
  }
}
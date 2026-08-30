import Phaser from 'phaser'
import { GAME_CONFIG } from '../config'

export class Player extends Phaser.Physics.Arcade.Sprite {
  private health: number
  private maxHealth: number
  private isInvincible: boolean
  private weapons: string[]
  private currentWeapon: string
  
  // Visual components
  private armRight!: Phaser.GameObjects.Sprite
  private gun!: Phaser.GameObjects.Sprite
  private container!: Phaser.GameObjects.Container
  
  // Direction tracking
  private currentAngle: number = 0
  private currentGunTexture: string = ''

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player')
    
    this.health = GAME_CONFIG.PLAYER.MAX_HEALTH
    this.maxHealth = GAME_CONFIG.PLAYER.MAX_HEALTH
    this.isInvincible = false
    this.weapons = ['DEBUG_RAY']
    this.currentWeapon = 'DEBUG_RAY'
    
    scene.add.existing(this)
    scene.physics.add.existing(this)
    
    this.setCollideWorldBounds(true)
    this.setDisplaySize(GAME_CONFIG.PLAYER.SIZE, GAME_CONFIG.PLAYER.SIZE)
    
    // Hide the sprite itself - we'll use the container for visuals instead
    this.setVisible(false)
    
    // Setup visual components
    this.setupVisuals()
  }

  private setupVisuals() {
    const scene = this.scene
    
    // Create container for player graphics (top-down view)
    this.container = scene.add.container(this.x, this.y)
    this.container.setDepth(10)
    
    // Player body indicator (small circle at center)
    const bodyGraphics = scene.add.graphics()
    bodyGraphics.fillStyle(0x0088ff, 0.8)
    bodyGraphics.fillCircle(0, 0, 3)
    this.container.add(bodyGraphics)
    
    // Arm holding gun (single arm visible from top-down view)
    // Using right side of hand texture, positioned to extend outward
    this.armRight = scene.add.sprite(6, 0, 'hand')
    this.armRight.setDisplaySize(12, 6)
    this.armRight.setAlpha(0.9)
    // Crop to show only the right half (hand reaching outward)
    this.armRight.setCrop(16, 0, 16, 32)
    this.armRight.setOrigin(0.1, 0.5) // Origin at wrist for rotation
    this.container.add(this.armRight)
    
    // Gun (random at start) - positioned at end of arm
    const gunOptions = ['gun_1', 'gun_2', 'gun_3', 'gun_4', 'gun_5', 'gun_6', 'gun_7', 'gun_8', 'gun_9', 'gun_10']
    const randomGun = gunOptions[Math.floor(Math.random() * gunOptions.length)]
    this.currentGunTexture = randomGun
    
    this.gun = scene.add.sprite(16, 0, randomGun)
    this.gun.setDisplaySize(14, 6)
    this.gun.setOrigin(0.1, 0.5)
    this.container.add(this.gun)
  }

  update(cursors: Phaser.Types.Input.Keyboard.CursorKeys, WASD: any, mouseX: number = this.x, mouseY: number = this.y) {
    let velocityX = 0
    let velocityY = 0

    if (cursors.left.isDown || WASD.A.isDown) {
      velocityX = -GAME_CONFIG.PLAYER.SPEED
    } else if (cursors.right.isDown || WASD.D.isDown) {
      velocityX = GAME_CONFIG.PLAYER.SPEED
    }

    if (cursors.up.isDown || WASD.W.isDown) {
      velocityY = -GAME_CONFIG.PLAYER.SPEED
    } else if (cursors.down.isDown || WASD.S.isDown) {
      velocityY = GAME_CONFIG.PLAYER.SPEED
    }

    this.setVelocity(velocityX, velocityY)

    // Calculate angle to mouse
    const angle = Phaser.Math.Angle.Between(this.x, this.y, mouseX, mouseY)
    this.currentAngle = angle
    
    // Rotate arm and gun to point toward mouse (smooth rotation)
    const angleDiff = Phaser.Math.Angle.Wrap(angle - this.container.rotation)
    this.container.rotation += angleDiff * 0.15 // Smooth rotation
    
    // Update container position to match physics body
    this.container.x = this.x
    this.container.y = this.y
  }

  takeDamage(amount: number) {
    if (this.isInvincible) return

    this.health -= amount
    this.isInvincible = true
    
    // Visual feedback on container
    if (this.container) {
      this.container.setAlpha(0.5)
    }

    this.scene.time.delayedCall(GAME_CONFIG.PLAYER.INVINCIBILITY_TIME, () => {
      this.isInvincible = false
      if (this.container) {
        this.container.setAlpha(1)
      }
    })

    // Emit health change event
    this.scene.events.emit('playerHealthChanged', this.health, this.maxHealth)

    if (this.health <= 0) {
      this.die()
    }
  }

  heal(amount: number) {
    this.health = Math.min(this.health + amount, this.maxHealth)
    this.scene.events.emit('playerHealthChanged', this.health, this.maxHealth)
  }

  die() {
    this.setActive(false)
    this.setVisible(false)
    if (this.container) {
      this.container.destroy()
    }
    this.scene.events.emit('playerDeath')
  }

  getCurrentWeapon() {
    return this.currentWeapon
  }

  switchWeapon(weaponName: string) {
    if (this.weapons.includes(weaponName)) {
      this.currentWeapon = weaponName
    }
  }

  addWeapon(weaponName: string) {
    if (!this.weapons.includes(weaponName)) {
      this.weapons.push(weaponName)
    }
  }

  getHealth() {
    return this.health
  }

  getMaxHealth() {
    return this.maxHealth
  }

  getGunPosition(): Phaser.Math.Vector2 {
    // Get gun position in world coordinates
    const gunWorldPoint = this.container.getWorldTransformMatrix().transformPoint(this.gun.x, this.gun.y)
    return new Phaser.Math.Vector2(gunWorldPoint.x, gunWorldPoint.y)
  }

  getAimAngle(): number {
    return this.currentAngle
  }

  isFacingDirection(direction: 'left' | 'right'): boolean {
    // In top-down view, rotation determines direction instead of left/right flip
    // Check if angle is in the direction specified
    const angle = this.currentAngle
    if (direction === 'left') {
      return Math.abs(angle) > Math.PI / 2
    } else {
      return Math.abs(angle) < Math.PI / 2
    }
  }

  switchGunVisual(gunTexture: string) {
    this.currentGunTexture = gunTexture
    this.gun.setTexture(gunTexture)
    
    // Flash effect when switching
    this.scene.tweens.add({
      targets: this.gun,
      alpha: 0.5,
      duration: 100,
      yoyo: true
    })
  }

  getCurrentGunTexture(): string {
    return this.currentGunTexture
  }
}
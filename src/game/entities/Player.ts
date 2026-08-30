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
  private weaponContainer!: Phaser.GameObjects.Container
  private playerSprite!: Phaser.GameObjects.Sprite
  
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
    
    // Create main container (ไม่หมุน - แค่ไว้รวมทุกอย่าง)
    this.container = scene.add.container(this.x, this.y)
    this.container.setDepth(10)
    
    // Player body sprite - แสดงแค่ครึ่งเดียวของ sprite
    this.playerSprite = scene.add.sprite(0, 0, 'player')
    
    // ถ้า player.png มี 2 ตัวละครในรูปเดียว (ซ้าย-ขวา)
    const texture = scene.textures.get('player')
    const frame = texture.get()
    const halfWidth = frame.width / 2
    
    // เริ่มต้นไม่ crop ก่อน แค่ใช้ครึ่งนึง
    this.playerSprite.setCrop(halfWidth, 0, halfWidth, frame.height)
    this.playerSprite.setOrigin(0.5, 0.5)
    
    // Scale ให้ตัวละครมีขนาดถูกต้องหลัง crop
    const targetSize = GAME_CONFIG.PLAYER.SIZE
    const scaleX = targetSize / halfWidth
    const scaleY = targetSize / frame.height
    this.playerSprite.setScale(scaleX, scaleY)
    
    this.container.add(this.playerSprite)
    
    // Weapon container (หมุนตามเมาส์) - ต้องอยู่เหนือตัวละคร
    this.weaponContainer = scene.add.container(0, 0)
    this.weaponContainer.setDepth(15) // เพิ่ม depth ให้สูงกว่าตัวละคร
    
    // Arm holding gun - ใช้ hand.png
    this.armRight = scene.add.sprite(15, 0, 'hand')
    this.armRight.setDisplaySize(25, 25)
    this.armRight.setOrigin(0.3, 0.5)
    this.armRight.setAlpha(1)
    this.weaponContainer.add(this.armRight)
    
    // Gun (random at start) - วางที่ปลายมือ
    const gunOptions = ['gun_1', 'gun_2', 'gun_3', 'gun_4', 'gun_5', 'gun_6', 'gun_7', 'gun_8', 'gun_9', 'gun_10']
    const randomGun = gunOptions[Math.floor(Math.random() * gunOptions.length)]
    this.currentGunTexture = randomGun
    
    this.gun = scene.add.sprite(28, 0, randomGun)
    this.gun.setDisplaySize(20, 12)
    this.gun.setOrigin(0.3, 0.5)
    this.weaponContainer.add(this.gun)
    
    // เพิ่ม weapon container เข้าใน scene (ไม่ใส่ใน main container)
    scene.add.existing(this.weaponContainer)
    
    console.log('Player visuals setup complete - arm and gun added to weapon container')
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
    
    // Determine if facing left or right based on angle
    const facingLeft = Math.abs(angle) > Math.PI / 2
    
    // Flip player sprite (ไม่หมุน แค่ flip)
    if (this.playerSprite) {
      const texture = this.scene.textures.get('player')
      const frame = texture.get()
      const halfWidth = frame.width / 2
      
      const targetSize = GAME_CONFIG.PLAYER.SIZE
      const scaleX = targetSize / halfWidth
      const scaleY = targetSize / frame.height
      
      if (facingLeft) {
        // หันซ้าย - ใช้ครึ่งขวาแล้ว flip (สลับจากเดิม)
        this.playerSprite.setCrop(halfWidth, 0, halfWidth, frame.height)
        this.playerSprite.setFlipX(true)
      } else {
        // หันขวา - ใช้ครึ่งซ้าย (สลับจากเดิม)
        this.playerSprite.setCrop(0, 0, halfWidth, frame.height)
        this.playerSprite.setFlipX(false)
      }
      
      this.playerSprite.setScale(scaleX, scaleY)
    }
    
    // Flip arm and gun based on direction
    if (facingLeft) {
      this.armRight.setFlipX(true)
      this.gun.setFlipX(true)
      // ตำแหน่งฝั่งซ้าย
      this.armRight.x = -15
      this.gun.x = -28
      this.gun.setFlipY(false)
    } else {
      this.armRight.setFlipX(false)
      this.gun.setFlipX(false)
      // ตำแหน่งฝั่งขวา
      this.armRight.x = 15
      this.gun.x = 28
      this.gun.setFlipY(false)
    }
    
    // Rotate ONLY weapon container (แขน+ปืน) to point toward mouse
    // เมื่อหันซ้าย ต้องกลับมุม
    let targetAngle = angle
    if (facingLeft) {
      // กลับมุมเมื่อหันซ้าย (180 องศา - มุมเดิม)
      targetAngle = angle > 0 ? angle - Math.PI : angle + Math.PI
    }
    
    const angleDiff = Phaser.Math.Angle.Wrap(targetAngle - this.weaponContainer.rotation)
    this.weaponContainer.rotation += angleDiff * 0.15 // Smooth rotation
    
    // Update both containers position to match physics body
    this.container.x = this.x
    this.container.y = this.y
    this.weaponContainer.x = this.x
    this.weaponContainer.y = this.y
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
    if (this.weaponContainer) {
      this.weaponContainer.destroy()
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
    // Get gun position in world coordinates from weapon container
    const gunWorldPoint = this.weaponContainer.getWorldTransformMatrix().transformPoint(this.gun.x, this.gun.y)
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
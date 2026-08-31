import Phaser from 'phaser'
import { GAME_CONFIG } from '../config'

export class Player extends Phaser.Physics.Arcade.Sprite {
  private health: number
  private maxHealth: number
  private isInvincible: boolean
  private weapons: string[]
  private currentWeapon: string

  private gun!: Phaser.GameObjects.Sprite
  private hand!: Phaser.GameObjects.Sprite
  private playerSprite!: Phaser.GameObjects.Sprite
  private bodyContainer!: Phaser.GameObjects.Container
  private weaponContainer!: Phaser.GameObjects.Container
  private healthBar!: Phaser.GameObjects.Graphics
  private healthBarBg!: Phaser.GameObjects.Graphics

  private currentAngle: number = 0
  private currentGunTexture: string = ''

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player')
    this.health = GAME_CONFIG.PLAYER.MAX_HEALTH
    this.maxHealth = GAME_CONFIG.PLAYER.MAX_HEALTH
    this.isInvincible = false
    this.weapons = []
    this.currentWeapon = 'RAPID_FIRE'
    scene.add.existing(this)
    scene.physics.add.existing(this)
    this.setCollideWorldBounds(true)
    this.setDisplaySize(GAME_CONFIG.PLAYER.SIZE, GAME_CONFIG.PLAYER.SIZE)
    this.setVisible(false)
    this.setupVisuals()
  }

  // crop ครึ่งซ้ายหรือขวาแล้ว scale ให้ได้ขนาดที่ต้องการ
  private cropHalf(sprite: Phaser.GameObjects.Sprite, key: string, side: 'left' | 'right', displaySize: number) {
    const tex = this.scene.textures.get(key)
    const frame = tex.get()
    const hw = frame.width / 2
    const h = frame.height
    if (side === 'left') {
      sprite.setCrop(0, 0, hw, h)
    } else {
      sprite.setCrop(hw, 0, hw, h)
    }
    sprite.setScale(displaySize / hw, displaySize / h)
  }

  private setupVisuals() {
    const scene = this.scene

    // bodyContainer: ตัวละครอย่างเดียว ไม่หมุน
    this.bodyContainer = scene.add.container(this.x, this.y)
    this.bodyContainer.setDepth(10)

    this.playerSprite = scene.add.sprite(0, 0, 'player')
    this.playerSprite.setOrigin(0.5, 0.5)
    this.cropHalf(this.playerSprite, 'player', 'left', GAME_CONFIG.PLAYER.SIZE)
    this.bodyContainer.add(this.playerSprite)

    // weaponContainer: origin คือตำแหน่งตัวละคร หมุนรอบจุดนี้
    // ปืนและมือวางที่ offset จาก center
    this.weaponContainer = scene.add.container(this.x, this.y)
    this.weaponContainer.setDepth(20)

    // ปืน: x=-12 จุดหมุนเข้ามาในลำตัวมากขึ้น, origin=(0,0.5) โคนปืนที่ x=-12
    this.currentGunTexture = 'gun_1'
    this.gun = scene.add.sprite(-12, 0, this.currentGunTexture)
    this.gun.setDisplaySize(20, 10)
    this.gun.setOrigin(0, 0.5)
    this.weaponContainer.add(this.gun)

    // มือ: วางที่ x=-12+10=-6 (กึ่งกลางปืน) ทับบนปืนพอดี
    this.hand = scene.add.sprite(-6, 0, 'hand')
    this.hand.setOrigin(0.5, 0.5)
    this.cropHalf(this.hand, 'hand', 'left', 16)
    this.weaponContainer.add(this.hand)

    // Health bar above player
    this.createHealthBar()
  }

  update(cursors: Phaser.Types.Input.Keyboard.CursorKeys, WASD: any, mouseX: number = this.x, mouseY: number = this.y) {
    let vx = 0, vy = 0
    if (cursors.left.isDown  || WASD.A.isDown) vx = -GAME_CONFIG.PLAYER.SPEED
    else if (cursors.right.isDown || WASD.D.isDown) vx =  GAME_CONFIG.PLAYER.SPEED
    if (cursors.up.isDown    || WASD.W.isDown) vy = -GAME_CONFIG.PLAYER.SPEED
    else if (cursors.down.isDown  || WASD.S.isDown) vy =  GAME_CONFIG.PLAYER.SPEED
    this.setVelocity(vx, vy)

    // คำนวณมุมเล็งเมาส์
    const angle = Phaser.Math.Angle.Between(this.x, this.y, mouseX, mouseY)
    this.currentAngle = angle
    const facingLeft = Math.abs(angle) > Math.PI / 2

    // ตัวละคร: flip ซ้าย/ขวา ไม่หมุน
    if (facingLeft) {
      this.cropHalf(this.playerSprite, 'player', 'right', GAME_CONFIG.PLAYER.SIZE)
      this.playerSprite.setFlipX(true)
    } else {
      this.cropHalf(this.playerSprite, 'player', 'left', GAME_CONFIG.PLAYER.SIZE)
      this.playerSprite.setFlipX(false)
    }

    // มือ + ปืน: mirror position เมื่อหันซ้าย เพื่อให้ไปอยู่ด้านซ้ายของตัว
    if (facingLeft) {
      // ซ้าย: ขยับปืนไปทางซ้ายมากขึ้น และมือติดกับปืน
      this.gun.setFlipY(true)
      this.gun.x = 12
      
      this.cropHalf(this.hand, 'hand', 'right', 16)
      this.hand.setFlipX(true)
      this.hand.x = 14
    } else {
      this.gun.setFlipY(false)
      this.gun.x = -12
      
      this.cropHalf(this.hand, 'hand', 'left', 16)
      this.hand.setFlipX(false)
      this.hand.x = -6
    }

    // หมุน weaponContainer รอบจุดกลาง (0,0) ซึ่งคือตำแหน่งตัวละคร
    const angleDiff = Phaser.Math.Angle.Wrap(angle - this.weaponContainer.rotation)
    this.weaponContainer.rotation += angleDiff * 0.2

    // sync position ทั้งคู่ให้ตรงกับ physics body
    this.bodyContainer.x   = this.x
    this.bodyContainer.y   = this.y
    this.weaponContainer.x = this.x
    this.weaponContainer.y = this.y
  }

  takeDamage(amount: number) {
    if (this.isInvincible) return
    this.isInvincible = true
    this.bodyContainer?.setAlpha(0.5)
    this.weaponContainer?.setAlpha(0.5)
    
    // Gradual damage over time
    const damagePerTick = amount / 10 // Divide damage into 10 ticks
    let ticksRemaining = 10
    
    const damageInterval = this.scene.time.addEvent({
      delay: 50, // 50ms per tick
      callback: () => {
        this.health -= damagePerTick
        this.updateHealthBar()
        this.scene.events.emit('playerHealthChanged', this.health, this.maxHealth)
        ticksRemaining--
        
        if (ticksRemaining <= 0 || this.health <= 0) {
          damageInterval.remove()
          this.isInvincible = false
          this.bodyContainer?.setAlpha(1)
          this.weaponContainer?.setAlpha(1)
          if (this.health <= 0) this.die()
        }
      },
      callbackScope: this,
      repeat: 9 // Run 10 times total
    })
  }

  heal(amount: number) {
    this.health = Math.min(this.health + amount, this.maxHealth)
    this.updateHealthBar()
    this.scene.events.emit('playerHealthChanged', this.health, this.maxHealth)
  }

  private createHealthBar() {
    const barWidth = 40
    const barHeight = 6
    const xOffset = -15 // Move far left to actual player body
    const yOffset = -25 // Position above player

    // Background bar
    this.healthBarBg = this.scene.add.graphics()
    this.healthBarBg.fillStyle(0x333333, 0.8)
    this.healthBarBg.fillRect(xOffset - barWidth / 2, yOffset, barWidth, barHeight)
    this.healthBarBg.setDepth(30)
    this.bodyContainer.add(this.healthBarBg)

    // Health bar
    this.healthBar = this.scene.add.graphics()
    this.healthBar.fillStyle(0x00ff00, 1)
    this.healthBar.fillRect(xOffset - barWidth / 2, yOffset, barWidth, barHeight)
    this.healthBar.setDepth(31)
    this.bodyContainer.add(this.healthBar)
  }

  private updateHealthBar() {
    if (!this.healthBar || !this.healthBarBg) return

    const barWidth = 40
    const barHeight = 6
    const xOffset = -20 // Move far left to actual player body
    const yOffset = -25
    const healthPercent = Math.max(0, this.health / this.maxHealth)

    this.healthBar.clear()

    // Change color based on health percentage
    if (healthPercent > 0.6) {
      this.healthBar.fillStyle(0x00ff00, 1) // Green
    } else if (healthPercent > 0.3) {
      this.healthBar.fillStyle(0xffff00, 1) // Yellow
    } else {
      this.healthBar.fillStyle(0xff0000, 1) // Red
    }

    this.healthBar.fillRect(xOffset - barWidth / 2, yOffset, barWidth * healthPercent, barHeight)
  }

  die() {
    this.setActive(false)
    this.setVisible(false)
    this.bodyContainer?.destroy()
    this.weaponContainer?.destroy()
    this.scene.events.emit('playerDeath')
  }

  getCurrentWeapon() { return this.currentWeapon }
  getCurrentWeaponType(): string {
    return (GAME_CONFIG.GUN_MAPPING as any)[this.currentGunTexture] || 'RAPID_FIRE'
  }
  switchWeapon(weaponName: string) { if (this.weapons.includes(weaponName)) this.currentWeapon = weaponName }
  addWeapon(weaponName: string) { if (!this.weapons.includes(weaponName)) this.weapons.push(weaponName) }
  getHealth()    { return this.health }
  getMaxHealth() { return this.maxHealth }

  getGunPosition(): Phaser.Math.Vector2 {
    const muzzleOffset = 20
    
    const p = this.weaponContainer.getWorldTransformMatrix().transformPoint(
      this.gun.x + muzzleOffset,
      this.gun.y
    )
    return new Phaser.Math.Vector2(p.x, p.y)
  }

  getAimAngle(): number { return this.currentAngle }

  isFacingDirection(direction: 'left' | 'right'): boolean {
    return direction === 'left'
      ? Math.abs(this.currentAngle) > Math.PI / 2
      : Math.abs(this.currentAngle) < Math.PI / 2
  }

  playFireAnimation(duration: number = 80) {
    // Switch to fire frame
    const fireTexture = this.currentGunTexture + '_fire'
    this.gun.setTexture(fireTexture)
    
    // Return to idle frame after duration
    this.scene.time.delayedCall(duration, () => {
      if (this.gun && this.gun.active) {
        this.gun.setTexture(this.currentGunTexture)
      }
    })
  }

  switchGunVisual(gunTexture: string) {
    this.currentGunTexture = gunTexture
    this.gun.setTexture(gunTexture)
    
    // Update current weapon based on gun texture
    const weaponType = (GAME_CONFIG.GUN_MAPPING as any)[gunTexture]
    if (weaponType) {
      this.currentWeapon = weaponType
    }
    
    // Flash effect when switching
    this.scene.tweens.add({
      targets: this.gun,
      alpha: 0.5,
      duration: 100,
      yoyo: true
    })
  }

  getCurrentGunTexture(): string { return this.currentGunTexture }
}

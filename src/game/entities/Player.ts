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
    const gunOptions = ['gun_1','gun_2','gun_3','gun_4','gun_5','gun_6','gun_7','gun_8','gun_9','gun_10']
    this.currentGunTexture = gunOptions[Math.floor(Math.random() * gunOptions.length)]
    this.gun = scene.add.sprite(-12, 0, this.currentGunTexture)
    this.gun.setDisplaySize(20, 10)
    this.gun.setOrigin(0, 0.5)
    this.weaponContainer.add(this.gun)

    // มือ: วางที่ x=-12+10=-6 (กึ่งกลางปืน) ทับบนปืนพอดี
    this.hand = scene.add.sprite(-6, 0, 'hand')
    this.hand.setOrigin(0.5, 0.5)
    this.cropHalf(this.hand, 'hand', 'left', 16)
    this.weaponContainer.add(this.hand)
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
      // ปืน: origin(0,0.5) + width=20 → เมื่อ flipY โคนปืนยังที่เดิม แต่ปลายกลับ
      // mirror คือ: x_new = -(x_old + width) = -(-12 + 20) = -8
      this.gun.setFlipY(true)
      this.gun.x = 8
      
      // มือ: อยู่กึ่งกลางปืน ที่ x = 8 + 10/2 = 13? ลองปรับให้ชิด
      this.cropHalf(this.hand, 'hand', 'right', 16)
      this.hand.setFlipX(true)
      this.hand.x = 12
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
    this.health -= amount
    this.isInvincible = true
    this.bodyContainer?.setAlpha(0.5)
    this.weaponContainer?.setAlpha(0.5)
    this.scene.time.delayedCall(GAME_CONFIG.PLAYER.INVINCIBILITY_TIME, () => {
      this.isInvincible = false
      this.bodyContainer?.setAlpha(1)
      this.weaponContainer?.setAlpha(1)
    })
    this.scene.events.emit('playerHealthChanged', this.health, this.maxHealth)
    if (this.health <= 0) this.die()
  }

  heal(amount: number) {
    this.health = Math.min(this.health + amount, this.maxHealth)
    this.scene.events.emit('playerHealthChanged', this.health, this.maxHealth)
  }

  die() {
    this.setActive(false)
    this.setVisible(false)
    this.bodyContainer?.destroy()
    this.weaponContainer?.destroy()
    this.scene.events.emit('playerDeath')
  }

  getCurrentWeapon() { return this.currentWeapon }
  switchWeapon(weaponName: string) { if (this.weapons.includes(weaponName)) this.currentWeapon = weaponName }
  addWeapon(weaponName: string) { if (!this.weapons.includes(weaponName)) this.weapons.push(weaponName) }
  getHealth()    { return this.health }
  getMaxHealth() { return this.maxHealth }

  getGunPosition(): Phaser.Math.Vector2 {
    const p = this.weaponContainer.getWorldTransformMatrix().transformPoint(
      this.gun.x + this.gun.displayWidth,
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

  switchGunVisual(gunTexture: string) {
    this.currentGunTexture = gunTexture
    this.gun.setTexture(gunTexture)
    this.scene.tweens.add({ targets: this.gun, alpha: 0.5, duration: 100, yoyo: true })
  }

  getCurrentGunTexture(): string { return this.currentGunTexture }
}

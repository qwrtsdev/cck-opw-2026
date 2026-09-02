import Phaser from 'phaser'

export class WeaponPickup extends Phaser.Physics.Arcade.Sprite {
  private gunTexture: string
  private outline: Phaser.GameObjects.Graphics

  constructor(scene: Phaser.Scene, x: number, y: number, gunTexture: string) {
    super(scene, x, y, gunTexture)

    this.gunTexture = gunTexture

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.setDisplaySize(24, 12)
    this.setBounce(0.6)
    this.setCollideWorldBounds(true)
    this.setDrag(0.98)

    // Random initial velocity for drop effect
    this.setVelocity(
      (Math.random() - 0.5) * 150,
      -100 - Math.random() * 100
    )

    // Add glow/rotation effect
    this.setDepth(8)

    this.outline = scene.add.graphics()
    this.outline.setDepth(7)

    // Floating animation
    this.scene.tweens.add({
      targets: this,
      y: y - 15,
      duration: 1000,
      ease: 'Sine.inOut',
      yoyo: true,
      repeat: -1
    })
  }

  update() {
    // Add subtle rotation
    this.rotation += 0.02

    // Add glow effect
    this.setAlpha(0.8 + Math.sin(this.scene.time.now * 0.004) * 0.2)

    const pulse = 1 + Math.sin(this.scene.time.now * 0.005) * 0.08
    const width = this.displayWidth + 10 * pulse
    const height = this.displayHeight + 10 * pulse

    this.outline.clear()
    this.outline.lineStyle(3, 0xffff00, 0.95)
    this.outline.strokeRoundedRect(
      this.x - width / 2,
      this.y - height / 2,
      width,
      height,
      4
    )
  }

  destroy(fromScene?: boolean) {
    this.outline?.destroy()
    super.destroy(fromScene)
  }

  getGunTexture(): string {
    return this.gunTexture
  }
}

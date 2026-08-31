import Phaser from 'phaser'

export class WeaponPickup extends Phaser.Physics.Arcade.Sprite {
  private gunTexture: string

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
  }

  getGunTexture(): string {
    return this.gunTexture
  }
}

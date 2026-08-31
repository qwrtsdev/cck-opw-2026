import Phaser from 'phaser'

export class HealthPickup extends Phaser.Physics.Arcade.Sprite {
  private healAmount: number = 25

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'health_pickup')
    scene.add.existing(this)
    scene.physics.add.existing(this)
    this.setDisplaySize(24, 24)
    this.setDepth(15)
  }

  update() {
    // Add floating animation
    this.y += Math.sin(this.scene.time.now / 200) * 0.3
  }

  getHealAmount(): number {
    return this.healAmount
  }
}

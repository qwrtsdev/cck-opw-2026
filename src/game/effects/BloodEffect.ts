import Phaser from 'phaser'

export class BloodEffect {
  private scene: Phaser.Scene
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  spawnBlood(x: number, y: number, angle: number = 0, intensity: number = 1) {
    const particleCount = Math.floor(5 + intensity * 5)
    
    for (let i = 0; i < particleCount; i++) {
      const velocity = 150 + Math.random() * 200
      const spreadAngle = angle + (Math.random() - 0.5) * Math.PI * 0.5
      
      const blood = this.scene.add.circle(x, y, 2 + Math.random() * 2, 0xaa0000)
      blood.setDepth(5)
      
      const vx = Math.cos(spreadAngle) * velocity
      const vy = Math.sin(spreadAngle) * velocity
      
      this.scene.physics.world.enable(blood)
      const body = blood.body as Phaser.Physics.Arcade.Body
      body.setVelocity(vx, vy)
      body.setDrag(0.98, 0.98)
      
      // Fade and fall
      this.scene.tweens.add({
        targets: blood,
        alpha: 0,
        scale: 0.3,
        duration: 800 + Math.random() * 400,
        ease: 'Quad.easeIn',
        onComplete: () => {
          blood.destroy()
        }
      })
    }
    
    // Add splatter effect at hit location
    this.createSplatter(x, y)
  }

  private createSplatter(x: number, y: number) {
    const splatter = this.scene.add.graphics()
    splatter.setDepth(4)
    
    const radius = 3 + Math.random() * 4
    const color = 0x880000
    
    splatter.fillStyle(color, 0.6)
    splatter.fillCircle(x, y, radius)
    splatter.fillCircle(x + Math.random() * 4 - 2, y + Math.random() * 4 - 2, radius * 0.6)
    splatter.fillCircle(x + Math.random() * 4 - 2, y + Math.random() * 4 - 2, radius * 0.4)
    
    // Fade splatter
    this.scene.tweens.add({
      targets: splatter,
      alpha: 0,
      duration: 2000,
      ease: 'Quad.easeOut',
      onComplete: () => {
        splatter.destroy()
      }
    })
  }
}

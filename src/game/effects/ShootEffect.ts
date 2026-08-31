import Phaser from 'phaser'

const EFFECT_DISPLAY_SIZE = 40

export class ShootEffect {
  private scene: Phaser.Scene

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  playMuzzle(x: number, y: number, angle: number, effectKey: string, scale: number = 1) {
    this.playStrip(x, y, angle, `${effectKey}_1`, scale)
  }

  playImpact(x: number, y: number, effectKey: string, scale: number = 1.2) {
    this.playStrip(x, y, 0, `${effectKey}_2`, scale)
  }

  private playStrip(x: number, y: number, angle: number, sheetKey: string, scale: number) {
    const animKey = `${sheetKey}_anim`
    if (!this.scene.anims.exists(animKey)) return

    const sprite = this.scene.add.sprite(x, y, sheetKey)
    sprite.setDepth(26)
    sprite.setOrigin(0.5, 0.5)
    sprite.setRotation(angle)
    sprite.setDisplaySize(EFFECT_DISPLAY_SIZE * scale, EFFECT_DISPLAY_SIZE * scale)
    sprite.play(animKey)
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      sprite.destroy()
    })
  }
}

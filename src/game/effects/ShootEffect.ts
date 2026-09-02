import Phaser from 'phaser'
import { GAME_CONFIG } from '../config'

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
    const displaySize = GAME_CONFIG.WEAPONS.EFFECT_DISPLAY_SIZE
    sprite.setDisplaySize(displaySize * scale, displaySize * scale)
    sprite.play(animKey)
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      sprite.destroy()
    })
  }
}

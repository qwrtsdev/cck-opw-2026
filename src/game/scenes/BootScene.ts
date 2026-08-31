import Phaser from 'phaser'
import { GAME_CONFIG } from '../config'

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: GAME_CONFIG.SCENES.BOOT })
  }

  preload() {
    // Create loading bar
    const width = this.cameras.main.width
    const height = this.cameras.main.height

    const progressBar = this.add.graphics()
    const progressBox = this.add.graphics()
    
    progressBox.fillStyle(0x222222, 0.8)
    progressBox.fillRect(width / 4, height / 2 - 30, width / 2, 50)

    const loadingText = this.make.text({
      x: width / 2,
      y: height / 2 - 50,
      text: 'Loading...',
      style: {
        font: '20px monospace',
        color: '#ffffff'
      }
    })
    loadingText.setOrigin(0.5, 0.5)

    const percentText = this.make.text({
      x: width / 2,
      y: height / 2 - 5,
      text: '0%',
      style: {
        font: '18px monospace',
        color: '#ffffff'
      }
    })
    percentText.setOrigin(0.5, 0.5)

    this.load.on('progress', (value: number) => {
      progressBar.clear()
      progressBar.fillStyle(0x00ff00, 1)
      progressBar.fillRect(width / 4 + 10, height / 2 - 20, (width / 2 - 20) * value, 30)
      percentText.setText(`${Math.floor(value * 100)}%`)
    })

    this.load.on('complete', () => {
      progressBar.destroy()
      progressBox.destroy()
      loadingText.destroy()
      percentText.destroy()
    })
    
    // Error handling
    this.load.on('loaderror', (file: any) => {
      console.error('Error loading asset:', file.key)
      loadingText.setText('Error loading: ' + file.key)
    })

    // Load actual game assets
    // Player sprite
    this.load.image('player', 'game/player.png')
    
    // Player hand/arm
    this.load.image('hand', 'game/hand.png')
    
    // Weapon sprites
    this.load.image('gun_1', 'game/2 Guns/1_1.png')
    this.load.image('gun_2', 'game/2 Guns/2_1.png')
    this.load.image('gun_3', 'game/2 Guns/3_1.png')
    this.load.image('gun_4', 'game/2 Guns/4_1.png')
    this.load.image('gun_5', 'game/2 Guns/5_1.png')
    this.load.image('gun_6', 'game/2 Guns/6_1.png')
    this.load.image('gun_7', 'game/2 Guns/7_1.png')
    this.load.image('gun_8', 'game/2 Guns/8_1.png')
    this.load.image('gun_9', 'game/2 Guns/9_1.png')
    this.load.image('gun_10', 'game/2 Guns/10_1.png')
    
    // Gun fire-frame sprites (frame 2 = shooting animation)
    this.load.image('gun_1_fire', 'game/2 Guns/1_2.png')
    this.load.image('gun_2_fire', 'game/2 Guns/2_2.png')
    this.load.image('gun_3_fire', 'game/2 Guns/3_2.png')
    this.load.image('gun_4_fire', 'game/2 Guns/4_2.png')
    this.load.image('gun_5_fire', 'game/2 Guns/5_2.png')
    this.load.image('gun_6_fire', 'game/2 Guns/6_2.png')
    this.load.image('gun_7_fire', 'game/2 Guns/7_2.png')
    this.load.image('gun_8_fire', 'game/2 Guns/8_2.png')
    this.load.image('gun_9_fire', 'game/2 Guns/9_2.png')
    this.load.image('gun_10_fire', 'game/2 Guns/10_2.png')
    
    // Shoot-effect strips: 288x48 = 6 frames of 48x48, left to right
    for (const n of [6, 7, 8, 9, 10]) {
      this.load.spritesheet(`effect_${n}_1`, `game/4 Shoot_effects/${n}_1.png`, {
        frameWidth: 48,
        frameHeight: 48
      })
      this.load.spritesheet(`effect_${n}_2`, `game/4 Shoot_effects/${n}_2.png`, {
        frameWidth: 48,
        frameHeight: 48
      })
    }

    // Chambered / pickup bullets + fired projectiles (*_2)
    for (let i = 1; i <= 10; i++) {
      this.load.image(`bullet_${i}`, `game/5 Bullets/${i}.png`)
    }
    for (const i of [1, 2, 3, 4, 5, 6, 7, 9, 10]) {
      this.load.image(`bullet_${i}_2`, `game/5 Bullets/${i}_2.png`)
    }
    
    // Enemy sprites (all use the same bug texture)
    this.load.image('enemy_bug', 'game/enemy_bug.png')
    
    // Background image
    this.load.image('background', 'game/background.png')
  }

  create() {
    console.log('BootScene create() called')

    if (!this.textures.exists('bullet_invisible')) {
      const g = this.add.graphics()
      g.fillStyle(0xffffff, 0)
      g.fillRect(0, 0, 8, 8)
      g.generateTexture('bullet_invisible', 8, 8)
      g.destroy()
    }

    for (const n of [6, 7, 8, 9, 10]) {
      for (const suffix of [1, 2]) {
        this.anims.create({
          key: `effect_${n}_${suffix}_anim`,
          frames: this.anims.generateFrameNumbers(`effect_${n}_${suffix}`, { start: 0, end: 5 }),
          frameRate: 18,
          repeat: 0
        })
      }
    }

    this.scene.start(GAME_CONFIG.SCENES.GAME)
  }
}
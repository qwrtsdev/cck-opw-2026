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
    
    // Enemy sprites (all use the same bug texture)
    this.load.image('enemy_bug', 'game/enemy_bug.png')
    
    // Background image
    this.load.image('background', 'game/background.png')
  }

  create() {
    console.log('BootScene create() called')
    // Start the game scene
    this.scene.start(GAME_CONFIG.SCENES.GAME)
    this.scene.launch(GAME_CONFIG.SCENES.UI)
  }
}
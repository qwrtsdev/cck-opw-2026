import Phaser from 'phaser'
import { GAME_CONFIG } from '../config'

export class UIScene extends Phaser.Scene {
  private healthBar!: Phaser.GameObjects.Graphics
  private healthText!: Phaser.GameObjects.Text
  private scoreText!: Phaser.GameObjects.Text
  private killsText!: Phaser.GameObjects.Text
  private timeText!: Phaser.GameObjects.Text

  constructor() {
    super({ key: GAME_CONFIG.SCENES.UI })
  }

  create() {
    // Setup UI to overlay on game scene
    this.cameras.main.setBackgroundColor('rgba(0, 0, 0, 0)') // Transparent background
    
    // Create health bar
    this.createHealthBar()
    
    // Create score display
    this.createScoreDisplay()
    
    // Create weapon display
    this.createWeaponDisplay()
    
    // Listen for game events
    this.setupEventListeners()
  }

  private createHealthBar() {
    const barWidth = 300
    const barHeight = 20
    const x = 20
    const y = 20
    
    // Background bar
    const bgBar = this.add.graphics()
    bgBar.fillStyle(0x333333, 0.8)
    bgBar.fillRect(x, y, barWidth, barHeight)
    
    // Health bar
    this.healthBar = this.add.graphics()
    this.healthBar.fillStyle(0x00ff00, 1)
    this.healthBar.fillRect(x, y, barWidth, barHeight)
    
    // Health text
    this.healthText = this.add.text(
      x + barWidth / 2,
      y + barHeight / 2,
      '100/100',
      {
        font: '14px Arial',
        color: '#ffffff',
        align: 'center'
      }
    )
    this.healthText.setOrigin(0.5, 0.5)
    
    // Label
    this.add.text(x, y - 15, 'HEALTH', {
      font: '12px Arial',
      color: '#ffffff'
    })
  }

  private createScoreDisplay() {
    const x = 20
    const y = 70
    
    // Score
    this.add.text(x, y, 'SCORE:', {
      font: '16px Arial',
      color: '#ffffff'
    })
    
    this.scoreText = this.add.text(x + 70, y, '0', {
      font: '20px Arial',
      color: '#00ff00'
    })
    
    // Kills
    this.add.text(x, y + 30, 'KILLS:', {
      font: '16px Arial',
      color: '#ffffff'
    })
    
    this.killsText = this.add.text(x + 70, y + 30, '0', {
      font: '20px Arial',
      color: '#ff6600'
    })
    
    // Time
    this.add.text(x, y + 60, 'TIME:', {
      font: '16px Arial',
      color: '#ffffff'
    })
    
    this.timeText = this.add.text(x + 70, y + 60, '0:00', {
      font: '20px Arial',
      color: '#00ffff'
    })
  }

  private createWeaponDisplay() {
    const x = this.cameras.main.width - 220
    const y = 20
    
    // Weapon label
    this.add.text(x, y, 'WEAPON:', {
      font: '16px Arial',
      color: '#ffffff'
    })
    
    this.add.text(x, y + 25, 'Debug Ray (Auto)', {
      font: '18px Arial',
      color: '#00ff00'
    })
    
    // Controls hint
    this.add.text(x, y + 55, 'WASD/Arrows: Move', {
      font: '12px Arial',
      color: '#aaaaaa'
    })
    
    this.add.text(x, y + 70, 'SPACE: Manual Fire', {
      font: '12px Arial',
      color: '#ffff00'
    })
    
    this.add.text(x, y + 85, 'Debug Ray: Auto-aims', {
      font: '10px Arial',
      color: '#00ff00'
    })
  }

  private setupEventListeners() {
    const gameScene = this.scene.get(GAME_CONFIG.SCENES.GAME)
    
    // Listen for health changes
    gameScene.events.on('healthChanged', (health: number, maxHealth: number) => {
      if (this.healthText && this.healthText.active) {
        this.updateHealthBar(health, maxHealth)
      }
    })
    
    // Listen for score changes
    gameScene.events.on('scoreChanged', (score: number, kills: number, time: number) => {
      if (this.scoreText && this.killsText && this.timeText) {
        this.updateScoreDisplay(score, kills, time)
      }
    })
  }

  private updateHealthBar(health: number, maxHealth: number) {
    if (!this.healthBar || !this.healthText) return
    
    const barWidth = 300
    const healthPercent = Math.max(0, health / maxHealth)
    
    this.healthBar.clear()
    
    // Change color based on health percentage
    if (healthPercent > 0.6) {
      this.healthBar.fillStyle(0x00ff00, 1) // Green
    } else if (healthPercent > 0.3) {
      this.healthBar.fillStyle(0xffff00, 1) // Yellow
    } else {
      this.healthBar.fillStyle(0xff0000, 1) // Red
    }
    
    this.healthBar.fillRect(20, 20, barWidth * healthPercent, 20)
    
    // Safely update text
    try {
      this.healthText.setText(`${Math.ceil(health)}/${maxHealth}`)
    } catch (e) {
      console.warn('Error updating health text:', e)
    }
  }

  private updateScoreDisplay(score: number, kills: number, time: number) {
    try {
      this.scoreText.setText(score.toString())
      this.killsText.setText(kills.toString())
      
      // Format time as M:SS
      const minutes = Math.floor(time / 60)
      const seconds = Math.floor(time % 60)
      this.timeText.setText(`${minutes}:${seconds.toString().padStart(2, '0')}`)
    } catch (e) {
      console.warn('Error updating score display:', e)
    }
  }
}
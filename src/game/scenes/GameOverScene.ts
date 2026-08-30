import Phaser from 'phaser'
import { GAME_CONFIG } from '../config'

interface GameOverData {
  score: number
  kills: number
  survivalTime: number
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: GAME_CONFIG.SCENES.GAME_OVER })
  }

  init(data: GameOverData) {
    // Store game over data
    this.registry.set('finalScore', data.score)
    this.registry.set('finalKills', data.kills)
    this.registry.set('finalTime', data.survivalTime)
  }

  create() {
    const { width, height } = this.cameras.main
    
    // Background
    this.add.graphics()
      .fillStyle(0x000000, 0.9)
      .fillRect(0, 0, width, height)
    
    // Game Over text
    this.add.text(width / 2, height / 2 - 150, 'GAME OVER', {
      font: '64px Arial',
      color: '#ff0000',
      align: 'center'
    }).setOrigin(0.5, 0.5)
    
    // Score display
    const finalScore = this.registry.get('finalScore')
    const finalKills = this.registry.get('finalKills')
    const finalTime = this.registry.get('finalTime')
    
    this.add.text(width / 2, height / 2 - 50, `Final Score: ${finalScore}`, {
      font: '32px Arial',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5, 0.5)
    
    this.add.text(width / 2, height / 2 + 10, `Kills: ${finalKills}`, {
      font: '24px Arial',
      color: '#ff6600',
      align: 'center'
    }).setOrigin(0.5, 0.5)
    
    // Format time
    const minutes = Math.floor(finalTime / 60)
    const seconds = Math.floor(finalTime % 60)
    this.add.text(width / 2, height / 2 + 50, `Survival Time: ${minutes}:${seconds.toString().padStart(2, '0')}`, {
      font: '24px Arial',
      color: '#00ffff',
      align: 'center'
    }).setOrigin(0.5, 0.5)
    
    // Restart instruction
    const restartText = this.add.text(width / 2, height / 2 + 120, 'Press SPACE to Restart', {
      font: '20px Arial',
      color: '#ffff00',
      align: 'center'
    }).setOrigin(0.5, 0.5)
    
    // Pulse animation for restart text
    this.tweens.add({
      targets: restartText,
      alpha: 0.5,
      duration: 500,
      yoyo: true,
      repeat: -1
    })
    
    // Setup restart input
    this.input.keyboard!.once('keydown-SPACE', () => {
      this.restartGame()
    })
    
    // Emit game ending event for Supabase integration
    this.events.emit('gameEnding', {
      score: finalScore,
      kills: finalKills,
      survivalTime: finalTime
    })
  }

  private restartGame() {
    // Restart the game
    this.scene.stop(GAME_CONFIG.SCENES.GAME_OVER)
    this.scene.start(GAME_CONFIG.SCENES.BOOT)
  }
}
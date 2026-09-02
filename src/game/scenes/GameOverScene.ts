import Phaser from 'phaser'
import { GAME_CONFIG } from '../config'
import { EventBus } from '@/game/eventBus'

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

    this.cameras.main.setBackgroundColor(0xff0000)

    this.add.text(width / 2, height / 2, 'GAME OVER', {
      fontFamily: 'Arial',
      fontSize: '96px',
      color: '#ffffff',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 8
    }).setOrigin(0.5, 0.5)

    const finalScore = Number(this.registry.get('finalScore') ?? 0)
    const finalKills = Number(this.registry.get('finalKills') ?? 0)
    const finalTime = Number(this.registry.get('finalTime') ?? 0)

    this.add.text(width / 2, height / 2 + 110, `Score: ${finalScore}  Kills: ${finalKills}  Time: ${Math.floor(finalTime / 60)}:${Math.floor(finalTime % 60).toString().padStart(2, '0')}`, {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5, 0.5)

    this.events.emit('gameEnding', {
      score: finalScore,
      kills: finalKills,
      survivalTime: finalTime
    })

    EventBus.emit('game-over-triggered', {
      score: finalScore,
      kills: finalKills,
      survivalTime: finalTime
    })

    this.time.delayedCall(10000, () => {
      EventBus.emit('game-over-return-home')
    })
  }
}
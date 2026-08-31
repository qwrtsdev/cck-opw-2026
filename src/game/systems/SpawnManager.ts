import Phaser from 'phaser'
import { GAME_CONFIG } from '../config'
import { Enemy } from '../entities/Enemy'
import { WeaponPickup } from '../entities/WeaponPickup'

type EnemyType = keyof typeof GAME_CONFIG.ENEMIES

export class SpawnManager {
  private scene: Phaser.Scene
  private player: Phaser.Physics.Arcade.Sprite
  private enemies: Phaser.Physics.Arcade.Sprite[]
  private weaponPickups: WeaponPickup[] = []
  private elapsedTime: number = 0
  private spawnTimer: Phaser.Time.TimerEvent
  private currentSpawnInterval: number
  private enemyHpMultiplier: number = 1
  private availableEnemyTypes: EnemyType[] = ['BUG']
  private lastDifficultyIncrease: number = 0
  private weaponSpawnInterval: number = 8000 // Spawn weapon every 8 seconds
  private spawnCount: number = 1

  constructor(scene: Phaser.Scene, player: Phaser.Physics.Arcade.Sprite) {
    this.scene = scene
    this.player = player
    this.enemies = []
    this.currentSpawnInterval = GAME_CONFIG.SPAWN.INITIAL_INTERVAL
    
    // Start spawn timer
    this.spawnTimer = scene.time.addEvent({
      delay: this.currentSpawnInterval,
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true
    })

    // Start weapon spawn timer
    scene.time.addEvent({
      delay: this.weaponSpawnInterval,
      callback: this.spawnWeapon,
      callbackScope: this,
      loop: true
    })
  }

  update(delta: number) {
    this.elapsedTime += delta / 1000 // Convert to seconds
    
    // Update spawn interval based on elapsed time
    this.currentSpawnInterval = Math.max(
      GAME_CONFIG.SPAWN.MIN_INTERVAL,
      GAME_CONFIG.SPAWN.INITIAL_INTERVAL - (this.elapsedTime * GAME_CONFIG.SPAWN.INTERVAL_DECREASE_RATE)
    )
    
    // Update timer delay only if it changed significantly
    if (Math.abs(this.spawnTimer.delay - this.currentSpawnInterval) > 50) {
      this.spawnTimer.reset({
        delay: this.currentSpawnInterval,
        callback: this.spawnEnemy,
        callbackScope: this,
        loop: true
      })
    }
    
    // Increase difficulty based on time
    if (this.elapsedTime - this.lastDifficultyIncrease >= GAME_CONFIG.SPAWN.DIFFICULTY_INCREASE_INTERVAL) {
      this.increaseDifficulty()
      this.lastDifficultyIncrease = this.elapsedTime
    }
  }

  private increaseDifficulty() {
    // Increase enemy HP multiplier
    this.enemyHpMultiplier += GAME_CONFIG.SPAWN.HP_MULTIPLIER_PER_MINUTE
    this.spawnCount += 2 // Increase spawn count by 2 instead of 1
    
    // Add new enemy types
    const allEnemyTypes: EnemyType[] = ['BUG', 'TROJAN', 'WORM', 'PACKET_SNIFFER', 'ROOTKIT']
    const currentTypeIndex = allEnemyTypes.indexOf(this.availableEnemyTypes[this.availableEnemyTypes.length - 1])
    
    if (currentTypeIndex < allEnemyTypes.length - 1) {
      this.availableEnemyTypes.push(allEnemyTypes[currentTypeIndex + 1])
    }
    
    this.scene.events.emit('difficultyIncreased', this.enemyHpMultiplier)
  }

  public spawnEnemy() {
    if (!this.player.active) return

    for (let i = 0; i < this.spawnCount; i++) {
      const camera = this.scene.cameras.main
      const spawnRect = new Phaser.Geom.Rectangle(
        camera.worldView.x - 120,
        camera.worldView.y - 120,
        camera.worldView.width + 240,
        camera.worldView.height + 240
      )

      const visibleRect = new Phaser.Geom.Rectangle(
        camera.worldView.x,
        camera.worldView.y,
        camera.worldView.width,
        camera.worldView.height
      )

      const spawnPoint = Phaser.Geom.Rectangle.RandomOutside(spawnRect, visibleRect)

      const enemyType = this.selectEnemyType()
      const enemy = new Enemy(
        this.scene,
        spawnPoint.x,
        spawnPoint.y,
        enemyType,
        this.player
      )

      enemy.applyDifficultyMultiplier(this.enemyHpMultiplier)
      this.enemies.push(enemy)

      this.scene.physics.add.overlap(
        enemy,
        this.player,
        () => {
          if (enemy.active && this.player.active) {
            enemy.damagePlayer()
          }
        }
      )

      console.log('Enemy spawned:', enemyType, 'at', spawnPoint.x, spawnPoint.y)
    }
  }

  private spawnWeapon() {
    if (!this.player.active) return

    const camera = this.scene.cameras.main
    
    // Spawn in random location within camera view, slightly off-screen
    const randomX = camera.worldView.x + Math.random() * camera.worldView.width
    const randomY = camera.worldView.y + Math.random() * camera.worldView.height

    const gunOptions = ['gun_1', 'gun_2', 'gun_3', 'gun_4', 'gun_5', 'gun_6', 'gun_7', 'gun_8', 'gun_9', 'gun_10']
    const randomGun = gunOptions[Math.floor(Math.random() * gunOptions.length)]

    const weapon = new WeaponPickup(this.scene, randomX, randomY, randomGun)
    this.weaponPickups.push(weapon)

    console.log('Weapon spawned:', randomGun, 'at', randomX, randomY)
  }

  private selectEnemyType(): EnemyType {
    // Weighted random selection
    const totalWeight = this.availableEnemyTypes.reduce(
      (sum, type) => sum + GAME_CONFIG.ENEMIES[type].spawnWeight,
      0
    )
    
    let random = Math.random() * totalWeight
    
    for (const type of this.availableEnemyTypes) {
      random -= GAME_CONFIG.ENEMIES[type].spawnWeight
      if (random <= 0) {
        return type
      }
    }
    
    return this.availableEnemyTypes[0]
  }

  getEnemies() {
    return this.enemies
  }

  getWeaponPickups() {
    return this.weaponPickups
  }

  removeWeaponPickup(weapon: WeaponPickup) {
    const index = this.weaponPickups.indexOf(weapon)
    if (index > -1) {
      this.weaponPickups.splice(index, 1)
    }
  }

  removeEnemy(enemy: Phaser.Physics.Arcade.Sprite) {
    const index = this.enemies.indexOf(enemy)
    if (index > -1) {
      this.enemies.splice(index, 1)
    }
  }

  clearEnemies() {
    this.enemies.forEach(enemy => {
      if (enemy.active) {
        enemy.destroy()
      }
    })
    this.enemies = []
  }

  getElapsedTime() {
    return this.elapsedTime
  }

  getEnemyHpMultiplier() {
    return this.enemyHpMultiplier
  }
}
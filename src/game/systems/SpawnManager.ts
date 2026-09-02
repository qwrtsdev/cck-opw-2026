import Phaser from 'phaser'
import { GAME_CONFIG } from '../config'
import { Enemy } from '../entities/Enemy'
import { WeaponPickup } from '../entities/WeaponPickup'
import { HealthPickup } from '../entities/HealthPickup'

type EnemyType = keyof typeof GAME_CONFIG.ENEMIES

const ALL_ENEMY_TYPES: EnemyType[] = ['BUG', 'TROJAN', 'WORM', 'PACKET_SNIFFER', 'ROOTKIT']

export class SpawnManager {
  private scene: Phaser.Scene
  private player: Phaser.Physics.Arcade.Sprite
  private enemies: Phaser.Physics.Arcade.Sprite[]
  private weaponPickups: WeaponPickup[] = []
  private healthPickups: HealthPickup[] = []
  private elapsedTime: number = 0
  private spawnTimer: Phaser.Time.TimerEvent
  private currentSpawnInterval: number
  private enemyHpMultiplier: number = 1
  private availableEnemyTypes: EnemyType[] = ['BUG']
  private readonly difficultyIncreaseInterval: number
  private lastDifficultyIncrease: number = 0
  private spawnCount: number = 1
  private lastWeaponDropTime: number = 0
  private lastHealthDropTime: number = 0

  constructor(scene: Phaser.Scene, player: Phaser.Physics.Arcade.Sprite) {
    this.scene = scene
    this.player = player
    this.enemies = []
    this.currentSpawnInterval = GAME_CONFIG.SPAWN.INITIAL_INTERVAL
    this.difficultyIncreaseInterval = GAME_CONFIG.SPAWN.ENEMY_REVEAL_DURATION_SECONDS / (ALL_ENEMY_TYPES.length - 1)

    // Start spawn timer
    this.spawnTimer = scene.time.addEvent({
      delay: this.currentSpawnInterval,
      callback: this.spawnEnemy,
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
    if (this.elapsedTime - this.lastDifficultyIncrease >= this.difficultyIncreaseInterval) {
      this.increaseDifficulty()
      this.lastDifficultyIncrease = this.elapsedTime
    }
  }

  private increaseDifficulty() {
    // Increase enemy HP multiplier
    this.enemyHpMultiplier += GAME_CONFIG.SPAWN.HP_MULTIPLIER_PER_MINUTE
    this.spawnCount += 2 // Increase spawn count by 2 instead of 1

    // Add new enemy types
    const currentTypeIndex = ALL_ENEMY_TYPES.indexOf(this.availableEnemyTypes[this.availableEnemyTypes.length - 1])

    if (currentTypeIndex < ALL_ENEMY_TYPES.length - 1) {
      this.availableEnemyTypes.push(ALL_ENEMY_TYPES[currentTypeIndex + 1])
    }

    this.scene.events.emit('difficultyIncreased', this.enemyHpMultiplier)
  }

  public spawnEnemy() {
    if (!this.player.active) return

    const activeEnemyCount = this.enemies.filter(enemy => enemy.active).length
    const remainingSlots = GAME_CONFIG.SPAWN.MAX_ACTIVE_ENEMIES - activeEnemyCount
    if (remainingSlots <= 0) return

    for (let i = 0; i < Math.min(this.spawnCount, remainingSlots); i++) {
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

  public dropLoot(x: number, y: number) {
    // Lower weapon drop frequency, with a cooldown so drops don't cluster.
    const weaponChance = GAME_CONFIG.SPAWN.WEAPON_DROP_CHANCE
    const healthChance = GAME_CONFIG.SPAWN.HEALTH_DROP_CHANCE
    const random = Math.random()
    const now = Date.now()

    if (
      random < weaponChance &&
      now - this.lastWeaponDropTime >= GAME_CONFIG.SPAWN.WEAPON_DROP_COOLDOWN_MS
    ) {
      this.spawnWeaponAt(x, y)
      this.lastWeaponDropTime = now
    } else if (
      random < weaponChance + healthChance &&
      now - this.lastHealthDropTime >= GAME_CONFIG.SPAWN.HEALTH_DROP_COOLDOWN_MS
    ) {
      this.spawnHealthAt(x, y)
      this.lastHealthDropTime = now
    }
  }

  private spawnWeaponAt(x: number, y: number) {
    const gunOptions = ['gun_1', 'gun_2', 'gun_3', 'gun_4', 'gun_5', 'gun_6', 'gun_7', 'gun_8', 'gun_9', 'gun_10']
    const randomGun = gunOptions[Math.floor(Math.random() * gunOptions.length)]

    const weapon = new WeaponPickup(this.scene, x, y, randomGun)
    this.weaponPickups.push(weapon)

    console.log('Weapon dropped:', randomGun, 'at', x, y)
  }

  private spawnHealthAt(x: number, y: number) {
    const health = new HealthPickup(this.scene, x, y)
    this.healthPickups.push(health)

    console.log('Health dropped at', x, y)
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

  getHealthPickups() {
    return this.healthPickups
  }

  removeHealthPickup(health: HealthPickup) {
    const index = this.healthPickups.indexOf(health)
    if (index > -1) {
      this.healthPickups.splice(index, 1)
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
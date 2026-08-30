import Phaser from 'phaser'
import { GAME_CONFIG } from '../config'
import { BloodEffect } from '../effects/BloodEffect'

type WeaponType = keyof typeof GAME_CONFIG.WEAPONS

export class WeaponManager {
  private scene: Phaser.Scene
  private player: Phaser.Physics.Arcade.Sprite & { getGunPosition?: () => Phaser.Math.Vector2; getAimAngle?: () => number }
  private enemies: Phaser.Physics.Arcade.Sprite[]
  private currentWeapon: WeaponType
  private lastFireTime: number = 0
  private projectiles: Phaser.Physics.Arcade.Group
  private mouseX: number = 0
  private mouseY: number = 0
  private bloodEffect: BloodEffect

  constructor(scene: Phaser.Scene, player: Phaser.Physics.Arcade.Sprite) {
    this.scene = scene
    this.player = player
    this.enemies = []
    this.currentWeapon = 'DEBUG_RAY'
    this.bloodEffect = new BloodEffect(scene)
    
    // Create projectile group
    this.projectiles = scene.physics.add.group()
    
    // Setup mouse tracking
    this.setupMouseTracking()
  }

  private setupMouseTracking() {
    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y)
      this.mouseX = worldPoint.x
      this.mouseY = worldPoint.y
    })
  }

  setEnemies(enemies: Phaser.Physics.Arcade.Sprite[]) {
    this.enemies = enemies
  }

  update() {
    const projectiles = this.projectiles.getChildren() as Phaser.Physics.Arcade.Image[]

    projectiles.forEach(projectile => {
      if (!projectile.active) return

      const lifetime = Number(projectile.getData('lifetime') ?? 0) - this.scene.game.loop.delta
      projectile.setData('lifetime', lifetime)

      if (lifetime <= 0) {
        projectile.destroy()
        return
      }

      for (const enemy of this.enemies) {
        if (!enemy.active || !projectile.active) continue

        const distance = Phaser.Math.Distance.Between(projectile.x, projectile.y, enemy.x, enemy.y)
        const hitRadius = Math.max((projectile.width + enemy.width) / 2, 12)

        if (distance <= hitRadius) {
          // Create blood effect at impact point
          const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y)
          this.bloodEffect.spawnBlood(enemy.x, enemy.y, angle, 1)
          
          // Create impact effect
          this.createImpactEffect(enemy.x, enemy.y, projectile.getData('color') ?? 0x00ff00)
          
          if ('takeDamage' in enemy && typeof enemy.takeDamage === 'function') {
            enemy.takeDamage(projectile.getData('damage'))
          }
          projectile.destroy()
          break
        }
      }
    })
  }

  switchWeapon(weaponType: WeaponType) {
    this.currentWeapon = weaponType
    this.scene.events.emit('weaponChanged', GAME_CONFIG.WEAPONS[weaponType].name)
  }

  private createImpactEffect(x: number, y: number, color: number) {
    // Flash effect
    const flash = this.scene.add.circle(x, y, 5, color)
    flash.setAlpha(0.8)
    flash.setDepth(6)
    
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 0.1,
      duration: 200,
      ease: 'Quad.easeOut',
      onComplete: () => {
        flash.destroy()
      }
    })
    
    // Expand ring
    const ring = this.scene.add.graphics()
    ring.setDepth(5)
    ring.lineStyle(2, color, 0.8)
    ring.strokeCircle(x, y, 3)
    
    this.scene.tweens.add({
      targets: ring,
      alpha: 0,
      onUpdate: (tween) => {
        const progress = tween.progress
        ring.clear()
        ring.lineStyle(2, color, 0.8 * (1 - progress))
        ring.strokeCircle(x, y, 3 + progress * 12)
      },
      duration: 300,
      ease: 'Quad.easeOut',
      onComplete: () => {
        ring.destroy()
      }
    })
  }

  getAimAngle(): number {
    return Phaser.Math.Angle.Between(
      this.player.x,
      this.player.y,
      this.mouseX,
      this.mouseY
    )
  }

  fire() {
    const now = Date.now()
    const weaponConfig = GAME_CONFIG.WEAPONS[this.currentWeapon]

    if (now - this.lastFireTime < weaponConfig.fireRate) return

    this.lastFireTime = now

    switch (weaponConfig.type) {
      case 'projectile':
        this.fireDebugRay()
        break
      case 'aoe':
        this.fireFirewallBurst()
        break
      case 'spread':
        this.firePacketStorm()
        break
      case 'melee':
        this.fireCompilerBlade()
        break
    }
  }

  private spawnProjectile(angle: number, config: any, size: number = config.size, speed: number = config.speed) {
    // Try to get gun position, otherwise use player position
    let spawnX = this.player.x
    let spawnY = this.player.y
    
    if (this.player.getGunPosition && typeof this.player.getGunPosition === 'function') {
      const gunPos = this.player.getGunPosition()
      spawnX = gunPos.x
      spawnY = gunPos.y
    }
    
    const projectile = this.projectiles.create(spawnX, spawnY, 'player')
    projectile.setDisplaySize(size * 2, size * 2)
    projectile.setTint(config.color)
    projectile.setVelocity(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed
    )
    projectile.setData('damage', config.damage)
    projectile.setData('lifetime', config.range ? 1800 : 1200)
    projectile.setData('color', config.color)
    projectile.setRotation(angle)
    
    return projectile
  }

  private fireDebugRay() {
    const weaponConfig = GAME_CONFIG.WEAPONS.DEBUG_RAY
    
    // Use player's getAimAngle if available, otherwise fall back to manager's method
    let angle = this.getAimAngle()
    if (this.player.getAimAngle && typeof this.player.getAimAngle === 'function') {
      angle = this.player.getAimAngle()
    }
    
    const target = this.findClosestEnemy()

    if (target) {
      const aim = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y)
      const projectile = this.spawnProjectile(aim, weaponConfig, weaponConfig.size, weaponConfig.speed)
      projectile.setData('lifetime', 1400)
    } else {
      this.spawnProjectile(angle, weaponConfig)
    }
  }

  private findClosestEnemy() {
    let closest: Phaser.Physics.Arcade.Sprite | null = null
    let shortestDistance = Number.MAX_VALUE

    for (const enemy of this.enemies) {
      if (!enemy.active) continue

      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y)
      if (distance < shortestDistance) {
        shortestDistance = distance
        closest = enemy
      }
    }

    return closest
  }

  private fireFirewallBurst() {
    const weaponConfig = GAME_CONFIG.WEAPONS.FIREWALL_BURST

    const circle = this.scene.add.graphics()
    circle.lineStyle(4, weaponConfig.color)
    circle.strokeCircle(this.player.x, this.player.y, 10)

    this.scene.tweens.add({
      targets: circle,
      scale: weaponConfig.radius / 10,
      duration: 300,
      onComplete: () => {
        circle.destroy()
      }
    })

    this.enemies.forEach(enemy => {
      if (!enemy.active) return

      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y)
      if (distance < weaponConfig.radius) {
        // Blood effect for AOE hit
        this.bloodEffect.spawnBlood(enemy.x, enemy.y, 0, 0.7)
        this.createImpactEffect(enemy.x, enemy.y, weaponConfig.color)
        
        if ('takeDamage' in enemy) {
          (enemy as any).takeDamage(weaponConfig.damage)
        }
      }
    })
  }

  private firePacketStorm() {
    const weaponConfig = GAME_CONFIG.WEAPONS.PACKET_STORM
    const baseAngle = this.getAimAngle()
    const spreadAngle = Math.PI / 4
    const startAngle = baseAngle - spreadAngle / 2

    for (let i = 0; i < weaponConfig.projectileCount; i++) {
      const angle = startAngle + (spreadAngle / (weaponConfig.projectileCount - 1)) * i
      const projectile = this.spawnProjectile(angle, weaponConfig, weaponConfig.size, weaponConfig.speed)
      projectile.setData('lifetime', 1500)
    }
  }

  private fireCompilerBlade() {
    const weaponConfig = GAME_CONFIG.WEAPONS.COMPILER_BLADE
    
    let angle = this.getAimAngle()
    if (this.player.getAimAngle && typeof this.player.getAimAngle === 'function') {
      angle = this.player.getAimAngle()
    }

    const blade = this.scene.add.graphics()
    blade.fillStyle(weaponConfig.color, 0.8)
    blade.beginPath()
    blade.arc(this.player.x, this.player.y, weaponConfig.radius, angle - Math.PI / 4, angle + Math.PI / 4)
    blade.fillPath()

    this.scene.time.delayedCall(200, () => {
      blade.destroy()
    })

    this.enemies.forEach(enemy => {
      if (!enemy.active) return

      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y)
      if (distance < weaponConfig.radius) {
        const enemyAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y)
        const angleDiff = Math.abs(Phaser.Math.Angle.Wrap(angle - enemyAngle))

        if (angleDiff < Math.PI / 4) {
          // Blood effect for melee hit
          this.bloodEffect.spawnBlood(enemy.x, enemy.y, enemyAngle, 1.2)
          this.createImpactEffect(enemy.x, enemy.y, weaponConfig.color)
          
          if ('takeDamage' in enemy) {
            (enemy as any).takeDamage(weaponConfig.damage)
          }
        }
      }
    })
  }
}
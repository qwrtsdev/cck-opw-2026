import Phaser from 'phaser'
import { GAME_CONFIG } from '../config'
import { BloodEffect } from '../effects/BloodEffect'
import { ShootEffect } from '../effects/ShootEffect'

export class WeaponManager {
  private scene: Phaser.Scene
  private player: Phaser.Physics.Arcade.Sprite & {
    getGunPosition?: () => Phaser.Math.Vector2
    getAimAngle?: () => number
    getCurrentWeaponType?: () => string
    playFireAnimation?: (duration?: number) => void
    getCurrentGunTexture?: () => string
  }
  private enemies: Phaser.Physics.Arcade.Sprite[]
  private lastFireTime: number = 0
  private projectiles: Phaser.Physics.Arcade.Group
  private mouseX: number = 0
  private mouseY: number = 0
  private bloodEffect: BloodEffect
  private shootEffect: ShootEffect

  constructor(scene: Phaser.Scene, player: Phaser.Physics.Arcade.Sprite) {
    this.scene = scene
    this.player = player
    this.enemies = []
    this.bloodEffect = new BloodEffect(scene)
    this.shootEffect = new ShootEffect(scene)

    this.projectiles = scene.physics.add.group()
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
        this.expireProjectile(projectile)
        return
      }

      for (const enemy of this.enemies) {
        if (!enemy.active || !projectile.active) continue

        const distance = Phaser.Math.Distance.Between(projectile.x, projectile.y, enemy.x, enemy.y)
        const hitRadius = Math.max((projectile.displayWidth + enemy.displayWidth) / 2, 12)

        if (distance <= hitRadius) {
          if (projectile.getData('kind') === 'aoe') {
            this.detonateAoe(projectile)
          } else {
            const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y)
            this.bloodEffect.spawnBlood(enemy.x, enemy.y, angle, 1)
            this.playImpactAt(projectile.x, projectile.y, projectile.getData('effectKey'), 1)
            this.createImpactEffect(enemy.x, enemy.y, projectile.getData('color') ?? 0x00ff00)

            if ('takeDamage' in enemy && typeof enemy.takeDamage === 'function') {
              enemy.takeDamage(projectile.getData('damage'))
            }
            projectile.destroy()
          }
          break
        }
      }
    })
  }

  private expireProjectile(projectile: Phaser.Physics.Arcade.Image) {
    if (projectile.getData('kind') === 'aoe') {
      this.detonateAoe(projectile)
      return
    }

    this.playImpactAt(projectile.x, projectile.y, projectile.getData('effectKey'), 0.8)
    projectile.destroy()
  }

  private detonateAoe(projectile: Phaser.Physics.Arcade.Image) {
    const x = projectile.x
    const y = projectile.y
    const radius = Number(projectile.getData('aoeRadius') ?? 120)
    const damage = Number(projectile.getData('damage') ?? 0)
    const color = projectile.getData('color') ?? 0xff3300
    const effectKey = projectile.getData('effectKey')

    projectile.destroy()
    this.explodeAt(x, y, radius, damage, color, effectKey)
  }

  private explodeAt(
    x: number,
    y: number,
    radius: number,
    damage: number,
    color: number,
    effectKey?: string
  ) {
    this.playImpactAt(x, y, effectKey, 2.2)

    const circle = this.scene.add.graphics()
    circle.setDepth(24)
    circle.lineStyle(4, color, 0.9)
    circle.strokeCircle(x, y, 12)

    this.scene.tweens.add({
      targets: circle,
      alpha: 0,
      duration: 320,
      onUpdate: (tween) => {
        const progress = tween.progress
        circle.clear()
        circle.lineStyle(3, color, 0.85 * (1 - progress))
        circle.strokeCircle(x, y, 12 + progress * (radius - 12))
      },
      onComplete: () => circle.destroy()
    })

    this.enemies.forEach(enemy => {
      if (!enemy.active) return

      const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y)
      if (distance < radius) {
        this.bloodEffect.spawnBlood(enemy.x, enemy.y, 0, 0.7)
        this.createImpactEffect(enemy.x, enemy.y, color)

        if ('takeDamage' in enemy) {
          (enemy as any).takeDamage(damage)
        }
      }
    })
  }

  private createImpactEffect(x: number, y: number, color: number) {
    const flash = this.scene.add.circle(x, y, 5, color)
    flash.setAlpha(0.8)
    flash.setDepth(6)

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 0.1,
      duration: 200,
      ease: 'Quad.easeOut',
      onComplete: () => flash.destroy()
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

  private getResolvedAimAngle(): number {
    if (this.player.getAimAngle && typeof this.player.getAimAngle === 'function') {
      return this.player.getAimAngle()
    }
    return this.getAimAngle()
  }

  private getMuzzlePosition(): Phaser.Math.Vector2 {
    if (this.player.getGunPosition && typeof this.player.getGunPosition === 'function') {
      return this.player.getGunPosition()
    }
    return new Phaser.Math.Vector2(this.player.x, this.player.y)
  }

  private getEffectKey(gunTexture: string): string {
    return (GAME_CONFIG.FLASH_MAPPING as Record<string, string>)[gunTexture] ?? 'effect_6'
  }

  private spawnMuzzleFlash(gunTexture: string, angle: number) {
    const muzzle = this.getMuzzlePosition()
    this.shootEffect.playMuzzle(muzzle.x, muzzle.y, angle, this.getEffectKey(gunTexture))
  }

  private playImpactAt(x: number, y: number, effectKey: string | undefined, scale: number) {
    if (!effectKey) return
    this.shootEffect.playImpact(x, y, effectKey, scale)
  }

  fire() {
    const now = Date.now()

    let weaponType = 'RAPID_FIRE'
    if (this.player.getCurrentWeaponType && typeof this.player.getCurrentWeaponType === 'function') {
      weaponType = this.player.getCurrentWeaponType()
    }

    const weaponConfig = GAME_CONFIG.WEAPONS[weaponType as keyof typeof GAME_CONFIG.WEAPONS]
    if (!weaponConfig) return

    if (now - this.lastFireTime < weaponConfig.fireRate) return
    this.lastFireTime = now

    let gunTexture = 'gun_1'
    if (this.player.getCurrentGunTexture) {
      gunTexture = this.player.getCurrentGunTexture()
    }

    const angle = this.getResolvedAimAngle()
    // this.triggerFireAnimation(weaponType) // Disabled to prevent gun recoil
    this.spawnMuzzleFlash(gunTexture, angle)

    switch (weaponConfig.type) {
      case 'projectile':
        this.fireRapidFire(weaponConfig as typeof GAME_CONFIG.WEAPONS.RAPID_FIRE, gunTexture, angle)
        break
      case 'aoe':
        this.fireAoeBlast(weaponConfig as typeof GAME_CONFIG.WEAPONS.AOE_BLAST, gunTexture, angle)
        break
      case 'spread':
        this.fireSpreadShot(weaponConfig as typeof GAME_CONFIG.WEAPONS.SPREAD_SHOT, gunTexture, angle)
        break
    }
  }

  private spawnProjectile(
    angle: number,
    config: { damage: number; color: number; range?: number },
    size: number,
    speed: number,
    gunTexture: string,
    kind: 'bullet' | 'aoe' = 'bullet'
  ) {
    const spawn = this.getMuzzlePosition()
    const bulletKey = (GAME_CONFIG.BULLET_MAPPING as Record<string, string | null>)[gunTexture]
    const textureKey = bulletKey && this.scene.textures.exists(bulletKey) ? bulletKey : 'bullet_invisible'
    const effectKey = this.getEffectKey(gunTexture)

    const projectile = this.projectiles.create(spawn.x, spawn.y, textureKey) as Phaser.Physics.Arcade.Image
    const display = kind === 'aoe' ? Math.max(size * 4, 16) : Math.max(size * 3, 10)
    projectile.setDisplaySize(display, display)
    projectile.setVisible(Boolean(bulletKey))
    projectile.setOrigin(0.5, 0.5)
    projectile.setVelocity(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed
    )
    projectile.setData('damage', config.damage)
    projectile.setData('lifetime', config.range ? Math.max(400, (config.range / speed) * 1000) : 1200)
    projectile.setData('color', config.color)
    projectile.setData('kind', kind)
    projectile.setData('effectKey', effectKey)
    projectile.setRotation(angle) // Rotate projectile to match gun direction

    return projectile
  }

  private fireRapidFire(config: typeof GAME_CONFIG.WEAPONS.RAPID_FIRE, gunTexture: string, angle: number) {
    this.spawnProjectile(angle, config, config.size, config.speed, gunTexture)
  }

  private fireAoeBlast(config: typeof GAME_CONFIG.WEAPONS.AOE_BLAST, gunTexture: string, angle: number) {
    const projectile = this.spawnProjectile(angle, config, 6, 380, gunTexture, 'aoe')
    projectile.setData('aoeRadius', config.radius)
    projectile.setData('lifetime', 900)
  }

  private fireSpreadShot(config: typeof GAME_CONFIG.WEAPONS.SPREAD_SHOT, gunTexture: string, angle: number) {
    const spreadAngle = Math.PI / 4
    const startAngle = angle - spreadAngle / 2
    const count = config.projectileCount

    for (let i = 0; i < count; i++) {
      const pelletAngle = count === 1 ? angle : startAngle + (spreadAngle / (count - 1)) * i
      const projectile = this.spawnProjectile(pelletAngle, config, config.size, config.speed, gunTexture)
      projectile.setData('lifetime', 700)
    }
  }
}

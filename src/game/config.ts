// config.ts

export const GAME_CONFIG = {
  // Scene keys
  SCENES: {
    BOOT: 'BootScene',
    GAME: 'GameScene',
    UI: 'UIScene',
    GAME_OVER: 'GameOverScene'
  },

  // World settings
  WORLD: {
    WIDTH: 3000,
    HEIGHT: 3000,
    TILE_SIZE: 32
  },

  // Camera settings
  CAMERA: {
    ZOOM: 1.5
  },

  // Player settings
  PLAYER: {
    SPEED: 220,
    MAX_HEALTH: 150,
    SIZE: 80,
    GUN_WIDTH: 34,
    GUN_HEIGHT: 17,
    INVINCIBILITY_TIME: 600
  },

  // Enemy types configuration (all are bugs with different colors)
  ENEMIES: {
    BUG: {
      name: 'Bug',
      health: 15,
      speed: 120,
      damage: 6,
      size: 60,
      score: 25,
      spawnWeight: 50,
      behavior: 'chase',
      color: 'green'
    },
    TROJAN: {
      name: 'Trojan',
      health: 28,
      speed: 85,
      damage: 12,
      size: 40,
      score: 50,
      spawnWeight: 30,
      behavior: 'chase',
      color: 'red'
    },
    WORM: {
      name: 'Worm',
      health: 22,
      speed: 70,
      damage: 8,
      size: 40,
      score: 40,
      spawnWeight: 25,
      behavior: 'chase',
      color: 'yellow'
    },
    PACKET_SNIFFER: {
      name: 'Packet Sniffer',
      health: 20,
      speed: 55,
      damage: 8,
      size: 40,
      score: 60,
      spawnWeight: 20,
      behavior: 'chase',
      color: 'green2'
    },
    ROOTKIT: {
      name: 'Rootkit',
      health: 25,
      speed: 95,
      damage: 14,
      size: 40,
      score: 80,
      spawnWeight: 15,
      behavior: 'chase',
      color: 'red2'
    }
  },

  // Gun texture to weapon type mapping
  GUN_MAPPING: {
    'gun_1': 'RAPID_FIRE',
    'gun_2': 'RAPID_FIRE',
    'gun_6': 'RAPID_FIRE',
    'gun_7': 'RAPID_FIRE',
    'gun_3': 'SPREAD_SHOT',
    'gun_4': 'SPREAD_SHOT',
    'gun_10': 'SPREAD_SHOT',
    'gun_5': 'AOE_BLAST',
    'gun_8': 'AOE_BLAST',
    'gun_9': 'AOE_BLAST'
  } as const,

  // Fired projectile sprites (normal versions, not _2). Guns without bullets use an invisible bullet.
  BULLET_MAPPING: {
    'gun_1': 'bullet_1',
    'gun_2': 'bullet_2',
    'gun_3': 'bullet_3',
    'gun_4': 'bullet_4',
    'gun_5': 'bullet_5',
    'gun_6': 'bullet_6',
    'gun_7': 'bullet_7',
    'gun_8': null,
    'gun_9': 'bullet_9',
    'gun_10': 'bullet_10',
  } as const,

  // Shoot-effect strips exist only for 6–10; reuse by weapon type.
  // Machine (1,2,6,7) → 6/7, shotgun (3,4,10) → 10, AOE (5,8,9) → 8/9
  FLASH_MAPPING: {
    'gun_1': 'effect_6',
    'gun_2': 'effect_7',
    'gun_6': 'effect_6',
    'gun_7': 'effect_7',
    'gun_3': 'effect_10',
    'gun_4': 'effect_10',
    'gun_10': 'effect_10',
    'gun_5': 'effect_8',
    'gun_8': 'effect_8',
    'gun_9': 'effect_9',
  } as const,

  // Weapon configuration for gun types
  WEAPONS: {
    RAPID_FIRE: {
      name: 'Rapid Fire',
      damage: 18,
      fireRate: 120,
      range: 650,
      type: 'projectile',
      color: 0x00ff00,
      speed: 750,
      size: 3
    },
    SPREAD_SHOT: {
      name: 'Spread Shot',
      damage: 15,
      fireRate: 320,
      range: 500,
      type: 'spread',
      projectileCount: 7,
      color: 0xffaa00,
      speed: 600,
      size: 4
    },
    AOE_BLAST: {
      name: 'AOE Blast',
      damage: 55,
      fireRate: 650,
      range: 350,
      type: 'aoe',
      color: 0xff3300,
      radius: 150
    }
  },

  WEAPON_EFFECTS: {
    DISPLAY_SIZE: 54
  },

  // Spawn settings
  SPAWN: {
    INITIAL_INTERVAL: 1400,
    MIN_INTERVAL: 350,
    INTERVAL_DECREASE_RATE: 15,
    ENEMY_REVEAL_DURATION_SECONDS: 300,
    MAX_ACTIVE_ENEMIES: 35,
    WEAPON_DROP_CHANCE: 0.20,
    WEAPON_DROP_COOLDOWN_MS: 6000,
    HEALTH_DROP_CHANCE: 0.18,
    HEALTH_DROP_COOLDOWN_MS: 8000,
    HP_MULTIPLIER_PER_MINUTE: 0.10
  },

  // Scoring
  SCORING: {
    SURVIVAL_POINTS_PER_SECOND: 5,
    KILL_MULTIPLIER: 25
  }
};
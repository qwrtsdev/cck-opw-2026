// Game configuration constants
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
  
  // Player settings
  PLAYER: {
    SPEED: 200,
    MAX_HEALTH: 100,
    SIZE: 32, // Adjusted for actual sprite size
    INVINCIBILITY_TIME: 500 // ms
  },
  
  // Enemy types configuration (all are bugs with different colors)
  ENEMIES: {
    BUG: {
      name: 'Bug',
      health: 20,
      speed: 150,
      damage: 10,
      size: 32,
      score: 10,
      spawnWeight: 50,
      behavior: 'chase',
      color: 'green'
    },
    TROJAN: {
      name: 'Trojan',
      health: 40,
      speed: 100,
      damage: 20,
      size: 32,
      score: 25,
      spawnWeight: 30,
      behavior: 'chase',
      color: 'red'
    },
    WORM: {
      name: 'Worm',
      health: 30,
      speed: 80,
      damage: 15,
      size: 32,
      score: 20,
      spawnWeight: 25,
      behavior: 'chase',
      color: 'yellow'
    },
    PACKET_SNIFFER: {
      name: 'Packet Sniffer',
      health: 25,
      speed: 60,
      damage: 15,
      size: 32,
      score: 30,
      spawnWeight: 20,
      behavior: 'chase',
      color: 'green2'
    },
    ROOTKIT: {
      name: 'Rootkit',
      health: 35,
      speed: 120,
      damage: 25,
      size: 32,
      score: 40,
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
    'gun_1':  'bullet_1',
    'gun_2':  'bullet_2',
    'gun_3':  'bullet_3',
    'gun_4':  'bullet_4',
    'gun_5':  'bullet_5',
    'gun_6':  'bullet_6',
    'gun_7':  'bullet_7',
    'gun_8':  null,
    'gun_9':  'bullet_9',
    'gun_10': 'bullet_10',
  } as const,

  // Shoot-effect strips exist only for 6–10; reuse by weapon type.
  // Machine (1,2,6,7) → 6/7, shotgun (3,4,10) → 10, AOE (5,8,9) → 8/9
  FLASH_MAPPING: {
    'gun_1':  'effect_6',
    'gun_2':  'effect_7',
    'gun_6':  'effect_6',
    'gun_7':  'effect_7',
    'gun_3':  'effect_10',
    'gun_4':  'effect_10',
    'gun_10': 'effect_10',
    'gun_5':  'effect_8',
    'gun_8':  'effect_8',
    'gun_9':  'effect_9',
  } as const,
  
  // Updated weapon configuration for gun types
  WEAPONS: {
    RAPID_FIRE: {
      name: 'Rapid Fire',
      damage: 12,
      fireRate: 150, // Fast firing
      range: 600,
      type: 'projectile',
      color: 0x00ff00,
      speed: 700,
      size: 3
    },
    SPREAD_SHOT: {
      name: 'Spread Shot', 
      damage: 10,
      fireRate: 400,
      range: 450,
      type: 'spread',
      projectileCount: 5,
      color: 0xffaa00,
      speed: 550,
      size: 4
    },
    AOE_BLAST: {
      name: 'AOE Blast',
      damage: 35,
      fireRate: 800, // Slower firing
      range: 300,
      type: 'aoe',
      color: 0xff3300,
      radius: 120
    }
  },
  
  // Spawn settings
  SPAWN: {
    INITIAL_INTERVAL: 800, // Reduced for faster initial spawn
    MIN_INTERVAL: 150, // Reduced for more frequent spawning
    INTERVAL_DECREASE_RATE: 25, // Increased rate for faster decrease
    DIFFICULTY_INCREASE_INTERVAL: 45, // Reduced for more frequent difficulty increases
    HP_MULTIPLIER_PER_MINUTE: 0.2
  },
  
  // Scoring
  SCORING: {
    SURVIVAL_POINTS_PER_SECOND: 1,
    KILL_MULTIPLIER: 10
  }
};
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
  
  // Weapon configuration (Soul Knight style)
  WEAPONS: {
    DEBUG_RAY: {
      name: 'Debug Ray',
      damage: 15,
      fireRate: 200, // ms
      range: 500,
      type: 'projectile',
      color: 0x00ff00,
      speed: 600,
      size: 4
    },
    FIREWALL_BURST: {
      name: 'Firewall Burst',
      damage: 40,
      fireRate: 1500,
      range: 200,
      type: 'aoe',
      color: 0xff6600,
      radius: 150
    },
    PACKET_STORM: {
      name: 'Packet Storm',
      damage: 12,
      fireRate: 300,
      range: 400,
      type: 'spread',
      projectileCount: 7,
      color: 0x00ffff,
      speed: 500,
      size: 3
    },
    COMPILER_BLADE: {
      name: 'Compiler Blade',
      damage: 35,
      fireRate: 500,
      range: 100,
      type: 'melee',
      color: 0xff00ff,
      radius: 80
    }
  },
  
  // Spawn settings
  SPAWN: {
    INITIAL_INTERVAL: 1000, // Reduced from 2000 for testing
    MIN_INTERVAL: 200, // Reduced from 300 for testing
    INTERVAL_DECREASE_RATE: 15, // ms per second
    DIFFICULTY_INCREASE_INTERVAL: 60, // seconds
    HP_MULTIPLIER_PER_MINUTE: 0.15
  },
  
  // Scoring
  SCORING: {
    SURVIVAL_POINTS_PER_SECOND: 1,
    KILL_MULTIPLIER: 10
  }
};
import Phaser from 'phaser'

// Shared singleton — imported by React components AND by every Scene.
// Decoupled from the Game instance lifecycle on purpose: React can safely
// emit into this before Phaser.Game has even been constructed.
export const EventBus = new Phaser.Events.EventEmitter()
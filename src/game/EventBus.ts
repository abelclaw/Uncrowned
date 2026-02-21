import Phaser from 'phaser';

// Singleton EventEmitter for cross-scene communication.
// Do NOT use this.game.events (collides with Phaser internal events).
const EventBus = new Phaser.Events.EventEmitter();

export default EventBus;

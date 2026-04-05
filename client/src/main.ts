import Phaser from 'phaser';
import TitleScene from './scenes/TitleScene';
import GameScene from './scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  backgroundColor: '#0f172a',
  parent: 'app',
  physics: {
    default: 'arcade',
  },
  render: {
    antialias: true,
    pixelArt: false,
    powerPreference: 'high-performance',
  },
  scale: {
    parent: 'app',
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    fullscreenTarget: 'app',
    width: window.innerWidth,
    height: window.innerHeight,
    zoom: 1,
  },
  scene: [TitleScene, GameScene],
};

const game = new Phaser.Game(config);

const resize = () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
  game.scale.refresh();
};

window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);

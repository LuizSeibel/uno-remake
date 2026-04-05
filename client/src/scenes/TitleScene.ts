import Phaser from 'phaser';

type ButtonConfig = {
  label: string;
  onClick: () => void;
};

const FONT = '"Space Mono", "Fira Code", monospace';
const TEXT_RESOLUTION = Math.min(window.devicePixelRatio || 1, 2);

export default class TitleScene extends Phaser.Scene {
  private staticElements: Phaser.GameObjects.GameObject[] = [];
  private buttons: Phaser.GameObjects.Zone[] = [];
  private infoText?: Phaser.GameObjects.Text;
  private lastNickname = '';

  constructor() {
    super('TitleScene');
  }

  create() {
    this.cameras.main.setBackgroundColor('#030712');
    this.buildLayout();

    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.handleResize, this);
      this.clearLayout();
    });
  }

  private buildLayout() {
    this.clearLayout();

    const { width, height } = this.scale;
    const centerX = width / 2;

    const background = this.add
      .rectangle(centerX, height / 2, width * 0.8, height * 0.8, 0x0b1222, 0.55)
      .setStrokeStyle(2, 0x172036, 0.8);
    this.staticElements.push(background);

    const title = this.add
      .text(centerX, height * 0.25, 'UNO REMAKE', {
        fontFamily: FONT,
        fontSize: Math.min(64, width * 0.06),
        fontStyle: 'bold',
        color: '#f4f4f5',
        letterSpacing: 4,
      })
      .setOrigin(0.5)
      .setResolution(TEXT_RESOLUTION);
    this.staticElements.push(title);

    const subtitle = this.add
      .text(centerX, title.y + 52, 'Multiplayer em tempo real', {
        fontFamily: FONT,
        fontSize: 22,
        color: '#cbd5f5',
      })
      .setOrigin(0.5)
      .setResolution(TEXT_RESOLUTION);
    this.staticElements.push(subtitle);

    const buttons: ButtonConfig[] = [
      { label: 'Criar Sala', onClick: () => this.handleCreateRoom() },
      { label: 'Entrar com Código', onClick: () => this.handleJoinRoom() },
    ];

    buttons.forEach((config, index) => {
      const posY = height * 0.45 + index * 100;
      this.createButton(centerX, posY, config);
    });

    this.infoText = this.add
      .text(centerX, height * 0.75, 'Escolha uma opção para continuar', {
        fontFamily: FONT,
        fontSize: 18,
        color: '#f9a8d4',
      })
      .setOrigin(0.5)
      .setResolution(TEXT_RESOLUTION);
    this.staticElements.push(this.infoText);
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    this.cameras.resize(gameSize.width, gameSize.height);
    this.buildLayout();
  }

  private createButton(x: number, y: number, config: ButtonConfig) {
    const width = Math.min(320, this.scale.width * 0.6);
    const height = 64;

    const buttonRect = this.add
      .rectangle(x, y, width, height, 0xf97316, 0.9)
      .setStrokeStyle(2, 0xffffff, 0.9)
      .setOrigin(0.5);
    const label = this.add
      .text(x, y, config.label, {
        fontFamily: FONT,
        fontSize: 20,
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setResolution(TEXT_RESOLUTION);

    const zone = this.add
      .zone(x, y, width, height)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    zone.on('pointerover', () => buttonRect.setFillStyle(0xfb923c));
    zone.on('pointerout', () => {
      buttonRect.setFillStyle(0xf97316);
      buttonRect.setScale(1);
    });
    zone.on('pointerdown', () => buttonRect.setScale(0.98));
    zone.on('pointerup', () => {
      buttonRect.setScale(1);
      config.onClick();
    });

    this.staticElements.push(buttonRect, label);
    this.buttons.push(zone);
  }

  private handleCreateRoom() {
    const nickname = this.promptNickname();
    this.scene.start('GameScene', {
      autoAction: 'create',
      nickname,
    });
  }

  private handleJoinRoom() {
    const roomCode = window.prompt('Digite o código da sala (ex: ABCD)')?.trim().toUpperCase();
    if (!roomCode) {
      this.showInfo('Informe um código válido.');
      return;
    }

    const nickname = this.promptNickname();
    this.scene.start('GameScene', {
      autoAction: 'join',
      nickname,
      roomCode,
    });
  }

  private showInfo(message: string) {
    this.infoText?.setText(message);
    if (this.infoText) {
      this.tweens.add({
        targets: this.infoText,
        alpha: 0.3,
        yoyo: true,
        repeat: 1,
        duration: 150,
      });
    }
  }

  private promptNickname() {
    const input =
      window.prompt('Qual nickname deseja usar?', this.lastNickname || 'Player')?.trim() ?? '';
    if (input) {
      this.lastNickname = input;
    }
    return input || undefined;
  }

  private clearLayout() {
    this.staticElements.forEach((el) => el.destroy());
    this.buttons.forEach((btn) => btn.destroy());
    this.staticElements = [];
    this.buttons = [];
  }

}

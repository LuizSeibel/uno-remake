import Phaser from 'phaser';

type CardStageOptions = {
  hudWidth: number;
  hudMargin: number;
  fontFamily: string;
  textResolution: number;
  stagePadding?: number;
};

export default class CardStage {
  private scene: Phaser.Scene;
  private options: CardStageOptions;
  private elements: Phaser.GameObjects.GameObject[];
  private cardBase?: Phaser.GameObjects.Rectangle;
  private cardShadow?: Phaser.GameObjects.Rectangle;
  private cardLabel?: Phaser.GameObjects.Text;
  private playerBadge?: Phaser.GameObjects.Text;
  private currentNickname?: string;

  constructor(scene: Phaser.Scene, options: CardStageOptions) {
    this.scene = scene;
    this.options = options;
    this.elements = [];
  }

  build() {
    this.destroy();

    const availableWidth =
      this.scene.scale.width - this.options.hudWidth - this.options.hudMargin * 3;
    const stageWidth = Math.min(420, availableWidth);
    const stageX = this.scene.scale.width - stageWidth / 2 - this.options.hudMargin;
    const stageHeight = this.scene.scale.height - (this.options.stagePadding ?? 120);
    const stageY = this.scene.scale.height / 2;

    const stagePanel = this.scene.add
      .rectangle(stageX, stageY, stageWidth, stageHeight, 0x101a33, 0.55)
      .setOrigin(0.5);
    stagePanel.setStrokeStyle(2, 0x1f2a44, 0.7);

    this.cardShadow = this.scene.add
      .rectangle(stageX + 10, stageY + 12, 150, 210, 0x000000, 0.25)
      .setOrigin(0.5);

    this.cardBase = this.scene.add.rectangle(stageX, stageY, 150, 210, 0xff5c63).setOrigin(0.5);

    this.cardLabel = this.scene.add
      .text(stageX, stageY, 'UNO', {
        fontFamily: this.options.fontFamily,
        fontSize: '36px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setResolution(this.options.textResolution);

    this.playerBadge = this.scene.add
      .text(stageX, stageY + 150, 'Aguardando conexão...', {
        fontFamily: this.options.fontFamily,
        fontSize: '18px',
        color: '#fcd34d',
      })
      .setOrigin(0.5)
      .setResolution(this.options.textResolution);

    this.elements.push(stagePanel, this.cardShadow, this.cardBase, this.cardLabel, this.playerBadge);
    this.applyNickname();
  }

  resize() {
    this.build();
  }

  setPlayerNickname(nickname?: string) {
    this.currentNickname = nickname;
    this.applyNickname();
  }

  pulsePlaceholder() {
    if (!this.cardBase || !this.cardShadow || !this.cardLabel) {
      return;
    }

    const targets = [this.cardBase, this.cardShadow, this.cardLabel];

    this.scene.tweens.add({
      targets,
      scaleX: 1.04,
      scaleY: 1.04,
      yoyo: true,
      duration: 200,
      ease: 'Sine.easeOut',
    });
  }

  destroy() {
    this.elements.forEach((obj) => obj.destroy());
    this.elements = [];
  }

  private applyNickname() {
    if (!this.playerBadge) {
      return;
    }

    if (this.currentNickname) {
      this.playerBadge.setText(`Você: ${this.currentNickname}`);
    } else {
      this.playerBadge.setText('Aguardando conexão...');
    }
  }
}

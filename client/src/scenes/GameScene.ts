import Phaser from 'phaser';
import { io, Socket } from 'socket.io-client';
import type { Card, CardActionEvent, Player, Room, RoomErrorPayload } from '../types';

const HUD_WIDTH = 360;
const HUD_MARGIN = 32;
const HUD_PADDING = 24;
const PANEL_COLOR = 0x111b2f;
const PANEL_BORDER = 0x1f2a44;
const PANEL_ACCENT = '#fcd34d';
const FONT_FAMILY = '"Space Mono", "Fira Code", monospace';
const TEXT_RESOLUTION = Math.min(window.devicePixelRatio || 1, 2);

type SceneLaunchData = {
  autoAction?: 'create' | 'join';
  nickname?: string;
  roomCode?: string;
};

export default class GameScene extends Phaser.Scene {
  private socket!: Socket;
  private statusText?: Phaser.GameObjects.Text;
  private actionLog?: Phaser.GameObjects.Text;
  private roomText?: Phaser.GameObjects.Text;
  private playerListText?: Phaser.GameObjects.Text;
  private cardBase?: Phaser.GameObjects.Rectangle;
  private cardShadow?: Phaser.GameObjects.Rectangle;
  private cardLabel?: Phaser.GameObjects.Text;
  private playerBadge?: Phaser.GameObjects.Text;
  private backgroundElements: Phaser.GameObjects.GameObject[] = [];
  private hudElements: Phaser.GameObjects.GameObject[] = [];
  private stageElements: Phaser.GameObjects.GameObject[] = [];
  private leaveButtonBg?: Phaser.GameObjects.Rectangle;
  private leaveButtonLabel?: Phaser.GameObjects.Text;
  private leaveButtonZone?: Phaser.GameObjects.Zone;
  private player?: Player;
  private roomId?: string;
  private logLines: string[] = [];
  private statusMessage = 'Conectando...';
  private lastPlayerListMessage = 'Nenhum jogador ainda.';
  private pendingAction?: 'create' | 'join';
  private pendingNickname?: string;
  private pendingRoomCode?: string;
  private isLeavingRoom = false;
  private hasReturnedToLobby = false;

  constructor() {
    super('GameScene');
  }

  init(data?: SceneLaunchData) {
    this.pendingAction = data?.autoAction;
    this.pendingNickname = data?.nickname;
    this.pendingRoomCode = data?.roomCode?.trim().toUpperCase();
    this.statusMessage = 'Conectando...';
    this.lastPlayerListMessage = 'Nenhum jogador ainda.';
    this.isLeavingRoom = false;
    this.hasReturnedToLobby = false;

    this.socket = io('http://localhost:3001', {
      transports: ['websocket'],
    });

    this.socket.on('lobby:welcome', (player: Player) => {
      this.player = player;
      this.drawPlaceholderCard(player.nickname);
      this.tryAutoAction();
    });

    this.socket.on('card:played', (event: CardActionEvent) => {
      this.pushLog(this.describeEvent(event));
    });

    this.socket.on('card:drawn', (event: CardActionEvent) => {
      this.pushLog(this.describeEvent(event));
    });

    this.socket.on('room:created', ({ roomId }: { roomId: string }) => {
      this.roomId = roomId;
      if (this.player) this.player.roomId = roomId;
      this.pushLog(`Sala ${roomId} criada. Compartilhe o código!`);
      this.updateRoomText();
      this.updateLeaveButtonState();
    });

    this.socket.on('room:joined', ({ roomId }: { roomId: string }) => {
      this.roomId = roomId;
      if (this.player) this.player.roomId = roomId;
      this.pushLog(`Entrou na sala ${roomId}.`);
      this.updateRoomText();
      this.updateLeaveButtonState();
    });

    this.socket.on('room:state', (room: Room) => {
      this.roomId = room.id;
      if (this.player) {
        const me = room.players.find((p) => p.id === this.player?.id);
        if (me) this.player = me;
      }
      this.refreshPlayerBadge();
      const list =
        room.players
          .map((p) => {
            const star = p.id === room.hostId ? '⭐ ' : '';
            const self = p.id === this.player?.id ? ' (você)' : '';
            return `${star}${p.nickname}${self}`;
          })
          .join('\n') || 'Sala vazia';
      this.lastPlayerListMessage = list;
      this.playerListText?.setText(list);
      this.updateRoomText();
      this.updateLeaveButtonState();
    });

    this.socket.on('room:error', (payload: RoomErrorPayload) => {
      this.pushLog(`Erro: ${payload.message}`);
      this.isLeavingRoom = false;
      this.updateLeaveButtonState();
    });

    this.socket.on('room:left', () => {
      this.roomId = undefined;
      this.isLeavingRoom = false;
      this.updateRoomText();
      this.updateLeaveButtonState();
      this.refreshPlayerBadge();
      this.goBackToLobby('Você saiu da sala.');
    });

    this.socket.on('connect_error', (err) => {
      console.error('Socket error', err);
      this.statusMessage = 'Falha na conexão';
      this.statusText?.setText(this.statusMessage);
    });
  }

  create() {
    this.drawBackdrop();
    this.createHud();
    this.createCardStage();
    this.registerKeyboardShortcuts();

    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.handleResize, this);
      if (this.socket.connected) this.socket.disconnect();
      this.clearGroup(this.backgroundElements);
      this.clearGroup(this.hudElements);
      this.clearGroup(this.stageElements);
    });
  }

  private drawBackdrop() {
    this.clearGroup(this.backgroundElements);
    const { width, height } = this.scale;

    const layerOne = this.add
      .rectangle(width * 0.65, height / 2, width * 0.75, height, 0x0d1628, 0.45)
      .setOrigin(0.5);
    const layerTwo = this.add
      .rectangle(width * 0.78, height / 2, width * 0.4, height, 0x14213d, 0.45)
      .setOrigin(0.5);

    this.backgroundElements.push(layerOne, layerTwo);
  }

  private createHud() {
    this.clearGroup(this.hudElements);
    this.leaveButtonBg = undefined;
    this.leaveButtonLabel = undefined;
    this.leaveButtonZone = undefined;

    const { height } = this.scale;
    const panelHeight = height - HUD_MARGIN * 2;

    const panel = this.add
      .rectangle(HUD_MARGIN, HUD_MARGIN, HUD_WIDTH, panelHeight, PANEL_COLOR, 0.92)
      .setOrigin(0);
    panel.setStrokeStyle(2, PANEL_BORDER, 0.9);

    const contentX = panel.x + HUD_PADDING;
    let cursorY = panel.y + HUD_PADDING;
    const wrapWidth = HUD_WIDTH - HUD_PADDING * 2;

    this.statusText = this.add
      .text(contentX, cursorY, this.statusMessage, {
        fontFamily: FONT_FAMILY,
        fontSize: '20px',
        color: '#ffffff',
      })
      .setResolution(TEXT_RESOLUTION);
    this.hudElements.push(panel, this.statusText);
    cursorY += 40;

    this.add
      .text(contentX, cursorY, 'Controles rápidos', {
        fontFamily: FONT_FAMILY,
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#a5b4fc',
      })
      .setResolution(TEXT_RESOLUTION);
    cursorY += 28;

    this.add
      .text(contentX, cursorY, 'P • jogar carta\nD • comprar carta', {
        fontFamily: FONT_FAMILY,
        fontSize: '16px',
        color: '#e2e8f0',
        lineSpacing: 8,
      })
      .setResolution(TEXT_RESOLUTION);
    cursorY += 90;

    this.roomText = this.add
      .text(
        contentX,
        cursorY,
        this.roomId ? `Sala atual: ${this.roomId}` : 'Nenhuma sala ativa.',
        {
          fontFamily: FONT_FAMILY,
          fontSize: '18px',
          color: PANEL_ACCENT,
        },
      )
      .setResolution(TEXT_RESOLUTION);
    cursorY += 50;

    this.createLeaveButton(panel.x + HUD_WIDTH / 2, cursorY);
    cursorY += 80;

    this.add
      .text(contentX, cursorY, 'Jogadores', {
        fontFamily: FONT_FAMILY,
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#cbd5ff',
      })
      .setResolution(TEXT_RESOLUTION);
    cursorY += 26;

    this.playerListText = this.add
      .text(contentX, cursorY, this.lastPlayerListMessage, {
        fontFamily: FONT_FAMILY,
        fontSize: '16px',
        color: '#cbd5f5',
        lineSpacing: 6,
        wordWrap: { width: wrapWidth },
      })
      .setResolution(TEXT_RESOLUTION);
    cursorY += 150;

    this.add
      .text(contentX, cursorY, 'Log recente', {
        fontFamily: FONT_FAMILY,
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#f9a8d4',
      })
      .setResolution(TEXT_RESOLUTION);
    cursorY += 26;

    this.actionLog = this.add
      .text(contentX, cursorY, 'Nenhuma ação ainda.', {
        fontFamily: FONT_FAMILY,
        fontSize: '16px',
        color: '#f472b6',
        lineSpacing: 6,
        wordWrap: { width: wrapWidth },
      })
      .setResolution(TEXT_RESOLUTION);
  }

  private createCardStage() {
    this.clearGroup(this.stageElements);

    const availableWidth = this.scale.width - HUD_WIDTH - HUD_MARGIN * 3;
    const stageWidth = Math.min(420, availableWidth);
    const stageX = this.scale.width - stageWidth / 2 - HUD_MARGIN;
    const stageY = this.scale.height / 2;

    const stagePanel = this.add
      .rectangle(stageX, stageY, stageWidth, this.scale.height - 120, 0x101a33, 0.55)
      .setOrigin(0.5);
    stagePanel.setStrokeStyle(2, 0x1f2a44, 0.7);
    this.stageElements.push(stagePanel);

    this.cardShadow = this.add
      .rectangle(stageX + 10, stageY + 12, 150, 210, 0x000000, 0.25)
      .setOrigin(0.5);
    this.cardBase = this.add.rectangle(stageX, stageY, 150, 210, 0xff5c63).setOrigin(0.5);
    this.cardLabel = this.add
      .text(stageX, stageY, 'UNO', {
        fontFamily: FONT_FAMILY,
        fontSize: '36px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setResolution(TEXT_RESOLUTION);
    this.playerBadge = this.add
      .text(stageX, stageY + 150, 'Aguardando conexão...', {
        fontFamily: FONT_FAMILY,
        fontSize: '18px',
        color: PANEL_ACCENT,
      })
      .setOrigin(0.5)
      .setResolution(TEXT_RESOLUTION);

    this.stageElements.push(
      stagePanel,
      this.cardShadow,
      this.cardBase,
      this.cardLabel,
      this.playerBadge,
    );
  }

  private createLeaveButton(centerX: number, y: number) {
    const width = HUD_WIDTH - HUD_PADDING * 2;
    const height = 54;

    this.leaveButtonBg = this.add
      .rectangle(centerX, y, width, height, 0xdc2626, 0.9)
      .setOrigin(0.5);
    this.leaveButtonBg.setStrokeStyle(2, 0xffffff, 0.85);

    this.leaveButtonLabel = this.add
      .text(centerX, y, 'Sair da sala', {
        fontFamily: FONT_FAMILY,
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setResolution(TEXT_RESOLUTION);

    this.leaveButtonZone = this.add
      .zone(centerX, y, width, height)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.leaveButtonZone.on('pointerover', () => {
      if (!this.canLeaveRoom()) return;
      this.leaveButtonBg?.setFillStyle(0xf87171);
    });
    this.leaveButtonZone.on('pointerout', () => {
      this.leaveButtonBg?.setFillStyle(0xdc2626);
      this.leaveButtonBg?.setScale(1);
    });
    this.leaveButtonZone.on('pointerdown', () => {
      if (!this.canLeaveRoom()) return;
      this.leaveButtonBg?.setScale(0.98);
    });
    this.leaveButtonZone.on('pointerup', () => {
      if (!this.canLeaveRoom()) {
        this.leaveButtonBg?.setScale(1);
        return;
      }
      this.leaveButtonBg?.setScale(1);
      this.promptLeaveRoom();
    });
  }

  private drawPlaceholderCard(label: string) {
    if (!this.cardBase || !this.cardLabel) {
      this.events.once(Phaser.Scenes.Events.CREATE, () => this.drawPlaceholderCard(label));
      return;
    }

    this.statusMessage = `Conectado como ${label}`;
    this.statusText?.setText(this.statusMessage);
    this.updatePlayerBadge();
    this.cardLabel.setText('UNO');

    const targets = [this.cardBase, this.cardShadow, this.cardLabel].filter(Boolean) as Phaser.GameObjects.GameObject[];

    this.tweens.add({
      targets,
      scaleX: 1.04,
      scaleY: 1.04,
      yoyo: true,
      duration: 200,
      ease: 'Sine.easeOut',
    });
  }

  private registerKeyboardShortcuts() {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;

    keyboard.on('keydown-P', this.handlePlayCard, this);
    keyboard.on('keydown-D', this.handleDrawCard, this);
  }

  private tryAutoAction() {
    if (!this.pendingAction || !this.player) return;

    const nickname = this.pendingNickname?.trim() || this.player.nickname;

    if (this.pendingAction === 'create') {
      this.socket.emit('room:create', { nickname });
    } else if (this.pendingAction === 'join') {
      const code = this.pendingRoomCode;
      if (!code) {
        this.pushLog('Código de sala ausente para entrar automaticamente.');
        this.pendingAction = undefined;
        return;
      }
      this.socket.emit('room:join', { roomId: code, nickname });
    }

    this.pendingAction = undefined;
    this.pendingNickname = undefined;
    this.pendingRoomCode = undefined;
  }

  private handlePlayCard() {
    if (!this.player || !this.roomId) {
      this.pushLog('Entre ou crie uma sala antes de jogar cartas.');
      return;
    }

    const mockCard: Card = {
      id: `client-${Date.now()}`,
      color: 'red',
      value: '9',
    };

    this.socket.emit('card:play', {
      playerId: this.player.id,
      card: mockCard,
    });
  }

  private handleDrawCard() {
    if (!this.player || !this.roomId) {
      this.pushLog('Entre ou crie uma sala antes de comprar cartas.');
      return;
    }

    this.socket.emit('card:draw', {
      playerId: this.player.id,
    });
  }

  private describeEvent(event: CardActionEvent) {
    const actor = event.playerId === this.player?.id ? 'Você' : event.nickname;
    const actionVerb = event.action === 'play' ? 'jogou' : 'comprou';
    const cardLabel = event.card ? `${event.card.color} ${event.card.value}` : 'uma carta';
    return `${actor} ${actionVerb} ${cardLabel}`;
  }

  private pushLog(entry: string) {
    const sanitized = entry.trim();
    if (!sanitized) return;
    this.logLines.unshift(sanitized);
    this.logLines = this.logLines.slice(0, 5);
    this.updateLogText();
  }

  private updateLogText() {
    if (!this.actionLog) return;
    if (!this.logLines.length) {
      this.actionLog.setText('• Nenhuma ação ainda.');
    } else {
      this.actionLog.setText(this.logLines.map((line) => `• ${line}`).join('\n'));
    }
  }

  private updateRoomText() {
    if (!this.roomText) return;
    if (this.roomId) {
      this.roomText.setText(`Sala atual: ${this.roomId}`);
    } else {
      this.roomText.setText('Nenhuma sala ativa.');
      this.playerListText?.setText('Nenhum jogador ainda.');
    }
    this.updateLeaveButtonState();
  }

  private updatePlayerBadge() {
    if (!this.playerBadge) return;
    if (this.player) {
      this.playerBadge.setText(`Você: ${this.player.nickname}`);
    } else {
      this.playerBadge.setText('Aguardando conexão...');
    }
  }

  private refreshPlayerBadge() {
    this.updatePlayerBadge();
  }

  private canLeaveRoom() {
    return Boolean(this.roomId) && !this.isLeavingRoom;
  }

  private updateLeaveButtonState() {
    if (!this.leaveButtonBg || !this.leaveButtonZone) return;
    if (this.canLeaveRoom()) {
      this.leaveButtonBg.setFillStyle(0xdc2626, 0.95);
      this.leaveButtonBg.setAlpha(1);
      this.leaveButtonLabel?.setAlpha(1);
      this.leaveButtonZone.setInteractive({ useHandCursor: true });
    } else {
      this.leaveButtonBg.setFillStyle(0x1f2937, 0.6);
      this.leaveButtonBg.setAlpha(0.6);
      this.leaveButtonLabel?.setAlpha(0.5);
      this.leaveButtonZone.disableInteractive();
    }
  }

  private promptLeaveRoom() {
    if (!this.roomId) {
      this.pushLog('Nenhuma sala ativa para sair.');
      return;
    }
    if (!window.confirm('Quer realmente sair da sala?')) {
      return;
    }
    this.isLeavingRoom = true;
    this.pushLog('Saindo da sala...');
    this.updateLeaveButtonState();
    this.socket.emit('room:leave');
  }

  private goBackToLobby(message?: string) {
    if (message) {
      this.logLines.unshift(message);
      this.logLines = this.logLines.slice(0, 5);
      this.updateLogText();
    }

    if (this.hasReturnedToLobby) {
      return;
    }

    this.hasReturnedToLobby = true;

    if (this.socket.connected) {
      this.socket.disconnect();
    }

    this.scene.start('TitleScene');
  }

  private handleResize(size: Phaser.Structs.Size) {
    this.cameras.resize(size.width, size.height);
    this.scene.restart({
      autoAction: this.pendingAction,
      nickname: this.pendingNickname,
      roomCode: this.pendingRoomCode,
    });
  }

  private clearGroup(group: Phaser.GameObjects.GameObject[]) {
    group.forEach((obj) => obj.destroy());
    group.length = 0;
  }
}

import { Scene } from 'phaser';
import { sceneEvents } from '../events/EventsCenter';
import { PlayerEvents, StatusEvents, AudioEvents } from '../events/EventNames';
import { SCENE_KEYS } from './SceneKeys';
import { dataManager } from '../DataManager';
import actorDefinitions from '../data/actor-definitions.json';
import { audioManager } from '../AudioManager';
import { t } from '../i18n';
import { isMobile } from '../utils';

export class UI extends Scene {
  constructor() {
    super({ key: SCENE_KEYS.UI });
  }

  create() {
    this.player = dataManager.player;

    const hudHeight = isMobile ? 160 : 80;
    const hudY = this.scale.height;
    const hudWidth = this.scale.width;

    if(isMobile) {
      const topHudHeight = 160;
      this.add.image(0, 0, 'hud').setOrigin(0, 0).setDisplaySize(hudWidth, topHudHeight);
      // Центрируем обе кнопки по центру HUD, между ними 24px
      const buttonGap = 100;
      const infoButtonWidth = 160;
      const menuButtonWidth = 140;
      const totalWidth = infoButtonWidth + menuButtonWidth + buttonGap;
      const startX = (hudWidth - totalWidth) / 2;
      this.infoButtonContainer = this.add.container(startX + infoButtonWidth / 2, topHudHeight / 2);
      this.menuButtonContainer = this.add.container(startX + infoButtonWidth + buttonGap + menuButtonWidth / 2, topHudHeight / 2);
    }

    const hudBg = this.add.image(0, hudY, 'hud')
      .setOrigin(0, 1)
      .setDisplaySize(hudWidth, hudHeight);

    // Нижний HUD
    // Центр нижнего HUD
    const bottomHudCenterY = hudY - hudHeight / 2;
    // Размеры иконок
    const iconScale = isMobile ? 2 : 1;
    const textSize = isMobile ? 20 : 10;
    // Координаты для выравнивания по ширине (примерно по центру HUD)
    let baseX = isMobile ? hudWidth / 2 - 120 + 60 : 48;
    // Рамка и портрет героя
    if (isMobile) {
      // Мобильная верстка HUD снизу
      const bottomHudCenterY = hudY - hudHeight / 2;
      const iconScale = 2;
      const textSize = 20;
      let baseX = hudWidth / 2 - 120 + 60;
      // Портрет
      this.playerFrame = this.add.sprite(baseX, bottomHudCenterY, 'hero_frame').setScale(iconScale);
      this.playerPortrait = this.add.sprite(baseX, bottomHudCenterY + 10, 'hero').setScale(iconScale);
      this.playerFrame.setInteractive();
      this.playerFrame.on('pointerdown', () => {
        if (dataManager.status !== StatusEvents.PLAYING && dataManager.status !== StatusEvents.INFO_OPEN) return;
        if (this.player.xp >= this.player.nextLevelXP()) {
          sceneEvents.emit(AudioEvents.LEVEL_UP);
          this.player.levelUp();
        }
      });
      // Смещения относительно портрета (как на десктопе, но *2)
      const dx = 52 * iconScale;
      this.playerHP = this.add.sprite(baseX + dx, bottomHudCenterY - 21 * iconScale, 'icons', 0).setScale(iconScale);
      this.hpText = this.add.bitmapText(
        baseX + dx + 14 * iconScale,
        bottomHudCenterY - 24 * iconScale,
        'ui',
        `${this.player.hp}/${this.player.maxHP}`,
        textSize
      );
      this.levelText = this.add.bitmapText(
        baseX + dx - 7 * iconScale,
        bottomHudCenterY + 18 * iconScale,
        'ui',
        `${t('level')} ${this.player.level}`,
        textSize
      );
      this.playerXP = this.add.sprite(baseX + dx, bottomHudCenterY, 'icons', 10).setScale(iconScale);
      this.xpText = this.add.bitmapText(
        baseX + dx + 14 * iconScale,
        bottomHudCenterY - 3 * iconScale,
        'ui',
        `${this.player.xp}/${this.player.nextLevelXP()}`,
        textSize
      );
      this.levelUpAnimation = this.add.sprite(baseX, bottomHudCenterY + 10, 'level_up', 0).setScale(iconScale);
      this.levelUpAnimation.setVisible(false);
    } else {
      // Десктопная верстка HUD снизу (как было раньше)
      this.playerFrame = this.add.sprite(48, hudY - hudHeight / 2, 'hero_frame');
      this.playerPortrait = this.add.sprite(48, hudY - hudHeight / 2 + 5, 'hero');
      this.playerFrame.setInteractive();
      this.playerFrame.on('pointerdown', () => {
        if (dataManager.status !== StatusEvents.PLAYING && dataManager.status !== StatusEvents.INFO_OPEN) return;
        if (this.player.xp >= this.player.nextLevelXP()) {
          sceneEvents.emit(AudioEvents.LEVEL_UP);
          this.player.levelUp();
        }
      });
      this.playerHP = this.add.sprite(100, hudY - hudHeight / 2 - 21, 'icons', 0);
      this.hpText = this.add.bitmapText(
        114,
        hudY - hudHeight / 2 - 24,
        'ui',
        `${this.player.hp}/${this.player.maxHP}`,
        10
      );
      this.levelText = this.add.bitmapText(
        93,
        hudY - hudHeight / 2 + 18,
        'ui',
        `${t('level')} ${this.player.level}`,
        10
      );
      this.playerXP = this.add.sprite(100, hudY - hudHeight / 2, 'icons', 10);
      this.xpText = this.add.bitmapText(
        114,
        hudY - hudHeight / 2 - 3,
        'ui',
        `${this.player.xp}/${this.player.nextLevelXP()}`,
        10
      );
      this.levelUpAnimation = this.add.sprite(48, hudY - hudHeight / 2 + 5, 'level_up', 0);
      this.levelUpAnimation.setVisible(false);
    }

    const halfHP = Math.floor(this.player.maxHP / 2);
    this.hpText.setText(`${Math.max(0, this.player.hp)}/${this.player.maxHP}`);
    if (this.player.hp === this.player.maxHP) {
      this.playerPortrait.setFrame(0);
      this.playerHP.setFrame(0);
    } else if (this.player.hp >= 1 && this.player.hp <= halfHP) {
      this.playerPortrait.setFrame(1);
      this.playerHP.setFrame(1);
    } else if (this.player.hp === 0) {
      this.playerPortrait.setFrame(1);
      this.playerHP.setFrame(2);
    } else if (this.player.hp < 0) {
      this.playerPortrait.setFrame(2);
      this.playerHP.setFrame(2);
    }
    this.xpText.setText(`${Math.max(0, this.player.xp)}/${this.player.nextLevelXP()}`);

    // Эффект возможности повысить уровень
    // Проверяем, может ли игрок повысить уровень
    if (this.player.xp >= this.player.nextLevelXP()) {
      this.levelUpAnimation.setVisible(true);
      this.levelUpAnimation.play('can_level_up');
    }

    if(!isMobile) {
      this.infoButtonContainer = this.add.container(hudWidth - 160, hudY - hudHeight / 2);
      this.menuButtonContainer = this.add.container(hudWidth - 60, hudY - hudHeight / 2);
    }

    // Кнопка информации об объектах (NineSlice)
    const infoButtonBg = this.add.nineslice(0, 0, 'button', null, isMobile ? 160 : 80, isMobile ? 80 : 40, 8, 8, 8, 8);
    const infoButtonText = this.add.bitmapText(0, 0, 'ui', t('summary'), isMobile ? 20 : 10).setOrigin(0.5);
    this.infoButtonContainer.add([infoButtonBg, infoButtonText]);
    infoButtonBg.setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        if (dataManager.status !== StatusEvents.PLAYING && dataManager.status !== StatusEvents.INFO_OPEN) return;
        sceneEvents.emit(AudioEvents.PLAYER_CLICK);
        this.showObjectInfo();
      });

    // Кнопка "Меню" (NineSlice)
    const menuButtonBg = this.add.nineslice(0, 0, 'button', null, isMobile ? 140 : 70, isMobile ? 80 : 40, 8, 8, 8, 8);
    const menuButtonText = this.add.bitmapText(0, 0, 'ui', t('menu'), isMobile ? 20 : 10).setOrigin(0.5);
    this.menuButtonContainer.add([menuButtonBg, menuButtonText]);
    menuButtonBg.setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        if (dataManager.status !== StatusEvents.PLAYING && dataManager.status !== StatusEvents.INFO_OPEN) return;
        sceneEvents.emit(AudioEvents.PLAYER_CLICK);
        dataManager.setStatus(StatusEvents.PAUSE);
        this.scene.pause(SCENE_KEYS.GAME);
        this.scene.stop(SCENE_KEYS.UI);
        this.scene.start(SCENE_KEYS.MENU);
      });

    // Создаем модальное окно для информации об объектах
    this.createObjectInfoWindow();

    sceneEvents.on(PlayerEvents.HP_CHANGED, ({ current }) => {
      const halfHP = Math.floor(this.player.maxHP / 2);
      this.hpText.setText(`${Math.max(0, current)}/${this.player.maxHP}`);

      if (current === this.player.maxHP) {
        this.playerPortrait.setFrame(0);
        this.playerHP.setFrame(0);
      } else if (current >= 1 && current <= halfHP) {
        this.playerPortrait.setFrame(1);
        this.playerHP.setFrame(1);
      } else if (current === 0) {
        this.playerPortrait.setFrame(1);
        this.playerHP.setFrame(2);
      } else if (current < 0) {
        this.playerPortrait.setFrame(2);
        this.playerHP.setFrame(2);
        this.levelUpAnimation.setVisible(false);
        this.levelUpAnimation.stop();
      }
    });

    sceneEvents.on(PlayerEvents.XP_CHANGED, ({ current }) => {
      this.xpText.setText(`${Math.max(0, current)}/${this.player.nextLevelXP()}`);
    });

    sceneEvents.on(PlayerEvents.CAN_LEVEL_UP, () => {
      this.levelUpAnimation.setVisible(true);
      this.levelUpAnimation.play('can_level_up');
    });

    sceneEvents.on(PlayerEvents.LEVEL_UP, () => {
      this.levelUpAnimation.setVisible(false);
      this.levelUpAnimation.stop();
      // Дополнительная проверка
      if (this.levelUpAnimation.anims) {
        this.levelUpAnimation.anims.stop();
      }
      // Обновляем текст уровня
      this.levelText.setText(`${t('level')} ${this.player.level}`);
    });
  }

  createObjectInfoWindow() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;
    // Создаём фон - почти на всю высоту и ширину с отступами 20px
    // Учитываем размер UI (HUD) - 80px снизу
    this.rectWidth = this.cameras.main.width - 40;
    if (isMobile) {
      this.rectHeight = 460;
    } else {
      this.rectHeight = this.cameras.main.height - 40 - 80;
    }
    // Создаём фон из спрайта book.png
    this.objectInfoBg = this.add.image(centerX, centerY, 'book');
    this.objectInfoBg.setDisplaySize(this.rectWidth, this.rectHeight);
    this.objectInfoBg.setVisible(false);
    // Контейнер для спрайтов
    this.objectInfoContainer = this.add.container(centerX, centerY);
    this.objectInfoContainer.setVisible(false);
  }

  showObjectInfo() {
    // Проверяем, не открыто ли уже окно информации
    if (this.objectInfoBg.visible) {
      // Если окно уже открыто, закрываем его
      this.hideObjectInfo();
      return;
    }
    
    // Устанавливаем статус открытого окна информации
    dataManager.setStatus(StatusEvents.INFO_OPEN);
    
    // Получаем данные об объектах
    const gameScene = this.scene.get('Game');
    let objectCounts = new Map();
    
    if (gameScene && gameScene.game && gameScene.game.ecs && gameScene.game.ecs.world) {
      const objectCounterSystem = gameScene.game.ecs.world.systemManager._systems.find(system => system.constructor.name === 'ObjectCounterSystem');
      if (objectCounterSystem) {
        objectCounts = objectCounterSystem.getAllObjectCounts();
      }
    } else if (window.ecsWorld) {
      const objectCounterSystem = window.ecsWorld.systemManager._systems.find(system => system.constructor.name === 'ObjectCounterSystem');
      if (objectCounterSystem) {
        objectCounts = objectCounterSystem.getAllObjectCounts();
      }
    }
    
    // Очищаем контейнер
    this.objectInfoContainer.removeAll();
    
    // Сортируем объекты по категориям
    const monsters = [];
    const structures = [];
    const items = [];
    
    // Получаем все возможные типы объектов из определений
    const allTypes = Object.keys(actorDefinitions);
    
    allTypes.forEach(type => {
      // Исключаем KEY, WALL и ORB
      if (type === 'KEY' || type === 'WALL' || type === 'ORB') {
        return;
      }
      
      const count = objectCounts.get(type) || 0; // Если типа нет в подсчете, считаем 0
      const actorComponents = actorDefinitions[type];
      
      if (type === 'CHEST') {
        structures.push({ type, count });
      } else if (actorComponents && actorComponents.some(comp => comp.component === 'Monster')) {
        monsters.push({ type, count });
      } else {
        items.push({ type, count });
      }
    });
    
    // Сортируем по урону от большего к меньшему
    const sortByAttack = (a, b) => {
      const aComponents = actorDefinitions[a.type];
      const bComponents = actorDefinitions[b.type];
      const aAttack = aComponents.find(comp => comp.component === 'Attack')?.data?.value || 0;
      const bAttack = bComponents.find(comp => comp.component === 'Attack')?.data?.value || 0;
      return bAttack - aAttack; // От большего к меньшему
    };
    
    monsters.sort(sortByAttack);
    structures.sort(sortByAttack);
    items.sort(sortByAttack);
    
    // Объединяем все категории
    const sortedObjects = [...monsters, ...structures, ...items];
    
    // Располагаем в 3 колонки равномерно
    const totalObjects = sortedObjects.length;
    const objectsPerColumn = Math.ceil(totalObjects / 3); // Количество объектов в каждой колонке
    
    let column = 0;
    const columnWidth = this.rectWidth/3; // Треть ширины с меньшим отступом
    const rowHeight = 50;    // Расстояние между строками

    sortedObjects.forEach(({ type, count }, index) => {
      // Определяем колонку и строку для текущего объекта
      column = Math.floor(index / objectsPerColumn);
      const rowInColumn = index % objectsPerColumn;
      
      // Вычисляем позицию
      const currentX = -this.rectWidth/2 + 40 + column * columnWidth;
      const currentY = -this.rectHeight/2 + 40 + rowInColumn * rowHeight;
      
      // Ищем определение спрайта
      let actorComponents = actorDefinitions[type];
      
      if (actorComponents) {
        const spriteComponent = actorComponents.find(comp => comp.component === 'Sprite');
        const attackComponent = actorComponents.find(comp => comp.component === 'Attack');
        
        if (spriteComponent && spriteComponent.data) {
          const { spriteSheet, frame } = spriteComponent.data;
          const attackValue = attackComponent ? attackComponent.data.value : 0;
          
          try {
            // Создаем иконку урона
            const attackIcon = this.add.sprite(0, 0, 'icons', 31);
            attackIcon.setPosition(currentX - 10, currentY);
            this.objectInfoContainer.add(attackIcon);
            
            // Создаем текст урона
            const attackText = this.add.bitmapText(0, 0, 'ingame', `${attackValue}`, 10);
            attackText.setOrigin(0.5, 0.5);
            attackText.setPosition(currentX + 15, currentY);
            this.objectInfoContainer.add(attackText);
            
            // Создаем спрайт сущности
            const sprite = this.add.sprite(0, 0, spriteSheet, frame);
            sprite.setPosition(currentX + 50, currentY);
            this.objectInfoContainer.add(sprite);
            
            // Создаем текст количества
            const countText = this.add.bitmapText(0, 0, 'ingame', `x${count}`, 10);
            countText.setPosition(currentX + 80, currentY - 5);
            this.objectInfoContainer.add(countText);
          } catch (error) {
            console.error(`Error creating sprite for ${type}:`, error);
          }
        }
      }
    });
    
    // Показываем окно
    this.objectInfoBg.setVisible(true);
    this.objectInfoContainer.setVisible(true);
  }

  hideObjectInfo() {
    this.objectInfoBg.setVisible(false);
    this.objectInfoContainer.setVisible(false);
    
    // Возвращаемся к игровому статусу
    dataManager.setStatus(StatusEvents.PLAYING);
    
    // Очищаем контейнер при скрытии
    this.objectInfoContainer.removeAll(true);
  }
} 
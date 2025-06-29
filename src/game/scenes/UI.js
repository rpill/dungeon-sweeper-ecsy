import { Scene } from 'phaser';
import { sceneEvents } from '../events/EventsCenter';
import { PlayerEvents, StatusEvents, AudioEvents } from '../events/EventNames';
import { SCENE_KEYS } from './SceneKeys';
import { dataManager } from '../DataManager';
import actorDefinitions from '../data/actor-definitions.json';
import { audioManager } from '../AudioManager';

export class UI extends Scene {
  constructor() {
    super({ key: SCENE_KEYS.UI });
  }

  create() {
    this.player = dataManager.player;

    const hudHeight = 80;
    const hudY = this.scale.height;
    const hudWidth = this.scale.width;

    const hudBg = this.add.image(0, hudY, 'hud')
      .setOrigin(0, 1)
      .setDisplaySize(hudWidth, hudHeight);

    this.playerFrame = this.add.sprite(48, hudY - hudHeight / 2, 'hero_frame');
    this.playerPortrait = this.add.sprite(48, hudY - hudHeight / 2 + 5, 'hero');
    this.playerFrame.setInteractive();
    this.playerFrame.on('pointerdown', () => {
      if (dataManager.status !== StatusEvents.PLAYING && dataManager.status !== StatusEvents.INFO_OPEN) return;
      if (this.player.xp >= this.player.nextLevelXP()) {
        // Воспроизводим звук повышения уровня
        sceneEvents.emit(AudioEvents.LEVEL_UP);
        this.player.levelUp();
      }
    });

    // HP
    this.playerHP = this.add.sprite(100, hudY - hudHeight / 2 - 21, 'icons', 0);
    this.hpText = this.add.bitmapText(
      114,
      hudY - hudHeight / 2 - 24,
      'ui',
      `${this.player.hp}/${this.player.maxHP}`,
      10
    );

    // Level
    this.levelText = this.add.bitmapText(
      93,
      hudY - hudHeight / 2 + 18,
      'ui',
      `Ур. ${this.player.level}`,
      10
    );

    // XP
    this.playerXP = this.add.sprite(100, hudY - hudHeight / 2, 'icons', 10);
    this.xpText = this.add.bitmapText(
      114,
      hudY - hudHeight / 2 - 3,
      'ui',
      `${this.player.xp}/${this.player.nextLevelXP()}`,
      10
    );

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

    // Анимация повышения уровня
    this.levelUpAnimation = this.add.sprite(48, hudY - hudHeight / 2 + 5, 'level_up', 0);
    this.levelUpAnimation.setVisible(false);

    // Проверяем, может ли игрок повысить уровень
    if (this.player.xp >= this.player.nextLevelXP()) {
      this.levelUpAnimation.setVisible(true);
      this.levelUpAnimation.play('can_level_up');
    }

    // Кнопка информации об объектах
    this.infoButton = this.add.bitmapText(hudWidth - 120, hudY - hudHeight / 2, 'ui', 'Информация', 12)
      .setOrigin(0.5, 0.5)
      .setTint(0xffffff)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        if (dataManager.status !== StatusEvents.PLAYING && dataManager.status !== StatusEvents.INFO_OPEN) return;
        
        // Воспроизводим звук клика
        sceneEvents.emit(AudioEvents.PLAYER_CLICK);
        
        this.showObjectInfo();
      });

    const menuBtn = this.add.bitmapText(hudWidth - 20, hudY - hudHeight / 2, 'ui', 'Меню', 12)
      .setOrigin(1, 0.5)
      .setTint(0xffffff)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        if (dataManager.status !== StatusEvents.PLAYING && dataManager.status !== StatusEvents.INFO_OPEN) return;
        
        // Воспроизводим звук клика
        sceneEvents.emit(AudioEvents.PLAYER_CLICK);
        
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
      this.levelText.setText(`Ур. ${this.player.level}`);
    });
  }

  createObjectInfoWindow() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;
    
    // Создаем фон - почти на всю высоту и ширину с отступами 20px
    // Учитываем размер UI (HUD) - 80px снизу
    this.rectWidth = this.cameras.main.width - 40;  // 20px отступы с каждой стороны
    this.rectHeight = this.cameras.main.height - 40 - 80; // 20px отступы + 80px для UI
    
    // Создаем фон из спрайта book.png
    this.objectInfoBg = this.add.image(centerX, centerY - 40, 'book');
    this.objectInfoBg.setDisplaySize(this.rectWidth, this.rectHeight);
    this.objectInfoBg.setVisible(false);

    // Контейнер для спрайтов
    this.objectInfoContainer = this.add.container(centerX, centerY - 40);
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
      const currentX = -this.rectWidth/2 + 50 + column * columnWidth;
      const currentY = -this.rectHeight/2 + 50 + rowInColumn * rowHeight;
      
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
            attackIcon.setScale(0.8);
            attackIcon.setPosition(currentX - 10, currentY);
            this.objectInfoContainer.add(attackIcon);
            
            // Создаем текст урона
            const attackText = this.add.text(0, 0, `${attackValue}`, {
              fontSize: '14px',
              fill: '#ffffff'
            });
            attackText.setOrigin(0.5, 0.5);
            attackText.setPosition(currentX + 15, currentY);
            this.objectInfoContainer.add(attackText);
            
            // Создаем спрайт сущности
            const sprite = this.add.sprite(0, 0, spriteSheet, frame);
            sprite.setPosition(currentX + 50, currentY);
            this.objectInfoContainer.add(sprite);
            
            // Создаем текст количества
            const countText = this.add.text(0, 0, `x${count}`, {
              fontSize: '16px',
              fill: '#ffffff'
            });
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
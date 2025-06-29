import { System } from 'ecsy';
import {
  TryReveal,
  Position,
  Tile,
  Sprite,
  Monster,
  Revealed,
  Defeated,
  TryAttack,
  Item,
  UseItem,
  Chest,
  Opened,
  TryOpen,
  TryCollect,
  TryCollectLoot,
  TryAttackWall,
  Mimic,
  Wall,
  Butterfly,
  XP,
  RevealedAsMonster,
  TryJump
} from '../components';
import { dataManager } from '../../DataManager';
import { StatusEvents, AudioEvents } from '../../events/EventNames';
import { sceneEvents } from '../../events/EventsCenter';

export class PlayerInputSystem extends System {
  static queries = {
    tiles: { components: [Tile, Position] },
    actors: { components: [Position, Sprite] },
  };

  init(attributes) {
    this.scene = attributes.scene;
    this.tileSize = attributes.tileSize;
    this._markMenuJustClosed = false;
    this._markMenuActive = false;
    this._markMenuInternalClick = false;
    this.scene.input.on('pointerdown', this.onPointerDown, this);
    // Отключаем стандартное контекстное меню браузера
    this.scene.input.manager.canvas.addEventListener('contextmenu', function(e) { e.preventDefault(); });
  }

  onPointerDown(pointer) {
    if (this._markMenuInternalClick) {
      setTimeout(() => { this._markMenuInternalClick = false }, 0);
      return;
    }
    if (dataManager.status !== StatusEvents.PLAYING) return;
    // Если меню меток открыто
    if (this._markMenuActive) {
      // Если клик был по кнопке меню — разрешаем только этот клик
      if (this._markMenuInternalClick) {
        this._markMenuInternalClick = false;
        return;
      }
      // Если клик правой кнопкой — просто закрыть меню
      if (pointer.rightButtonDown()) {
        this.hideMarkMenu();
        return;
      }
      // Если клик не по меню — ничего не делать
      return;
    }
    // Если только что закрыли меню меток — игнорируем этот клик
    if (this._markMenuJustClosed) {
      this._markMenuJustClosed = false;
      return;
    }
    // Обработка правой кнопки мыши для меню меток
    if (pointer.rightButtonDown()) {
      const x = Math.floor(pointer.worldX / this.tileSize);
      const y = Math.floor(pointer.worldY / this.tileSize);
      if (this.showMarkMenu) {
        this.showMarkMenu(x, y, pointer.worldX, pointer.worldY);
      }
      return;
    }
    
    const x = Math.floor(pointer.worldX / this.tileSize);
    const y = Math.floor(pointer.worldY / this.tileSize);
    const tileEntity = this.queries.tiles.results.find(tile => {
      const pos = tile.getComponent(Position);
      return pos.x === x && pos.y === y;
    });
    
    // Проверяем, есть ли на этой позиции живой монстр
    const liveMonster = this.queries.actors.results.find(actor => {
      const pos = actor.getComponent(Position);
      return pos.x === x && pos.y === y &&
        actor.hasComponent(Monster) &&
        !actor.hasComponent(Butterfly) &&
        actor.hasComponent(Revealed) &&
        !actor.hasComponent(Defeated);
    });
    
    // Проверяем закрытый сундук для открытия
    const chest = this.queries.actors.results.find(actor => {
      const pos = actor.getComponent(Position);
      return pos.x === x && pos.y === y &&
        actor.hasComponent(Chest) &&
        actor.hasComponent(Revealed) &&
        !actor.hasComponent(Opened);
    });
    if (chest) {
      if (!chest.hasComponent(TryOpen)) {
        chest.addComponent(TryOpen);
      }
      return;
    }

    // Проверяем открытый сундук с опытом для сбора
    const chestToCollect = this.queries.actors.results.find(actor => {
      const pos = actor.getComponent(Position);
      return pos.x === x && pos.y === y &&
        actor.hasComponent(Chest) &&
        actor.hasComponent(Opened) &&
        actor.hasComponent(XP) &&
        !actor.hasComponent(TryCollect);
    });
    if (chestToCollect) {
      chestToCollect.addComponent(TryCollect);
      return;
    }

    // Проверяем стену для атаки (только если у игрока есть HP)
    if (dataManager.player && dataManager.player.hp > 0) {
      const wall = this.queries.actors.results.find(actor => {
        const pos = actor.getComponent(Position);
        return pos.x === x && pos.y === y &&
          actor.hasComponent(Wall) &&
          actor.hasComponent(Revealed) &&
          !actor.hasComponent(Defeated) &&
          !actor.hasComponent(TryAttackWall);
      });
      if (wall) {
        wall.addComponent(TryAttackWall);
        return;
      }
    } else if (dataManager.player && dataManager.player.hp <= 0) {
      // Проверяем, не пытается ли игрок атаковать стену без HP
      const wall = this.queries.actors.results.find(actor => {
        const pos = actor.getComponent(Position);
        return pos.x === x && pos.y === y &&
          actor.hasComponent(Wall) &&
          actor.hasComponent(Revealed) &&
          !actor.hasComponent(Defeated);
      });
      if (wall) {
        // Воспроизводим звук отказа
        sceneEvents.emit(AudioEvents.PLAYER_DENIED);
        return;
      }
    }

    // Проверяем живого монстра для атаки
    const actor = this.queries.actors.results.find(actor => {
      const pos = actor.getComponent(Position);
      return pos.x === x && pos.y === y &&
        actor.hasComponent(Monster) &&
        !actor.hasComponent(Butterfly) &&
        actor.hasComponent(Revealed) &&
        !actor.hasComponent(Defeated);
    });
    if (actor) {
      if (!actor.hasComponent(TryAttack)) {
        actor.addComponent(TryAttack);
      }
      if (actor.hasComponent(Mimic)) {
        actor.addComponent(RevealedAsMonster);
      }
      return;
    }

    // Проверяем убитого монстра для сбора лута (только если клетка уже открыта)
    const monsterToCollect = this.queries.actors.results.find(actor => {
      const pos = actor.getComponent(Position);
      return pos.x === x && pos.y === y &&
        actor.hasComponent(Monster) &&
        actor.hasComponent(Defeated) &&
        actor.hasComponent(Revealed) &&
        !actor.hasComponent(TryCollectLoot);
    });
    if (monsterToCollect) {
      monsterToCollect.addComponent(TryCollectLoot);
      return;
    }

    // Проверяем разрушенную стену для сбора опыта (только если клетка уже открыта)
    const wallToCollect = this.queries.actors.results.find(actor => {
      const pos = actor.getComponent(Position);
      return pos.x === x && pos.y === y &&
        actor.hasComponent(Wall) &&
        actor.hasComponent(Defeated) &&
        actor.hasComponent(XP) &&
        actor.hasComponent(Revealed) &&
        !actor.hasComponent(TryCollectLoot);
    });
    if (wallToCollect) {
      wallToCollect.addComponent(TryCollectLoot);
      return;
    }

    // Активация предмета (например, орба или медкита) по клику
    const item = this.queries.actors.results.find(actor => {
      const pos = actor.getComponent(Position);
      return pos.x === x && pos.y === y &&
        actor.hasComponent(Item) &&
        actor.hasComponent(Revealed) &&
        !actor.hasComponent(UseItem);
    });
    if (item) {
      item.addComponent(UseItem);
      return;
    }

    // Прыжок бабочки только по клику на неё
    const butterfly = this.queries.actors.results.find(actor => {
      const pos = actor.getComponent(Position);
      return pos.x === x && pos.y === y && actor.hasComponent(Butterfly) && !actor.hasComponent(Defeated);
    });

    if (butterfly && !butterfly.hasComponent(TryJump)) {
      butterfly.addComponent(TryJump);
    }

    // Открываем клетку, если ничего другого не найдено
    if (tileEntity && !tileEntity.hasComponent(TryReveal)) {
      tileEntity.addComponent(TryReveal);
      // Воспроизводим звук клика только если на клетке нет живого монстра
      if (!liveMonster) {
        sceneEvents.emit(AudioEvents.PLAYER_CLICK);
      }
    }
  }

  stop() {
    this.scene.input.off('pointerdown', this.onPointerDown, this);
  }

  execute() { }

  // --- МЕНЮ МЕТОК ---
  showMarkMenu(tileX, tileY, worldX, worldY) {
    // Получаем tileEntity для проверки
    const tileEntity = this.queries.tiles.results.find(tile => {
      const pos = tile.getComponent(Position);
      return pos.x === tileX && pos.y === tileY;
    });
    // Если тайл уже ревильнут — не открываем меню меток
    if (!tileEntity || tileEntity.hasComponent(Revealed)) return;
    // Если меню уже открыто — не навешивать обработчик повторно
    if (this._markMenuActive) return;
    this._markMenuActive = true;
    // Удаляем предыдущее меню, если оно есть
    if (this._markMenuButtons) {
      this._markMenuButtons.forEach(btn => btn.destroy());
      this._markMenuButtons = null;
      if (this._markMenuBgRemover) {
        this.scene.input.off('pointerdown', this._markMenuBgRemover, this);
        this._markMenuBgRemover = null;
      }
    }

    // Размеры сетки
    const gridWidth = dataManager.width;
    const gridHeight = dataManager.height;
    const tileSize = this.tileSize;

    const hasMark = tileEntity && tileEntity.getComponent(Tile).mark;

    // Список меток
    const marks = [
      ...Array.from({length: 12}, (_, i) => (i+1).toString()),
      '?', '!', '*'
    ];
    if (hasMark) marks.push('del');

    // Параметры сетки кнопок
    const btnsPerRow = 4;
    const btnSize = 40;
    const btnMargin = 0;
    const rows = Math.ceil(marks.length / btnsPerRow);
    const cols = btnsPerRow;
    const menuWidth = cols * btnSize;
    const menuHeight = rows * btnSize;

    // Позиция меню (справа от тайла, но не выходить за границы)
    let menuX = (tileX + 1) * tileSize;
    let menuY = tileY * tileSize;
    // Если меню выходит за низ — сдвигаем вверх
    if (menuY + menuHeight > gridHeight * tileSize) {
      menuY = gridHeight * tileSize - menuHeight;
    }
    // Если меню выходит за правую границу — рисуем слева
    if (menuX + menuWidth > gridWidth * tileSize) {
      menuX = tileX * tileSize - menuWidth;
    }
    // Если всё равно не помещается — прижимаем к левому краю
    if (menuX < 0) menuX = 4;

    // Создаём кнопки
    this._markMenuButtons = marks.map((mark, i) => {
      const col = i % btnsPerRow;
      const row = Math.floor(i / btnsPerRow);
      const x = menuX + col * btnSize;
      const y = menuY + row * btnSize;
      let btn, bg;
      // Фон кнопки — тайл из атласа tiles, фрейм 16
      bg = this.scene.add.image(x, y, 'tiles', 16)
        .setOrigin(0, 0)
        .setDisplaySize(btnSize, btnSize)
        .setDepth(999)
        .setInteractive({ useHandCursor: true });
      if (mark === 'del') {
        btn = this.scene.add.image(x, y, 'icons', 30)
          .setOrigin(0, 0)
          .setDisplaySize(btnSize, btnSize)
          .setInteractive({ useHandCursor: true });
        btn.setDepth(1000);
        btn._bg = bg;
      } else {
        btn = this.scene.add.bitmapText(x + btnSize/2, y + btnSize/2, 'ingame', mark, 10)
          .setOrigin(0.5)
          .setTint(0xf5df6a)
          .setInteractive({ useHandCursor: true });
        btn.setDepth(1000);
        btn._bg = bg;
      }
      // Общий обработчик для кнопки
      const handleClick = (pointer) => {
        this._markMenuInternalClick = true;
        if (tileEntity) {
          const tile = tileEntity.getMutableComponent(Tile);
          if (mark === 'del') {
            tile.mark = '';
          } else {
            tile.mark = mark;
          }
        }
        this.hideMarkMenu();
        if (pointer.event.preventDefault) pointer.event.preventDefault();
        pointer.event.stopPropagation();
        if (pointer.event.stopImmediatePropagation) pointer.event.stopImmediatePropagation();
        setTimeout(() => { this._markMenuInternalClick = false }, 0);
      };
      btn.on('pointerdown', handleClick);
      bg.on('pointerdown', handleClick);
      btn.setDepth(1000);
      return btn;
    });

    // Обработчик клика вне меню — закрыть меню
    this._markMenuBgRemover = (pointer) => {
      if (this._markMenuButtons) {
        this.hideMarkMenu();
        // Отменяем всплытие и дефолтное поведение, чтобы клик не дошёл до поля
        if (pointer.event.preventDefault) pointer.event.preventDefault();
        pointer.event.stopPropagation();
        if (pointer.event.stopImmediatePropagation) pointer.event.stopImmediatePropagation();
      }
    };
    setTimeout(() => {
      if (this._markMenuActive) {
        this.scene.input.on('pointerdown', this._markMenuBgRemover, this);
      }
    }, 0);

    // Добавляем оверлей tiles 15 поверх выбранного тайла
    this._markMenuTileOverlay = this.scene.add.image(
      tileX * tileSize,
      tileY * tileSize,
      'tiles',
      15
    ).setOrigin(0, 0).setDisplaySize(tileSize, tileSize).setDepth(998);
  }

  hideMarkMenu() {
    if (this._markMenuButtons) {
      this._markMenuButtons.forEach(btn => {
        if (btn._bg) btn._bg.destroy();
        btn.destroy();
      });
      this._markMenuButtons = null;
    }
    if (this._markMenuBgRemover) {
      this.scene.input.off('pointerdown', this._markMenuBgRemover, this);
      this._markMenuBgRemover = null;
    }
    // Удаляем оверлей tiles 15, если он есть
    if (this._markMenuTileOverlay) {
      this._markMenuTileOverlay.destroy();
      this._markMenuTileOverlay = null;
    }
    this._markMenuActive = false;
  }
}
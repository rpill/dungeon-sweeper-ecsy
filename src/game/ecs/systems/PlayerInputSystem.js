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
import { gameSaveManager } from '../../GameSaveManager';

const TIME_TO_HOVER_MENU = 0.33;

export class PlayerInputSystem extends System {
  static queries = {
    tiles: { components: [Tile, Position] },
    actors: { components: [Position, Sprite] },
  };

  init(attributes) {
    this.scene = attributes.scene;
    this.tileSize = attributes.tileSize;
    this.offsetX = attributes.offsetX || 0;
    this.offsetY = attributes.offsetY || 0;
    this._markMenuJustClosed = false;
    this._markMenuActive = false;
    this._markMenuInternalClick = false;
    // --- Для удержания ---
    this._holding = false;
    this._lastPushedTile = null;
    this._holdStartTime = null;
    this.scene.input.on('pointerdown', this.onPointerDown, this);
    this.scene.input.on('pointerup', this.onPointerUp, this);
    this.scene.input.on('pointerout', this.onPointerUp, this);
    this.scene.input.on('pointercancel', this.onPointerUp, this);
    // Отключаем стандартное контекстное меню браузера
    this.scene.input.manager.canvas.addEventListener('contextmenu', function(e) { e.preventDefault(); });
  }

  onPointerDown(pointer) {
    if (this._markMenuInternalClick) {
      setTimeout(() => { this._markMenuInternalClick = false }, 0);
      return;
    }
    if (dataManager.status !== StatusEvents.PLAYING) return;
    if (this._markMenuActive) {
      if (this._markMenuInternalClick) {
        this._markMenuInternalClick = false;
        return;
      }
      if (pointer.rightButtonDown()) {
        this.hideMarkMenu();
        return;
      }
      return;
    }
    if (this._markMenuJustClosed) {
      this._markMenuJustClosed = false;
      return;
    }
    const offsetX = this.offsetX;
    const offsetY = this.offsetY;
    const x = Math.floor((pointer.worldX - offsetX) / this.tileSize);
    const y = Math.floor((pointer.worldY - offsetY) / this.tileSize);
    const tileEntity = this.queries.tiles.results.find(tile => {
      const pos = tile.getComponent(Position);
      return pos.x === x && pos.y === y;
    });
    // --- ПКМ или Shift+ЛКМ всегда вызывает меню маркеров ---
    const isShiftLeftClick = pointer.button === 0 && pointer.event && pointer.event.shiftKey;
    if (pointer.rightButtonDown() || isShiftLeftClick) {
      if (tileEntity && !tileEntity.hasComponent(Revealed)) {
        this.showMarkMenu(x, y, pointer.worldX, pointer.worldY);
      }
      return;
    }
    // --- ЛКМ: удержание или обычный клик ---
    if (tileEntity && !tileEntity.hasComponent(Revealed)) {
      this._holding = true;
      this._lastPushedTile = { x, y, pointer };
      this._holdStartTime = this.scene.time.now / 1000;
    } else {
      this._holding = false;
      this._lastPushedTile = null;
      this._holdStartTime = null;
      this._handleTileTap(x, y, pointer);
    }
  }

  onPointerUp(pointer) {
    if (this._holding && this._lastPushedTile) {
      const now = this.scene.time.now / 1000;
      if (now - this._holdStartTime < TIME_TO_HOVER_MENU) {
        // Короткое нажатие — обычный клик
        this._handleTileTap(this._lastPushedTile.x, this._lastPushedTile.y, this._lastPushedTile.pointer);
      }
    }
    this._holding = false;
    this._lastPushedTile = null;
    this._holdStartTime = null;
  }

  _handleTileTap(x, y, pointer) {
    // --- Вся логика из onPointerDown для мыши ---
    // Обработка правой кнопки мыши для меню меток
    if (pointer && pointer.rightButtonDown && pointer.rightButtonDown()) {
      if (this.showMarkMenu) {
        this.showMarkMenu(x, y, pointer.worldX, pointer.worldY);
      }
      return;
    }
    const tileEntity = this.queries.tiles.results.find(tile => {
      const pos = tile.getComponent(Position);
      return pos.x === x && pos.y === y;
    });
    const liveMonster = this.queries.actors.results.find(actor => {
      const pos = actor.getComponent(Position);
      return pos.x === x && pos.y === y &&
        actor.hasComponent(Monster) &&
        !actor.hasComponent(Butterfly) &&
        actor.hasComponent(Revealed) &&
        !actor.hasComponent(Defeated);
    });
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
      this.saveAfterAction();
      return;
    }
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
      this.saveAfterAction();
      return;
    }
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
        this.saveAfterAction();
        return;
      }
    } else if (dataManager.player && dataManager.player.hp <= 0) {
      const wall = this.queries.actors.results.find(actor => {
        const pos = actor.getComponent(Position);
        return pos.x === x && pos.y === y &&
          actor.hasComponent(Wall) &&
          actor.hasComponent(Revealed) &&
          !actor.hasComponent(Defeated);
      });
      if (wall) {
        sceneEvents.emit(AudioEvents.PLAYER_DENIED);
        return;
      }
    }
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
      this.saveAfterAction();
      return;
    }
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
      this.saveAfterAction();
      return;
    }
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
      this.saveAfterAction();
      return;
    }
    const item = this.queries.actors.results.find(actor => {
      const pos = actor.getComponent(Position);
      return pos.x === x && pos.y === y &&
        actor.hasComponent(Item) &&
        actor.hasComponent(Revealed) &&
        !actor.hasComponent(UseItem);
    });
    if (item) {
      item.addComponent(UseItem);
      this.saveAfterAction();
      return;
    }
    const butterfly = this.queries.actors.results.find(actor => {
      const pos = actor.getComponent(Position);
      return pos.x === x && pos.y === y && actor.hasComponent(Butterfly) && !actor.hasComponent(Defeated);
    });
    if (butterfly && !butterfly.hasComponent(TryJump)) {
      butterfly.addComponent(TryJump);
      this.saveAfterAction();
    }
    if (tileEntity && !tileEntity.hasComponent(TryReveal)) {
      tileEntity.addComponent(TryReveal);
      if (!liveMonster) {
        sceneEvents.emit(AudioEvents.PLAYER_CLICK);
      }
    }
    
    // Сохраняем состояние после любого действия игрока
    this.saveAfterAction();
  }

  saveAfterAction() {
    // Сохраняем игру после любого действия игрока
    if (dataManager.status === StatusEvents.PLAYING) {

      // Используем setTimeout чтобы дать время системам обработать действие
      setTimeout(() => {
        gameSaveManager.saveGameState();
      }, 100);
    }
  }

  stop() {
    this.scene.input.off('pointerdown', this.onPointerDown, this);
    this.scene.input.off('pointerup', this.onPointerUp, this);
    this.scene.input.off('pointerout', this.onPointerUp, this);
    this.scene.input.off('pointercancel', this.onPointerUp, this);
  }

  execute() {
    if (this._holding && this._lastPushedTile && this._holdStartTime != null) {
      const now = this.scene.time.now / 1000;
      if (now - this._holdStartTime > TIME_TO_HOVER_MENU) {
        this.showMarkMenu(this._lastPushedTile.x, this._lastPushedTile.y, this._lastPushedTile.pointer.worldX, this._lastPushedTile.pointer.worldY);
        this._holding = false;
        this._lastPushedTile = null;
        this._holdStartTime = null;
      }
    }
  }

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
    const offsetX = this.offsetX;
    const offsetY = this.offsetY;

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
    const rows = Math.ceil(marks.length / btnsPerRow);
    const cols = btnsPerRow;
    const menuWidth = cols * btnSize;
    const menuHeight = rows * btnSize;

    // Позиция меню (справа от тайла, но не выходить за границы)
    let menuX = offsetX + (tileX + 1) * tileSize;
    let menuY = offsetY + tileY * tileSize;
    // Если меню выходит за низ — сдвигаем вверх
    if (menuY + menuHeight > offsetY + gridHeight * tileSize) {
      menuY = offsetY + gridHeight * tileSize - menuHeight;
    }
    // Если меню выходит за правую границу — рисуем слева
    if (menuX + menuWidth > offsetX + gridWidth * tileSize) {
      menuX = offsetX + tileX * tileSize - menuWidth;
    }
    // Если всё равно не помещается — прижимаем к левому краю
    if (menuX < offsetX) menuX = offsetX + 4;

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
        btn = this.scene.add.image(x, y, 'icons', 32)
          .setOrigin(0, 0)
          .setDisplaySize(btnSize, btnSize)
          .setInteractive({ useHandCursor: true });
        btn.setDepth(1000);
        btn._bg = bg;
      } else {
        let tint = 0xffff00; // по умолчанию жёлтый
        if (mark === '?') tint = 0x88ccd0; // синий
        else if (mark === '!') tint = 0x00ff00; // зелёный
        else if (mark === '*') tint = 0xff2d2d; // красный
        btn = this.scene.add.bitmapText(x + btnSize/2, y + btnSize/2, 'ingame', mark, 10)
          .setOrigin(0.5)
          .setTint(tint)
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
        this.saveAfterAction();
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
      offsetX + tileX * tileSize,
      offsetY + tileY * tileSize,
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
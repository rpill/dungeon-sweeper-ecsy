import { System } from 'ecsy';
import {
  Position,
  Sprite,
  Tile,
  Revealed,
  Defeated,
  Chest,
  Monster,
  Item,
  Attack,
  DefeatedSprite,
  XP,
  Wall,
  Mimic,
  Health,
  SpriteObjects,
  Opened,
  OpenedSprite,
  TryCollectLoot,
  TryCollect,
  RevealedAsMonster,
  MineWasTriggered,
  Butterfly,
  Gazer,
  Dragon,
  Mine,
  Key
} from '../components';
import { findEntityAt } from '../helpers';
import { dataManager } from '../../DataManager';

export class RenderSystem extends System {
  init(attributes) {
    this.scene = attributes.scene;
    this.tileSize = attributes.tileSize;
    this.animationCounter = 0; // Счетчик для уникальных ключей анимаций
    this.fontSize = 10;
  }

  static queries = {
    tiles: { components: [Tile, Position] },
    actors: { components: [Position, Sprite] },
  };

  execute(delta, time) {
    this.queries.tiles.results.forEach(entity => this.renderTile(entity));
		
    this.queries.actors.results.forEach(entity => {
      if (entity.hasComponent(Monster) && !entity.hasComponent(Mimic)) {
        this.renderMonster(entity);
      }
      if (entity.hasComponent(Mimic)) {
        this.renderMimic(entity);
      }
			if (entity.hasComponent(Item)) {
        this.renderItem(entity);
      }
      if (entity.hasComponent(Wall)) {
        this.renderWall(entity);
      }
      if (entity.hasComponent(Chest)) {
        this.renderChest(entity);
      }
    });
  }

  renderTile(entity) {
    const tile = entity.getComponent(Tile);
    const position = entity.getComponent(Position);
    const tileX = position.x * this.tileSize;
    const tileY = position.y * this.tileSize;
    let frame = tile.baseType;
    
    // Получаем или создаем SpriteObjects компонент
    if (!entity.hasComponent(SpriteObjects)) {
      entity.addComponent(SpriteObjects);
    }
    const spriteObjects = entity.getComponent(SpriteObjects);
    
    if (entity.hasComponent(Revealed) || dataManager.debug) {
      // Проверяем наличие убитых монстров, сундуков и стен
      const monsterDefeatedEntity = findEntityAt(this.queries.actors.results, position.x, position.y, Monster, Defeated);
      const chestOpenedEntity = findEntityAt(this.queries.actors.results, position.x, position.y, Chest, Opened);
      const wallDefeatedEntity = findEntityAt(this.queries.actors.results, position.x, position.y, Wall, Defeated);
      
      // Проверяем наличие любых активных сущностей (монстры, предметы, стены, сундуки)
      const anyActiveEntity = this.queries.actors.results.find(actor => {
        const actorPos = actor.getComponent(Position);
        return actorPos.x === position.x && actorPos.y === position.y &&
               !actor.hasComponent(TryCollectLoot) && !actor.hasComponent(TryCollect) &&
               !actor.hasComponent(Defeated) &&
               (actor.hasComponent(Monster) || actor.hasComponent(Item) || actor.hasComponent(Chest) || actor.hasComponent(Wall));
      });
      
      if (monsterDefeatedEntity || chestOpenedEntity || wallDefeatedEntity) {
        frame = tile.baseType + 5;
      } else if (!anyActiveEntity) {
        frame = tile.baseType + 10;
        let totalDmg = 0;
        let gazerNearby = false;
        // Проверяем радиус 2 клетки на наличие GAZER
        for (let dx = -2; dx <= 2; dx++) {
          for (let dy = -2; dy <= 2; dy++) {
            if (dx === 0 && dy === 0) continue;
            const mx = position.x + dx;
            const my = position.y + dy;
            const monster = findEntityAt(this.queries.actors.results, mx, my, Monster, Attack);
            if (monster && !monster.hasComponent(Defeated) && !monster.hasComponent(TryCollectLoot)) {
              if (monster.hasComponent(Gazer)) {
                gazerNearby = true;
              }
            }
          }
        }
        if (gazerNearby) {
          // Показываем знак вопроса цветом 0x88ccd0
          if (!spriteObjects.dmgText) {
            const dmgText = this.scene.add.bitmapText(
              tileX + this.tileSize / 2,
              tileY + this.tileSize / 2,
              'ingame',
              '?',
              this.fontSize
            ).setOrigin(0.5).setTint(0x88ccd0).setDepth(3);
            spriteObjects.dmgText = dmgText;
          } else {
            spriteObjects.dmgText.setText('?');
            spriteObjects.dmgText.setPosition(tileX + this.tileSize / 2, tileY + this.tileSize / 2);
            spriteObjects.dmgText.setTint(0x88ccd0);
          }
        } else {
          // Считаем обычный суммарный урон
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              if (dx === 0 && dy === 0) continue;
              const mx = position.x + dx;
              const my = position.y + dy;
              const monster = findEntityAt(this.queries.actors.results, mx, my, Monster, Attack);
              if (monster && !monster.hasComponent(Defeated) && !monster.hasComponent(TryCollectLoot)) {
                totalDmg += monster.getComponent(Attack).value;
              }
            }
          }
          if (totalDmg > 0) {
            if (!spriteObjects.dmgText) {
              const dmgText = this.scene.add.bitmapText(
                tileX + this.tileSize / 2,
                tileY + this.tileSize / 2,
                'ingame',
                String(totalDmg),
                this.fontSize
              ).setOrigin(0.5).setTint(0xffffff).setDepth(3);
              spriteObjects.dmgText = dmgText;
            } else {
              spriteObjects.dmgText.setText(String(totalDmg));
              spriteObjects.dmgText.setPosition(tileX + this.tileSize / 2, tileY + this.tileSize / 2);
              spriteObjects.dmgText.setTint(0xffffff);
            }
          } else {
            if (spriteObjects.dmgText) {
              spriteObjects.dmgText.destroy();
              spriteObjects.dmgText = null;
            }
          }
        }
      }
      // Если на клетке есть активная сущность (например, бабочка), удаляем dmgText
      if (anyActiveEntity && spriteObjects.dmgText) {
        spriteObjects.dmgText.destroy();
        spriteObjects.dmgText = null;
      }
    }
    if (!spriteObjects.spriteObj) {
      const tileSprite = this.scene.add.image(
        tileX,
        tileY,
        'tiles',
        frame
      ).setOrigin(0).setDepth(0);
      tileSprite.setInteractive();
      spriteObjects.spriteObj = tileSprite;
    } else {
      spriteObjects.spriteObj.setFrame(frame);
    }

    // --- ОТРИСОВКА МЕТКИ ---
    // Удаляем старую метку, если есть
    if (spriteObjects.markObj) {
      spriteObjects.markObj.destroy();
      spriteObjects.markObj = null;
    }
    if (tile.mark) {
      // Теперь текстовая метка по центру тайла
      let tint = 0xffff00; // по умолчанию жёлтый
      if (tile.mark === '?') tint = 0x88ccd0; // синий
      else if (tile.mark === '!') tint = 0x00ff00; // зелёный
      else if (tile.mark === '*') tint = 0xff2d2d; // красный
      const markObj = this.scene.add.bitmapText(
        tileX + this.tileSize / 2,
        tileY + this.tileSize / 2,
        'ingame',
        tile.mark,
        10
      ).setOrigin(0.5).setTint(tint).setDepth(900);
      spriteObjects.markObj = markObj;
    }
  }

  renderMonster(entity) {
    if (!entity.hasComponent(Revealed) && !dataManager.debug) return;
    
    // Получаем или создаем SpriteObjects компонент
    if (!entity.hasComponent(SpriteObjects)) {
      entity.addComponent(SpriteObjects);
    }
    const spriteObjects = entity.getComponent(SpriteObjects);
    
    const sprite = entity.getComponent(Sprite);
    const position = entity.getComponent(Position);
    const tileX = position.x * this.tileSize;
    const tileY = position.y * this.tileSize;
    let offsetY = entity.hasComponent(Butterfly) ? 0 : -8;
    let frame = sprite.frame;
    // Для мины показываем defeated-спрайт только если есть MineWasTriggered
    if (
      (entity.hasComponent(Defeated) && entity.hasComponent(DefeatedSprite)) ||
      (entity.hasComponent(Mine) && entity.hasComponent(MineWasTriggered) && entity.hasComponent(DefeatedSprite))
    ) {
      const defeatedSprite = entity.getComponent(DefeatedSprite);
      frame = defeatedSprite.frame;
    }
    if (!spriteObjects.spriteObj) {
      const spriteObj = this.scene.add.image(
        tileX,
        tileY + offsetY,
        sprite.spriteSheet,
        frame
      ).setOrigin(0).setDepth(2);
      spriteObjects.spriteObj = spriteObj;
    } else {
      spriteObjects.spriteObj.setFrame(frame);
      spriteObjects.spriteObj.setPosition(tileX, tileY + offsetY);
    }
    // Урон
    if (!entity.hasComponent(Defeated) && entity.hasComponent(Attack)) {
      if (!spriteObjects.dmgText) {
        const attack = entity.getComponent(Attack);
        const dmgText = this.scene.add.bitmapText(
          tileX + this.tileSize / 2,
          tileY + this.tileSize - 4,
          'ingame',
          String(attack.value),
          this.fontSize
        ).setOrigin(0.5, 1).setTint(0xfab402).setDepth(3);
        spriteObjects.dmgText = dmgText;
      } else {
        spriteObjects.dmgText.setText(String(entity.getComponent(Attack).value));
        spriteObjects.dmgText.setPosition(tileX + this.tileSize / 2, tileY + this.tileSize - 4);
      }
    } else if (spriteObjects.dmgText) {
      spriteObjects.dmgText.destroy();
      spriteObjects.dmgText = null;
    }
    // Монетка и XP
    if (entity.hasComponent(Defeated)) {
      if (!spriteObjects.coinIcon) {
        const coin = this.scene.add.image(
          tileX + this.tileSize / 2 - 9,
          tileY + this.tileSize + 10,
          'icons',
          this.fontSize
        ).setOrigin(0.5, 1).setDepth(3);
        spriteObjects.coinIcon = coin;
      } else {
        spriteObjects.coinIcon.setPosition(tileX + this.tileSize / 2 - 9, tileY + this.tileSize + 10);
      }
      const xp = entity.getComponent(XP);
      const xpValue = xp ? xp.value : 0;
      if (!spriteObjects.xpText) {
        const xpText = this.scene.add.bitmapText(
          tileX + this.tileSize / 2 + 9,
          tileY + this.tileSize - 5,
          'ingame',
          String(xpValue),
          this.fontSize
        ).setOrigin(0.5, 1).setTint(0xfab402).setDepth(3);
        spriteObjects.xpText = xpText;
      } else {
        spriteObjects.xpText.setText(String(xpValue));
        spriteObjects.xpText.setPosition(tileX + this.tileSize / 2 + 9, tileY + this.tileSize - 5);
      }
    } else {
      if (spriteObjects.coinIcon) { spriteObjects.coinIcon.destroy(); spriteObjects.coinIcon = null; }
      if (spriteObjects.xpText) { spriteObjects.xpText.destroy(); spriteObjects.xpText = null; }
    }
  }

  renderMimic(entity) {
    if (!entity.hasComponent(Revealed) && !dataManager.debug) return;
    
    // Получаем или создаем SpriteObjects компонент
    if (!entity.hasComponent(SpriteObjects)) {
      entity.addComponent(SpriteObjects);
    }
    const spriteObjects = entity.getComponent(SpriteObjects);
    
    const sprite = entity.getComponent(Sprite);
    const position = entity.getComponent(Position);
    const tileX = position.x * this.tileSize;
    const tileY = position.y * this.tileSize;
    let offsetY = entity.hasComponent(RevealedAsMonster) ? -8 : 0;
    let frame = sprite.frame;
    if (!entity.hasComponent(RevealedAsMonster)) {
      const mimic = entity.getComponent(Mimic);
      frame = mimic.frame;
    }
    if (entity.hasComponent(Defeated) && entity.hasComponent(DefeatedSprite)) {
      const defeatedSprite = entity.getComponent(DefeatedSprite);
      frame = defeatedSprite.frame;
    }
    if (!spriteObjects.spriteObj) {
      const spriteObj = this.scene.add.image(
        tileX,
        tileY + offsetY,
        sprite.spriteSheet,
        frame
      ).setOrigin(0).setDepth(2);
      spriteObjects.spriteObj = spriteObj;
    } else {
      spriteObjects.spriteObj.setFrame(frame);
      spriteObjects.spriteObj.setPosition(tileX, tileY + offsetY);
    }
    // Урон
    if (!entity.hasComponent(Defeated) && entity.hasComponent(RevealedAsMonster)) {
      if (!spriteObjects.dmgText) {
        const attack = entity.getComponent(Attack);
        const dmgText = this.scene.add.bitmapText(
          tileX + this.tileSize / 2,
          tileY + this.tileSize - 4,
          'ingame',
          String(attack.value),
          this.fontSize
        ).setOrigin(0.5, 1).setTint(0xfab402).setDepth(3);
        spriteObjects.dmgText = dmgText;
      } else {
        spriteObjects.dmgText.setText(String(entity.getComponent(Attack).value));
        spriteObjects.dmgText.setPosition(tileX + this.tileSize / 2, tileY + this.tileSize - 4);
      }
    } else if (spriteObjects.dmgText) {
      spriteObjects.dmgText.destroy();
      spriteObjects.dmgText = null;
    }
    // Монетка и XP
    if (entity.hasComponent(Defeated)) {
      if (!spriteObjects.coinIcon) {
        const coin = this.scene.add.image(
          tileX + this.tileSize / 2 - 9,
          tileY + this.tileSize + 10,
          'icons',
          this.fontSize
        ).setOrigin(0.5, 1).setDepth(3);
        spriteObjects.coinIcon = coin;
      } else {
        spriteObjects.coinIcon.setPosition(tileX + this.tileSize / 2 - 9, tileY + this.tileSize + 10);
      }
      const xp = entity.getComponent(XP);
      const xpValue = xp ? xp.value : 0;
      if (!spriteObjects.xpText) {
        const xpText = this.scene.add.bitmapText(
          tileX + this.tileSize / 2 + 9,
          tileY + this.tileSize - 5,
          'ingame',
          String(xpValue),
          this.fontSize
        ).setOrigin(0.5, 1).setTint(0xfab402).setDepth(3);
        spriteObjects.xpText = xpText;
      } else {
        spriteObjects.xpText.setText(String(xpValue));
        spriteObjects.xpText.setPosition(tileX + this.tileSize / 2 + 9, tileY + this.tileSize - 5);
      }
    } else {
      if (spriteObjects.coinIcon) { spriteObjects.coinIcon.destroy(); spriteObjects.coinIcon = null; }
      if (spriteObjects.xpText) { spriteObjects.xpText.destroy(); spriteObjects.xpText = null; }
    }
  }

  renderItem(entity) {
    if (!entity.hasComponent(Revealed) && !entity.hasComponent(Opened) && !dataManager.debug) return;
    
    // Получаем или создаем SpriteObjects компонент
    if (!entity.hasComponent(SpriteObjects)) {
      entity.addComponent(SpriteObjects);
    }
    const spriteObjects = entity.getComponent(SpriteObjects);
    
    const sprite = entity.getComponent(Sprite);
    const position = entity.getComponent(Position);
    const tileX = position.x * this.tileSize;
    const tileY = position.y * this.tileSize;
    
    // Специальная обработка для ключа - создаем анимацию
    if (entity.hasComponent(Key)) {
      if (!spriteObjects.spriteObj) {
        const spriteObj = this.scene.add.sprite(
          tileX + this.tileSize / 2,
          tileY + this.tileSize / 2,
          'icons'
        ).setOrigin(0.5).setDepth(2);
        
        // Создаем анимацию для ключа (фреймы 3-7)
        const animKey = `key_animation_${this.animationCounter++}`;
        if (!this.scene.anims.exists(animKey)) {
          this.scene.anims.create({
            key: animKey,
            frames: this.scene.anims.generateFrameNumbers('icons', { start: 3, end: 7 }),
            frameRate: 6,
            repeat: -1
          });
        }
        
        spriteObj.play(animKey);
        spriteObjects.spriteObj = spriteObj;
      }
    } else {
      // Обычная обработка для других предметов
      if (!spriteObjects.spriteObj) {
        const spriteObj = this.scene.add.image(
          tileX,
          tileY,
          sprite.spriteSheet,
          sprite.frame
        ).setOrigin(0).setDepth(2);
        spriteObjects.spriteObj = spriteObj;
      } else {
        spriteObjects.spriteObj.setFrame(sprite.frame);
        spriteObjects.spriteObj.setPosition(tileX, tileY);
      }
    }
  }

  renderWall(entity) {
    if (!entity.hasComponent(Revealed) && !dataManager.debug) return;
    
    // Получаем или создаем SpriteObjects компонент
    if (!entity.hasComponent(SpriteObjects)) {
      entity.addComponent(SpriteObjects);
    }
    const spriteObjects = entity.getComponent(SpriteObjects);
    
    const sprite = entity.getComponent(Sprite);
    const position = entity.getComponent(Position);
    const x = position.x;
    const y = position.y;
    const tileX = x * this.tileSize;
    const tileY = y * this.tileSize;
    let frame = sprite.frame;
    
    // Если стена разрушена, используем DefeatedSprite
    if (entity.hasComponent(Defeated) && entity.hasComponent(DefeatedSprite)) {
      const defeatedSprite = entity.getComponent(DefeatedSprite);
      frame = defeatedSprite.frame;
    }
    
    if (!spriteObjects.spriteObj) {
      const spriteObj = this.scene.add.image(
        tileX,
        tileY,
        sprite.spriteSheet,
        frame
      ).setOrigin(0).setDepth(2);
      spriteObjects.spriteObj = spriteObj;
    } else {
      spriteObjects.spriteObj.setFrame(frame);
      spriteObjects.spriteObj.setPosition(tileX, tileY);
    }
    
    // HP стены (только если не разрушена)
    if (entity.hasComponent(Health) && !entity.hasComponent(Defeated)) {
      const health = entity.getComponent(Health);
      const hpText = `${health.current}/${health.max}`;
      if (!spriteObjects.hpText) {
        const text = this.scene.add.bitmapText(
          tileX + this.tileSize / 2,
          tileY + this.tileSize - 4,
          'ingame',
          hpText,
          this.fontSize
        ).setOrigin(0.5, 1).setTint(0xfab402).setDepth(3);
        spriteObjects.hpText = text;
      } else {
        spriteObjects.hpText.setText(hpText);
        spriteObjects.hpText.setPosition(tileX + this.tileSize / 2, tileY + this.tileSize - 4);
      }
    } else if (spriteObjects.hpText) {
      spriteObjects.hpText.destroy();
      spriteObjects.hpText = null;
    }
    
    // Отображаем опыт у разрушенных стен
    if (entity.hasComponent(Defeated) && entity.hasComponent(XP)) {
      const xp = entity.getComponent(XP);
      const xpValue = xp ? xp.value : 0;
      if (!spriteObjects.xpText) {
        const xpText = this.scene.add.bitmapText(
          tileX + this.tileSize / 2 + 9,
          tileY + this.tileSize - 5,
          'ingame',
          String(xpValue),
          this.fontSize
        ).setOrigin(0.5, 1).setTint(0xfab402).setDepth(3);
        spriteObjects.xpText = xpText;
      } else {
        spriteObjects.xpText.setText(String(xpValue));
        spriteObjects.xpText.setPosition(tileX + this.tileSize / 2 + 9, tileY + this.tileSize - 5);
      }
      
      // Отображаем иконку монетки
      if (!spriteObjects.coinIcon) {
        const coin = this.scene.add.image(
          tileX + this.tileSize / 2 - 7,
          tileY + this.tileSize + 10,
          'icons',
          this.fontSize
        ).setOrigin(0.5, 1).setDepth(3);
        spriteObjects.coinIcon = coin;
      } else {
        spriteObjects.coinIcon.setPosition(tileX + this.tileSize / 2 - 7, tileY + this.tileSize + 10);
      }
    } else {
      // Убираем отображение опыта, если стена не разрушена или не содержит XP
      if (spriteObjects.coinIcon) { spriteObjects.coinIcon.destroy(); spriteObjects.coinIcon = null; }
      if (spriteObjects.xpText) { spriteObjects.xpText.destroy(); spriteObjects.xpText = null; }
    }
  }

  renderChest(entity) {
    if (!entity.hasComponent(Revealed) && !dataManager.debug) return;
    
    // Получаем или создаем SpriteObjects компонент
    if (!entity.hasComponent(SpriteObjects)) {
      entity.addComponent(SpriteObjects);
    }
    const spriteObjects = entity.getComponent(SpriteObjects);
    
    const sprite = entity.getComponent(Sprite);
    const position = entity.getComponent(Position);
    const x = position.x;
    const y = position.y;
    const tileX = x * this.tileSize;
    const tileY = y * this.tileSize;
    // Центрируем сундук
    const centerX = tileX + this.tileSize / 2;
    const centerY = tileY + this.tileSize / 2;
    let frame = sprite.frame;
    if (entity.hasComponent(OpenedSprite) && entity.hasComponent(Opened)) {
      const openedSprite = entity.getComponent(OpenedSprite);
      frame = openedSprite.frame;
    }
    if (!spriteObjects.spriteObj) {
      const spriteObj = this.scene.add.image(
        centerX,
        centerY,
        sprite.spriteSheet,
        frame
      ).setOrigin(0.5).setDepth(2);
      spriteObjects.spriteObj = spriteObj;
    } else {
      spriteObjects.spriteObj.setFrame(frame);
      spriteObjects.spriteObj.setPosition(centerX, centerY);
    }
    
    // Отображаем опыт у открытых сундуков с XP
    if (entity.hasComponent(Opened) && entity.hasComponent(XP)) {
      const xp = entity.getComponent(XP);
      const xpValue = xp ? xp.value : 0;
      if (!spriteObjects.xpText) {
        const xpText = this.scene.add.bitmapText(
          tileX + this.tileSize / 2 + 9,
          tileY + this.tileSize - 5,
          'ingame',
          String(xpValue),
          this.fontSize
        ).setOrigin(0.5, 1).setTint(0xfab402).setDepth(3);
        spriteObjects.xpText = xpText;
      } else {
        spriteObjects.xpText.setText(String(xpValue));
        spriteObjects.xpText.setPosition(tileX + this.tileSize / 2 + 9, tileY + this.tileSize - 5);
      }
      
      // Отображаем иконку монетки
      if (!spriteObjects.coinIcon) {
        const coin = this.scene.add.image(
          tileX + this.tileSize / 2 - 7,
          tileY + this.tileSize + 10,
          'icons',
          this.fontSize
        ).setOrigin(0.5, 1).setDepth(3);
        spriteObjects.coinIcon = coin;
      } else {
        spriteObjects.coinIcon.setPosition(tileX + this.tileSize / 2 - 7, tileY + this.tileSize + 10);
      }
    } else {
      // Убираем отображение опыта, если сундук не открыт или не содержит XP
      if (spriteObjects.coinIcon) { spriteObjects.coinIcon.destroy(); spriteObjects.coinIcon = null; }
      if (spriteObjects.xpText) { spriteObjects.xpText.destroy(); spriteObjects.xpText = null; }
    }
  }

  updateSprite(entity) {
    // Обновление спрайта (можно использовать для анимаций или изменений)
    if (entity.hasComponent(SpriteObjects)) {
      const spriteObjects = entity.getComponent(SpriteObjects);
      // Здесь можно добавить логику обновления спрайтов
    }
  }

  removeSprite(entity) {
    // Удаление всех визуальных объектов сущности
    if (entity.hasComponent(SpriteObjects)) {
      const spriteObjects = entity.getComponent(SpriteObjects);
      spriteObjects.destroyAll();
    }
  }
}
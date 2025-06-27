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
  Health,
  SpriteObjects,
  Opened,
  OpenedSprite,
  TryCollectLoot,
  TryCollect,
  Type
} from '../components';
import { findEntityAt } from '../helpers';

export class RenderSystem extends System {
  init(attributes) {
    this.scene = attributes.scene;
    this.container = attributes.container;
    this.tileSize = attributes.tileSize;
  }

  static queries = {
    tiles: { components: [Tile, Position] },
    actors: { components: [Position, Sprite] },
  };

  execute(delta, time) {
    this.queries.tiles.results.forEach(entity => this.renderTile(entity));
		
    this.queries.actors.results.forEach(entity => {
      if (entity.hasComponent(Monster)) {
        this.renderMonster(entity);
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
    
    if (entity.hasComponent(Revealed)) {
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
      
      // Проверяем, что найденные сущности действительно существуют и не помечены для удаления
      const hasActiveEntity = anyActiveEntity !== undefined;
      
      if (monsterDefeatedEntity || chestOpenedEntity || wallDefeatedEntity) {
        frame = tile.baseType + 5;
      } else if (!hasActiveEntity) {
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
              const type = monster.getComponent(Type);
              if (type && type.value === 'GAZER') {
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
              10
            ).setOrigin(0.5).setTint(0x88ccd0);
            this.container.add(dmgText);
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
                10
              ).setOrigin(0.5).setTint(0xffffff);
              this.container.add(dmgText);
              spriteObjects.dmgText = dmgText;
            } else {
              spriteObjects.dmgText.setText(String(totalDmg));
              spriteObjects.dmgText.setPosition(tileX + this.tileSize / 2, tileY + this.tileSize / 2);
              spriteObjects.dmgText.setTint(0xffffff);
            }
          } else if (spriteObjects.dmgText) {
            spriteObjects.dmgText.destroy();
            spriteObjects.dmgText = null;
          }
        }
      }
    }
    if (!spriteObjects.spriteObj) {
      const tileSprite = this.scene.add.image(
        tileX,
        tileY,
        'tiles',
        frame
      ).setOrigin(0);
      tileSprite.setInteractive();
      this.container.add(tileSprite);
      spriteObjects.spriteObj = tileSprite;
    } else {
      spriteObjects.spriteObj.setFrame(frame);
    }
  }

  renderMonster(entity) {
    if (!entity.hasComponent(Revealed)) return;
    
    // Получаем или создаем SpriteObjects компонент
    if (!entity.hasComponent(SpriteObjects)) {
      entity.addComponent(SpriteObjects);
    }
    const spriteObjects = entity.getComponent(SpriteObjects);
    
    const sprite = entity.getComponent(Sprite);
    const position = entity.getComponent(Position);
    const tileX = position.x * this.tileSize;
    const tileY = position.y * this.tileSize;
    let offsetY = -8;
    let frame = sprite.frame;
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
      ).setOrigin(0);
      this.container.add(spriteObj);
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
          10
        ).setOrigin(0.5, 1).setTint(0xfab402);
        this.container.add(dmgText);
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
          tileX + this.tileSize / 2 - 7,
          tileY + this.tileSize + 10,
          'icons',
          10
        ).setOrigin(0.5, 1);
        this.container.add(coin);
        spriteObjects.coinIcon = coin;
      } else {
        spriteObjects.coinIcon.setPosition(tileX + this.tileSize / 2 - 7, tileY + this.tileSize + 10);
      }
      const xp = entity.getComponent(XP);
      const xpValue = xp ? xp.value : 0;
      if (!spriteObjects.xpText) {
        const xpText = this.scene.add.bitmapText(
          tileX + this.tileSize / 2 + 9,
          tileY + this.tileSize - 5,
          'ingame',
          String(xpValue),
          10
        ).setOrigin(0.5, 1).setTint(0xfab402);
        this.container.add(xpText);
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
    if (!entity.hasComponent(Revealed) && !entity.hasComponent(Opened)) return;
    
    // Получаем или создаем SpriteObjects компонент
    if (!entity.hasComponent(SpriteObjects)) {
      entity.addComponent(SpriteObjects);
    }
    const spriteObjects = entity.getComponent(SpriteObjects);
    
    const sprite = entity.getComponent(Sprite);
    const position = entity.getComponent(Position);
    const tileX = position.x * this.tileSize;
    const tileY = position.y * this.tileSize;
    if (!spriteObjects.spriteObj) {
      const spriteObj = this.scene.add.image(
        tileX,
        tileY,
        sprite.spriteSheet,
        sprite.frame
      ).setOrigin(0);
      this.container.add(spriteObj);
      spriteObjects.spriteObj = spriteObj;
    } else {
      spriteObjects.spriteObj.setFrame(sprite.frame);
      spriteObjects.spriteObj.setPosition(tileX, tileY);
    }
  }

  renderWall(entity) {
    if (!entity.hasComponent(Revealed)) return;
    
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
      ).setOrigin(0);
      this.container.add(spriteObj);
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
          10
        ).setOrigin(0.5, 1).setTint(0xfab402);
        this.container.add(text);
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
          10
        ).setOrigin(0.5, 1).setTint(0xfab402);
        this.container.add(xpText);
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
          10
        ).setOrigin(0.5, 1);
        this.container.add(coin);
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
    if (!entity.hasComponent(Revealed)) return;
    
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
      ).setOrigin(0.5);
      this.container.add(spriteObj);
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
          10
        ).setOrigin(0.5, 1).setTint(0xfab402);
        this.container.add(xpText);
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
          10
        ).setOrigin(0.5, 1);
        this.container.add(coin);
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
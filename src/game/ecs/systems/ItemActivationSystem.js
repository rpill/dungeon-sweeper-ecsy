import { System } from 'ecsy';
import { UseItem, Orb, Position, Tile, Spell, Monster, Defeated, Revealed, Attack, Heal, SpriteObjects, Type, Key, Mine } from '../components';
import { findEntityAt } from '../helpers';
import { dataManager } from '../../DataManager';
import { StatusEvents, EffectEvents, AudioEvents } from '../../events/EventNames';
import { sceneEvents } from '../../events/EventsCenter';

export class ItemActivationSystem extends System {
  init(attributes) {
    this.scene = attributes.scene;
  }

  static queries = {
    usedItems: { components: [UseItem, Position] },
    tiles: { components: [Tile, Position] },
    actors: { components: [Position] },
    monsters: { components: [Monster, Type] }
  };

  execute() {
    this.queries.usedItems.results.forEach(item => {
      // HEAL: лечение игрока
      if (item.hasComponent(Heal)) {
        dataManager.player.heal();
        // Воспроизводим звук использования предмета
        sceneEvents.emit(AudioEvents.USE_ITEM);
      }
      // ORB: массовый ревил
      if (item.hasComponent(Orb)) {
        const orbPos = item.getComponent(Position);
        const radius = item.getComponent(Orb).radius;
        const revealedPositions = [];
        
        this.queries.tiles.results.forEach(tile => {
          const pos = tile.getComponent(Position);
          const dx = pos.x - orbPos.x;
          const dy = pos.y - orbPos.y;
          if (dx * dx + dy * dy <= radius * radius) {
            if (!tile.hasComponent(Revealed)) {
              tile.addComponent(Revealed);
              revealedPositions.push({ x: pos.x, y: pos.y });
            }
            const x = pos.x;
            const y = pos.y;

            this.queries.actors.results.forEach(actor => {
              const actorPos = actor.getComponent(Position);
              if (actorPos.x === x && actorPos.y === y && !actor.hasComponent(Revealed)) {
                actor.addComponent(Revealed);
              }
            });
          }
        });

        // Создаем эффекты на всех открытых клетках
        if (revealedPositions.length > 0) {
          sceneEvents.emit(EffectEvents.MULTIPLE_ORB, {
            positions: revealedPositions
          });
        }
        // Воспроизводим звук использования предмета
        sceneEvents.emit(AudioEvents.USE_ITEM);
      }
      // SPELL: reveal_enemies или disarm_enemies
      if (item.hasComponent(Spell)) {
        const spell = item.getComponent(Spell);
        const itemPos = item.getComponent(Position);
        const revealedPositions = [];
        
        if (spell.type === 'reveal_enemies' && Array.isArray(spell.targets)) {
          this.queries.monsters.results.forEach(monster => {
            const monsterType = monster.getComponent(Type);
            if (spell.targets.includes(monsterType.value) && !monster.hasComponent(Revealed)) {
              monster.addComponent(Revealed);
              
              // Открываем тайл под монстром
              const monsterPos = monster.getComponent(Position);
              const tile = findEntityAt(this.queries.tiles.results, monsterPos.x, monsterPos.y, Tile);
              if (tile && !tile.hasComponent(Revealed)) {
                tile.addComponent(Revealed);
                revealedPositions.push({ x: monsterPos.x, y: monsterPos.y });
              }
            }
          });
        }
        if (spell.type === 'disarm_enemies' && Array.isArray(spell.targets)) {
          // Убиваем всех монстров указанного типа (добавляем Defeated)
          const explodedPositions = [];
          
          this.queries.monsters.results.forEach(monster => {
            const monsterType = monster.getComponent(Type);
            if (spell.targets.includes(monsterType.value) && !monster.hasComponent(Defeated)) {
              monster.removeComponent(Attack);
              monster.addComponent(Defeated);
              
              // Если монстр был уже открыт, создаем эффект взрыва
              if (monster.hasComponent(Revealed)) {
                const monsterPos = monster.getComponent(Position);
                explodedPositions.push({ x: monsterPos.x, y: monsterPos.y });
              }
            }
          });
          
          // Создаем эффекты взрыва на позициях уже открытых врагов
          if (explodedPositions.length > 0) {
            sceneEvents.emit(EffectEvents.MULTIPLE_EXPLOSION, {
              positions: explodedPositions
            });
            // Воспроизводим звук взрыва
            sceneEvents.emit(AudioEvents.EXPLOSION);
            // Добавляем тряску камеры при дизарме
            this.scene.cameras.main.shake(800, 0.003);
          }
        }
        if (spell.type === 'make_orb_effect') {
          const radius = spell.radius || 1.5;
          // 1. Собираем все нераскрытые клетки
          const unrevealedTiles = this.queries.tiles.results.filter(tile => !tile.hasComponent(Revealed));
          // 2. Перемешиваем
          Phaser.Utils.Array.Shuffle(unrevealedTiles);
          let pick = null;
          // 3. Ищем клетку рядом с миной
          for (const candidate of unrevealedTiles) {
            const pos = candidate.getComponent(Position);
            let foundMineNearby = false;
            for (let dx = -1; dx <= 1; dx++) {
              for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                const mx = pos.x + dx;
                const my = pos.y + dy;
                const monster = findEntityAt(this.queries.actors.results, mx, my, Monster);
                if (monster) {
                  if (monster.hasComponent(Mine) && !monster.hasComponent(Revealed)) {
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < radius) {
                      foundMineNearby = true;
                      break;
                    }
                  }
                }
              }
            }
            if (foundMineNearby) {
              pick = candidate;
              break;
            }
          }
          // 4. Если не нашли — берём любую нераскрытую
          if (!pick && unrevealedTiles.length > 0) {
            pick = unrevealedTiles[0];
          }
          // 5. Открываем клетки вокруг выбранной
          if (pick) {
            const pos = pick.getComponent(Position);
            for (let dx = -1; dx <= 1; dx++) {
              for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                const tx = pos.x + dx;
                const ty = pos.y + dy;
                const tile = findEntityAt(this.queries.tiles.results, tx, ty, Tile);
                if (tile && !tile.hasComponent(Revealed)) {
                  tile.addComponent(Revealed);
                  revealedPositions.push({ x: tx, y: ty });
                }
                // Открываем акторов в этой клетке
                this.queries.actors.results.forEach(actor => {
                  const actorPos = actor.getComponent(Position);
                  if (actorPos.x === tx && actorPos.y === ty && !actor.hasComponent(Revealed)) {
                    actor.addComponent(Revealed);
                  }
                });
              }
            }
          }
        }

        // Создаем эффекты на всех открытых клетках
        if (revealedPositions.length > 0) {
          sceneEvents.emit(EffectEvents.MULTIPLE_SPELL, {
            positions: revealedPositions
          });
        } else {
          // Если не было открыто новых клеток, создаем эффект в позиции предмета
          sceneEvents.emit(EffectEvents.SPELL_CAST, {
            x: itemPos.x,
            y: itemPos.y
          });
        }
        // Воспроизводим звук использования предмета
        sceneEvents.emit(AudioEvents.USE_ITEM);
      }
      // Победа при подборе ключа
      if (item.hasComponent(Key)) {
        dataManager.setStatus(StatusEvents.WIN);
        sceneEvents.emit(StatusEvents.CHANGED, {
          previous: StatusEvents.PLAYING,
          current: StatusEvents.WIN
        });
      }
      // Удаляем все визуальные объекты, связанные с предметом
      if (item.hasComponent(SpriteObjects)) {
        const spriteObjects = item.getComponent(SpriteObjects);
        spriteObjects.destroyAll();
      }
      item.removeComponent(UseItem);
      item.remove(); // удаляем предмет из ECS-мирa после использования
    });
  }
} 
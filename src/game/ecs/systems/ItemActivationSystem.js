import { System } from 'ecsy';
import { UseItem, Orb, Position, Tile, TryReveal, Spell, Monster, Defeated, Revealed, Attack, Heal, SpriteObjects } from '../components';
import { findEntityAt } from '../helpers';
import { dataManager } from '../../DataManager';

export class ItemActivationSystem extends System {
  static queries = {
    usedItems: { components: [UseItem, Position] },
    tiles: { components: [Tile, Position] },
    actors: { components: [Position] }
  };

  execute() {
    this.queries.usedItems.results.forEach(item => {
      // HEAL: лечение игрока
      if (item.hasComponent(Heal)) {
        dataManager.player.heal();
      }
      // ORB: массовый ревил
      if (item.hasComponent(Orb)) {
        const orbPos = item.getComponent(Position);
        const radius = item.getComponent(Orb).radius;
        this.queries.tiles.results.forEach(tile => {
          const pos = tile.getComponent(Position);
          const dx = pos.x - orbPos.x;
          const dy = pos.y - orbPos.y;
          if (dx * dx + dy * dy <= radius * radius) {
            if (!tile.hasComponent(Revealed)) {
              tile.addComponent(Revealed);
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
      }
      // SPELL: reveal_enemies или disarm_enemies
      if (item.hasComponent(Spell)) {
        const spell = item.getComponent(Spell);
        if (spell.type === 'reveal_enemies' && Array.isArray(spell.targets)) {
          this.queries.monsters.results.forEach(monster => {
            if (spell.targets.includes(monster.name) && !monster.hasComponent(Revealed)) {
              monster.addComponent(Revealed);
            }
          });
        }
        if (spell.type === 'disarm_enemies' && Array.isArray(spell.targets)) {
          // Здесь можно реализовать дизарм мин (например, убрать компонент Attack у мин)
          this.queries.monsters.results.forEach(monster => {
            if (spell.targets.includes(monster.name) && monster.hasComponent(Attack)) {
              monster.removeComponent(Attack);
            }
          });
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
                const actor = findEntityAt(this.queries.actors.results, mx, my, Monster);
                if (actor && actor.name === 'MINE' && !actor.hasComponent(Revealed)) {
                  console.log(1)
                  const dist = Math.sqrt(dx * dx + dy * dy);
                  if (dist < radius) {
                    foundMineNearby = true;
                    break;
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
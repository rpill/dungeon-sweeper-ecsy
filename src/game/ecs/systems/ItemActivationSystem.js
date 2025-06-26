import { System } from 'ecsy';
import { UseItem, Orb, Position, Tile, TryReveal, Spell, Monster, Defeated, Revealed, Attack } from '../components';

export class ItemActivationSystem extends System {
  static queries = {
    usedItems: { components: [UseItem, Position] },
    tiles: { components: [Tile, Position] },
    actors: { components: [Position] }
  };

  execute() {
    this.queries.usedItems.results.forEach(item => {
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
      }
      // Удаляем все визуальные объекты, связанные с предметом
      if (item.spriteObj) { item.spriteObj.destroy(); item.spriteObj = null; }
      if (item.dmgText) { item.dmgText.destroy(); item.dmgText = null; }
      if (item.coinIcon) { item.coinIcon.destroy(); item.coinIcon = null; }
      if (item.xpText) { item.xpText.destroy(); item.xpText = null; }
      if (item.hpText) { item.hpText.destroy(); item.hpText = null; }
      item.removeComponent(UseItem);
      item.remove(); // удаляем предмет из ECS-мирa после использования
    });
  }
} 
import { System } from 'ecsy';
import { TryCollectLoot, Monster, Wall, Defeated, XP, Loot, Position, SpriteObjects } from '../components';
import { dataManager } from '../../DataManager';
import actorDefinitions from '../../data/actor-definitions.json';
import * as Components from '../components';

export class LootSystem extends System {
  static queries = {
    entitiesToCollect: { components: [TryCollectLoot, Defeated, Position] }
  };

  execute() {
    this.queries.entitiesToCollect.results.forEach(entity => {
      const position = entity.getComponent(Position);
      const hasXP = entity.hasComponent(XP);
      const hasLoot = entity.hasComponent(Loot);

      // Выдаем опыт, если есть
      if (hasXP) {
        const xp = entity.getComponent(XP);
        if (dataManager.player) {
          dataManager.player.grantXP(xp.value);
        }
      }

      // Очищаем спрайты сущности
      if (entity.hasComponent(SpriteObjects)) {
        const spriteObjects = entity.getComponent(SpriteObjects);
        spriteObjects.destroyAll();
      }

      // Если есть лут, создаем сущность из него
      if (hasLoot) {
        const loot = entity.getComponent(Loot);
        const lootType = loot.type;
        
        // Создаем сущность из actor-definitions.json
        if (actorDefinitions[lootType]) {
          const lootEntity = this.world.createEntity();
          lootEntity.addComponent(Components.Position, { x: position.x, y: position.y });
          
          // Добавляем все компоненты из определения
          actorDefinitions[lootType].forEach(compDef => {
            const ComponentClass = Components[compDef.component];
            if (ComponentClass && compDef.component !== 'Position') {
              lootEntity.addComponent(ComponentClass, compDef.data);
            }
          });
          
          // Отмечаем как открытый для отображения
          lootEntity.addComponent(Components.Revealed);
        }
      }

      // Удаляем сущность из мира
      entity.remove();
    });
  }
} 
import { System } from 'ecsy';
import { TryCollectLoot, Monster, Defeated, XP, Loot, Position, SpriteObjects } from '../components';
import { dataManager } from '../../DataManager';
import actorDefinitions from '../../data/actor-definitions.json';
import * as Components from '../components';

export class LootSystem extends System {
  static queries = {
    monstersToCollect: { components: [TryCollectLoot, Monster, Defeated, Position] }
  };

  execute() {
    this.queries.monstersToCollect.results.forEach(monster => {
      const position = monster.getComponent(Position);
      const hasXP = monster.hasComponent(XP);
      const hasLoot = monster.hasComponent(Loot);

      // Выдаем опыт, если есть
      if (hasXP) {
        const xp = monster.getComponent(XP);
        if (dataManager.player) {
          dataManager.player.grantXP(xp.value);
        }
      }

      // Очищаем спрайты монстра
      if (monster.hasComponent(SpriteObjects)) {
        const spriteObjects = monster.getComponent(SpriteObjects);
        spriteObjects.destroyAll();
      }

      // Если есть лут, создаем сущность из него
      if (hasLoot) {
        const loot = monster.getComponent(Loot);
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

      // Удаляем монстра из мира
      monster.remove();
    });
  }
} 
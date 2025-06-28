import { System } from 'ecsy';
import { TryOpen, Chest, Opened, OpenedSprite, XP, Loot, Position, Sprite, Item, Heal, Type, Revealed, SpriteObjects, Mimic, Defeated, TryAttack, RevealedAsMonster } from '../components';
import { dataManager } from '../../DataManager';
import actorDefinitions from '../../data/actor-definitions.json';
import * as Components from '../components';
import { sceneEvents } from '../../events/EventsCenter';
import { EffectEvents } from '../../events/EventNames';

export class ChestSystem extends System {
  static queries = {
    chestsToOpen: { components: [TryOpen, Chest, Position] }
  };

  execute() {
    this.queries.chestsToOpen.results.forEach(chest => {
      const position = chest.getComponent(Position);
      
      // Если в сундуке медкит, удаляем сундук и создаем медкит
      if (chest.hasComponent(Loot)) {
        const loot = chest.getComponent(Loot);
        if (loot.type === 'MEDKIT') {
          // Создаем эффект открытия сундука
          sceneEvents.emit(EffectEvents.CHEST_OPEN, {
            x: position.x,
            y: position.y
          });
          
          // Очищаем спрайты сундука перед удалением
          if (chest.hasComponent(SpriteObjects)) {
            const spriteObjects = chest.getComponent(SpriteObjects);
            spriteObjects.destroyAll();
          }
          
          // Создаем сущность медкита на той же позиции через actor-definitions.json
          const medkitEntity = this.world.createEntity();
          medkitEntity.addComponent(Position, { x: position.x, y: position.y });
          actorDefinitions['MEDKIT'].forEach(compDef => {
            const ComponentClass = Components[compDef.component];
            if (ComponentClass && compDef.component !== 'Position') {
              medkitEntity.addComponent(ComponentClass, compDef.data);
            }
          });
          // Отмечаем как открытый для отображения
          medkitEntity.addComponent(Opened);
          medkitEntity.addComponent(Revealed);
          
          // Удаляем сундук
          chest.remove();
          return;
        }
      }
      
      // Если в сундуке опыт, просто отмечаем как открытый
      if (chest.hasComponent(XP)) {
        if (!chest.hasComponent(Opened)) {
          // Создаем эффект открытия сундука
          sceneEvents.emit(EffectEvents.CHEST_OPEN, {
            x: position.x,
            y: position.y
          });
          chest.addComponent(Opened);
        }
      }
    });
  }
} 
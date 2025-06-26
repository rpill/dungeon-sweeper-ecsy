import { System } from 'ecsy';
import { TryOpen, Chest, Opened, OpenedSprite, XP, Loot, Position, Sprite, Item, Heal, Type, Revealed, SpriteObjects } from '../components';
import { dataManager } from '../../DataManager';

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
          // Очищаем спрайты сундука перед удалением
          if (chest.hasComponent(SpriteObjects)) {
            const spriteObjects = chest.getComponent(SpriteObjects);
            spriteObjects.destroyAll();
          }
          
          // Создаем сущность медкита на той же позиции
          const medkitEntity = this.world.createEntity();
          medkitEntity.addComponent(Position, { x: position.x, y: position.y });
          medkitEntity.addComponent(Sprite, { spriteSheet: 'icons', frame: 12 });
          medkitEntity.addComponent(Item);
          medkitEntity.addComponent(Heal, { amount: 'full' });
          medkitEntity.addComponent(Type, { value: 'MEDKIT' });
          medkitEntity.addComponent(Opened); // Отмечаем как открытый для отображения
          medkitEntity.addComponent(Revealed); // Отмечаем как открытый для правильного отображения тайла
          
          // Удаляем сундук
          chest.remove();
          return;
        }
      }
      
      // Если в сундуке опыт, просто отмечаем как открытый
      if (chest.hasComponent(XP)) {
        if (!chest.hasComponent(Opened)) {
          chest.addComponent(Opened);
        }
      }

      // Удаляем компонент TryOpen
      chest.removeComponent(TryOpen);
    });
  }
} 
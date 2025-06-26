import { System } from 'ecsy';
import { TryCollect, Chest, Opened, XP, Position, SpriteObjects } from '../components';
import { dataManager } from '../../DataManager';

export class CollectSystem extends System {
  static queries = {
    chestsToCollect: { components: [TryCollect, Chest, Opened, XP, Position] }
  };

  execute() {
    this.queries.chestsToCollect.results.forEach(chest => {
      // Выдаем опыт
      const xp = chest.getComponent(XP);
      if (dataManager.player) {
        dataManager.player.grantXP(xp.value);
      }

      // Очищаем спрайты сундука перед удалением
      if (chest.hasComponent(SpriteObjects)) {
        const spriteObjects = chest.getComponent(SpriteObjects);
        spriteObjects.destroyAll();
      }

      // Удаляем сундук из мира
      chest.remove();
    });
  }
} 
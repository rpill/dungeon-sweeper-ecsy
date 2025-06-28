import { System } from 'ecsy';
import { TryCollect, Chest, Opened, XP, Position, SpriteObjects } from '../components';
import { dataManager } from '../../DataManager';
import { AudioEvents } from '../../events/EventNames';
import { sceneEvents } from '../../events/EventsCenter';

export class CollectSystem extends System {
  static queries = {
    chestsToCollect: { components: [TryCollect, Chest, Opened, XP, Position] }
  };

  execute() {
    this.queries.chestsToCollect.results.forEach(chest => {
      // Выдаем опыт
      const xp = chest.getComponent(XP);
      if (dataManager.player) {
        const oldLevel = dataManager.player.level;
        dataManager.player.grantXP(xp.value);
        const newLevel = dataManager.player.level;
        
        // Воспроизводим звук получения опыта
        if (newLevel > oldLevel) {
          // Если повысился уровень
          sceneEvents.emit(AudioEvents.LEVEL_UP);
        } else if (dataManager.player.xp >= dataManager.player.nextLevelXP()) {
          // Если достигли максимума опыта
          sceneEvents.emit(AudioEvents.GRANT_XP_MAX);
        } else {
          // Обычное получение опыта
          sceneEvents.emit(AudioEvents.GRANT_XP);
        }
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
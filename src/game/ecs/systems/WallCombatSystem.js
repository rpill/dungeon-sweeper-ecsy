import { System } from 'ecsy';
import { TryAttackWall, Wall, Revealed, Health, Defeated, DefeatedSprite, XP, Position, SpriteObjects } from '../components';
import { dataManager } from '../../DataManager';
import { AudioEvents } from '../../events/EventNames';
import { sceneEvents } from '../../events/EventsCenter';

export class WallCombatSystem extends System {
  static queries = {
    wallsToAttack: { components: [TryAttackWall, Wall, Revealed, Health, Position] }
  };

  execute() {
    this.queries.wallsToAttack.results.forEach(wall => {
      // Проверяем, что у игрока есть HP для атаки
      if (dataManager.player && dataManager.player.hp <= 0) {
        // Игрок не может атаковать с 0 HP
        wall.removeComponent(TryAttackWall);
        // Воспроизводим звук отказа
        sceneEvents.emit(AudioEvents.DENIED);
        return;
      }

      const health = wall.getComponent(Health);
      
      // Игрок получает 1 урон за атаку на стену
      if (dataManager.player) {
        dataManager.player.takeDamage(1);
      }

      // Уменьшаем HP стены
      health.current = Math.max(0, health.current - 1);

      // Если стена разрушена
      if (health.current <= 0) {
        // Отмечаем стену как разрушенную
        wall.addComponent(Defeated);
        
        // Если есть DefeatedSprite, меняем спрайт
        if (wall.hasComponent(DefeatedSprite)) {
          const defeatedSprite = wall.getComponent(DefeatedSprite);
          if (wall.hasComponent(SpriteObjects)) {
            const spriteObjects = wall.getComponent(SpriteObjects);
            if (spriteObjects.spriteObj) {
              spriteObjects.spriteObj.setFrame(defeatedSprite.frame);
            }
          }
        }
        
        // Воспроизводим звук разрушения стены
        sceneEvents.emit(AudioEvents.ENEMY_DEAD);
      } else {
        // Воспроизводим звук промаха при атаке стены
        sceneEvents.emit(AudioEvents.PLAYER_CLICK);
      }

      // Удаляем компонент TryAttackWall
      wall.removeComponent(TryAttackWall);
    });
  }
} 
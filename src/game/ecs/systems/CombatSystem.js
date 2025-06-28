import { System } from 'ecsy';
import { Revealed, Monster, Attack, Defeated, TryAttack, Mine, MineWasTriggered, Position } from '../components';
import { sceneEvents } from '../../events/EventsCenter';
import { StatusEvents, EffectEvents, AudioEvents } from '../../events/EventNames';
import { dataManager } from '../../DataManager';

export class CombatSystem extends System {
  static queries = {
    tryAttack: {
      components: [TryAttack, Monster, Revealed, Attack],
    }
  };

  execute(delta, time) {
    // Бой по TryAttack (и при открытии, и по клику)
    this.queries.tryAttack.results.forEach(entity => {
      if (entity.hasComponent(Defeated)) {
        entity.removeComponent(TryAttack);
        return;
      }
      
      const attack = entity.getComponent(Attack);
      const position = entity.getComponent(Position);
      
      // Если это мина, навешиваем MineWasTriggered и создаем эффект взрыва
      if (entity.hasComponent(Mine)) {
        if (!entity.hasComponent(MineWasTriggered)) {
          entity.addComponent(MineWasTriggered);
          // Создаем эффект взрыва мины
          sceneEvents.emit(EffectEvents.MINE_EXPLOSION, {
            x: position.x,
            y: position.y
          });
          // Воспроизводим звук взрыва
          sceneEvents.emit(AudioEvents.EXPLOSION);
        }
      } else {
        // Создаем эффект удара по монстру
        sceneEvents.emit(EffectEvents.MONSTER_HIT, {
          x: position.x,
          y: position.y
        });
        // Воспроизводим звук смерти врага
        sceneEvents.emit(AudioEvents.ENEMY_DEAD);
      }
      
      if (attack.value > 0) {
        dataManager.player.takeDamage(attack.value);
      }
      if (dataManager.player.hp < 0) {
        const prevStatus = dataManager.status;
        dataManager.setStatus(StatusEvents.LOSE);
        // Воспроизводим звук смерти игрока
        sceneEvents.emit(AudioEvents.PLAYER_DEAD);
        sceneEvents.emit(StatusEvents.CHANGED, {
            previous: prevStatus,
            current: dataManager.status
        });
        entity.removeComponent(TryAttack);
        return;
      }
      entity.addComponent(Defeated);
      entity.removeComponent(TryAttack);
    });
  }
}
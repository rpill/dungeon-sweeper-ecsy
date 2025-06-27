import { System } from 'ecsy';
import { Revealed, Monster, Attack, Defeated, TryAttack, Type, MineWasTriggered } from '../components';
import { sceneEvents } from '../../events/EventsCenter';
import { StatusEvents } from '../../events/EventNames';
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
      // Если это мина, навешиваем MineWasTriggered
      if (entity.hasComponent(Type) && entity.getComponent(Type).value === 'MINE') {
        if (!entity.hasComponent(MineWasTriggered)) {
          entity.addComponent(MineWasTriggered);
        }
      }
      if (attack.value > 0) {
        dataManager.player.takeDamage(attack.value);
      }
      if (dataManager.player.hp < 0) {
        const prevStatus = dataManager.status;
        dataManager.setStatus(StatusEvents.LOSE);
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
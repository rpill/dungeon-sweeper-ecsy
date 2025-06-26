import { System } from 'ecsy';
import { Revealed, Monster, Attack, Defeated } from '../components';
import { sceneEvents } from '../../events/EventsCenter';
import { StatusEvents } from '../../events/EventNames';
import { dataManager } from '../../DataManager';

export class CombatSystem extends System {
  static queries = {
    newMonsters: {
      components: [Revealed, Monster, Attack],
      listen: {
        added: true
      }
    }
  };

  execute(delta, time) {
    this.queries.newMonsters.added.forEach(entity => {
      if (entity.hasComponent(Defeated)) return;

      const attack = entity.getComponent(Attack);
      if (attack.value > 0) {
        dataManager.player.takeDamage(attack.value);
      }
      entity.addComponent(Defeated);

      if (dataManager.player.hp <= 0) {
        const prevStatus = dataManager.status;
        dataManager.setStatus(StatusEvents.LOSE);
        sceneEvents.emit(StatusEvents.CHANGED, {
            previous: prevStatus,
            current: dataManager.status
        });
      }
    });
  }
}
import { System } from 'ecsy';
import { TryReveal, Revealed, Monster } from '../components';

export class RevealSystem extends System {
  static queries = {
    entitiesToReveal: {
      components: [TryReveal]
    }
  };

  execute(delta, time) {
    this.queries.entitiesToReveal.results.forEach(entity => {
      if (!entity.hasComponent(Revealed)) {
        entity.addComponent(Revealed);
      }
      
      entity.removeComponent(TryReveal);
    });
  }
}
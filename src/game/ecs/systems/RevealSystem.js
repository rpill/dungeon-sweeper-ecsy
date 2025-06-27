import { System } from 'ecsy';
import { TryReveal, Revealed, Position, Sprite, Tile, Monster, Defeated, TryAttack, Mimic } from '../components';

export class RevealSystem extends System {
  static queries = {
    tilesToReveal: { components: [TryReveal, Tile, Position] },
    actors: { components: [Sprite, Position] }
  };

  execute() {
    this.queries.tilesToReveal.results.forEach(tileEntity => {
      if (!tileEntity.hasComponent(Revealed)) {
        tileEntity.addComponent(Revealed);
      }
      // Открываем актора в этой клетке
      const tilePos = tileEntity.getComponent(Position);
      this.queries.actors.results.forEach(actor => {
        const actorPos = actor.getComponent(Position);
        if (actorPos.x === tilePos.x && actorPos.y === tilePos.y && !actor.hasComponent(Revealed)) {
          actor.addComponent(Revealed);
          // Если это монстр и он не убит — инициируем бой через TryAttack, КРОМЕ Mimic
          if (actor.hasComponent(Monster) && !actor.hasComponent(Defeated) && !actor.hasComponent(TryAttack)) {
            if (!actor.hasComponent(Mimic)) {
              actor.addComponent(TryAttack);
            }
          }
        }
      });
      tileEntity.removeComponent(TryReveal);
    });
  }
}
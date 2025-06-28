import { System } from 'ecsy';
import { TryReveal, Revealed, Position, Sprite, Tile, Monster, Defeated, TryAttack, Mimic, Butterfly } from '../components';
import { AudioEvents } from '../../events/EventNames';
import { sceneEvents } from '../../events/EventsCenter';

export class RevealSystem extends System {
  static queries = {
    tilesToReveal: { components: [TryReveal, Tile, Position] },
    actors: { components: [Sprite, Position] }
  };

  execute() {
    this.queries.tilesToReveal.results.forEach(tileEntity => {
      const wasAlreadyRevealed = tileEntity.hasComponent(Revealed);
      
      if (!tileEntity.hasComponent(Revealed)) {
        tileEntity.addComponent(Revealed);
      }
      // Открываем актора в этой клетке
      const tilePos = tileEntity.getComponent(Position);
      let foundNewActor = false;
      this.queries.actors.results.forEach(actor => {
        const actorPos = actor.getComponent(Position);
        if (actorPos.x === tilePos.x && actorPos.y === tilePos.y && !actor.hasComponent(Revealed)) {
          actor.addComponent(Revealed);
          foundNewActor = true;
          
          // Воспроизводим звук открытия
          sceneEvents.emit(AudioEvents.PLAYER_REVEAL);
          
          // Если это монстр и он не убит — инициируем бой через TryAttack, КРОМЕ Mimic
          if (actor.hasComponent(Monster) && !actor.hasComponent(Defeated) && !actor.hasComponent(TryAttack)) {
            if (!actor.hasComponent(Mimic)) {
              actor.addComponent(TryAttack);
            }
          }
        }
      });
      
      // Если клетка уже была открыта и не нашли новых акторов, воспроизводим звук отказа
      if (wasAlreadyRevealed && !foundNewActor) {
        sceneEvents.emit(AudioEvents.DENIED);
      }
      
      tileEntity.removeComponent(TryReveal);
    });
  }
}
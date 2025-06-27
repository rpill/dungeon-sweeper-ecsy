import { System } from "ecsy";
import { Butterfly, Defeated, Position, TryJump, Medkit, Monster, Item, Wall, Chest, Revealed, Tile, SpriteObjects } from "../components";
import { dataManager } from '../../DataManager';

export class ButterflySystem extends System {
  static queries = {
    butterflies: { components: [Butterfly, Position, TryJump] },
    medkits: { components: [Medkit, Position] },
    actors: { components: [Position] },
    tiles: { components: [Tile, Position] },
  };

  execute() {
    // Собираем занятые позиции
    const occupied = new Set();
    this.queries.actors.results.forEach(entity => {
      if (
        entity.hasComponent(Monster) ||
        entity.hasComponent(Item) ||
        entity.hasComponent(Wall) ||
        entity.hasComponent(Chest)
      ) {
        const pos = entity.getComponent(Position);
        occupied.add(`${pos.x},${pos.y}`);
      }
    });

    // Собираем все позиции аптечек
    const medkitPositions = this.queries.medkits.results.map(medkit => {
      const pos = medkit.getComponent(Position);
      return { x: pos.x, y: pos.y };
    });

    this.queries.butterflies.results.forEach(entity => {
      if (entity.hasComponent(Defeated)) {
        entity.removeComponent(TryJump);
        return;
      }
      const pos = entity.getComponent(Position);

      let bestCandidate = null;
      let closestDistance = Number.MAX_VALUE;

      for (let x = 0; x < dataManager.width; x++) {
        for (let y = 0; y < dataManager.height; y++) {
          // Пропускаем занятые клетки
          if (occupied.has(`${x},${y}`)) continue;
          // Пропускаем открытые клетки
          const tileEntity = this.queries.tiles.results.find(tile => {
            const pos = tile.getComponent(Position);
            return pos.x === x && pos.y === y;
          });
          if (tileEntity && tileEntity.hasComponent(Revealed)) continue;

          // Ищем ближайшую аптечку
          let minDist = Number.MAX_VALUE;
          for (const mk of medkitPositions) {
            const dist = Phaser.Math.Distance.Between(x, y, mk.x, mk.y);
            if (dist < minDist) minDist = dist;
          }
          if (minDist < closestDistance) {
            closestDistance = minDist;
            bestCandidate = { x, y };
          }
        }
      }

      if (bestCandidate) {
        pos.x = bestCandidate.x;
        pos.y = bestCandidate.y;
        if (entity.hasComponent(Revealed)) {
          entity.removeComponent(Revealed);

          if (entity.hasComponent(SpriteObjects)) {
            const spriteObjects = entity.getComponent(SpriteObjects);
            if (spriteObjects.spriteObj) {
              spriteObjects.spriteObj.destroy();
              spriteObjects.spriteObj = null;
            }
          }
        }
      } else {
        // Некуда прыгать — бабочка умирает
        entity.addComponent(Defeated);
      }
      entity.removeComponent(TryJump);
    });
  }
} 
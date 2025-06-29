import { System } from 'ecsy';
import { Monster, Type, Defeated, ObjectCounter, Item, Loot, Chest, Opened, Wall, Tile, Revealed, Position } from '../components';

export class ObjectCounterSystem extends System {
  static queries = {
    monsters: { components: [Monster, Type] },
    defeatedMonsters: { components: [Monster, Type, Defeated] },
    items: { components: [Item, Type] },
    chests: { components: [Chest, Loot, Type] },
    openedChests: { components: [Chest, Loot, Type, Opened] },
    walls: { components: [Wall, Type] },
    tiles: { components: [Tile, Position] }
  };

  execute() {
    // Получаем или создаем глобальный счетчик объектов
    let counterEntity = this.world.entityManager._entities ? 
      Object.values(this.world.entityManager._entities).find(e => e.hasComponent && e.hasComponent(ObjectCounter)) : null;
    
    if (!counterEntity) {
      counterEntity = this.world.createEntity();
      counterEntity.addComponent(ObjectCounter);
    }

    const counter = counterEntity.getComponent(ObjectCounter);
    counter.counts.clear();

    // Подсчитываем живых монстров
    this.queries.monsters.results.forEach(monster => {
      if (!monster.hasComponent(Defeated)) {
        const type = monster.getComponent(Type);
        const currentCount = counter.counts.get(type.value) || 0;
        counter.counts.set(type.value, currentCount + 1);
      }
    });

    // Подсчитываем предметы
    this.queries.items.results.forEach(item => {
      const type = item.getComponent(Type);
      const currentCount = counter.counts.get(type.value) || 0;
      counter.counts.set(type.value, currentCount + 1);
    });

    // Подсчитываем лут в сундуках (только в неоткрытых сундуках)
    this.queries.chests.results.forEach(chest => {
      if (!chest.hasComponent(Opened)) {
        const loot = chest.getComponent(Loot);
        const currentCount = counter.counts.get(loot.type) || 0;
        counter.counts.set(loot.type, currentCount + 1);
      }
    });

    // Подсчитываем стены
    this.queries.walls.results.forEach(wall => {
      const type = wall.getComponent(Type);
      const currentCount = counter.counts.get(type.value) || 0;
      counter.counts.set(type.value, currentCount + 1);
    });

    // Подсчитываем нераскрытые тайлы
    const unrevealedTiles = this.queries.tiles.results.filter(tile => !tile.hasComponent(Revealed));
    if (unrevealedTiles.length > 0) {
      counter.counts.set('UNREVEALED_TILES', unrevealedTiles.length);
    }
  }

  // Метод для получения количества объектов определенного типа
  getObjectCount(type) {
    let counterEntity = this.world.entityManager._entities ? 
      Object.values(this.world.entityManager._entities).find(e => e.hasComponent && e.hasComponent(ObjectCounter)) : null;
    
    if (counterEntity) {
      const counter = counterEntity.getComponent(ObjectCounter);
      return counter.counts.get(type) || 0;
    }
    return 0;
  }

  // Метод для получения всех типов объектов и их количества
  getAllObjectCounts() {
    let counterEntity = this.world.entityManager._entities ? 
      Object.values(this.world.entityManager._entities).find(e => e.hasComponent && e.hasComponent(ObjectCounter)) : null;
    
    if (counterEntity) {
      const counter = counterEntity.getComponent(ObjectCounter);
      return new Map(counter.counts);
    }
    return new Map();
  }
} 
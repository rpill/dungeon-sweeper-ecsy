import { System } from 'ecsy';
import { Monster, Type, Defeated, ObjectCounter, Item, Loot, Chest, Opened, Wall, Tile, Revealed, Position, Spell, Orb } from '../components';

export class ObjectCounterSystem extends System {
  static queries = {
    allEntities: { components: [Type] }
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
    
    // Проверяем, нужно ли пересчитывать
    const currentEntityCount = this.queries.allEntities.results.length;
    if (counter.lastEntityCount === currentEntityCount && counter.lastUpdateTime > 0) {
      // Если количество сущностей не изменилось, не пересчитываем
      return;
    }
    
    // Обновляем время последнего подсчёта
    counter.lastUpdateTime = Date.now();
    counter.lastEntityCount = currentEntityCount;
    
    counter.counts.clear();

    // Простой подсчёт всех объектов по типу
    this.queries.allEntities.results.forEach(entity => {
      const type = entity.getComponent(Type);
      const currentCount = counter.counts.get(type.value) || 0;
      counter.counts.set(type.value, currentCount + 1);
    });

    // Дополнительно подсчитываем лут с монстров и сундуков
    this.world.entityManager._entities && Object.values(this.world.entityManager._entities).forEach(entity => {
      if (entity.hasComponent && entity.hasComponent(Loot)) {
        const loot = entity.getComponent(Loot);
        const currentCount = counter.counts.get(loot.type) || 0;
        counter.counts.set(loot.type, currentCount + 1);
      }
    });
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
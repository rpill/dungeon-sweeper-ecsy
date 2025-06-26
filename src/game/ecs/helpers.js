import { Position } from "./components";

// Универсальный поиск сущности по позиции и компонентам
export function findEntityAt(entities, x, y, ...components) {
  return entities.find(entity => {
    const pos = entity.getComponent(Position);
    if (!pos || pos.x !== x || pos.y !== y) return false;
    return components.every(comp => entity.hasComponent(comp));
  });
} 
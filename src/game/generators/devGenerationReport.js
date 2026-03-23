import { World } from 'ecsy';
import * as Components from '../ecs/components';
import { ACTOR_TYPES, ORB_RADIUS } from '../constants/actor';
import { dataManager } from '../DataManager';
import { LevelGenerator } from './LevelGenerator';

const EXPECTED_TYPE_COUNTS = {
  [ACTOR_TYPES.DRAGON]: 1,
  [ACTOR_TYPES.WIZARD]: 1,
  [ACTOR_TYPES.BIG_SLIME]: 5,
  [ACTOR_TYPES.MINE_KING]: 1,
  [ACTOR_TYPES.GOLEM]: 2,
  [ACTOR_TYPES.RAT_KING]: 1,
  [ACTOR_TYPES.WALL]: 6,
  [ACTOR_TYPES.MINOTAUR]: 5,
  [ACTOR_TYPES.GUARD]: 4,
  [ACTOR_TYPES.BANSHEE]: 8,
  [ACTOR_TYPES.GAZER]: 2,
  [ACTOR_TYPES.MINE]: 9,
  [ACTOR_TYPES.MEDKIT]: 5,
  [ACTOR_TYPES.CHEST]: 7,
  [ACTOR_TYPES.ORB]: 1,
  [ACTOR_TYPES.DRAGON_EGG]: 1,
  [ACTOR_TYPES.RAT]: 13,
  [ACTOR_TYPES.BAT]: 12,
  [ACTOR_TYPES.SKELETON]: 10,
  [ACTOR_TYPES.SLIME]: 8,
  [ACTOR_TYPES.MIMIC]: 1,
  [ACTOR_TYPES.BUTTERFLY]: 1,
  [ACTOR_TYPES.SPELL_MAKE_ORB]: 1,
};

const EXPECTED_TOTAL_ACTORS = Object.values(EXPECTED_TYPE_COUNTS).reduce((sum, value) => sum + value, 0);
const EXPECTED_BANSHEE_NAMES = ['banshee1', 'banshee2', 'banshee3', 'banshee4'];
const FORBIDDEN_ORB_TYPES = new Set([
  ACTOR_TYPES.DRAGON,
  ACTOR_TYPES.GAZER,
  ACTOR_TYPES.CHEST,
  ACTOR_TYPES.SPELL_MAKE_ORB,
  ACTOR_TYPES.RAT_KING,
  ACTOR_TYPES.MINE,
  ACTOR_TYPES.DRAGON_EGG,
  ACTOR_TYPES.BIG_SLIME,
  ACTOR_TYPES.MIMIC,
]);

function toEntityArray(entities) {
  if (!entities) return [];
  if (Array.isArray(entities)) return entities;
  if (typeof entities[Symbol.iterator] === 'function') return Array.from(entities);
  return Object.values(entities);
}

function key(x, y) {
  return `${x},${y}`;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function toMapByType(actors) {
  const map = new Map();
  for (const actor of actors) {
    const type = actor.getComponent(Components.Type).value;
    if (!map.has(type)) {
      map.set(type, []);
    }
    map.get(type).push(actor);
  }
  return map;
}

function getPosition(entity) {
  return entity.getComponent(Components.Position);
}

function getTypeCount(typeMap, type) {
  return typeMap.get(type)?.length ?? 0;
}

function toRatio(passed, total) {
  if (!total) return 1;
  return passed / total;
}

function createWorld() {
  const world = new World();
  Object.values(Components).forEach((component) => {
    world.registerComponent(component);
  });
  return world;
}

function collectEntities(world) {
  return toEntityArray(world.entityManager._entities);
}

function analyze(world, generator, width, height) {
  const entities = collectEntities(world);
  const tiles = entities.filter((entity) =>
    entity.hasComponent(Components.Tile) && entity.hasComponent(Components.Position)
  );
  const actors = entities.filter((entity) =>
    entity.hasComponent(Components.Type) && entity.hasComponent(Components.Position)
  );

  const actorsByType = toMapByType(actors);
  const actorByPosition = new Map();
  const tileByPosition = new Map();
  const violations = [];
  const diagnostics = {};

  const addViolation = (rule, details) => {
    violations.push({ rule, details });
  };

  for (const actor of actors) {
    const position = getPosition(actor);
    actorByPosition.set(key(position.x, position.y), actor);
  }

  for (const tile of tiles) {
    const position = getPosition(tile);
    tileByPosition.set(key(position.x, position.y), tile);
  }

  if (tiles.length !== width * height) {
    addViolation('tile_count', { expected: width * height, actual: tiles.length });
  }

  if (actors.length !== EXPECTED_TOTAL_ACTORS) {
    addViolation('actor_count', { expected: EXPECTED_TOTAL_ACTORS, actual: actors.length });
  }

  for (const tile of tiles) {
    const tileData = tile.getComponent(Components.Tile);
    const validBaseType = Number.isInteger(tileData.baseType) && tileData.baseType >= 0 && tileData.baseType <= 4;
    if (!validBaseType) {
      addViolation('tile_base_type', { baseType: tileData.baseType });
      break;
    }
  }

  for (const [type, expectedCount] of Object.entries(EXPECTED_TYPE_COUNTS)) {
    const actualCount = getTypeCount(actorsByType, type);
    if (actualCount !== expectedCount) {
      addViolation('type_count', { type, expectedCount, actualCount });
    }
  }

  const emptyCount = getTypeCount(actorsByType, ACTOR_TYPES.EMPTY);
  if (emptyCount !== 0) {
    addViolation('empty_entities_present', { count: emptyCount });
  }

  for (const actor of actors) {
    if (actor.fixed !== true) {
      addViolation('actor_not_fixed', { id: actor.id });
      break;
    }
  }

  for (const actor of actors) {
    if (actor.hasComponent(Components.Tile)) {
      addViolation('tile_in_spatial_actor_layer', { id: actor.id });
      break;
    }
  }

  const dragon = actorsByType.get(ACTOR_TYPES.DRAGON)?.[0] ?? null;
  const dragonEgg = actorsByType.get(ACTOR_TYPES.DRAGON_EGG)?.[0] ?? null;
  if (dragon && dragonEgg) {
    const dragonPosition = getPosition(dragon);
    const eggPosition = getPosition(dragonEgg);
    if (distance(dragonPosition, eggPosition) > 1.5) {
      addViolation('dragon_egg_distance', { dragonPosition, eggPosition });
    }
  }

  const banshees = actorsByType.get(ACTOR_TYPES.BANSHEE) ?? [];
  const bansheesByName = new Map();
  for (const banshee of banshees) {
    const groupName = banshee.name || '<missing>';
    if (!bansheesByName.has(groupName)) {
      bansheesByName.set(groupName, []);
    }
    bansheesByName.get(groupName).push(banshee);
  }

  for (const requiredName of EXPECTED_BANSHEE_NAMES) {
    const group = bansheesByName.get(requiredName) ?? [];
    if (group.length !== 2) {
      addViolation('banshee_pair_count', { name: requiredName, count: group.length });
      continue;
    }

    const p0 = getPosition(group[0]);
    const p1 = getPosition(group[1]);
    if (distance(p0, p1) > 1) {
      addViolation('banshee_pair_distance', { name: requiredName, p0, p1 });
    }
  }

  const guards = actorsByType.get(ACTOR_TYPES.GUARD) ?? [];
  const namedGuards = guards.filter((guard) => Boolean(guard.name));
  if (namedGuards.length !== 0) {
    addViolation('guard_names_present', { names: namedGuards.map((guard) => guard.name) });
  }

  for (const actorType of [ACTOR_TYPES.DRAGON, ACTOR_TYPES.ORB]) {
    const entity = actorsByType.get(actorType)?.[0] ?? null;
    if (!entity) continue;

    if (!entity.hasComponent(Components.Revealed)) {
      addViolation('revealed_actor_missing', { actorType });
    }

    const position = getPosition(entity);
    const tile = tileByPosition.get(key(position.x, position.y));
    if (!tile || !tile.hasComponent(Components.Revealed)) {
      addViolation('revealed_tile_missing', { actorType, position });
    }
  }

  const chests = actorsByType.get(ACTOR_TYPES.CHEST) ?? [];
  const medkitChests = chests.filter((chest) => {
    if (!chest.hasComponent(Components.Loot)) return false;
    const loot = chest.getComponent(Components.Loot);
    return loot.type === ACTOR_TYPES.MEDKIT;
  }).length;
  const xpChests = chests.filter((chest) => {
    if (!chest.hasComponent(Components.XP)) return false;
    const xp = chest.getComponent(Components.XP);
    return xp.value === 3;
  }).length;

  if (medkitChests !== 2 || xpChests !== 5) {
    addViolation('chest_split', { expected: { medkitChests: 2, xpChests: 5 }, actual: { medkitChests, xpChests } });
  }

  if (generator.spatialMap.size !== width * height) {
    addViolation('spatial_map_size', { expected: width * height, actual: generator.spatialMap.size });
  }

  for (const [positionKey, entity] of generator.spatialMap.entries()) {
    if (!entity) continue;

    if (entity.hasComponent(Components.Tile)) {
      addViolation('spatial_map_contains_tile', { positionKey });
      break;
    }

    if (entity.hasComponent(Components.Type) && entity.getComponent(Components.Type).value === ACTOR_TYPES.EMPTY) {
      addViolation('spatial_map_contains_empty', { positionKey });
      break;
    }
  }

  const dragonTarget = { x: Math.floor(width / 2), y: 4 };

  const eggDiagnostics = (actorsByType.get(ACTOR_TYPES.DRAGON_EGG) ?? []).filter((egg) => {
    const pos = getPosition(egg);
    return generator.checkAdjacent(pos.x, pos.y, ACTOR_TYPES.DRAGON, 1.5);
  }).length;
  diagnostics.dragonEggNearDragon = {
    passed: eggDiagnostics,
    total: getTypeCount(actorsByType, ACTOR_TYPES.DRAGON_EGG),
  };

  const butterflyDiagnostics = (actorsByType.get(ACTOR_TYPES.BUTTERFLY) ?? []).filter((butterfly) => {
    const pos = getPosition(butterfly);
    return generator.checkAdjacent(pos.x, pos.y, ACTOR_TYPES.MEDKIT, 1.5);
  }).length;
  diagnostics.butterflyNearMedkit = {
    passed: butterflyDiagnostics,
    total: getTypeCount(actorsByType, ACTOR_TYPES.BUTTERFLY),
  };

  const bigSlimeDiagnostics = (actorsByType.get(ACTOR_TYPES.BIG_SLIME) ?? []).filter((entity) => {
    const pos = getPosition(entity);
    return generator.checkAdjacent(pos.x, pos.y, ACTOR_TYPES.WIZARD, 1.5);
  }).length;
  diagnostics.bigSlimeNearWizard = {
    passed: bigSlimeDiagnostics,
    total: getTypeCount(actorsByType, ACTOR_TYPES.BIG_SLIME),
  };

  const wizardDiagnostics = (actorsByType.get(ACTOR_TYPES.WIZARD) ?? []).filter((wizard) => {
    const pos = getPosition(wizard);
    return generator.isEdge(pos.x, pos.y) && !generator.isCorner(pos.x, pos.y);
  }).length;
  diagnostics.wizardOnEdgeNotCorner = {
    passed: wizardDiagnostics,
    total: getTypeCount(actorsByType, ACTOR_TYPES.WIZARD),
  };

  const mineKingDiagnostics = (actorsByType.get(ACTOR_TYPES.MINE_KING) ?? []).filter((mineKing) => {
    const pos = getPosition(mineKing);
    return generator.isCorner(pos.x, pos.y);
  }).length;
  diagnostics.mineKingInCorner = {
    passed: mineKingDiagnostics,
    total: getTypeCount(actorsByType, ACTOR_TYPES.MINE_KING),
  };

  const dragonDiagnostics = (actorsByType.get(ACTOR_TYPES.DRAGON) ?? []).filter((dragonEntity) => {
    const pos = getPosition(dragonEntity);
    return pos.x === dragonTarget.x && pos.y === dragonTarget.y;
  }).length;
  diagnostics.dragonAtTarget = {
    passed: dragonDiagnostics,
    total: getTypeCount(actorsByType, ACTOR_TYPES.DRAGON),
  };

  const minotaurDiagnostics = (actorsByType.get(ACTOR_TYPES.MINOTAUR) ?? []).filter((minotaur) => {
    const pos = getPosition(minotaur);
    return generator.calculateActorHappiness(minotaur, ACTOR_TYPES.MINOTAUR, pos.x, pos.y) >= 10000;
  }).length;
  diagnostics.minotaurChestRule = {
    passed: minotaurDiagnostics,
    total: getTypeCount(actorsByType, ACTOR_TYPES.MINOTAUR),
  };

  const bansheeDiagnostics = (actorsByType.get(ACTOR_TYPES.BANSHEE) ?? []).filter((banshee) =>
    generator.isBansheeInRightPlace(banshee)
  ).length;
  diagnostics.bansheePaired = {
    passed: bansheeDiagnostics,
    total: getTypeCount(actorsByType, ACTOR_TYPES.BANSHEE),
  };

  const guardDiagnostics = (actorsByType.get(ACTOR_TYPES.GUARD) ?? []).filter((guard) =>
    generator.isGuardianInRightQuadrant(guard)
  ).length;
  diagnostics.guardQuadrantRule = {
    passed: guardDiagnostics,
    total: getTypeCount(actorsByType, ACTOR_TYPES.GUARD),
  };

  const medkits = actorsByType.get(ACTOR_TYPES.MEDKIT) ?? [];
  const medkitNearCounts = medkits.map((medkit) => generator.countNearMeWithSameId(medkit, 3.5));
  diagnostics.medkitIsolation = {
    averageNeighbors: medkitNearCounts.length
      ? medkitNearCounts.reduce((sum, value) => sum + value, 0) / medkitNearCounts.length
      : 0,
  };

  const chestNearCounts = chests.map((chest) => generator.countNearMeWithSameId(chest, 3));
  diagnostics.chestIsolation = {
    averageNeighbors: chestNearCounts.length
      ? chestNearCounts.reduce((sum, value) => sum + value, 0) / chestNearCounts.length
      : 0,
  };

  const walls = actorsByType.get(ACTOR_TYPES.WALL) ?? [];
  const wallsWithPattern = walls.filter((wall) => {
    const pos = getPosition(wall);
    return generator.calculateActorHappiness(wall, ACTOR_TYPES.WALL, pos.x, pos.y) >= 2000;
  }).length;
  diagnostics.wallPattern = {
    passed: wallsWithPattern,
    total: walls.length,
  };

  const orb = actorsByType.get(ACTOR_TYPES.ORB)?.[0] ?? null;
  if (orb) {
    const orbPos = getPosition(orb);
    let forbiddenNearby = 0;
    let wallsNearby = 0;
    let medkitsNearby = 0;

    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (dx === 0 && dy === 0) continue;

        const dist = Math.hypot(dx, dy);
        if (dist >= ORB_RADIUS) continue;

        const entityAtPos = actorByPosition.get(key(orbPos.x + dx, orbPos.y + dy));
        if (!entityAtPos) continue;

        const entityType = entityAtPos.getComponent(Components.Type).value;
        if (FORBIDDEN_ORB_TYPES.has(entityType)) forbiddenNearby += 1;
        if (entityType === ACTOR_TYPES.WALL) wallsNearby += 1;
        if (entityType === ACTOR_TYPES.MEDKIT) medkitsNearby += 1;
      }
    }

    diagnostics.orbPlacement = {
      closeToEdge: generator.isCloseToEdge(orbPos.x, orbPos.y),
      forbiddenNearby,
      wallsNearby,
      medkitsNearby,
      medkitAndWallCombo: medkitsNearby === 1 && wallsNearby > 0,
    };
  }

  return { violations, diagnostics };
}

function aggregateDiagnostics(base, current) {
  const next = { ...base };
  for (const [name, value] of Object.entries(current)) {
    if (value && typeof value.passed === 'number' && typeof value.total === 'number') {
      const prev = next[name] || { passed: 0, total: 0 };
      next[name] = {
        passed: prev.passed + value.passed,
        total: prev.total + value.total,
      };
      continue;
    }

    if (value && typeof value.averageNeighbors === 'number') {
      const prev = next[name] || { sum: 0, count: 0 };
      next[name] = {
        sum: prev.sum + value.averageNeighbors,
        count: prev.count + 1,
      };
      continue;
    }

    if (name === 'orbPlacement') {
      const prev = next[name] || {
        count: 0,
        closeToEdge: 0,
        forbiddenNearby: 0,
        wallsNearby: 0,
        medkitsNearby: 0,
        medkitAndWallCombo: 0,
      };
      next[name] = {
        count: prev.count + 1,
        closeToEdge: prev.closeToEdge + (value.closeToEdge ? 1 : 0),
        forbiddenNearby: prev.forbiddenNearby + value.forbiddenNearby,
        wallsNearby: prev.wallsNearby + value.wallsNearby,
        medkitsNearby: prev.medkitsNearby + value.medkitsNearby,
        medkitAndWallCombo: prev.medkitAndWallCombo + (value.medkitAndWallCombo ? 1 : 0),
      };
    }
  }
  return next;
}

function finalizeDiagnostics(aggregated) {
  const result = {};
  for (const [name, value] of Object.entries(aggregated)) {
    if (typeof value.passed === 'number' && typeof value.total === 'number') {
      result[name] = {
        passed: value.passed,
        total: value.total,
        ratio: Number(toRatio(value.passed, value.total).toFixed(3)),
      };
      continue;
    }

    if (typeof value.sum === 'number' && typeof value.count === 'number') {
      result[name] = {
        averageNeighbors: Number((value.sum / value.count).toFixed(3)),
      };
      continue;
    }

    if (name === 'orbPlacement') {
      const divisor = value.count || 1;
      result[name] = {
        avgForbiddenNearby: Number((value.forbiddenNearby / divisor).toFixed(3)),
        avgWallsNearby: Number((value.wallsNearby / divisor).toFixed(3)),
        avgMedkitsNearby: Number((value.medkitsNearby / divisor).toFixed(3)),
        closeToEdgeRate: Number((value.closeToEdge / divisor).toFixed(3)),
        medkitAndWallComboRate: Number((value.medkitAndWallCombo / divisor).toFixed(3)),
      };
    }
  }
  return result;
}

function runSingle(width, height) {
  const previousWidth = dataManager.width;
  const previousHeight = dataManager.height;

  dataManager.width = width;
  dataManager.height = height;

  try {
    const world = createWorld();
    const generator = new LevelGenerator(world);
    generator.generate({ skipStatusUpdates: true });
    return analyze(world, generator, width, height);
  } finally {
    dataManager.width = previousWidth;
    dataManager.height = previousHeight;
  }
}

export function runGenerationReport(options = {}) {
  const iterations = Number.isInteger(options.iterations) ? options.iterations : 200;
  const width = Number.isInteger(options.width) ? options.width : dataManager.width;
  const height = Number.isInteger(options.height) ? options.height : dataManager.height;
  const shouldLog = options.log !== false;

  const generationTimes = [];
  const failures = [];
  let aggregatedDiagnostics = {};

  for (let i = 0; i < iterations; i++) {
    const startedAt = performance.now();
    const result = runSingle(width, height);
    const elapsed = performance.now() - startedAt;
    generationTimes.push(elapsed);

    if (result.violations.length > 0) {
      failures.push({ iteration: i + 1, violations: result.violations });
    }

    aggregatedDiagnostics = aggregateDiagnostics(aggregatedDiagnostics, result.diagnostics);
  }

  const minMs = Math.min(...generationTimes);
  const maxMs = Math.max(...generationTimes);
  const avgMs = generationTimes.reduce((sum, value) => sum + value, 0) / generationTimes.length;

  const summary = {
    iterations,
    size: { width, height },
    generationMs: {
      min: Number(minMs.toFixed(3)),
      avg: Number(avgMs.toFixed(3)),
      max: Number(maxMs.toFixed(3)),
    },
    hardChecks: {
      passed: failures.length === 0,
      failures: failures.length,
    },
    failureSamples: failures.slice(0, 5),
    diagnostics: finalizeDiagnostics(aggregatedDiagnostics),
  };

  if (shouldLog) {
    if (summary.hardChecks.passed) {
      console.info('[GenerationReport] Hard checks passed.', summary);
    } else {
      console.error('[GenerationReport] Hard checks failed.', summary);
    }
  }

  return summary;
}

export function registerGenerationDevTools() {
  if (typeof window === 'undefined') return;

  window.__dev = window.__dev || {};
  window.__dev.runGenerationReport = runGenerationReport;
  window.__dev.checkGenerationOnce = () => runGenerationReport({ iterations: 1 });
}


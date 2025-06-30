import { Effect, EffectAnimation, EffectPosition } from './ecs/components';
import { sceneEvents } from './events/EventsCenter';
import { EffectEvents } from './events/EventNames';

export class EffectManager {
  constructor(world, tileSize) {
    this.world = world;
    this.tileSize = tileSize;
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Слушаем события для создания эффектов
    sceneEvents.on(EffectEvents.MONSTER_HIT, this.createMonsterHitEffect, this);
    sceneEvents.on(EffectEvents.MINE_EXPLOSION, this.createMineExplosionEffect, this);
    sceneEvents.on(EffectEvents.BUTTERFLY_DISAPPEAR, this.createButterflyDisappearEffect, this);
    sceneEvents.on(EffectEvents.CHEST_OPEN, this.createChestOpenEffect, this);
    sceneEvents.on(EffectEvents.SPELL_CAST, this.createSpellEffect, this);
    sceneEvents.on(EffectEvents.MULTIPLE_SPELL, this.createMultipleSpellEffects, this);
    sceneEvents.on(EffectEvents.MULTIPLE_ORB, this.createMultipleOrbEffects, this);
    sceneEvents.on(EffectEvents.MULTIPLE_EXPLOSION, this.createMultipleExplosionEffects, this);
  }

  createEffect(type, x, y, duration = 1000, offsetX = 0, offsetY = 0) {
    const entity = this.world.createEntity();
    
    entity.addComponent(Effect, {
      type: type,
      duration: duration,
      startTime: 0
    });

    entity.addComponent(EffectAnimation, {
      sprite: null,
      animation: null,
      scale: 1.0,
      alpha: 1.0
    });

    entity.addComponent(EffectPosition, {
      x: x * this.tileSize + this.tileSize / 2,
      y: y * this.tileSize + this.tileSize / 2,
      offsetX: offsetX,
      offsetY: offsetY,
      depth: 10
    });

    return entity;
  }

  createMultipleEffects(type, positions, duration = 1000, offsetX = 0, offsetY = 0) {
    const entities = [];
    positions.forEach(pos => {
      const entity = this.createEffect(type, pos.x, pos.y, duration, offsetX, offsetY);
      entities.push(entity);
    });
    return entities;
  }

  createMonsterHitEffect(data) {
    const { x, y } = data;
    this.createEffect('hit', x, y, 800, 0, -5);
  }

  createMineExplosionEffect(data) {
    const { x, y } = data;
    this.createEffect('explosion', x, y, 1200, 0, 0);
  }

  createButterflyDisappearEffect(data) {
    const { x, y } = data;
    this.createEffect('disappear', x, y, 600, 0, 0);
  }

  createChestOpenEffect(data) {
    const { x, y } = data;
    this.createEffect('open', x, y, 1000, 0, 0);
  }

  createSpellEffect(data) {
    const { x, y } = data;
    this.createEffect('spell', x, y, 1500, 0, 0);
  }

  createMultipleSpellEffects(data) {
    const { positions } = data;
    this.createMultipleEffects('spell', positions, 1500, 0, 0);
  }

  createMultipleOrbEffects(data) {
    const { positions } = data;
    this.createMultipleEffects('spell', positions, 1200, 0, 0);
  }

  // Методы для прямого создания эффектов (без событий)
  createHitEffectAt(x, y) {
    return this.createEffect('hit', x, y, 800, 0, -5);
  }

  createExplosionEffectAt(x, y) {
    return this.createEffect('explosion', x, y, 1200, 0, 0);
  }

  createDisappearEffectAt(x, y) {
    return this.createEffect('disappear', x, y, 600, 0, -8);
  }

  createOpenEffectAt(x, y) {
    return this.createEffect('open', x, y, 1000, 0, 0);
  }

  createSpellEffectAt(x, y) {
    return this.createEffect('spell', x, y, 1500, 0, 0);
  }

  createMultipleSpellEffectsAt(positions) {
    return this.createMultipleEffects('spell', positions, 1500, 0, 0);
  }

  createMultipleOrbEffectsAt(positions) {
    return this.createMultipleEffects('spell', positions, 1200, 0, 0);
  }

  createMultipleExplosionEffects(data) {
    const { positions } = data;
    this.createMultipleEffects('explosion', positions, 1200, 0, 0);
  }

  createMultipleExplosionEffectsAt(positions) {
    return this.createMultipleEffects('explosion', positions, 1200, 0, 0);
  }

  destroy() {
    // Удаляем слушатели событий
    sceneEvents.off(EffectEvents.MONSTER_HIT, this.createMonsterHitEffect, this);
    sceneEvents.off(EffectEvents.MINE_EXPLOSION, this.createMineExplosionEffect, this);
    sceneEvents.off(EffectEvents.BUTTERFLY_DISAPPEAR, this.createButterflyDisappearEffect, this);
    sceneEvents.off(EffectEvents.CHEST_OPEN, this.createChestOpenEffect, this);
    sceneEvents.off(EffectEvents.SPELL_CAST, this.createSpellEffect, this);
    sceneEvents.off(EffectEvents.MULTIPLE_SPELL, this.createMultipleSpellEffects, this);
    sceneEvents.off(EffectEvents.MULTIPLE_ORB, this.createMultipleOrbEffects, this);
    sceneEvents.off(EffectEvents.MULTIPLE_EXPLOSION, this.createMultipleExplosionEffects, this);
  }
} 
import { System } from 'ecsy';
import { Effect, EffectAnimation, EffectPosition } from '../components';

export class EffectSystem extends System {
  init(attributes) {
    this.scene = attributes.scene;
    this.tileSize = attributes.tileSize;
    this.animationCounter = 0; // Счетчик для уникальных ключей анимаций
    this.createdAnimations = new Set(); // Отслеживаем созданные анимации
  }

  static queries = {
    effects: {
      components: [Effect, EffectAnimation, EffectPosition],
    }
  };

  execute(delta, time) {
    this.queries.effects.results.forEach(entity => {
      const effect = entity.getComponent(Effect);
      const animation = entity.getComponent(EffectAnimation);
      const position = entity.getComponent(EffectPosition);

      // Если это первый кадр, инициализируем анимацию
      if (effect.startTime === 0) {
        effect.startTime = time;
        this.createEffectAnimation(entity, effect, animation, position);
      }

      // Проверяем, закончился ли эффект
      const elapsed = time - effect.startTime;
      if (elapsed >= effect.duration) {
        this.cleanupEffect(entity, animation);
        entity.remove();
      } else {
        // Обновляем анимацию
        this.updateEffectAnimation(entity, effect, animation, position, elapsed, effect.duration);
      }
    });
  }

  createEffectAnimation(entity, effect, animation, position) {
    const x = position.x + position.offsetX;
    const y = position.y + position.offsetY;

    switch (effect.type) {
      case 'hit':
        this.createHitEffect(animation, x, y, position.depth);
        break;
      case 'explosion':
        this.createExplosionEffect(animation, x, y, position.depth);
        break;
      case 'disappear':
        this.createDisappearEffect(animation, x, y, position.depth);
        break;
      case 'open':
        this.createOpenEffect(animation, x, y, position.depth);
        break;
      case 'spell':
        this.createSpellEffect(animation, x, y, position.depth);
        break;
      default:
        console.warn(`Unknown effect type: ${effect.type}`);
    }
  }

  createHitEffect(animation, x, y, depth) {
    // Создаем спрайт удара из fx_impact
    const sprite = this.scene.add.sprite(x, y, 'fx_impact');
    sprite.setOrigin(0.5);
    sprite.setDepth(depth);
    sprite.setScale(0.8);

    // Создаем уникальный ключ анимации
    const animKey = `hit_effect_${this.animationCounter++}`;
    
    // Проверяем, не существует ли уже такая анимация
    if (this.createdAnimations.has(animKey)) {
      console.warn(`Animation key already exists: ${animKey}, skipping creation`);
      return;
    }
    
    // Создаем анимацию удара
    const anim = this.scene.anims.create({
      key: animKey,
      frames: this.scene.anims.generateFrameNumbers('fx_impact', { start: 3, end: 5 }),
      frameRate: 12,
      repeat: 0,
      hideOnComplete: true
    });

    this.createdAnimations.add(animKey);
    sprite.play(animKey);
    animation.sprite = sprite;
    animation.animation = anim;
  }

  createExplosionEffect(animation, x, y, depth) {
    // Создаем спрайт взрыва из fx_impact
    const sprite = this.scene.add.sprite(x, y, 'fx_impact');
    sprite.setOrigin(0.5);
    sprite.setDepth(depth);
    sprite.setScale(1.2);

    // Создаем уникальный ключ анимации
    const animKey = `explosion_effect_${this.animationCounter++}`;
    
    // Проверяем, не существует ли уже такая анимация
    if (this.createdAnimations.has(animKey)) {
      console.warn(`Animation key already exists: ${animKey}, skipping creation`);
      return;
    }
    
    // Создаем анимацию взрыва
    const anim = this.scene.anims.create({
      key: animKey,
      frames: this.scene.anims.generateFrameNumbers('fx_impact', { start: 20, end: 23 }),
      frameRate: 15,
      repeat: 0,
      hideOnComplete: true
    });

    this.createdAnimations.add(animKey);
    sprite.play(animKey);
    animation.sprite = sprite;
    animation.animation = anim;
  }

  createDisappearEffect(animation, x, y, depth) {
    // Создаем спрайт исчезновения из monsters (бабочка)
    const sprite = this.scene.add.sprite(x, y, 'monsters');
    sprite.setOrigin(0.5);
    sprite.setDepth(depth);
    sprite.setScale(0.6);

    // Создаем уникальный ключ анимации
    const animKey = `disappear_effect_${this.animationCounter++}`;
    
    // Проверяем, не существует ли уже такая анимация
    if (this.createdAnimations.has(animKey)) {
      console.warn(`Animation key already exists: ${animKey}, skipping creation`);
      return;
    }
    
    // Создаем анимацию исчезновения бабочки
    const anim = this.scene.anims.create({
      key: animKey,
      frames: this.scene.anims.generateFrameNumbers('monsters', { start: 134, end: 136 }),
      frameRate: 10,
      repeat: 0,
      hideOnComplete: true
    });

    this.createdAnimations.add(animKey);
    sprite.play(animKey);
    animation.sprite = sprite;
    animation.animation = anim;
  }

  createOpenEffect(animation, x, y, depth) {
    // Создаем спрайт открытия из fx_impact
    const sprite = this.scene.add.sprite(x, y, 'fx_impact');
    sprite.setOrigin(0.5);
    sprite.setDepth(depth);
    sprite.setScale(0.7);

    // Создаем уникальный ключ анимации
    const animKey = `open_effect_${this.animationCounter++}`;
    
    // Проверяем, не существует ли уже такая анимация
    if (this.createdAnimations.has(animKey)) {
      console.warn(`Animation key already exists: ${animKey}, skipping creation`);
      return;
    }
    
    // Создаем анимацию открытия
    const anim = this.scene.anims.create({
      key: animKey,
      frames: this.scene.anims.generateFrameNumbers('fx_impact', { start: 13, end: 11 }),
      frameRate: 8,
      repeat: 0,
      hideOnComplete: true
    });

    this.createdAnimations.add(animKey);
    sprite.play(animKey);
    animation.sprite = sprite;
    animation.animation = anim;
  }

  createSpellEffect(animation, x, y, depth) {
    // Создаем спрайт заклинания из fx_impact
    const sprite = this.scene.add.sprite(x, y, 'fx_impact');
    sprite.setOrigin(0.5);
    sprite.setDepth(depth);
    sprite.setScale(1.0);

    // Создаем уникальный ключ анимации
    const animKey = `spell_effect_${this.animationCounter++}`;
    
    // Проверяем, не существует ли уже такая анимация
    if (this.createdAnimations.has(animKey)) {
      console.warn(`Animation key already exists: ${animKey}, skipping creation`);
      return;
    }
    
    // Создаем анимацию заклинания
    const anim = this.scene.anims.create({
      key: animKey,
      frames: this.scene.anims.generateFrameNumbers('fx_impact', { start: 24, end: 28 }),
      frameRate: 12,
      repeat: 0,
      yoyo: true,
      hideOnComplete: true
    });

    this.createdAnimations.add(animKey);
    sprite.play(animKey);
    animation.sprite = sprite;
    animation.animation = anim;
  }

  updateEffectAnimation(entity, effect, animation, position, elapsed, duration) {
    if (!animation.sprite) return;

    // Обновляем позицию (для движущихся эффектов)
    const x = position.x + position.offsetX;
    const y = position.y + position.offsetY;
    animation.sprite.setPosition(x, y);

    // Применяем масштаб и прозрачность
    animation.sprite.setScale(animation.scale);
    animation.sprite.setAlpha(animation.alpha);

    // Для некоторых эффектов можно добавить дополнительную логику
    // Например, пульсацию или изменение цвета
    if (effect.type === 'hit') {
      const pulse = 1 + 0.2 * Math.sin(elapsed * 0.01);
      animation.sprite.setScale(animation.scale * pulse);
    }
  }

  cleanupEffect(entity, animation) {
    if (animation.sprite) {
      animation.sprite.destroy();
      animation.sprite = null;
    }
    if (animation.animation) {
      this.scene.anims.remove(animation.animation.key);
      this.createdAnimations.delete(animation.animation.key);
      animation.animation = null;
    }
  }

  // Метод для полной очистки всех анимаций (вызывается при перезапуске игры)
  cleanupAllAnimations() {
    this.createdAnimations.forEach(animKey => {
      if (this.scene.anims.exists(animKey)) {
        this.scene.anims.remove(animKey);
      }
    });
    this.createdAnimations.clear();
    this.animationCounter = 0;
  }

  // Метод для сброса счетчика без удаления анимаций (для новой игры)
  resetCounter() {
    this.animationCounter = 0;
    this.createdAnimations.clear();
  }
} 
import { System } from 'ecsy';
import { Effect, EffectAnimation, EffectPosition } from '../components';

export class EffectSystem extends System {
  init(attributes) {
    this.scene = attributes.scene;
    this.tileSize = attributes.tileSize;
    this.animationsCreated = false;
    this.animationKeys = {
      hit: 'hit_effect',
      explosion: 'explosion_effect', 
      disappear: 'disappear_effect',
      open: 'open_effect',
      spell: 'spell_effect'
    };
  }

  static queries = {
    effects: {
      components: [Effect, EffectAnimation, EffectPosition],
    }
  };

  execute(delta, time) {
    // Создаем анимации только один раз при первом запуске
    if (!this.animationsCreated) {
      this.createStaticAnimations();
      this.animationsCreated = true;
    }

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

  createStaticAnimations() {
    // Создаем статические анимации один раз
    if (!this.scene.anims.exists(this.animationKeys.hit)) {
      this.scene.anims.create({
        key: this.animationKeys.hit,
        frames: this.scene.anims.generateFrameNumbers('fx_impact', { start: 3, end: 5 }),
        frameRate: 12,
        repeat: 0,
        hideOnComplete: true
      });
    }

    if (!this.scene.anims.exists(this.animationKeys.explosion)) {
      this.scene.anims.create({
        key: this.animationKeys.explosion,
        frames: this.scene.anims.generateFrameNumbers('fx_impact', { start: 20, end: 23 }),
        frameRate: 15,
        repeat: 0,
        hideOnComplete: true
      });
    }

    if (!this.scene.anims.exists(this.animationKeys.disappear)) {
      this.scene.anims.create({
        key: this.animationKeys.disappear,
        frames: this.scene.anims.generateFrameNumbers('monsters', { start: 134, end: 136 }),
        frameRate: 10,
        repeat: 0,
        hideOnComplete: true
      });
    }

    if (!this.scene.anims.exists(this.animationKeys.open)) {
      this.scene.anims.create({
        key: this.animationKeys.open,
        frames: this.scene.anims.generateFrameNumbers('fx_impact', { start: 13, end: 11 }),
        frameRate: 8,
        repeat: 0,
        hideOnComplete: true
      });
    }

    if (!this.scene.anims.exists(this.animationKeys.spell)) {
      this.scene.anims.create({
        key: this.animationKeys.spell,
        frames: this.scene.anims.generateFrameNumbers('fx_impact', { start: 24, end: 28 }),
        frameRate: 12,
        repeat: 0,
        yoyo: true,
        hideOnComplete: true
      });
    }
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
    const sprite = this.scene.add.sprite(x, y, 'fx_impact');
    sprite.setOrigin(0.5);
    sprite.setDepth(depth);
    sprite.setScale(0.8);
    sprite.play(this.animationKeys.hit);
    animation.sprite = sprite;
  }

  createExplosionEffect(animation, x, y, depth) {
    const sprite = this.scene.add.sprite(x, y, 'fx_impact');
    sprite.setOrigin(0.5);
    sprite.setDepth(depth);
    sprite.setScale(1.2);
    sprite.play(this.animationKeys.explosion);
    animation.sprite = sprite;
  }

  createDisappearEffect(animation, x, y, depth) {
    const sprite = this.scene.add.sprite(x, y, 'monsters');
    sprite.setOrigin(0.5);
    sprite.setDepth(depth);
    sprite.setScale(0.6);
    sprite.play(this.animationKeys.disappear);
    animation.sprite = sprite;
  }

  createOpenEffect(animation, x, y, depth) {
    const sprite = this.scene.add.sprite(x, y, 'fx_impact');
    sprite.setOrigin(0.5);
    sprite.setDepth(depth);
    sprite.setScale(0.7);
    sprite.play(this.animationKeys.open);
    animation.sprite = sprite;
  }

  createSpellEffect(animation, x, y, depth) {
    const sprite = this.scene.add.sprite(x, y, 'fx_impact');
    sprite.setOrigin(0.5);
    sprite.setDepth(depth);
    sprite.setScale(1.0);
    sprite.play(this.animationKeys.spell);
    animation.sprite = sprite;
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
  }

  // Метод для полной очистки всех анимаций (вызывается при перезапуске игры)
  cleanupAllAnimations() {
    // Удаляем статические анимации
    Object.values(this.animationKeys).forEach(animKey => {
      if (this.scene.anims.exists(animKey)) {
        this.scene.anims.remove(animKey);
      }
    });
    this.animationsCreated = false;
  }

  // Метод для сброса (больше не нужен, но оставляем для совместимости)
  resetCounter() {
    this.cleanupAllAnimations();
  }
} 
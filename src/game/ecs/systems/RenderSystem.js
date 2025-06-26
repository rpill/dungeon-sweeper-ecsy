import { System } from 'ecsy';
import { Position, Sprite, Tile, Revealed, Defeated } from '../components';

export class RenderSystem extends System {
  init(attributes) {
    this.scene = attributes.scene;
    this.container = attributes.container;
    this.tileSize = attributes.tileSize;
  }

  static queries = {
    tiles: {
        components: [Tile, Position]
    },
    sprites: {
        components: [Sprite, Position],
        listen: { added: true, removed: true }
    },
    revealedTiles: { components: [Tile, Revealed] },
    defeatedActors: { components: [Sprite, Defeated] }
  };

  execute(delta, time) {
    // Рендерим все плитки
    this.queries.tiles.results.forEach(entity => this.renderTile(entity));
    // Рендерим новые спрайты акторов
    this.queries.sprites.added.forEach(entity => this.renderSprite(entity));
    // Можно добавить обновление/скрытие по revealed/defeated
  }
    
  renderTile(entity) {
    const tile = entity.getComponent(Tile);
    const position = entity.getComponent(Position);
    const tileSprite = this.scene.add.image(
      position.x * this.tileSize,
      position.y * this.tileSize,
      'tiles',
      tile.baseType
    ).setOrigin(0);
    tileSprite.setInteractive();
    this.container.add(tileSprite);
    entity.tileSprite = tileSprite;
  }

  renderSprite(entity) {
    if (!entity.hasComponent(Revealed)) return;
    const sprite = entity.getComponent(Sprite);
    const position = entity.getComponent(Position);
    if (!sprite || !position) return;
    const spriteObj = this.scene.add.image(
      position.x * this.tileSize,
      position.y * this.tileSize,
      sprite.spriteSheet,
      sprite.frame
    );
    this.container.add(spriteObj);
    entity.spriteObj = spriteObj;
  }

  updateSprite(entity) {
    // Implementation for updating sprites will be added in the next steps
  }

  removeSprite(entity) {
    // Implementation for removing sprites will be added in the next steps
  }
}
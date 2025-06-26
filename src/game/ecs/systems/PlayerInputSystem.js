import { System } from 'ecsy';
import { TryReveal, Position, Tile, Sprite, Monster, Revealed, Defeated, TryAttack, Item, UseItem } from '../components';

export class PlayerInputSystem extends System {
    static queries = {
        tiles: { components: [Tile, Position] },
        actors: { components: [Position, Sprite] },
    };

    init(attributes) {
        this.scene = attributes.scene;
        this.tileSize = attributes.tileSize;
        this.scene.input.on('pointerdown', this.onPointerDown, this);
    }

    onPointerDown(pointer) {
        if (pointer.rightButtonDown()) return;
        const x = Math.floor(pointer.worldX / this.tileSize);
        const y = Math.floor(pointer.worldY / this.tileSize);
        const tileEntity = this.queries.tiles.results.find(tile => {
            const pos = tile.getComponent(Position);
            return pos.x === x && pos.y === y;
        });
        const actor = this.queries.actors.results.find(actor => {
            const pos = actor.getComponent(Position);
            return pos.x === x && pos.y === y &&
                actor.hasComponent(Monster) &&
                actor.hasComponent(Revealed) &&
                !actor.hasComponent(Defeated);
        });
        if (actor) {
            if (!actor.hasComponent(TryAttack)) {
                actor.addComponent(TryAttack);
            }
            return;
        }
        if (tileEntity && !tileEntity.hasComponent(TryReveal)) {
            tileEntity.addComponent(TryReveal);
        }
        // Активация предмета (например, орба) по клику
        const item = this.queries.actors.results.find(actor => {
            const pos = actor.getComponent(Position);
            return pos.x === x && pos.y === y &&
                actor.hasComponent(Item) &&
                actor.hasComponent(Revealed) &&
                !actor.hasComponent(UseItem);
        });
        if (item) {
            item.addComponent(UseItem);
            return;
        }
    }

    stop() {
        this.scene.input.off('pointerdown', this.onPointerDown, this);
    }

    execute() { }
}
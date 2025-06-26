import { System } from 'ecsy';
import {
  TryReveal,
  Position,
  Tile,
  Sprite,
  Monster,
  Revealed,
  Defeated,
  TryAttack,
  Item,
  UseItem,
  Chest,
  Opened,
  TryOpen,
  TryCollect,
  TryCollectLoot,
  XP
} from '../components';

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
        
        // Проверяем убитого монстра для сбора лута
        const monsterToCollect = this.queries.actors.results.find(actor => {
            const pos = actor.getComponent(Position);
            return pos.x === x && pos.y === y &&
                actor.hasComponent(Monster) &&
                actor.hasComponent(Defeated) &&
                !actor.hasComponent(TryCollectLoot);
        });
        if (monsterToCollect) {
            monsterToCollect.addComponent(TryCollectLoot);
            return;
        }
        
        // Проверяем открытый сундук с опытом для сбора
        const chestToCollect = this.queries.actors.results.find(actor => {
            const pos = actor.getComponent(Position);
            return pos.x === x && pos.y === y &&
                actor.hasComponent(Chest) &&
                actor.hasComponent(Opened) &&
                actor.hasComponent(XP) &&
                !actor.hasComponent(TryCollect);
        });
        if (chestToCollect) {
            chestToCollect.addComponent(TryCollect);
            return;
        }
        
        // Проверяем закрытый сундук для открытия
        const chest = this.queries.actors.results.find(actor => {
            const pos = actor.getComponent(Position);
            return pos.x === x && pos.y === y &&
                actor.hasComponent(Chest) &&
                actor.hasComponent(Revealed) &&
                !actor.hasComponent(Opened);
        });
        if (chest) {
            if (!chest.hasComponent(TryOpen)) {
                chest.addComponent(TryOpen);
            }
            return;
        }
        
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
        // Активация предмета (например, орба или медкита) по клику
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
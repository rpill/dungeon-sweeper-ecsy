import { StatusEvents } from './events/EventNames';
import { Player } from './entities/Player';

class DataManager {
    constructor() {
        if (DataManager.instance) {
            return DataManager.instance;
        }
        this.width = 13;
        this.height = 10;
        this.tileSize = 48;
        this.debug = false;
        this.reset();
        DataManager.instance = this;
    }

    reset() {
        this.status = StatusEvents.NONE;
        this.player = null;
    }

    initialize(scene) {
        this.scene = scene;
        this.status = StatusEvents.NONE;
        this.player = new Player();
    }

    setStatus(status) {
        this.status = status;
    }
}

export const dataManager = new DataManager(); 
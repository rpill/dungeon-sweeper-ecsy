import { StatusEvents } from './events/EventNames';
import { Player } from './entities/Player';
import { sceneEvents } from './events/EventsCenter';

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
    this.startTime = null;
    this.endTime = null;
    this.gameStartCount = 1;
  }

  initialize(scene) {
    this.scene = scene;
    this.status = StatusEvents.NONE;
    this.player = new Player();
    this.startTime = null;
    this.endTime = null;
    this.gameStartCount = (this.gameStartCount || 1) + 1;
  }

  setStatus(status) {
    const previous = this.status;
    this.status = status;
    if (status === StatusEvents.PLAYING) {
      this.startTime = Date.now();
      this.endTime = null;
    }
    if (status === StatusEvents.WIN || status === StatusEvents.LOSE) {
      this.endTime = Date.now();
    }
    sceneEvents.emit(StatusEvents.CHANGED, { previous, current: status });
  }

  getElapsedTime() {
    if (this.startTime && this.endTime) {
      return Math.floor((this.endTime - this.startTime) / 1000);
    }
    return 0;
  }
}

export const dataManager = new DataManager(); 
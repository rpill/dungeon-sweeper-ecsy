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
    this.startTime = null;
    this.endTime = null;
  }

  initialize(scene) {
    this.scene = scene;
    this.status = StatusEvents.NONE;
    this.player = new Player();
    this.startTime = null;
    this.endTime = null;
  }

  setStatus(status) {
    this.status = status;
    if (status === StatusEvents.PLAYING) {
      this.startTime = Date.now();
      this.endTime = null;
    }
    if (status === StatusEvents.WIN || status === StatusEvents.LOSE) {
      this.endTime = Date.now();
    }
  }

  getElapsedTime() {
    if (this.startTime && this.endTime) {
      return Math.floor((this.endTime - this.startTime) / 1000);
    }
    return 0;
  }
}

export const dataManager = new DataManager(); 
import { StatusEvents } from './events/EventNames';
import { Player } from './entities/Player';
import { sceneEvents } from './events/EventsCenter';
import { gameSaveManager } from './GameSaveManager';

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

    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
  }

  reset() {
    this.status = StatusEvents.NONE;
    this.player = null;
    this.startTime = null;
    this.elapsedTime = 0;
    this.reviveUsed = false;
  }

  initialize(scene) {
    this.scene = scene;
    this.status = StatusEvents.NONE;
    this.player = new Player();
    this.startTime = null;
    this.elapsedTime = 0;
    this.reviveUsed = false;
  }

  setStatus(status) {
    const previous = this.status;
    this.status = status;
    
    if (status === StatusEvents.PLAYING) {
      if (!this.startTime) {
        this.startTime = Date.now();
      }
    }
    if (status === StatusEvents.WIN || status === StatusEvents.LOSE) {
      if (this.startTime) {
        this.elapsedTime += Math.floor((Date.now() - this.startTime) / 1000);
        this.startTime = null;
      }
      gameSaveManager.clearSave();
    }
    if (status !== StatusEvents.PLAYING && this.startTime) {
      this.elapsedTime += Math.floor((Date.now() - this.startTime) / 1000);
      this.startTime = null;
    }
    sceneEvents.emit(StatusEvents.CHANGED, { previous, current: status });
    
    if (status === StatusEvents.PLAYING) {
      setTimeout(() => {
        gameSaveManager.saveGameState();
      }, 100);
    }
  }

  getElapsedTime() {
    if (this.startTime) {
      return this.elapsedTime + Math.floor((Date.now() - this.startTime) / 1000);
    }
    return this.elapsedTime;
  }

  handleVisibilityChange() {
    if (document.hidden) {
      // Если страница скрыта, ставим таймер на паузу
      if (this.status === StatusEvents.PLAYING && this.startTime) {
        this.elapsedTime += Math.floor((Date.now() - this.startTime) / 1000);
        this.startTime = null;
        gameSaveManager.saveGameState(); // Сохраняем состояние при скрытии вкладки
      }
    } else {
      // Если страница снова видима, возобновляем таймер
      if (this.status === StatusEvents.PLAYING && !this.startTime) {
        this.startTime = Date.now();
      }
    }
  }
}

export const dataManager = new DataManager(); 
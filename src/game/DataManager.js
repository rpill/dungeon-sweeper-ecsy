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
  }

  reset() {
    this.status = StatusEvents.NONE;
    this.player = null;
    this.startTimestamp = null;
    this.endTimestamp = null;
    this.reviveUsed = false;
  }

  initialize(scene) {
    this.scene = scene;
    this.status = StatusEvents.NONE;
    this.player = new Player();
    this.startTimestamp = null;
    this.endTimestamp = null;
    this.reviveUsed = false;
    console.log('DataManager: initialize - сцена:', !!scene, 'игрок:', !!this.player);
  }

  setStatus(status) {
    const previous = this.status;
    this.status = status;
    console.log('DataManager: setStatus -', previous, '->', status);
    
    if (status === StatusEvents.PLAYING) {
      if (!this.startTimestamp) {
        this.startTimestamp = Date.now();
      }
      this.endTimestamp = null;
    }
    if (status === StatusEvents.WIN || status === StatusEvents.LOSE) {
      this.endTimestamp = Date.now();
      gameSaveManager.clearSave();
    }
    sceneEvents.emit(StatusEvents.CHANGED, { previous, current: status });
    
    if (status === StatusEvents.PLAYING) {
      setTimeout(() => {
        gameSaveManager.saveGameState();
      }, 100);
    }
  }

  getElapsedTime() {
    if (this.startTimestamp) {
      if (this.status === StatusEvents.WIN || this.status === StatusEvents.LOSE) {
        return Math.floor((this.endTimestamp - this.startTimestamp) / 1000);
      } else {
        return Math.floor((Date.now() - this.startTimestamp) / 1000);
      }
    }
    return 0;
  }

  LEADERBOARD_CACHE_KEY = 'leaderboardCache';
  LEADERBOARD_CACHE_TTL = 60 * 1000; // 1 минута

  setLeaderboardCache(data) {
    localStorage.setItem(this.LEADERBOARD_CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  }

  getLeaderboardCache() {
    const cacheStr = localStorage.getItem(this.LEADERBOARD_CACHE_KEY);
    if (cacheStr) {
      try {
        const cacheObj = JSON.parse(cacheStr);
        if (cacheObj.timestamp && (Date.now() - cacheObj.timestamp < this.LEADERBOARD_CACHE_TTL)) {
          return cacheObj.data;
        }
      } catch (e) {}
    }
    return null;
  }

  clearLeaderboardCache() {
    localStorage.removeItem(this.LEADERBOARD_CACHE_KEY);
  }
}

export const dataManager = new DataManager(); 
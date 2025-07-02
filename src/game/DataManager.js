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
    this.reviveUsed = false;
  }

  initialize(scene) {
    this.scene = scene;
    this.status = StatusEvents.NONE;
    this.player = new Player();
    this.startTime = null;
    this.endTime = null;
    this.gameStartCount = (this.gameStartCount || 1) + 1;
    this.reviveUsed = false;
  }

  setStatus(status) {
    const previous = this.status;
    this.status = status;
    if (status === StatusEvents.PLAYING) {
      if (this.startTime === null) {
        this.startTime = Date.now();
      }
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
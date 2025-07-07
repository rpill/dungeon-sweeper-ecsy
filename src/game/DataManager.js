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
    console.log('DataManager: initialize - сцена:', !!scene, 'игрок:', !!this.player);
  }

  setStatus(status) {
    const previous = this.status;
    this.status = status;
    console.log('DataManager: setStatus -', previous, '->', status);
    
    if (status === StatusEvents.PLAYING) {
      if (this.startTime === null) {
        this.startTime = Date.now();
      }
      this.endTime = null;
    }
    if (status === StatusEvents.WIN || status === StatusEvents.LOSE) {
      this.endTime = Date.now();
      // Очищаем сохранение при завершении игры
      gameSaveManager.clearSave();
    }
    sceneEvents.emit(StatusEvents.CHANGED, { previous, current: status });
    
    // Автоматически сохраняем игру при изменении статуса на PLAYING
    if (status === StatusEvents.PLAYING) {
      console.log('DataManager: setStatus - сохраняем игру при статусе PLAYING');
      // Используем setTimeout чтобы дать время на инициализацию
      setTimeout(() => {
        gameSaveManager.saveGameState();
      }, 100);
    }
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
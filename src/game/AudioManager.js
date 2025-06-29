import { sceneEvents } from './events/EventsCenter';
import { AudioEvents } from './events/EventNames';

export class AudioManager {
  constructor() {
    this.scene = null;
    this.sounds = new Map();
    this.music = null;
    this.winMusic = null;
    this.settings = this.loadSettings();
    this.userInteracted = false; // Флаг для отслеживания первого взаимодействия
  }

  // Метод для инициализации с scene
  initialize(scene) {
    this.scene = scene;
    this.setupEventListeners();
    // Создаем звуки
    this.createSounds();
  }

  // Метод для переинициализации с новой сценой
  reinitialize(scene) {
    // Останавливаем только музыку победы, обычную музыку не трогаем
    if (this.winMusic) {
      this.winMusic.stop();
      this.winMusic.destroy();
      this.winMusic = null;
    }
    
    this.scene = scene;
    
    // Пересоздаем только звуки, музыку не трогаем
    this.sounds.forEach(sound => {
      sound.destroy();
    });
    this.sounds.clear();
    
    // Создаем звуки заново
    this.createSounds();
    
    // Воспроизводим обычную музыку если она включена и пользователь уже взаимодействовал
    if (this.settings.musicEnabled && this.userInteracted && this.music && !this.music.isPlaying) {
      this.playMusic();
    }
  }

  loadSettings() {
    const defaultSettings = {
      musicEnabled: true,
      soundEnabled: true,
      musicVolume: 0.3,
      soundVolume: 0.5
    };

    try {
      const saved = localStorage.getItem('audioSettings');
      const settings = saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
      return settings;
    } catch (error) {
      console.warn('Не удалось загрузить настройки звука:', error);
      return defaultSettings;
    }
  }

  saveSettings() {
    try {
      localStorage.setItem('audioSettings', JSON.stringify(this.settings));
    } catch (error) {
      console.warn('Не удалось сохранить настройки звука:', error);
    }
  }

  setupEventListeners() {
    // Слушаем события для воспроизведения звуков
    sceneEvents.on(AudioEvents.PLAYER_CLICK, () => {
      this.onUserInteraction(); // Обрабатываем первое взаимодействие
      this.playClick();
    });
    sceneEvents.on(AudioEvents.PLAYER_REVEAL, () => {
      this.onUserInteraction(); // Обрабатываем первое взаимодействие
      this.playReveal();
    });
    sceneEvents.on(AudioEvents.PLAYER_DENIED, this.playDenied.bind(this));
    sceneEvents.on(AudioEvents.ENEMY_DEAD, this.playEnemyDead.bind(this));
    sceneEvents.on(AudioEvents.PLAYER_DEAD, this.playPlayerDead.bind(this));
    sceneEvents.on(AudioEvents.EXPLOSION, this.playExplosion.bind(this));
    sceneEvents.on(AudioEvents.USE_ITEM, this.playUseItem.bind(this));
    sceneEvents.on(AudioEvents.CHEST_OPEN, this.playChestOpen.bind(this));
    sceneEvents.on(AudioEvents.HEAL, this.playHeal.bind(this));
    sceneEvents.on(AudioEvents.GRANT_XP, this.playGrantXp.bind(this));
    sceneEvents.on(AudioEvents.GRANT_XP_MAX, this.playGrantXpMax.bind(this));
    sceneEvents.on(AudioEvents.LEVEL_UP, this.playLevelUp.bind(this));
    sceneEvents.on(AudioEvents.MISS, this.playMiss.bind(this));
    sceneEvents.on(AudioEvents.SETTINGS_CHANGED, this.updateSettings.bind(this));
    sceneEvents.on(AudioEvents.STOP_WIN_MUSIC, () => {
      this.stopWinMusic();
    });
  }

  createSounds() {
    // Создаем звуковые объекты
    this.sounds.set('click', this.scene.sound.add('click'));
    this.sounds.set('reveal', this.scene.sound.add('reveal'));
    this.sounds.set('denied', this.scene.sound.add('denied'));
    this.sounds.set('enemy_dead', this.scene.sound.add('enemy_dead'));
    this.sounds.set('player_dead', this.scene.sound.add('player_dead'));
    this.sounds.set('explosion', this.scene.sound.add('explosion'));
    this.sounds.set('use_item', this.scene.sound.add('use_item'));
    this.sounds.set('chest_open', this.scene.sound.add('chest_open'));
    this.sounds.set('heal', this.scene.sound.add('heal'));
    this.sounds.set('grant_xp', this.scene.sound.add('grant_xp'));
    this.sounds.set('grant_xp_max', this.scene.sound.add('grant_xp_max'));
    this.sounds.set('level_up', this.scene.sound.add('level_up'));
    this.sounds.set('miss', this.scene.sound.add('miss'));

    // Создаем музыку только если её еще нет
    if (!this.music) {
      this.music = this.scene.sound.add('ambient', {
        loop: true,
        volume: this.settings.musicVolume
      });
    }

    // Устанавливаем громкость для всех звуков
    this.updateSoundVolumes();
  }

  updateSoundVolumes() {
    this.sounds.forEach(sound => {
      const volume = this.settings.soundEnabled ? this.settings.soundVolume : 0;
      sound.setVolume(volume);
    });

    if (this.music) {
      const musicVolume = this.settings.musicEnabled ? this.settings.musicVolume : 0;
      this.music.setVolume(musicVolume);
    }
    
    // Обновляем громкость музыки победы
    if (this.winMusic) {
      const winMusicVolume = this.settings.musicEnabled ? this.settings.musicVolume : 0;
      this.winMusic.setVolume(winMusicVolume);
    }
  }

  // Методы для воспроизведения звуков
  playClick() {
    if (this.settings.soundEnabled) {
      this.sounds.get('click').play();
    }
  }

  playReveal() {
    if (this.settings.soundEnabled) {
      this.sounds.get('reveal').play();
    }
  }

  playDenied() {
    if (this.settings.soundEnabled) {
      this.sounds.get('denied').play();
    }
  }

  playEnemyDead() {
    if (this.settings.soundEnabled) {
      this.sounds.get('enemy_dead').play();
    }
  }

  playPlayerDead() {
    if (this.settings.soundEnabled) {
      this.sounds.get('player_dead').play();
    }
  }

  playExplosion() {
    if (this.settings.soundEnabled) {
      this.sounds.get('explosion').play();
    }
  }

  playUseItem() {
    if (this.settings.soundEnabled) {
      this.sounds.get('use_item').play();
    }
  }

  playChestOpen() {
    if (this.settings.soundEnabled) {
      this.sounds.get('chest_open').play();
    }
  }

  playHeal() {
    if (this.settings.soundEnabled) {
      this.sounds.get('heal').play();
    }
  }

  playGrantXp() {
    if (this.settings.soundEnabled) {
      this.sounds.get('grant_xp').play();
    }
  }

  playGrantXpMax() {
    if (this.settings.soundEnabled) {
      this.sounds.get('grant_xp_max').play();
    }
  }

  playLevelUp() {
    if (this.settings.soundEnabled) {
      this.sounds.get('level_up').play();
    }
  }

  playMiss() {
    if (this.settings.soundEnabled) {
      this.sounds.get('miss').play();
    }
  }

  // Методы для управления музыкой
  playMusic() {
    
    // Проверяем, что пользователь уже взаимодействовал с игрой
    if (!this.userInteracted) {
      return;
    }
    
    // Проверяем, что никакая музыка не играет уже
    if (this.isAnyMusicPlaying()) {
      return;
    }
    
    if (this.settings.musicEnabled && this.music) {
      this.music.play();
    }
  }

  stopMusic() {
    if (this.music && this.music.isPlaying) {
      this.music.stop();
    }
  }

  pauseMusic() {
    if (this.music && this.music.isPlaying) {
      this.music.pause();
    }
  }

  resumeMusic() {
    if (this.settings.musicEnabled && this.music && this.music.isPaused) {
      this.music.resume();
    }
  }

  playWinMusic() {
    // Останавливаем обычную музыку
    this.stopMusic();
    
    if (this.settings.musicEnabled) {
      // Создаем музыку победы и сохраняем ссылку на неё
      this.winMusic = this.scene.sound.add('ambient_win', {
        loop: false,
        volume: this.settings.musicVolume
      });
      
      // Добавляем обработчик завершения музыки победы
      this.winMusic.once('complete', () => {
        if (this.winMusic) {
          this.winMusic.destroy();
          this.winMusic = null;
        }
        // Возвращаемся к обычной музыке
        this.playMusic();
      });
      
      this.winMusic.play();
    }
  }

  stopWinMusic() {
    if (this.winMusic) {
      this.winMusic.stop();
      this.winMusic.destroy();
      this.winMusic = null;
      
      // Возвращаем обычную музыку только если она не играет и пользователь взаимодействовал
      if (this.music && !this.music.isPlaying && this.userInteracted && this.settings.musicEnabled) {
        this.playMusic();
      }
    }
  }

  forceStopWinMusic() {
    if (this.winMusic) {
      // Удаляем обработчик завершения чтобы избежать автоматического возврата к обычной музыке
      this.winMusic.removeAllListeners('complete');
      
      this.winMusic.stop();
      this.winMusic.destroy();
      this.winMusic = null;
    }
  }

  // Методы для управления настройками
  updateSettings() {
    this.settings = this.loadSettings();
    this.updateSoundVolumes();
    
    if (this.settings.musicEnabled) {
      // Если музыка включена, но обычная музыка не играет и нет музыки победы, запускаем её
      if (this.music && !this.music.isPlaying && !this.winMusic && this.userInteracted) {
        this.playMusic();
      }
    } else {
      // Если музыка отключена, останавливаем все виды музыки
      this.stopMusic();
      if (this.winMusic) {
        this.winMusic.stop();
        this.winMusic.destroy();
        this.winMusic = null;
      }
    }
  }

  toggleMusic() {
    this.settings.musicEnabled = !this.settings.musicEnabled;
    this.updateSoundVolumes();
    this.saveSettings();
    
    if (this.settings.musicEnabled) {
      // Если музыка включена, запускаем обычную музыку только если нет музыки победы и пользователь взаимодействовал
      if (!this.winMusic && this.userInteracted && this.music && !this.music.isPlaying) {
        this.playMusic();
      }
    } else {
      this.stopMusic();
      // Останавливаем музыку победы при отключении музыки
      if (this.winMusic) {
        this.winMusic.stop();
        this.winMusic.destroy();
        this.winMusic = null;
      }
    }
  }

  toggleSound() {
    this.settings.soundEnabled = !this.settings.soundEnabled;
    this.updateSoundVolumes();
    this.saveSettings();
  }

  setMusicVolume(volume) {
    this.settings.musicVolume = Math.max(0, Math.min(1, volume));
    this.updateSoundVolumes();
    this.saveSettings();
  }

  setSoundVolume(volume) {
    this.settings.soundVolume = Math.max(0, Math.min(1, volume));
    this.updateSoundVolumes();
    this.saveSettings();
  }

  getSettings() {
    return { ...this.settings };
  }

  getCurrentMusicStatus() {
    return {
      musicEnabled: this.settings.musicEnabled,
      musicVolume: this.settings.musicVolume,
      musicExists: !!this.music,
      musicIsPlaying: this.music ? this.music.isPlaying : false,
      winMusicExists: !!this.winMusic,
      winMusicIsPlaying: this.winMusic ? this.winMusic.isPlaying : false
    };
  }

  isAnyMusicPlaying() {
    return (this.music && this.music.isPlaying) || (this.winMusic && this.winMusic.isPlaying);
  }

  clearAllMusic() {
    // Останавливаем и уничтожаем обычную музыку
    if (this.music) {
      this.music.stop();
      this.music.destroy();
      this.music = null;
    }
    
    // Останавливаем и уничтожаем музыку победы
    if (this.winMusic) {
      this.winMusic.stop();
      this.winMusic.destroy();
      this.winMusic = null;
    }
    
    // Сбрасываем флаг взаимодействия
    this.userInteracted = false;
  }

  destroy() {
    // Удаляем слушатели событий
    sceneEvents.off(AudioEvents.PLAYER_CLICK, () => {
      this.onUserInteraction(); // Обрабатываем первое взаимодействие
      this.playClick();
    });
    sceneEvents.off(AudioEvents.PLAYER_REVEAL, () => {
      this.onUserInteraction(); // Обрабатываем первое взаимодействие
      this.playReveal();
    });
    sceneEvents.off(AudioEvents.PLAYER_DENIED, this.playDenied.bind(this));
    sceneEvents.off(AudioEvents.ENEMY_DEAD, this.playEnemyDead.bind(this));
    sceneEvents.off(AudioEvents.PLAYER_DEAD, this.playPlayerDead.bind(this));
    sceneEvents.off(AudioEvents.EXPLOSION, this.playExplosion.bind(this));
    sceneEvents.off(AudioEvents.USE_ITEM, this.playUseItem.bind(this));
    sceneEvents.off(AudioEvents.CHEST_OPEN, this.playChestOpen.bind(this));
    sceneEvents.off(AudioEvents.HEAL, this.playHeal.bind(this));
    sceneEvents.off(AudioEvents.GRANT_XP, this.playGrantXp.bind(this));
    sceneEvents.off(AudioEvents.GRANT_XP_MAX, this.playGrantXpMax.bind(this));
    sceneEvents.off(AudioEvents.LEVEL_UP, this.playLevelUp.bind(this));
    sceneEvents.off(AudioEvents.MISS, this.playMiss.bind(this));
    sceneEvents.off(AudioEvents.SETTINGS_CHANGED, this.updateSettings.bind(this));
    sceneEvents.off(AudioEvents.STOP_WIN_MUSIC, this.stopWinMusic.bind(this));

    // Полностью очищаем всю музыку
    this.clearAllMusic();
    
    // Останавливаем и уничтожаем звуки
    this.sounds.forEach(sound => {
      sound.destroy();
    });
    this.sounds.clear();
  }

  // Метод для обработки первого взаимодействия пользователя
  onUserInteraction() {
    if (!this.userInteracted) {
      this.userInteracted = true;
      
      // Запускаем музыку если она включена в настройках и не играет
      if (this.settings.musicEnabled && this.music && !this.music.isPlaying) {
        this.playMusic();
      }
    }
  }
}

// Глобальный экземпляр AudioManager
export const audioManager = new AudioManager(); 
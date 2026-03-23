import { Scene } from 'phaser';
import { SCENE_KEYS } from './SceneKeys';
import { AudioEvents } from '../events/EventNames';
import { sceneEvents } from '../events/EventsCenter';
import { audioManager } from '../AudioManager';
import { t } from '../i18n';
import { dataManager } from '../DataManager';
import { yandexGames } from '../platform/YandexGames';

export class GameOver extends Scene {
  constructor() {
    super({ key: SCENE_KEYS.GAME_OVER });
  }

  create(data) {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    function formatTime(seconds) {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      const pad = Phaser.Utils.String.Pad;
      if (h > 0) {
        return `${pad(h, 2, '0', 1)}:${pad(m, 2, '0', 1)}:${pad(s, 2, '0', 1)}`;
      } else {
        return `${pad(m, 2, '0', 1)}:${pad(s, 2, '0', 1)}`;
      }
    }

    // Фон меню
    this.add.image(centerX, centerY, 'menu_background');

    const bgColor = data.win ? 0x445f41 : 0xa04f4f;
    // Полупрозрачный затемняющий фон
    const bg = this.add.rectangle(centerX, centerY, this.scale.width, this.scale.height, bgColor, 0.55);
    bg.setOrigin(0.5);
    bg.setDepth(0);

    let offsetY = -60;
    if (data.win) {
      this.add.bitmapText(centerX, centerY + offsetY, 'ui', t('win'), 20).setOrigin(0.5).setTint(0xffffff);
    } else {
      this.add.bitmapText(centerX, centerY + offsetY, 'ui', t('lose'), 20).setOrigin(0.5).setTint(0xffffff);
    }
    offsetY += 60;
    this.add.bitmapText(centerX, centerY + offsetY, 'ui', `${t('time')}: ${formatTime(data.time)}`, 18).setOrigin(0.5).setTint(0xffffff);
    offsetY += 30;
    this.add.bitmapText(centerX, centerY + offsetY, 'ui', `${t('score')}: ${data.score}`, 18).setOrigin(0.5).setTint(0xffffff);
    offsetY += 70;

    // --- Лидерборды ---
    if (yandexGames.sdk && yandexGames.sdk.getPlayer && yandexGames.sdk.leaderboards) {
      yandexGames.sdk.getPlayer().then(player => {
        if (player.isAuthorized && player.isAuthorized()) {
          // BestTime: только если победа
          if (data.win) {
            // Получаем текущее лучшее время игрока
            yandexGames.sdk.leaderboards.getPlayerEntry('BestTime').then(entry => {
              const prevBest = entry && typeof entry.score === 'number' ? entry.score : null;
              const newTime = data.time * 1000; // переводим в миллисекунды
              // Если нет предыдущего результата или новое время лучше — отправляем
              if (prevBest === null || newTime < prevBest) {
                yandexGames.sdk.leaderboards.setScore('BestTime', newTime)
                  .then(() => {
                    // Отправляем TotalScore после успешного сохранения BestTime
                    setTimeout(() => {
                      this.sendTotalScore(data.score);
                    }, 1100); // задержка чуть больше 1 секунды
                  })
                  .catch((err) => console.error('BestTime save error:', err));
              } else {
                // Отправляем TotalScore сразу, если BestTime не обновлялся
                this.sendTotalScore(data.score);
              }
            }).catch((err) => {
              // Если не удалось получить предыдущее время — просто отправляем
              yandexGames.sdk.leaderboards.setScore('BestTime', data.time * 1000)
                .then(() => {
                  // Отправляем TotalScore после успешного сохранения BestTime
                  setTimeout(() => {
                    this.sendTotalScore(data.score);
                  }, 1100);
                })
                .catch((err) => console.error('BestTime save error:', err));
            });
          } else {
            // Если не победа, отправляем только TotalScore
            this.sendTotalScore(data.score);
          }
        }
      });
    }
    // --- конец лидербордов ---

    // --- Локальное сохранение для неавторизованных ---
    if (yandexGames.sdk && yandexGames.sdk.getPlayer) {
      yandexGames.sdk.getPlayer().then(player => {
        if (!player.isAuthorized || !player.isAuthorized()) {
          // Сохраняем лучший результат (BestTime) только если победа
          if (data.win) {
            const prevBest = Number(localStorage.getItem('bestTime') || 0);
            const newTime = data.time * 1000;
            if (!prevBest || newTime < prevBest) {
              localStorage.setItem('bestTime', newTime);
            }
          }
          // Сохраняем общий счет (TotalScore)
          const prevScore = Number(localStorage.getItem('totalScore') || 0);
          localStorage.setItem('totalScore', prevScore + data.score);
        }
      });
    }

    // --- Показываем напоминание об отзыве ---
    if (yandexGames.sdk && yandexGames.sdk.feedback) {
      if (dataManager.getGamesPlayed() === 5) {
        yandexGames.sdk.feedback.canReview()
          .then(({ value, reason }) => {
            if (value) {
              yandexGames.sdk.feedback.requestReview()
                .then(({ feedbackSent }) => {
                  if (feedbackSent) {
                    // Можно показать благодарность или анимацию
                    console.log('Спасибо за вашу оценку!');
                  } else {
                    console.log('Окно оценки закрыто без оценки');
                  }
                });
            } else {
              console.log('Оценка недоступна:', reason);
            }
          });
      }
    }
    // Кнопка "В меню"
    const menuBtn = this.add.bitmapText(centerX, centerY + offsetY, 'ui', t('menu'), 18)
      .setOrigin(0.5)
      .setTint(0xffffff)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        sceneEvents.emit(AudioEvents.PLAYER_CLICK);
        
        // Принудительно останавливаем музыку победы
        audioManager.forceStopWinMusic();
        
        // Запускаем обычную музыку если она не играет
        if (audioManager.music && !audioManager.music.isPlaying && audioManager.userInteracted && audioManager.settings.musicEnabled) {
          audioManager.playMusic();
        }
        
        this.scene.start(SCENE_KEYS.MENU);
      });
  }

  // Метод для отправки TotalScore
  sendTotalScore(score) {
    yandexGames.sdk.leaderboards.getPlayerEntry('TotalScore')
      .then(entry => {
        const prev = entry && typeof entry.score === 'number' ? entry.score : 0;
        const newTotal = prev + score;
        yandexGames.sdk.leaderboards.setScore('TotalScore', newTotal)
          .catch((err) => console.error('TotalScore save error:', err));
      })
      .catch((err) => {
        yandexGames.sdk.leaderboards.setScore('TotalScore', score)
          .catch((err) => console.error('TotalScore save error:', err));
      });
  }
}

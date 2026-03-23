const REMOTE_SDK_URL = 'https://sdk.games.s3.yandex.net/sdk.js';
const SCRIPT_SELECTOR = 'script[data-ya-games-sdk="true"],script[src*="sdk.games.s3.yandex.net/sdk.js"]';
const DEFAULT_LOAD_TIMEOUT_MS = 3500;
const DEFAULT_INIT_TIMEOUT_MS = 4000;

function createTimeoutPromise(timeoutMs, message) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), timeoutMs);
  });
}

function toDisplayName(playerId) {
  if (!playerId) return 'Anonymous';
  return 'Local Player';
}

function formatLeaderboardScore(name, score) {
  if (name === 'BestTime') {
    return `${Math.floor(score / 1000)}s`;
  }
  return `${score}`;
}

function isAscendingLeaderboard(name) {
  return name === 'BestTime';
}

function createMockSdk() {
  const state = {
    authorized: false,
    playerId: 'local-player',
    boards: new Map(),
  };

  function getBoardMap(name) {
    if (!state.boards.has(name)) {
      state.boards.set(name, new Map());
    }
    return state.boards.get(name);
  }

  function sortedEntries(name) {
    const board = getBoardMap(name);
    const ascending = isAscendingLeaderboard(name);
    return Array.from(board.entries())
      .map(([playerId, score]) => ({ playerId, score }))
      .sort((a, b) => {
        if (ascending) return a.score - b.score;
        return b.score - a.score;
      });
  }

  const leaderboards = {
    async getEntries(name, options = {}) {
      const quantityTop = typeof options.quantityTop === 'number' ? options.quantityTop : 10;
      const top = sortedEntries(name).slice(0, quantityTop);
      return {
        entries: top.map((entry, index) => ({
          rank: index + 1,
          score: entry.score,
          formattedScore: formatLeaderboardScore(name, entry.score),
          player: {
            uniqueID: entry.playerId,
            publicName: toDisplayName(entry.playerId),
          },
        })),
      };
    },

    async getPlayerEntry(name) {
      const board = getBoardMap(name);
      if (!board.has(state.playerId)) {
        const error = new Error('Player is not present in leaderboard');
        error.code = 'LEADERBOARD_PLAYER_NOT_PRESENT';
        throw error;
      }

      const score = board.get(state.playerId);
      const entries = sortedEntries(name);
      const rank = entries.findIndex((entry) => entry.playerId === state.playerId);
      return {
        rank: rank >= 0 ? rank : 0,
        score,
        formattedScore: formatLeaderboardScore(name, score),
        player: {
          uniqueID: state.playerId,
          publicName: toDisplayName(state.playerId),
        },
      };
    },

    async setScore(name, score) {
      const board = getBoardMap(name);
      board.set(state.playerId, score);
      return { leaderboardName: name, score };
    },
  };

  const player = {
    isAuthorized: () => state.authorized,
    getUniqueID: () => state.playerId,
    publicName: toDisplayName(state.playerId),
  };

  return {
    environment: {
      i18n: {
        lang: navigator?.language?.startsWith('ru') ? 'ru' : 'en',
      },
    },
    features: {
      LoadingAPI: {
        ready: () => Promise.resolve(),
      },
      GameplayAPI: {
        start: () => Promise.resolve(),
        stop: () => Promise.resolve(),
      },
    },
    adv: {
      showFullscreenAdv({ callbacks = {} } = {}) {
        setTimeout(() => {
          callbacks.onClose?.();
        }, 0);
      },
      showRewardedVideo({ callbacks = {} } = {}) {
        setTimeout(() => {
          callbacks.onRewarded?.();
          callbacks.onClose?.();
        }, 0);
      },
    },
    auth: {
      async openAuthDialog() {
        state.authorized = true;
        return { value: true };
      },
    },
    feedback: {
      async canReview() {
        return { value: false, reason: 'mock_mode' };
      },
      async requestReview() {
        return { feedbackSent: false };
      },
    },
    leaderboards,
    async getPlayer() {
      return player;
    },
  };
}

class YandexGamesAdapter {
  constructor() {
    this.mode = 'mock';
    this.sdk = createMockSdk();
    this.initPromise = null;
    this.initialized = false;
  }

  getSDK() {
    return this.sdk;
  }

  async init(options = {}) {
    if (this.initPromise) {
      return this.initPromise;
    }

    const loadTimeoutMs = options.loadTimeoutMs ?? DEFAULT_LOAD_TIMEOUT_MS;
    const initTimeoutMs = options.initTimeoutMs ?? DEFAULT_INIT_TIMEOUT_MS;

    this.initPromise = this.initInternal(loadTimeoutMs, initTimeoutMs);
    return this.initPromise;
  }

  async initInternal(loadTimeoutMs, initTimeoutMs) {
    const remoteLoaded = await this.ensureRemoteSdkLoaded(loadTimeoutMs);
    if (remoteLoaded && window.YaGames?.init) {
      try {
        const remoteSdk = await Promise.race([
          window.YaGames.init(),
          createTimeoutPromise(initTimeoutMs, 'YaGames init timeout'),
        ]);
        this.setSdk(remoteSdk, 'remote');
        this.initialized = true;
        return this.mode;
      } catch (error) {
        console.warn('[YandexGames] Failed to init remote SDK, using mock fallback.', error);
      }
    }

    this.setSdk(createMockSdk(), 'mock');
    this.initialized = true;
    return this.mode;
  }

  setSdk(sdk, mode) {
    this.sdk = sdk;
    this.mode = mode;
    window.ysdk = sdk;
  }

  async ensureRemoteSdkLoaded(timeoutMs) {
    if (window.YaGames) {
      return true;
    }

    const existingScript = document.querySelector(SCRIPT_SELECTOR);
    if (existingScript) {
      return this.waitForGlobalSdk(timeoutMs);
    }

    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = REMOTE_SDK_URL;
      script.async = true;
      script.dataset.yaGamesSdk = 'true';

      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(Boolean(window.YaGames));
      }, timeoutMs);

      const onLoad = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(Boolean(window.YaGames));
      };

      const onError = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(false);
      };

      const cleanup = () => {
        clearTimeout(timer);
        script.removeEventListener('load', onLoad);
        script.removeEventListener('error', onError);
      };

      script.addEventListener('load', onLoad);
      script.addEventListener('error', onError);
      document.head.appendChild(script);
    });
  }

  waitForGlobalSdk(timeoutMs) {
    if (window.YaGames) return Promise.resolve(true);

    return new Promise((resolve) => {
      const startedAt = Date.now();
      const interval = setInterval(() => {
        if (window.YaGames) {
          clearInterval(interval);
          resolve(true);
          return;
        }

        if (Date.now() - startedAt >= timeoutMs) {
          clearInterval(interval);
          resolve(false);
        }
      }, 50);
    });
  }

  loadingReady() {
    this.sdk?.features?.LoadingAPI?.ready?.();
  }

  startGameplay() {
    this.sdk?.features?.GameplayAPI?.start?.();
  }

  stopGameplay() {
    this.sdk?.features?.GameplayAPI?.stop?.();
  }

  showFullscreenAd(callbacks = {}) {
    if (!this.sdk?.adv?.showFullscreenAdv) {
      callbacks.onClose?.();
      return Promise.resolve('unavailable');
    }

    return new Promise((resolve) => {
      let finished = false;
      const finish = (status) => {
        if (finished) return;
        finished = true;
        resolve(status);
      };

      this.sdk.adv.showFullscreenAdv({
        callbacks: {
          onOpen: () => callbacks.onOpen?.(),
          onClose: () => {
            callbacks.onClose?.();
            finish('closed');
          },
          onError: (error) => {
            callbacks.onError?.(error);
            finish('error');
          },
        },
      });
    });
  }

  canShowRewardedVideo() {
    return Boolean(this.sdk?.adv?.showRewardedVideo);
  }

  showRewardedVideo(callbacks = {}) {
    if (!this.sdk?.adv?.showRewardedVideo) {
      callbacks.onError?.(new Error('Rewarded video is unavailable'));
      return false;
    }

    this.sdk.adv.showRewardedVideo({
      callbacks: {
        onOpen: () => callbacks.onOpen?.(),
        onRewarded: () => callbacks.onRewarded?.(),
        onClose: () => callbacks.onClose?.(),
        onError: (error) => callbacks.onError?.(error),
      },
    });

    return true;
  }

  async getPlayer() {
    if (!this.sdk?.getPlayer) return null;
    try {
      return await this.sdk.getPlayer();
    } catch (error) {
      return null;
    }
  }

  isPlayerAuthorized(player) {
    return Boolean(player?.isAuthorized && player.isAuthorized());
  }

  async openAuthDialog() {
    if (!this.sdk?.auth?.openAuthDialog) return false;
    await this.sdk.auth.openAuthDialog();
    return true;
  }

  hasLeaderboards() {
    return Boolean(this.sdk?.leaderboards);
  }

  async getLeaderboardEntries(name, options) {
    if (!this.sdk?.leaderboards?.getEntries) return null;
    return this.sdk.leaderboards.getEntries(name, options);
  }

  async getLeaderboardPlayerEntry(name) {
    if (!this.sdk?.leaderboards?.getPlayerEntry) return null;
    return this.sdk.leaderboards.getPlayerEntry(name);
  }

  async setLeaderboardScore(name, score) {
    if (!this.sdk?.leaderboards?.setScore) return null;
    return this.sdk.leaderboards.setScore(name, score);
  }

  hasFeedback() {
    return Boolean(this.sdk?.feedback);
  }

  async canReview() {
    if (!this.sdk?.feedback?.canReview) return { value: false, reason: 'feedback_unavailable' };
    return this.sdk.feedback.canReview();
  }

  async requestReview() {
    if (!this.sdk?.feedback?.requestReview) return { feedbackSent: false };
    return this.sdk.feedback.requestReview();
  }
}

export const yandexGames = new YandexGamesAdapter();

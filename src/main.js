/**
 * main.js
 * Application entry point and coordinator for FloorMat Studio TV.
 * Boots UI, loads URL query params (?yt=, ?script=, ?catalog=),
 * instantiates VideoSource, HUD, Effects, Audio, and Activity Engines (GAME, WALK, CARDIO).
 */

import { SETTINGS } from './storage.js';
import { AudioManager } from './audio.js';
import { createVideoSource, parseYouTubeUrl } from './videoSource.js';
import { EffectsManager } from './effects.js';
import { HUDManager } from './hud.js';
import { TimelineEngine } from './timeline.js';
import { WalkEngine } from './walk.js';
import { CardioEngine } from './cardio.js';
import { AuthoringStudio } from './authoring.js';
import { MatSimulator } from './simulator.js';
import { UIManager } from './ui.js';
import './bridge.js'; // Registers window.MatEngine

class AppManager {
  constructor() {
    this.ui = new UIManager(this);
    this.simulator = new MatSimulator();
    this.currentEngine = null;
    this.currentVideoSource = null;
    this.currentHud = null;
    this.authoringStudio = null;

    // Attach to global window for MatEngine access
    window.App = this;
  }

  init() {
    this.ui.renderHomeScreen();
    this.checkUrlParameters();
  }

  // Check URL parameters: ?yt=...&script=... and ?catalog=...
  checkUrlParameters() {
    try {
      const params = new URLSearchParams(window.location.search);
      const ytParam = params.get('yt');
      const scriptParam = params.get('script');
      const catalogParam = params.get('catalog');

      if (scriptParam) {
        this.loadActivityFromLinks(ytParam || '', scriptParam);
      } else if (catalogParam) {
        // Custom catalog url
        this.ui.catalogData = null;
        fetch(catalogParam)
          .then(res => res.json())
          .then(data => {
            this.ui.catalogData = data;
            this.ui.renderCatalogCards();
          })
          .catch(e => console.warn('[App] Could not fetch ?catalog param:', e));
      }
    } catch (e) {
      console.warn('[App] Error reading URL search params:', e);
    }
  }

  // Fetch and validate script JSON
  async loadActivityFromLinks(youtubeInput, scriptUrl) {
    const errorBox = document.getElementById('loader-error-box');
    if (errorBox) errorBox.classList.add('hidden');

    try {
      // 1. Fetch script.json
      let resp;
      try {
        resp = await fetch(scriptUrl);
      } catch (fetchErr) {
        throw new Error(`Failed to fetch script from "${scriptUrl}". Hint: Ensure CORS is enabled on the remote server, or paste the JSON directly using "Paste JSON / Local File".`);
      }

      if (!resp.ok) {
        throw new Error(`HTTP error ${resp.status} (${resp.statusText}) when loading "${scriptUrl}". Check that the file exists and the path is valid.`);
      }

      const scriptJson = await resp.json();

      // 2. Validate script format
      const validationError = this.validateScript(scriptJson);
      if (validationError) {
        throw new Error(`Script format validation failed: ${validationError}`);
      }

      // 3. Start activity
      this.startActivity(scriptJson, youtubeInput);
    } catch (err) {
      console.error('[App] Load error:', err);
      this.ui.showLoaderError(err.message);
    }
  }

  // Strict script format validation
  validateScript(script) {
    if (!script || typeof script !== 'object') {
      return 'Root must be a valid JSON object.';
    }
    if (!['game', 'walk', 'cardio'].includes(script.type)) {
      return `Field "type" must be one of "game", "walk", or "cardio". Got: "${script.type}".`;
    }
    if (!script.meta || typeof script.meta !== 'object') {
      return 'Missing required "meta" object in script.';
    }
    if (!script.meta.id) {
      return 'Missing required "meta.id" string field.';
    }

    if (script.type === 'game' && !Array.isArray(script.timeline)) {
      return 'GAME activities must contain an array of "timeline" events.';
    }
    if (script.type === 'cardio' && (!script.rules || !Array.isArray(script.rules.program))) {
      return 'CARDIO activities must contain a "rules.program" array of workout phases.';
    }

    return null; // Valid
  }

  // Launch the activity into the viewport
  startActivity(script, youtubeInputOverride = '') {
    this.cleanCurrentSession();
    AudioManager.initContext();

    // Determine YouTube video ID: input overrides script
    let ytId = null;
    if (youtubeInputOverride) {
      ytId = parseYouTubeUrl(youtubeInputOverride);
    }
    if (!ytId && script.video?.youtubeId) {
      ytId = parseYouTubeUrl(script.video.youtubeId);
    }

    const root = document.getElementById('root');
    root.innerHTML = `
      <div id="activity-viewport" class="relative w-full h-full bg-black overflow-hidden select-none">
        <!-- Video Layer (YouTube Iframe or HTML5 video or Procedural Canvas) -->
        <div id="video-container" class="absolute inset-0 w-full h-full"></div>
        <!-- Overlays (Canvas + DOM) sit above video with pointer-events none -->
        <div id="activity-overlay-root" class="absolute inset-0 pointer-events-none z-20"></div>
      </div>
    `;

    const videoContainer = document.getElementById('video-container');
    const overlayRoot = document.getElementById('activity-overlay-root');

    // Initialize visual effects engine
    EffectsManager.init(overlayRoot);

    if (script.type === 'cardio') {
      // CARDIO has no video; it renders the athletic dashboard directly
      this.currentEngine = new CardioEngine(root, script, {
        onRestart: () => this.startActivity(script, youtubeInputOverride),
        onQuit: () => this.ui.renderHomeScreen()
      });
      this.currentEngine.start();
    } else {
      // GAME or WALK: instantiate VideoSource
      this.currentVideoSource = createVideoSource(videoContainer, {
        youtubeId: ytId,
        src: script.video?.src,
        duration: script.meta?.duration || 600,
        startAt: script.video?.startAt || 0
      });

      // Initialize HUD overlay
      this.currentHud = new HUDManager(overlayRoot, {
        type: script.type,
        initialLives: script.rules?.lives || 3,
        onPause: () => {
          if (this.currentEngine) this.currentEngine.pause();
        }
      });

      // Handle video errors gracefully with clear user guidance
      this.currentVideoSource.onError((code, message) => {
        alert(`Video Warning [Code ${code}]: ${message}\n\nFalling back to simulated procedural video track.`);
        // Fallback to placeholder video
        this.currentVideoSource.destroy();
        this.currentVideoSource = createVideoSource(videoContainer, {
          duration: script.meta?.duration || 600
        });
        if (this.currentEngine) {
          this.currentEngine.video = this.currentVideoSource;
          this.currentEngine.resume();
        }
      });

      if (script.type === 'game') {
        this.currentEngine = new TimelineEngine(this.currentVideoSource, script, this.currentHud, {
          onRestart: () => this.startActivity(script, youtubeInputOverride),
          onQuit: () => this.ui.renderHomeScreen(),
          onCalibrate: () => this.ui.showCalibrationWizard()
        });
        this.currentEngine.start();
      } else if (script.type === 'walk') {
        this.currentEngine = new WalkEngine(this.currentVideoSource, script, this.currentHud, {
          onRestart: () => this.startActivity(script, youtubeInputOverride),
          onQuit: () => this.ui.renderHomeScreen(),
          onCalibrate: () => this.ui.showCalibrationWizard()
        });
        this.currentEngine.start();
      }
    }
  }

  // Open Authoring Studio
  openAuthoringStudio(initialScript = null, initialYoutube = '') {
    this.cleanCurrentSession();
    const container = document.createElement('div');
    container.id = 'authoring-container';
    document.body.appendChild(container);

    this.authoringStudio = new AuthoringStudio(
      container,
      initialScript,
      initialYoutube,
      () => {
        container.remove();
        this.ui.renderHomeScreen();
      }
    );
  }

  cleanCurrentSession() {
    if (this.currentEngine) {
      this.currentEngine.destroy();
      this.currentEngine = null;
    }
    if (this.currentVideoSource) {
      this.currentVideoSource.destroy();
      this.currentVideoSource = null;
    }
    if (this.currentHud) {
      this.currentHud.destroy();
      this.currentHud = null;
    }
    EffectsManager.destroy();
  }
}

// Instantiate and start app
const app = new AppManager();
window.addEventListener('DOMContentLoaded', () => {
  app.init();
});

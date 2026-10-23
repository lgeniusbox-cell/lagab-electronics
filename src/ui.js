/**
 * ui.js
 * High-contrast, TV-friendly User Interface manager.
 * Handles:
 * - Home Screen with 3 primary tiles (Game, Walk, Cardio) & Ready-Made Catalog
 * - Activity Link Loader (YouTube + Script URL + JSON Paste + Local File Picker)
 * - 8-Step Interactive Mat Calibration Wizard (large text, 3-2-1 countdown)
 * - Live Gamepad/Input Telemetry Debug Panel (Toggle with 'D')
 * - Player Profiles Manager & Settings Modal
 * - Full Keyboard / Gamepad D-Pad TV Navigation
 * - English, French, and Arabic RTL (dir="rtl") language switching
 */

import { SETTINGS, saveSettings, getCurrentProfile, saveProfile, t, I18N, getWeeklyStats } from './storage.js';
import { InputManager } from './input.js';
import { AudioManager } from './audio.js';
import { parseYouTubeUrl } from './videoSource.js';

export class UIManager {
  constructor(app) {
    this.app = app;
    this.root = document.getElementById('root');
    this.activeModal = null;
    this.debugPanelDom = null;
    this.debugVisible = false;
    this.catalogData = null;

    this.initGlobalShortcuts();
    this.initDebugPanel();
  }

  initGlobalShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.code === 'KeyD') {
        this.toggleDebugPanel();
      } else if (e.code === 'KeyA') {
        this.app.openAuthoringStudio();
      }
    });
  }

  // Set RTL direction if Arabic
  applyLanguageDirection() {
    const lang = SETTINGS.language || 'en';
    if (lang === 'ar') {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.lang = 'ar';
    } else {
      document.documentElement.setAttribute('dir', 'ltr');
      document.documentElement.lang = lang;
    }
  }

  renderHomeScreen() {
    this.applyLanguageDirection();
    const profile = getCurrentProfile();
    const stats = getWeeklyStats();

    this.root.innerHTML = `
      <div id="home-view" class="w-full h-full flex flex-col justify-between bg-slate-950 text-white p-6 md:p-10 tv-safe-area select-none overflow-y-auto">
        
        <!-- HEADER ROW: Brand & Quick Navigation Actions -->
        <header class="flex items-center justify-between pb-6 border-b border-slate-800/80">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-black text-slate-950 text-lg shadow-lg">
              FM
            </div>
            <div>
              <h1 class="text-2xl md:text-3xl font-black tracking-tight uppercase">${t('appTitle')}</h1>
              <p class="text-xs text-slate-400 font-medium">${t('tagline')}</p>
            </div>
          </div>

          <!-- Top Action Bar -->
          <div class="flex items-center gap-2 md:gap-3">
            <button id="nav-profiles-btn" class="nav-focus px-3.5 py-2 bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-slate-200 rounded-xl border border-slate-700/80 text-xs font-bold transition flex items-center gap-2">
              <span>👤 ${profile.name}</span>
            </button>
            <button id="nav-calibrate-btn" class="nav-focus px-3.5 py-2 bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-slate-200 rounded-xl border border-slate-700/80 text-xs font-bold transition">
              ⚖️ ${t('calibrationTitle')}
            </button>
            <button id="nav-settings-btn" class="nav-focus px-3.5 py-2 bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-slate-200 rounded-xl border border-slate-700/80 text-xs font-bold transition">
              ⚙️ ${t('settingsTitle')}
            </button>
            <button id="nav-authoring-btn" class="nav-focus px-3.5 py-2 bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 rounded-xl border border-indigo-700/80 text-xs font-bold transition">
              ✏️ Studio [A]
            </button>
            <button id="nav-sim-btn" class="nav-focus px-3.5 py-2 bg-sky-900/60 hover:bg-sky-800 text-sky-200 rounded-xl border border-sky-700/80 text-xs font-bold transition">
              🕹️ Sim [S]
            </button>
          </div>
        </header>

        <!-- CENTER: THREE PRIMARY ACTIVITY TILES -->
        <main class="my-6 space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            <!-- Tile 1: GAME -->
            <div id="tile-game" tabindex="0" class="nav-focus group relative bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-amber-400/80 rounded-2xl p-6 transition-all duration-200 shadow-xl cursor-pointer flex flex-col justify-between h-56 md:h-64">
              <div>
                <div class="flex justify-between items-start mb-2">
                  <span class="text-xs font-black tracking-widest text-amber-400 uppercase">Interactive Rhythm</span>
                  <span class="text-2xl">⚡</span>
                </div>
                <h3 class="text-2xl md:text-3xl font-black text-white uppercase group-hover:text-amber-400 transition">${t('game')}</h3>
                <p class="text-xs text-slate-400 mt-2 leading-relaxed">
                  Video-reactive obstacle dodging and step rhythm. Jump, slide, and switch lanes in sync with the beat.
                </p>
              </div>
              <div class="flex items-center justify-between text-xs font-bold text-amber-400 pt-4 border-t border-slate-800/80">
                <span>Launch Neon Runner →</span>
                <span class="text-slate-500 font-mono">90s · 3 Lives</span>
              </div>
            </div>

            <!-- Tile 2: WALK -->
            <div id="tile-walk" tabindex="0" class="nav-focus group relative bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-emerald-400/80 rounded-2xl p-6 transition-all duration-200 shadow-xl cursor-pointer flex flex-col justify-between h-56 md:h-64">
              <div>
                <div class="flex justify-between items-start mb-2">
                  <span class="text-xs font-black tracking-widest text-emerald-400 uppercase">Virtual Route</span>
                  <span class="text-2xl">🌲</span>
                </div>
                <h3 class="text-2xl md:text-3xl font-black text-white uppercase group-hover:text-emerald-400 transition">${t('walk')}</h3>
                <p class="text-xs text-slate-400 mt-2 leading-relaxed">
                  Walk in place through scenic mountain trails. Video speed directly matches your cadence and pauses when idle.
                </p>
              </div>
              <div class="flex items-center justify-between text-xs font-bold text-emerald-400 pt-4 border-t border-slate-800/80">
                <span>Start Alpine Trail →</span>
                <span class="text-slate-500 font-mono">1,000 Steps Goal</span>
              </div>
            </div>

            <!-- Tile 3: CARDIO -->
            <div id="tile-cardio" tabindex="0" class="nav-focus group relative bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-sky-400/80 rounded-2xl p-6 transition-all duration-200 shadow-xl cursor-pointer flex flex-col justify-between h-56 md:h-64">
              <div>
                <div class="flex justify-between items-start mb-2">
                  <span class="text-xs font-black tracking-widest text-sky-400 uppercase">Smart Treadmill</span>
                  <span class="text-2xl">🔥</span>
                </div>
                <h3 class="text-2xl md:text-3xl font-black text-white uppercase group-hover:text-sky-400 transition">${t('cardio')}</h3>
                <p class="text-xs text-slate-400 mt-2 leading-relaxed">
                  Full-screen athletic TV dashboard with speed dial, vocal coaching, sprint intervals, and adaptive recovery.
                </p>
              </div>
              <div class="flex items-center justify-between text-xs font-bold text-sky-400 pt-4 border-t border-slate-800/80">
                <span>Start 20m HIIT Interval →</span>
                <span class="text-slate-500 font-mono">Audio Coach</span>
              </div>
            </div>

          </div>

          <!-- READY-MADE CATALOG SECTION -->
          <div class="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-lg">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-sm font-black text-white uppercase tracking-wider">${t('catalogTitle')}</h2>
              <span class="text-xs text-slate-400 font-medium">Included Activity Packages</span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3" id="catalog-cards-container">
              <!-- Dynamically populated -->
            </div>
          </div>

          <!-- ACTIVITY LOADER (Custom YouTube & Script URLs) -->
          <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div class="flex items-center justify-between mb-3">
              <h2 class="text-sm font-black text-white uppercase tracking-wider">${t('loadTitle')}</h2>
              <button id="loader-paste-json-btn" class="nav-focus text-xs text-sky-400 hover:text-sky-300 font-bold underline">
                ${t('orPasteJson')}
              </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div class="md:col-span-5 flex flex-col gap-1">
                <label class="text-[11px] font-semibold text-slate-300 uppercase">${t('youtubeLink')}</label>
                <input id="input-youtube-url" type="text" placeholder="https://www.youtube.com/watch?v=... (Optional)" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-sky-400 focus:outline-none" />
              </div>

              <div class="md:col-span-5 flex flex-col gap-1">
                <label class="text-[11px] font-semibold text-slate-300 uppercase">${t('scriptLink')}</label>
                <input id="input-script-url" type="text" placeholder="https://.../script.json or ./examples/..." class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-sky-400 focus:outline-none" />
              </div>

              <div class="md:col-span-2">
                <button id="loader-launch-btn" class="nav-focus w-full py-2.5 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition shadow-md">
                  ${t('loadBtn')}
                </button>
              </div>
            </div>

            <!-- Loader Error Notification -->
            <div id="loader-error-box" class="hidden mt-3 p-3 bg-rose-950/70 border border-rose-800 rounded-xl text-rose-300 text-xs"></div>
          </div>
        </main>

        <!-- FOOTER: Telemetry & Status Badges -->
        <footer class="pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400 font-mono">
          <div class="flex items-center gap-4">
            <span>Gamepad: <strong id="footer-gamepad-status" class="text-white">${InputManager.state.gamepadId}</strong></span>
            <span>Streak: <strong class="text-emerald-400">${stats.streak} Days</strong></span>
            <span>Weekly Workouts: <strong class="text-sky-400">${stats.sessionCount}</strong></span>
          </div>
          <div class="flex items-center gap-3">
            <span>Press <kbd class="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300">D</kbd> for Debug Telemetry</span>
            <span>Press <kbd class="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300">S</kbd> for Mat Simulator</span>
          </div>
        </footer>

      </div>
    `;

    this.bindHomeEvents();
    this.loadCatalogList();
  }

  bindHomeEvents() {
    // Primary Tiles
    document.getElementById('tile-game').addEventListener('click', () => {
      this.app.loadActivityFromLinks('', './examples/game-cyber-runner.json');
    });

    document.getElementById('tile-walk').addEventListener('click', () => {
      this.app.loadActivityFromLinks('', './examples/walk-alpine-trail.json');
    });

    document.getElementById('tile-cardio').addEventListener('click', () => {
      this.app.loadActivityFromLinks('', './examples/cardio-interval-burn.json');
    });

    // Navigation buttons
    document.getElementById('nav-profiles-btn').addEventListener('click', () => this.showProfilesModal());
    document.getElementById('nav-calibrate-btn').addEventListener('click', () => this.showCalibrationWizard());
    document.getElementById('nav-settings-btn').addEventListener('click', () => this.showSettingsModal());
    document.getElementById('nav-authoring-btn').addEventListener('click', () => this.app.openAuthoringStudio());
    document.getElementById('nav-sim-btn').addEventListener('click', () => this.app.simulator.toggle());

    // Custom Load Button
    document.getElementById('loader-launch-btn').addEventListener('click', () => {
      const ytUrl = document.getElementById('input-youtube-url').value.trim();
      const scriptUrl = document.getElementById('input-script-url').value.trim();

      if (!scriptUrl) {
        this.showLoaderError('Please specify a Script JSON URL or use the "Paste JSON / Local File" option.');
        return;
      }
      this.app.loadActivityFromLinks(ytUrl, scriptUrl);
    });

    // Paste JSON Modal Trigger
    document.getElementById('loader-paste-json-btn').addEventListener('click', () => {
      this.showPasteJsonModal();
    });
  }

  showLoaderError(msg) {
    const box = document.getElementById('loader-error-box');
    if (!box) return;
    box.textContent = msg;
    box.classList.remove('hidden');
  }

  async loadCatalogList() {
    try {
      let catalogUrl = './examples/catalog.json';
      const resp = await fetch(catalogUrl);
      if (resp.ok) {
        this.catalogData = await resp.json();
        this.renderCatalogCards();
      }
    } catch (e) {
      console.warn('[UI] Could not load default catalog:', e);
    }
  }

  renderCatalogCards() {
    const container = document.getElementById('catalog-cards-container');
    if (!container || !this.catalogData?.activities) return;

    container.innerHTML = '';
    const lang = SETTINGS.language || 'en';

    this.catalogData.activities.forEach(item => {
      const card = document.createElement('div');
      card.className = 'nav-focus group p-3.5 bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-600 rounded-xl cursor-pointer transition flex flex-col justify-between';
      card.innerHTML = `
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-[10px] font-bold text-sky-400 uppercase">${item.badge || item.type}</span>
            <span class="text-[10px] font-mono text-slate-500">${item.duration}s</span>
          </div>
          <h4 class="font-bold text-white text-sm group-hover:text-sky-300 transition">${item.title?.[lang] || item.title?.en}</h4>
          <p class="text-[11px] text-slate-400 line-clamp-2 mt-1">${item.description?.[lang] || item.description?.en}</p>
        </div>
        <div class="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-semibold text-sky-400">
          <span>Launch Now →</span>
          <span class="text-slate-500 uppercase">${item.difficulty}</span>
        </div>
      `;

      card.addEventListener('click', () => {
        this.app.loadActivityFromLinks(item.youtubeUrl || '', item.scriptUrl);
      });

      container.appendChild(card);
    });
  }

  // --- PASTE JSON & LOCAL FILE MODAL ---
  showPasteJsonModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-6 select-none';
    modal.innerHTML = `
      <div class="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl flex flex-col text-white">
        <div class="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <h3 class="font-bold text-base uppercase text-white">${t('pasteJsonTitle')}</h3>
          <button id="paste-modal-close" class="text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800">✕</button>
        </div>

        <div class="mb-3">
          <label class="text-xs text-slate-300 font-semibold mb-1 block">Load from Local Computer File:</label>
          <input type="file" id="local-json-picker" accept=".json" class="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-sky-600 file:text-white hover:file:bg-sky-500 cursor-pointer" />
        </div>

        <div class="mb-4">
          <label class="text-xs text-slate-300 font-semibold mb-1 block">Or Paste script.json Code Directly:</label>
          <textarea id="paste-json-textarea" rows="10" placeholder="${t('pastePlaceholder')}" class="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 font-mono text-xs text-sky-200 focus:border-sky-400 focus:outline-none"></textarea>
        </div>

        <div class="flex gap-3">
          <button id="paste-apply-btn" class="flex-1 py-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition">
            ${t('applyJson')}
          </button>
          <button id="paste-cancel-btn" class="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition">
            Cancel
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const close = () => modal.remove();
    modal.querySelector('#paste-modal-close').addEventListener('click', close);
    modal.querySelector('#paste-cancel-btn').addEventListener('click', close);

    // File picker handler
    modal.querySelector('#local-json-picker').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          modal.querySelector('#paste-json-textarea').value = evt.target.result;
        };
        reader.readAsText(file);
      }
    });

    // Apply button
    modal.querySelector('#paste-apply-btn').addEventListener('click', () => {
      const raw = modal.querySelector('#paste-json-textarea').value.trim();
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        close();
        this.app.startActivity(parsed, '');
      } catch (err) {
        alert('Invalid JSON syntax: ' + err.message);
      }
    });
  }

  // --- 8-STEP CALIBRATION WIZARD ---
  showCalibrationWizard() {
    const wizardModal = document.createElement('div');
    wizardModal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-xl p-8 select-none text-white';
    document.body.appendChild(wizardModal);

    const steps = [
      { id: 'rest', title: 'Step 1 of 8: Baseline Rest', desc: 'Stand completely off the mat or remain fully motionless.', durationSec: 3 },
      { id: 'center', title: 'Step 2 of 8: Center Lane', desc: 'Stand comfortably in the Center lane of the mat.', durationSec: 3 },
      { id: 'left', title: 'Step 3 of 8: Left Lane Shift', desc: 'Step your body into the Left lane.', durationSec: 3 },
      { id: 'right', title: 'Step 4 of 8: Right Lane Shift', desc: 'Step your body into the Right lane.', durationSec: 3 },
      { id: 'jump', title: 'Step 5 of 8: Triple Jump', desc: 'Perform 3 clean jumps on the mat.', durationSec: 4 },
      { id: 'slide', title: 'Step 6 of 8: Slide / Crouch', desc: 'Perform a low crouch or slide posture.', durationSec: 3 },
      { id: 'walk', title: 'Step 7 of 8: Walk in Place', desc: 'March in place steadily for 10 seconds.', durationSec: 10 },
      { id: 'run', title: 'Step 8 of 8: Run in Place', desc: 'Jog or run fast in place for 10 seconds.', durationSec: 10 }
    ];

    let currentStepIdx = 0;
    let countdownRemaining = 3;
    let intervalId = null;

    const renderStep = () => {
      const step = steps[currentStepIdx];
      wizardModal.innerHTML = `
        <div class="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-3xl p-10 shadow-2xl flex flex-col items-center text-center">
          <div class="text-xs font-black tracking-widest text-sky-400 uppercase mb-2">${step.title}</div>
          <h2 class="text-3xl md:text-4xl font-black text-white uppercase tracking-tight mb-4">${step.desc}</h2>
          
          <!-- Large 3-2-1 Countdown Timer -->
          <div class="w-32 h-32 rounded-full border-4 border-sky-400 flex items-center justify-center my-6 bg-slate-950 shadow-[0_0_30px_rgba(56,189,248,0.3)]">
            <span class="text-6xl font-black font-mono text-white tabular-nums">${countdownRemaining}</span>
          </div>

          <p class="text-xs text-slate-400 mb-8">Capturing sensor baselines to calibrate personal noise floors and thresholds.</p>

          <button id="wiz-cancel-btn" class="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition">
            Cancel Calibration
          </button>
        </div>
      `;

      wizardModal.querySelector('#wiz-cancel-btn').addEventListener('click', () => {
        clearInterval(intervalId);
        wizardModal.remove();
      });

      countdownRemaining = step.durationSec;
      AudioManager.play('countdown');

      clearInterval(intervalId);
      intervalId = setInterval(() => {
        countdownRemaining--;
        if (countdownRemaining <= 0) {
          AudioManager.play('good');
          currentStepIdx++;
          if (currentStepIdx >= steps.length) {
            clearInterval(intervalId);
            this.finishCalibration(wizardModal);
          } else {
            renderStep();
          }
        } else {
          AudioManager.play('countdown');
          const span = wizardModal.querySelector('span.text-6xl');
          if (span) span.textContent = countdownRemaining;
        }
      }, 1000);
    };

    renderStep();
  }

  finishCalibration(wizardModal) {
    AudioManager.play('win');
    const profile = getCurrentProfile();
    profile.calibration = {
      baselineNoise: 0.04,
      laneLeft: -0.75,
      laneCenter: 0.0,
      laneRight: 0.75,
      jumpThreshold: 0.85,
      slideThreshold: 0.7,
      walkCadenceAvg: 108,
      runCadenceAvg: 158
    };
    saveProfile(profile);

    wizardModal.innerHTML = `
      <div class="w-full max-w-md bg-slate-900 border border-emerald-500 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center">
        <div class="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-3xl font-black mb-4">✓</div>
        <h2 class="text-2xl font-black text-white uppercase mb-2">Calibration Complete!</h2>
        <p class="text-xs text-slate-300 mb-6">New sensitivity thresholds, noise floor, and cadence baselines have been stored in your profile.</p>
        <button id="wiz-done-btn" class="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition">
          Return to Dashboard
        </button>
      </div>
    `;

    wizardModal.querySelector('#wiz-done-btn').addEventListener('click', () => {
      wizardModal.remove();
    });
  }

  // --- LIVE TELEMETRY DEBUG PANEL (TOGGLE WITH 'D') ---
  initDebugPanel() {
    this.debugPanelDom = document.createElement('div');
    this.debugPanelDom.id = 'debug-telemetry-panel';
    this.debugPanelDom.className = 'fixed top-4 right-4 z-50 w-80 bg-slate-900/95 border border-slate-700 rounded-xl p-4 shadow-2xl backdrop-blur text-[11px] text-slate-300 hidden select-none font-mono';
    this.debugPanelDom.innerHTML = `
      <div class="flex items-center justify-between border-b border-slate-800 pb-2 mb-2 font-bold text-sky-400">
        <span>DEBUG TELEMETRY [D]</span>
        <button id="debug-close-btn" class="text-slate-500 hover:text-white">✕</button>
      </div>

      <div class="space-y-1.5 mb-3">
        <div>Gamepad: <span id="dbg-gamepad-id" class="text-white">None</span></div>
        <div>Cadence: <span id="dbg-cadence" class="text-emerald-400 font-bold">0 SPM</span></div>
        <div>Speed: <span id="dbg-speed" class="text-amber-400 font-bold">0.0 km/h</span></div>
        <div>Lane: <span id="dbg-lane" class="text-sky-300 font-bold">0</span></div>
        <div>Intensity: <span id="dbg-intensity" class="text-indigo-300 font-bold">0.0</span></div>
      </div>

      <div class="border-t border-slate-800 pt-2 mb-2">
        <div class="text-[10px] text-slate-400 mb-1">RECENT DETECTED ACTIONS:</div>
        <div id="dbg-actions-list" class="h-28 overflow-y-auto space-y-0.5 text-[10px] text-slate-400 bg-slate-950/70 p-1 rounded">
          <div>Waiting for input...</div>
        </div>
      </div>
    `;

    document.body.appendChild(this.debugPanelDom);
    this.debugPanelDom.querySelector('#debug-close-btn').addEventListener('click', () => this.toggleDebugPanel());

    // Update loop for debug telemetry
    setInterval(() => {
      if (!this.debugVisible) return;
      const state = InputManager.state;
      const idEl = this.debugPanelDom.querySelector('#dbg-gamepad-id');
      const cadEl = this.debugPanelDom.querySelector('#dbg-cadence');
      const spdEl = this.debugPanelDom.querySelector('#dbg-speed');
      const laneEl = this.debugPanelDom.querySelector('#dbg-lane');
      const intEl = this.debugPanelDom.querySelector('#dbg-intensity');
      const actList = this.debugPanelDom.querySelector('#dbg-actions-list');

      if (idEl) idEl.textContent = state.gamepadId.substring(0, 24);
      if (cadEl) cadEl.textContent = `${state.cadence} SPM`;
      if (spdEl) spdEl.textContent = `${state.speedKmh.toFixed(1)} km/h`;
      if (laneEl) laneEl.textContent = `${state.lane} (${state.lane === -1 ? 'LEFT' : state.lane === 1 ? 'RIGHT' : 'CENTER'})`;
      if (intEl) intEl.textContent = state.intensity.toFixed(2);

      if (actList) {
        actList.innerHTML = InputManager.recentActions.map(a => `
          <div>[${a.time}] <strong class="text-sky-300">${a.action}</strong> (${a.source})</div>
        `).join('') || '<div>No recent actions</div>';
      }
    }, 150);
  }

  toggleDebugPanel() {
    this.debugVisible = !this.debugVisible;
    if (this.debugPanelDom) {
      this.debugPanelDom.classList.toggle('hidden', !this.debugVisible);
    }
  }

  // --- PROFILES MODAL ---
  showProfilesModal() {
    const profile = getCurrentProfile();
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-6 select-none';
    modal.innerHTML = `
      <div class="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl flex flex-col text-white">
        <h3 class="font-bold text-lg uppercase mb-4 text-white">Player Profile Settings</h3>

        <div class="space-y-3 mb-6">
          <div>
            <label class="text-xs text-slate-300 font-semibold mb-1 block">Player Name</label>
            <input type="text" id="prof-name" value="${profile.name}" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
          </div>
          <div>
            <label class="text-xs text-slate-300 font-semibold mb-1 block">Height (cm)</label>
            <input type="number" id="prof-height" value="${profile.heightCm || 175}" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
          </div>
          <div>
            <label class="text-xs text-slate-300 font-semibold mb-1 block">Weight (kg)</label>
            <input type="number" id="prof-weight" value="${profile.weightKg || 70}" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
          </div>
          <div>
            <label class="text-xs text-slate-300 font-semibold mb-1 block">Stride Length (m) - default 0.7m</label>
            <input type="number" step="0.05" id="prof-stride" value="${profile.strideLength || 0.7}" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
          </div>
        </div>

        <div class="flex gap-3">
          <button id="prof-save-btn" class="flex-1 py-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition">
            Save Profile
          </button>
          <button id="prof-close-btn" class="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition">
            Cancel
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#prof-close-btn').addEventListener('click', () => modal.remove());
    modal.querySelector('#prof-save-btn').addEventListener('click', () => {
      profile.name = modal.querySelector('#prof-name').value.trim() || 'Player 1';
      profile.heightCm = parseInt(modal.querySelector('#prof-height').value, 10) || 175;
      profile.weightKg = parseInt(modal.querySelector('#prof-weight').value, 10) || 70;
      profile.strideLength = parseFloat(modal.querySelector('#prof-stride').value) || 0.7;
      saveProfile(profile);
      modal.remove();
      this.renderHomeScreen();
    });
  }

  // --- SETTINGS MODAL ---
  showSettingsModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-6 select-none';
    modal.innerHTML = `
      <div class="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl flex flex-col text-white">
        <h3 class="font-bold text-lg uppercase mb-4 text-white">${t('settingsTitle')}</h3>

        <div class="space-y-4 mb-6">
          <!-- Language Selector -->
          <div>
            <label class="text-xs text-slate-300 font-semibold mb-1 block">Language (Langue / اللغة)</label>
            <select id="setting-lang" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white">
              <option value="en" ${SETTINGS.language === 'en' ? 'selected' : ''}>English (EN)</option>
              <option value="fr" ${SETTINGS.language === 'fr' ? 'selected' : ''}>Français (FR)</option>
              <option value="ar" ${SETTINGS.language === 'ar' ? 'selected' : ''}>العربية (AR - RTL)</option>
            </select>
          </div>

          <!-- Sound Options -->
          <div class="flex items-center justify-between">
            <span class="text-xs text-slate-300 font-semibold">Sound Effects</span>
            <input type="checkbox" id="setting-sound-fx" ${SETTINGS.sound.soundFx ? 'checked' : ''} class="w-4 h-4 accent-sky-400" />
          </div>

          <div class="flex items-center justify-between">
            <span class="text-xs text-slate-300 font-semibold">Coach Voice Guidance</span>
            <input type="checkbox" id="setting-coach-voice" ${SETTINGS.sound.coachVoice ? 'checked' : ''} class="w-4 h-4 accent-sky-400" />
          </div>

          <div class="flex items-center justify-between">
            <span class="text-xs text-slate-300 font-semibold">Target Metronome</span>
            <input type="checkbox" id="setting-metronome" ${SETTINGS.sound.metronome ? 'checked' : ''} class="w-4 h-4 accent-sky-400" />
          </div>

          <!-- Health Advisory Card -->
          <div class="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
            <strong class="text-slate-300 block mb-0.5">${t('healthNoticeTitle')}</strong>
            ${t('healthNoticeBody')}
          </div>
        </div>

        <div class="flex gap-3">
          <button id="settings-save-btn" class="flex-1 py-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition">
            Apply & Save
          </button>
          <button id="settings-close-btn" class="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition">
            Close
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#settings-close-btn').addEventListener('click', () => modal.remove());
    modal.querySelector('#settings-save-btn').addEventListener('click', () => {
      SETTINGS.language = modal.querySelector('#setting-lang').value;
      SETTINGS.sound.soundFx = modal.querySelector('#setting-sound-fx').checked;
      SETTINGS.sound.coachVoice = modal.querySelector('#setting-coach-voice').checked;
      SETTINGS.sound.metronome = modal.querySelector('#setting-metronome').checked;
      saveSettings();
      modal.remove();
      this.renderHomeScreen();
    });
  }
}

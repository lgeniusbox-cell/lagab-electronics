/**
 * hud.js
 * Heads-Up Display (HUD) overlay, Mat Preview widget (3 lanes, 6 foot zones, front jump bar),
 * Pause menu, and Victory/Results modal with stars.
 */

import { t, getCurrentProfile, saveRecord, SETTINGS } from './storage.js';
import { InputManager } from './input.js';
import { AudioManager } from './audio.js';

export class HUDManager {
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;
    this.type = options.type || 'game'; // 'game' | 'walk' | 'cardio'
    this.hudDom = null;
    this.matPreviewDom = null;
    this.pauseModalDom = null;
    this.matPreviewVisible = true;

    // Track dynamic HUD values
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.lives = options.initialLives || 3;
    this.progress = 0; // 0..1

    this.initHUD();
    this.initMatPreview();
  }

  initHUD() {
    this.hudDom = document.createElement('div');
    this.hudDom.id = 'hud-overlay-container';
    this.hudDom.className = 'absolute inset-0 pointer-events-none z-30 flex flex-col justify-between p-6 md:p-8 tv-safe-area select-none';

    // Different header layout for Game vs Walk vs Cardio
    if (this.type === 'game') {
      this.hudDom.innerHTML = `
        <!-- Top Bar: Score, Combo, Lives -->
        <div class="flex items-start justify-between w-full">
          <!-- Left: Score & Combo -->
          <div class="flex flex-col gap-1">
            <div class="text-xs uppercase tracking-wider text-slate-400 font-semibold">${t('score')}</div>
            <div id="hud-score-val" class="text-4xl md:text-5xl font-black font-mono tracking-tight text-white tabular-nums drop-shadow-md">
              0
            </div>
            <div id="hud-combo-val" class="inline-flex items-center gap-1.5 text-amber-400 font-black text-xl md:text-2xl italic tracking-wider transition-all">
              <span id="hud-combo-num">0x</span>
              <span class="text-xs uppercase tracking-widest text-slate-400 font-bold">${t('combo')}</span>
            </div>
          </div>

          <!-- Center: Incoming Action Warning Banner -->
          <div id="hud-action-warning" class="hidden flex flex-col items-center">
            <div class="text-xs font-bold tracking-widest text-sky-400 uppercase mb-1">INCOMING</div>
            <div id="hud-action-badge" class="px-6 py-2 rounded-xl bg-slate-900/90 border-2 border-sky-400 shadow-[0_0_25px_rgba(56,189,248,0.4)] text-2xl md:text-3xl font-black text-white uppercase tracking-wider animate-pulse">
              JUMP
            </div>
          </div>

          <!-- Right: Lives & Pause Action Button -->
          <div class="flex flex-col items-end gap-3">
            <div class="flex items-center gap-1.5" id="hud-lives-container">
              <!-- Rendered dynamically -->
            </div>
            <button id="hud-pause-btn" class="pointer-events-auto px-4 py-2 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700/80 text-xs font-bold tracking-wider uppercase transition">
              ESC · Pause
            </button>
          </div>
        </div>

        <!-- Bottom: Progress Bar & Activity Info -->
        <div class="w-full flex flex-col gap-2">
          <div class="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span id="hud-section-name" class="tracking-wide">Phase 1</span>
            <span id="hud-time-display" class="font-mono tabular-nums text-sky-400">00:00 / 00:00</span>
          </div>
          <div class="w-full h-3 bg-slate-900/80 rounded-full border border-slate-700/60 overflow-hidden p-0.5">
            <div id="hud-progress-fill" class="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full transition-all duration-150" style="width: 0%;"></div>
          </div>
        </div>
      `;
    } else if (this.type === 'walk') {
      this.hudDom.innerHTML = `
        <!-- Top Bar for Virtual Walk -->
        <div class="flex items-start justify-between w-full">
          <div class="flex flex-col gap-1">
            <div class="text-xs uppercase tracking-wider text-slate-400 font-semibold">${t('steps')}</div>
            <div id="hud-walk-steps" class="text-4xl md:text-5xl font-black font-mono text-emerald-400 tabular-nums">0</div>
            <div class="flex items-center gap-2 text-sm text-slate-300 font-mono">
              <span id="hud-walk-cadence" class="text-sky-400 font-bold">0</span> ${t('cadence')} · 
              <span id="hud-walk-speed" class="text-amber-400 font-bold">0.0</span> ${t('speed')}
            </div>
          </div>

          <!-- Pause -->
          <div class="flex items-center gap-3">
            <button id="hud-pause-btn" class="pointer-events-auto px-4 py-2 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700/80 text-xs font-bold tracking-wider uppercase transition">
              ESC · Pause
            </button>
          </div>
        </div>

        <!-- Center: Keep Walking Warning (shown when idle > 3s) -->
        <div id="hud-idle-banner" class="hidden my-auto mx-auto flex flex-col items-center justify-center p-8 bg-slate-950/90 border-2 border-amber-500 rounded-2xl shadow-[0_0_40px_rgba(245,158,11,0.3)] animate-bounce">
          <div class="text-4xl md:text-5xl font-black text-amber-400 tracking-wider mb-2 uppercase">${t('keepWalking')}</div>
          <div class="text-base text-slate-300 text-center max-w-md">Step in place on the mat to resume your virtual journey!</div>
        </div>

        <!-- Center: Point of Interest Card -->
        <div id="hud-poi-card" class="hidden absolute top-28 right-8 w-80 bg-slate-900/95 border border-sky-400/80 rounded-xl p-4 shadow-2xl backdrop-blur transition-all duration-300">
          <div class="flex items-center gap-2 text-sky-400 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Scenic Landmark</span>
          </div>
          <div id="hud-poi-title" class="text-lg font-bold text-white mb-1.5">Alpine Stream</div>
          <div id="hud-poi-desc" class="text-xs text-slate-300 leading-relaxed">Description...</div>
        </div>

        <!-- Bottom: Distance, Progress & Calories -->
        <div class="w-full flex flex-col gap-2">
          <div class="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span id="hud-walk-distance" class="text-sky-300 font-mono font-bold">0.00 km</span>
            <span id="hud-walk-calories" class="text-amber-300 font-mono">0 kcal approx.</span>
            <span id="hud-time-display" class="font-mono tabular-nums text-slate-300">00:00 / 00:00</span>
          </div>
          <div class="w-full h-3 bg-slate-900/80 rounded-full border border-slate-700/60 overflow-hidden p-0.5">
            <div id="hud-progress-fill" class="h-full bg-gradient-to-r from-emerald-500 to-sky-500 rounded-full transition-all duration-150" style="width: 0%;"></div>
          </div>
        </div>
      `;
    }

    this.container.appendChild(this.hudDom);
    this.renderLives();

    const pauseBtn = this.hudDom.querySelector('#hud-pause-btn');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        if (this.options.onPause) this.options.onPause();
      });
    }
  }

  // Corner Mat Preview Lighting Widget
  initMatPreview() {
    this.matPreviewDom = document.createElement('div');
    this.matPreviewDom.id = 'mat-preview-widget';
    this.matPreviewDom.className = 'absolute bottom-6 right-6 pointer-events-auto z-40 bg-slate-950/85 border border-slate-800 rounded-xl p-3 shadow-xl backdrop-blur transition-all cursor-pointer select-none';
    this.matPreviewDom.title = 'Click or press [M] to toggle Mat Preview';
    this.matPreviewDom.innerHTML = `
      <div class="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1.5 flex justify-between">
        <span>MAT SENSOR</span>
        <span id="mat-conn-dot" class="text-slate-600">●</span>
      </div>

      <!-- Front Jump Zone -->
      <div id="mat-front-zone" class="w-28 h-2.5 bg-slate-800 rounded-sm mb-1.5 mx-auto transition-colors duration-100"></div>

      <!-- 3 Lanes x Foot Sensor Zones -->
      <div class="grid grid-cols-3 gap-1.5 w-28 h-20 bg-slate-900/80 rounded p-1 border border-slate-800/80 relative">
        <!-- Lane -1: Left -->
        <div id="mat-lane-l" class="flex flex-col justify-between items-center bg-slate-800/40 rounded py-1 transition-colors duration-100">
          <div id="mat-foot-l-toe" class="w-2.5 h-3 bg-slate-700 rounded-sm"></div>
          <div id="mat-foot-l-mid" class="w-2 h-2.5 bg-slate-700 rounded-sm"></div>
          <div id="mat-foot-l-heel" class="w-2.5 h-3.5 bg-slate-700 rounded-sm"></div>
        </div>

        <!-- Lane 0: Center -->
        <div id="mat-lane-c" class="flex flex-col justify-between items-center bg-slate-800/60 rounded py-1 transition-colors duration-100">
          <div class="w-2 h-2 bg-slate-700/60 rounded-full"></div>
          <span class="text-[8px] font-mono text-slate-500 font-bold">CTR</span>
          <div class="w-2 h-2 bg-slate-700/60 rounded-full"></div>
        </div>

        <!-- Lane 1: Right -->
        <div id="mat-lane-r" class="flex flex-col justify-between items-center bg-slate-800/40 rounded py-1 transition-colors duration-100">
          <div id="mat-foot-r-toe" class="w-2.5 h-3 bg-slate-700 rounded-sm"></div>
          <div id="mat-foot-r-mid" class="w-2 h-2.5 bg-slate-700 rounded-sm"></div>
          <div id="mat-foot-r-heel" class="w-2.5 h-3.5 bg-slate-700 rounded-sm"></div>
        </div>
      </div>
    `;

    this.container.appendChild(this.matPreviewDom);

    this.matPreviewDom.addEventListener('click', () => {
      this.toggleMatPreview();
    });

    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.code === 'KeyM') {
        this.toggleMatPreview();
      }
    });
  }

  toggleMatPreview() {
    this.matPreviewVisible = !this.matPreviewVisible;
    if (this.matPreviewDom) {
      this.matPreviewDom.classList.toggle('opacity-20', !this.matPreviewVisible);
    }
  }

  // Update real-time HUD values
  updateGameHUD({ score, combo, lives, progress, currentTime, duration, sectionName }) {
    if (this.type !== 'game') return;

    if (score !== undefined && score !== this.score) {
      this.score = score;
      const el = this.hudDom.querySelector('#hud-score-val');
      if (el) el.textContent = score.toLocaleString();
    }

    if (combo !== undefined && combo !== this.combo) {
      this.combo = combo;
      if (combo > this.maxCombo) this.maxCombo = combo;
      const numEl = this.hudDom.querySelector('#hud-combo-num');
      if (numEl) {
        numEl.textContent = `${combo}x`;
        numEl.parentElement.style.transform = 'scale(1.25)';
        setTimeout(() => {
          if (numEl.parentElement) numEl.parentElement.style.transform = 'scale(1.0)';
        }, 150);
      }
    }

    if (lives !== undefined && lives !== this.lives) {
      this.lives = lives;
      this.renderLives();
    }

    if (progress !== undefined) {
      const fill = this.hudDom.querySelector('#hud-progress-fill');
      if (fill) fill.style.width = `${Math.min(100, Math.max(0, progress * 100))}%`;
    }

    if (currentTime !== undefined && duration !== undefined) {
      const timeEl = this.hudDom.querySelector('#hud-time-display');
      if (timeEl) {
        const curM = Math.floor(currentTime / 60);
        const curS = Math.floor(currentTime % 60);
        const durM = Math.floor(duration / 60);
        const durS = Math.floor(duration % 60);
        timeEl.textContent = `${String(curM).padStart(2, '0')}:${String(curS).padStart(2, '0')} / ${String(durM).padStart(2, '0')}:${String(durS).padStart(2, '0')}`;
      }
    }

    if (sectionName) {
      const secEl = this.hudDom.querySelector('#hud-section-name');
      if (secEl) secEl.textContent = sectionName;
    }
  }

  updateWalkHUD({ steps, cadence, speedKmh, distanceKm, calories, progress, currentTime, duration, idlePaused }) {
    if (this.type !== 'walk') return;

    const stepsEl = this.hudDom.querySelector('#hud-walk-steps');
    if (stepsEl && steps !== undefined) stepsEl.textContent = steps.toLocaleString();

    const cadEl = this.hudDom.querySelector('#hud-walk-cadence');
    if (cadEl && cadence !== undefined) cadEl.textContent = cadence;

    const spdEl = this.hudDom.querySelector('#hud-walk-speed');
    if (spdEl && speedKmh !== undefined) spdEl.textContent = speedKmh.toFixed(1);

    const distEl = this.hudDom.querySelector('#hud-walk-distance');
    if (distEl && distanceKm !== undefined) distEl.textContent = `${distanceKm.toFixed(2)} km`;

    const calEl = this.hudDom.querySelector('#hud-walk-calories');
    if (calEl && calories !== undefined) calEl.textContent = `${calories} kcal approx.`;

    const fill = this.hudDom.querySelector('#hud-progress-fill');
    if (fill && progress !== undefined) fill.style.width = `${Math.min(100, Math.max(0, progress * 100))}%`;

    const timeEl = this.hudDom.querySelector('#hud-time-display');
    if (timeEl && currentTime !== undefined && duration !== undefined) {
      const curM = Math.floor(currentTime / 60);
      const curS = Math.floor(currentTime % 60);
      const durM = Math.floor(duration / 60);
      const durS = Math.floor(duration % 60);
      timeEl.textContent = `${String(curM).padStart(2, '0')}:${String(curS).padStart(2, '0')} / ${String(durM).padStart(2, '0')}:${String(durS).padStart(2, '0')}`;
    }

    const idleBanner = this.hudDom.querySelector('#hud-idle-banner');
    if (idleBanner) {
      idleBanner.classList.toggle('hidden', !idlePaused);
    }
  }

  showPOI(poi) {
    const card = this.hudDom.querySelector('#hud-poi-card');
    if (!card) return;
    const titleEl = card.querySelector('#hud-poi-title');
    const descEl = card.querySelector('#hud-poi-desc');
    if (titleEl) titleEl.textContent = poi.title || 'Landmark';
    if (descEl) descEl.textContent = poi.description || '';
    card.classList.remove('hidden');
    card.style.opacity = '1';

    setTimeout(() => {
      card.style.opacity = '0';
      setTimeout(() => card.classList.add('hidden'), 300);
    }, (poi.duration || 8) * 1000);
  }

  showActionWarning(actionName) {
    const warningEl = this.hudDom.querySelector('#hud-action-warning');
    const badgeEl = this.hudDom.querySelector('#hud-action-badge');
    if (!warningEl || !badgeEl) return;
    badgeEl.textContent = actionName;
    warningEl.classList.remove('hidden');
  }

  hideActionWarning() {
    const warningEl = this.hudDom.querySelector('#hud-action-warning');
    if (warningEl) warningEl.classList.add('hidden');
  }

  renderLives() {
    const container = this.hudDom?.querySelector('#hud-lives-container');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      const heart = document.createElement('div');
      heart.className = `w-5 h-5 rounded-full transition-all ${
        i < this.lives ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]' : 'bg-slate-800 border border-slate-700 opacity-40'
      }`;
      container.appendChild(heart);
    }
  }

  // Update mat preview lighting based on real-time inputs
  updateMatLighting() {
    if (!this.matPreviewDom || !this.matPreviewVisible) return;
    const state = InputManager.state;

    // Gamepad connection dot
    const connDot = this.matPreviewDom.querySelector('#mat-conn-dot');
    if (connDot) {
      connDot.className = state.gamepadConnected ? 'text-emerald-400' : 'text-slate-600';
    }

    // Front Jump zone
    const front = this.matPreviewDom.querySelector('#mat-front-zone');
    if (front) {
      front.className = state.jump
        ? 'w-28 h-2.5 bg-white shadow-[0_0_15px_#ffffff] rounded-sm mb-1.5 mx-auto transition-colors'
        : 'w-28 h-2.5 bg-slate-800 rounded-sm mb-1.5 mx-auto transition-colors';
    }

    // Lanes highlight
    const laneL = this.matPreviewDom.querySelector('#mat-lane-l');
    const laneC = this.matPreviewDom.querySelector('#mat-lane-c');
    const laneR = this.matPreviewDom.querySelector('#mat-lane-r');

    if (laneL) laneL.className = state.lane === -1
      ? 'flex flex-col justify-between items-center bg-sky-600/70 shadow-[0_0_12px_rgba(56,189,248,0.5)] rounded py-1 transition-colors'
      : 'flex flex-col justify-between items-center bg-slate-800/40 rounded py-1 transition-colors';

    if (laneC) laneC.className = state.lane === 0
      ? 'flex flex-col justify-between items-center bg-sky-600/70 shadow-[0_0_12px_rgba(56,189,248,0.5)] rounded py-1 transition-colors'
      : 'flex flex-col justify-between items-center bg-slate-800/40 rounded py-1 transition-colors';

    if (laneR) laneR.className = state.lane === 1
      ? 'flex flex-col justify-between items-center bg-sky-600/70 shadow-[0_0_12px_rgba(56,189,248,0.5)] rounded py-1 transition-colors'
      : 'flex flex-col justify-between items-center bg-slate-800/40 rounded py-1 transition-colors';

    // Slide lighting (all foot zones light up amber)
    if (state.slide) {
      ['l-toe', 'l-mid', 'l-heel', 'r-toe', 'r-mid', 'r-heel'].forEach(zone => {
        const el = this.matPreviewDom.querySelector(`#mat-foot-${zone}`);
        if (el) el.className = el.className.replace('bg-slate-700', 'bg-amber-400');
      });
    }
  }

  // Flash a specific foot zone when step occurs
  pulseFoot(foot = 'left') {
    if (!this.matPreviewDom) return;
    const prefix = foot === 'left' ? 'l' : 'r';
    ['toe', 'mid', 'heel'].forEach(part => {
      const el = this.matPreviewDom.querySelector(`#mat-foot-${prefix}-${part}`);
      if (el) {
        el.classList.add('bg-emerald-400', 'shadow-[0_0_8px_#34d399]');
        setTimeout(() => {
          el.classList.remove('bg-emerald-400', 'shadow-[0_0_8px_#34d399]');
        }, 180);
      }
    });
  }

  // --- PAUSE MENU MODAL ---
  showPauseMenu({ onResume, onRestart, onQuit, onCalibrate }) {
    if (this.pauseModalDom) return;
    this.pauseModalDom = document.createElement('div');
    this.pauseModalDom.id = 'hud-pause-modal';
    this.pauseModalDom.className = 'absolute inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-6 select-none';
    this.pauseModalDom.innerHTML = `
      <div class="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-8 shadow-2xl flex flex-col items-center text-center">
        <h2 class="text-3xl font-black tracking-wider text-white mb-2 uppercase">${t('pauseTitle')}</h2>
        <p class="text-sm text-slate-400 mb-8">Take a breather, grab some water, or calibrate your sensor.</p>

        <div class="w-full space-y-3" id="pause-menu-actions">
          <button id="pause-resume-btn" class="w-full py-4 px-6 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-slate-950 font-black text-lg rounded-xl shadow-lg transition">
            ${t('resume')} (ESC)
          </button>
          <button id="pause-restart-btn" class="w-full py-3.5 px-6 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 transition">
            ${t('restart')}
          </button>
          <button id="pause-calibrate-btn" class="w-full py-3.5 px-6 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 transition">
            ${t('calibrationTitle')}
          </button>
          <button id="pause-mute-btn" class="w-full py-3 px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl border border-slate-700 text-sm transition">
            ${AudioManager.isMuted ? t('unmute') : t('mute')}
          </button>
          <button id="pause-quit-btn" class="w-full py-3 px-6 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 font-bold rounded-xl border border-rose-800/60 text-sm transition mt-2">
            ${t('quit')}
          </button>
        </div>
      </div>
    `;

    this.container.appendChild(this.pauseModalDom);

    const resumeBtn = this.pauseModalDom.querySelector('#pause-resume-btn');
    const restartBtn = this.pauseModalDom.querySelector('#pause-restart-btn');
    const calibrateBtn = this.pauseModalDom.querySelector('#pause-calibrate-btn');
    const muteBtn = this.pauseModalDom.querySelector('#pause-mute-btn');
    const quitBtn = this.pauseModalDom.querySelector('#pause-quit-btn');

    resumeBtn.focus();

    resumeBtn.addEventListener('click', () => {
      this.closePauseMenu();
      if (onResume) onResume();
    });

    restartBtn.addEventListener('click', () => {
      this.closePauseMenu();
      if (onRestart) onRestart();
    });

    calibrateBtn.addEventListener('click', () => {
      this.closePauseMenu();
      if (onCalibrate) onCalibrate();
    });

    muteBtn.addEventListener('click', () => {
      const isMuted = AudioManager.toggleMute();
      muteBtn.textContent = isMuted ? t('unmute') : t('mute');
    });

    quitBtn.addEventListener('click', () => {
      this.closePauseMenu();
      if (onQuit) onQuit();
    });
  }

  closePauseMenu() {
    if (this.pauseModalDom && this.pauseModalDom.parentNode) {
      this.pauseModalDom.parentNode.removeChild(this.pauseModalDom);
      this.pauseModalDom = null;
    }
  }

  // --- RESULTS / SUMMARY MODAL ---
  showResultsModal({ activityId, score, maxCombo, stars, steps, distanceKm, calories, onRestart, onQuit }) {
    const isNewRecord = saveRecord(activityId, { score, stars });
    if (stars > 0) {
      AudioManager.play('win');
    }

    const modal = document.createElement('div');
    modal.className = 'absolute inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-lg p-6 select-none';
    modal.innerHTML = `
      <div class="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center">
        <div class="text-xs font-bold tracking-widest text-sky-400 uppercase mb-1">${t('victory')}</div>
        <h2 class="text-3xl md:text-4xl font-black text-white uppercase tracking-tight mb-4">Workout Complete!</h2>

        ${isNewRecord ? `<div class="px-4 py-1.5 mb-4 bg-amber-500/20 border border-amber-400 text-amber-300 text-xs font-black rounded-full uppercase tracking-wider animate-pulse">${t('newRecord')}</div>` : ''}

        <!-- Stars (1 to 3) -->
        <div class="flex items-center justify-center gap-3 my-4">
          ${[1, 2, 3].map(s => `
            <div class="text-5xl md:text-6xl transition-all duration-300 ${s <= stars ? 'text-amber-400 scale-110 drop-shadow-[0_0_20px_rgba(251,191,36,0.6)]' : 'text-slate-700'}">
              ★
            </div>
          `).join('')}
        </div>

        <!-- Metrics Grid -->
        <div class="grid grid-cols-2 gap-3 w-full my-6 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
          <div class="text-left">
            <div class="text-xs text-slate-400 font-semibold uppercase">${t('score')}</div>
            <div class="text-2xl font-black font-mono text-white">${score.toLocaleString()}</div>
          </div>
          <div class="text-left">
            <div class="text-xs text-slate-400 font-semibold uppercase">Max Combo</div>
            <div class="text-2xl font-black font-mono text-amber-400">${maxCombo}x</div>
          </div>
          ${steps !== undefined ? `
            <div class="text-left">
              <div class="text-xs text-slate-400 font-semibold uppercase">${t('steps')}</div>
              <div class="text-2xl font-black font-mono text-emerald-400">${steps.toLocaleString()}</div>
            </div>
          ` : ''}
          ${distanceKm !== undefined ? `
            <div class="text-left">
              <div class="text-xs text-slate-400 font-semibold uppercase">${t('distance')}</div>
              <div class="text-2xl font-black font-mono text-sky-400">${distanceKm.toFixed(2)} km</div>
            </div>
          ` : ''}
        </div>

        <div class="w-full flex gap-3">
          <button id="results-restart-btn" class="flex-1 py-4 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black rounded-xl text-base transition">
            ${t('restart')}
          </button>
          <button id="results-quit-btn" class="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-base border border-slate-700 transition">
            ${t('quit')}
          </button>
        </div>
      </div>
    `;

    this.container.appendChild(modal);

    modal.querySelector('#results-restart-btn').addEventListener('click', () => {
      modal.remove();
      if (onRestart) onRestart();
    });

    modal.querySelector('#results-quit-btn').addEventListener('click', () => {
      modal.remove();
      if (onQuit) onQuit();
    });
  }

  destroy() {
    if (this.hudDom && this.hudDom.parentNode) this.hudDom.parentNode.removeChild(this.hudDom);
    if (this.matPreviewDom && this.matPreviewDom.parentNode) this.matPreviewDom.parentNode.removeChild(this.matPreviewDom);
    this.closePauseMenu();
  }
}

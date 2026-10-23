/**
 * ui.js
 * Cheerful, TV-friendly User Interface manager for FloorMat Studio TV.
 * Features:
 * - 2D Spatial Arrow Key & Gamepad D-Pad Navigation Engine across all screens and modals.
 * - 3 Experience Levels:
 *     1. Normal (Simple & Fun): Sweet, kid & family-friendly, zero clutter, big candy cards.
 *     2. Advanced: Ready-made catalog, YouTube link customizer, profiles, calibration.
 *     3. Expert: Direct script JSON editor, live authoring studio, raw debug telemetry, simulator.
 * - Happy, energetic, high-contrast colors with playful bouncy focus states.
 * - Full mouse, touch, keyboard, and gamepad accessibility.
 */

import { SETTINGS, saveSettings, getCurrentProfile, saveProfile, t, I18N, getWeeklyStats } from './storage.js';
import { InputManager } from './input.js';
import { AudioManager } from './audio.js';
import { parseYouTubeUrl } from './videoSource.js';

export function showToast(message, type = 'info') {
  let toastContainer = document.getElementById('app-toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'app-toast-container';
    toastContainer.className = 'fixed top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none max-w-md';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  const bg = type === 'error' ? 'bg-rose-600 text-white shadow-rose-950/60' : (type === 'success' ? 'bg-emerald-600 text-white shadow-emerald-950/60' : 'bg-slate-900 text-amber-300 border border-amber-400/40 shadow-black/80');
  toast.className = `${bg} px-5 py-3 rounded-2xl shadow-2xl font-bold text-sm tracking-wide flex items-center gap-3 animate-bounce transition-all duration-300 pointer-events-auto`;
  toast.innerHTML = `<span>${message}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
if (typeof window !== 'undefined') {
  window.showToast = showToast;
}

export class UIManager {
  constructor(app) {
    this.app = app;
    this.root = document.getElementById('root');
    this.activeModal = null;
    this.debugPanelDom = null;
    this.debugVisible = false;
    this.catalogData = null;

    this.initSpatialNavigation();
    this.initGlobalShortcuts();
    this.initDebugPanel();
  }

  // --- 2D SPATIAL ARROW KEY & GAMEPAD D-PAD NAVIGATION ENGINE ---
  initSpatialNavigation() {
    // Listen for Directional Menu Navigation from InputManager (Keyboard Arrows & Gamepad D-pad)
    InputManager.onMenuNav((direction) => {
      this.navigateDirection(direction);
    });

    // Listen for Select action (Enter, Space, Gamepad Button 0 / A)
    InputManager.onMenuSelect(() => {
      this.selectCurrentElement();
    });

    // Listen for Back / Cancel action (Escape, Gamepad Button 1 / B)
    InputManager.onMenuBack(() => {
      this.handleBackAction();
    });
  }

  // Get all focusable elements inside the currently active context
  getFocusableElements() {
    // If a modal is open, trap focus strictly inside the modal
    const context = this.activeModal || document.getElementById('home-view') || this.root;
    if (!context) return [];

    const selector = 'button:not([disabled]):not([aria-hidden="true"]), [tabindex="0"]:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), .nav-focus';
    const elements = Array.from(context.querySelectorAll(selector));
    
    // Filter only visible elements
    return elements.filter(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && el.offsetParent !== null;
    });
  }

  // Spatial 2D direction navigation
  navigateDirection(direction) {
    const focusables = this.getFocusableElements();
    if (focusables.length === 0) return;

    let current = document.activeElement;
    if (!current || !focusables.includes(current)) {
      // Focus first item
      focusables[0].focus();
      AudioManager.play('tick');
      return;
    }

    const currentRect = current.getBoundingClientRect();
    const currentCx = currentRect.left + currentRect.width / 2;
    const currentCy = currentRect.top + currentRect.height / 2;

    let bestCandidate = null;
    let minDistance = Infinity;

    for (const el of focusables) {
      if (el === current) continue;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const dx = cx - currentCx;
      const dy = cy - currentCy;

      let isCandidate = false;
      let weightedDist = Infinity;

      if (direction === 'RIGHT' && dx > 10) {
        isCandidate = true;
        weightedDist = dx * dx + (dy * dy) * 3.5;
      } else if (direction === 'LEFT' && dx < -10) {
        isCandidate = true;
        weightedDist = (-dx) * (-dx) + (dy * dy) * 3.5;
      } else if (direction === 'DOWN' && dy > 10) {
        isCandidate = true;
        weightedDist = dy * dy + (dx * dx) * 3.5;
      } else if (direction === 'UP' && dy < -10) {
        isCandidate = true;
        weightedDist = (-dy) * (-dy) + (dx * dx) * 3.5;
      }

      if (isCandidate && weightedDist < minDistance) {
        minDistance = weightedDist;
        bestCandidate = el;
      }
    }

    // Fallback: If no candidate in the exact angular cone, wrap linearly in DOM order
    if (!bestCandidate) {
      const currentIndex = focusables.indexOf(current);
      if (direction === 'RIGHT' || direction === 'DOWN') {
        bestCandidate = focusables[(currentIndex + 1) % focusables.length];
      } else {
        bestCandidate = focusables[(currentIndex - 1 + focusables.length) % focusables.length];
      }
    }

    if (bestCandidate) {
      bestCandidate.focus();
      bestCandidate.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      AudioManager.play('tick');
    }
  }

  // Activate currently focused item
  selectCurrentElement() {
    const el = document.activeElement;
    if (el && typeof el.click === 'function') {
      AudioManager.play('good');
      el.click();
    }
  }

  // Handle Back / Close / Escape
  handleBackAction() {
    if (this.activeModal) {
      // Find close or cancel button inside active modal
      const closeBtn = this.activeModal.querySelector('#modal-close-btn, #wiz-cancel-btn, #prof-close-btn, #settings-close-btn, #paste-modal-close, #paste-cancel-btn, #results-quit-btn, #pause-quit-btn, #pause-resume-btn');
      if (closeBtn) {
        closeBtn.click();
      } else {
        this.closeModal(this.activeModal);
      }
    }
  }

  openModal(modalElement) {
    this.closeModal();
    this.activeModal = modalElement;
    document.body.appendChild(modalElement);
    modalElement.classList.add('active-modal');

    // Auto-focus first button in modal
    setTimeout(() => {
      const focusables = this.getFocusableElements();
      if (focusables.length > 0) {
        focusables[0].focus();
      }
    }, 50);
  }

  closeModal(modalElement = null) {
    const target = modalElement || this.activeModal;
    if (target && target.parentNode) {
      target.parentNode.removeChild(target);
    }
    if (this.activeModal === target) {
      this.activeModal = null;
    }
    // Return focus to home
    setTimeout(() => {
      const focusables = this.getFocusableElements();
      if (focusables.length > 0) focusables[0].focus();
    }, 50);
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

  // Set Experience Level: 'normal' | 'advanced' | 'expert'
  setExperienceLevel(level) {
    SETTINGS.experienceLevel = level;
    saveSettings();
    AudioManager.play('good');
    this.renderHomeScreen();
  }

  // --- RENDER MAIN HOME SCREEN ---
  renderHomeScreen() {
    this.applyLanguageDirection();
    const profile = getCurrentProfile();
    const stats = getWeeklyStats();
    const expLevel = SETTINGS.experienceLevel || 'normal';

    this.root.innerHTML = `
      <div id="home-view" class="w-full h-full flex flex-col justify-between bg-transparent text-white p-6 md:p-8 tv-safe-area select-none overflow-y-auto">
        
        <!-- HEADER ROW: Brand, Experience Level Switcher & Profile Quick Access -->
        <header class="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-indigo-900/40">
          
          <!-- Brand Wordmark -->
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 via-rose-500 to-sky-400 flex items-center justify-center font-black text-slate-950 text-xl shadow-[0_0_20px_rgba(251,191,36,0.5)]">
              ✨
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h1 class="text-2xl md:text-3xl font-black tracking-tight uppercase text-white drop-shadow">
                  FloorMat <span class="text-amber-300">Studio</span>
                </h1>
                <span class="text-xs px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 font-bold uppercase">TV</span>
              </div>
              <p class="text-xs text-sky-200 font-medium">${t('tagline')}</p>
            </div>
          </div>

          <!-- EXPERIENCE LEVEL TOGGLE (Normal, Advanced, Expert) -->
          <div class="flex items-center gap-1 bg-slate-900/90 p-1.5 rounded-2xl border border-indigo-500/30 shadow-lg">
            <button id="exp-normal-btn" class="nav-focus px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
              expLevel === 'normal'
                ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-[0_0_15px_rgba(251,191,36,0.5)] scale-105'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }">
              🌟 ${t('normalMode')}
            </button>
            <button id="exp-advanced-btn" class="nav-focus px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
              expLevel === 'advanced'
                ? 'bg-gradient-to-r from-sky-400 to-blue-500 text-slate-950 shadow-[0_0_15px_rgba(56,189,248,0.5)] scale-105'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }">
              🚀 ${t('advancedMode')}
            </button>
            <button id="exp-expert-btn" class="nav-focus px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
              expLevel === 'expert'
                ? 'bg-gradient-to-r from-purple-400 to-indigo-500 text-slate-950 shadow-[0_0_15px_rgba(167,139,250,0.5)] scale-105'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }">
              ⚡ ${t('expertMode')}
            </button>
          </div>

          <!-- Top Action Buttons (Profile, Settings, Tools) -->
          <div class="flex items-center gap-2">
            <button id="nav-profiles-btn" class="nav-focus px-3.5 py-2 bg-slate-900/80 hover:bg-slate-800 active:bg-slate-700 text-slate-200 hover:text-white rounded-xl border border-indigo-500/30 text-xs font-bold transition flex items-center gap-1.5 shadow">
              <span>👤 ${profile.name}</span>
            </button>
            <button id="nav-settings-btn" class="nav-focus px-3 py-2 bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white rounded-xl border border-indigo-500/30 text-xs font-bold transition shadow">
              ⚙️ ${t('settingsTitle')}
            </button>
            
            ${expLevel !== 'normal' ? `
              <button id="nav-calibrate-btn" class="nav-focus px-3 py-2 bg-slate-900/80 hover:bg-slate-800 text-amber-300 rounded-xl border border-amber-500/30 text-xs font-bold transition shadow">
                ⚖️ Calibration
              </button>
            ` : ''}

            ${expLevel === 'expert' ? `
              <button id="nav-authoring-btn" class="nav-focus px-3 py-2 bg-purple-900/60 hover:bg-purple-800 text-purple-200 rounded-xl border border-purple-500/40 text-xs font-bold transition shadow">
                ✏️ Studio [A]
              </button>
              <button id="nav-sim-btn" class="nav-focus px-3 py-2 bg-sky-900/60 hover:bg-sky-800 text-sky-200 rounded-xl border border-sky-500/40 text-xs font-bold transition shadow">
                🕹️ Sim [S]
              </button>
            ` : ''}
          </div>
        </header>

        <!-- CENTER CONTENT CONTAINER -->
        <main class="my-4 space-y-6">
          
          <!-- THREE MAIN HAPPY ACTIVITY CARDS -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            <!-- Tile 1: GAME (Sunshine Amber / Electric Cyan) -->
            <div id="tile-game" tabindex="0" class="nav-focus happy-card group relative bg-gradient-to-br from-amber-500/20 via-slate-900 to-slate-900 border-2 border-amber-400/60 hover:border-amber-400 rounded-3xl p-6 transition-all duration-200 shadow-xl cursor-pointer flex flex-col justify-between h-64 md:h-72">
              <div>
                <div class="flex justify-between items-start mb-2">
                  <span class="px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[11px] font-black uppercase tracking-wider">
                    ⚡ Rhythm Obstacle Run
                  </span>
                  <span class="text-3xl filter drop-shadow">🎮</span>
                </div>
                <h3 class="text-3xl font-black text-white uppercase group-hover:text-amber-300 transition">
                  ${t('game')}
                </h3>
                <p class="text-xs text-amber-100/80 mt-2.5 leading-relaxed">
                  Jump over hurdles, slide low, and dash through glowing beat gates in sync with musical rhythms on the mat!
                </p>
              </div>

              <div class="pt-4 border-t border-amber-500/20 flex items-center justify-between">
                <span class="text-xs font-black text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
                  Play Now →
                </span>
                <span class="px-2.5 py-1 rounded-lg bg-amber-400/10 text-amber-300 text-[11px] font-mono font-bold">
                  90s · 3 Lives
                </span>
              </div>
            </div>

            <!-- Tile 2: WALK (Spring Emerald / Mint) -->
            <div id="tile-walk" tabindex="0" class="nav-focus happy-card group relative bg-gradient-to-br from-emerald-500/20 via-slate-900 to-slate-900 border-2 border-emerald-400/60 hover:border-emerald-400 rounded-3xl p-6 transition-all duration-200 shadow-xl cursor-pointer flex flex-col justify-between h-64 md:h-72">
              <div>
                <div class="flex justify-between items-start mb-2">
                  <span class="px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/40 text-[11px] font-black uppercase tracking-wider">
                    🌲 Nature Journey
                  </span>
                  <span class="text-3xl filter drop-shadow">🏔️</span>
                </div>
                <h3 class="text-3xl font-black text-white uppercase group-hover:text-emerald-300 transition">
                  ${t('walk')}
                </h3>
                <p class="text-xs text-emerald-100/80 mt-2.5 leading-relaxed">
                  Stroll peacefully through panoramic mountain trails. The video speeds up when you walk and pauses when you stop!
                </p>
              </div>

              <div class="pt-4 border-t border-emerald-500/20 flex items-center justify-between">
                <span class="text-xs font-black text-emerald-300 uppercase tracking-wide flex items-center gap-1.5">
                  Start Walk →
                </span>
                <span class="px-2.5 py-1 rounded-lg bg-emerald-400/10 text-emerald-300 text-[11px] font-mono font-bold">
                  1,000 Steps Goal
                </span>
              </div>
            </div>

            <!-- Tile 3: CARDIO (Bubblegum Coral / Fuchsia) -->
            <div id="tile-cardio" tabindex="0" class="nav-focus happy-card group relative bg-gradient-to-br from-rose-500/20 via-slate-900 to-slate-900 border-2 border-rose-400/60 hover:border-rose-400 rounded-3xl p-6 transition-all duration-200 shadow-xl cursor-pointer flex flex-col justify-between h-64 md:h-72">
              <div>
                <div class="flex justify-between items-start mb-2">
                  <span class="px-3 py-1 rounded-full bg-rose-400/20 text-rose-300 border border-rose-400/40 text-[11px] font-black uppercase tracking-wider">
                    🔥 Smart Treadmill
                  </span>
                  <span class="text-3xl filter drop-shadow">🏃</span>
                </div>
                <h3 class="text-3xl font-black text-white uppercase group-hover:text-rose-300 transition">
                  ${t('cardio')}
                </h3>
                <p class="text-xs text-rose-100/80 mt-2.5 leading-relaxed">
                  Full-screen athletic TV speed gauge with audio coaching, pace targets, sprint intervals, and joyful celebration!
                </p>
              </div>

              <div class="pt-4 border-t border-rose-500/20 flex items-center justify-between">
                <span class="text-xs font-black text-rose-300 uppercase tracking-wide flex items-center gap-1.5">
                  Start Cardio →
                </span>
                <span class="px-2.5 py-1 rounded-lg bg-rose-400/10 text-rose-300 text-[11px] font-mono font-bold">
                  20 Min HIIT
                </span>
              </div>
            </div>

          </div>

          <!-- ADVANCED & EXPERT SECTIONS -->
          ${expLevel !== 'normal' ? `
            <!-- Activity Catalog Strip -->
            <div class="bg-slate-900/80 border border-indigo-500/20 rounded-3xl p-6 shadow-xl">
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-2">
                  <span class="text-lg">📚</span>
                  <h2 class="text-sm font-black text-white uppercase tracking-wider">${t('catalogTitle')}</h2>
                </div>
                <span class="text-xs text-slate-400">Select any pre-configured adventure</span>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3" id="catalog-cards-container">
                <!-- Dynamically populated -->
              </div>
            </div>

            <!-- YouTube Video & Script URL Loader -->
            <div class="bg-slate-900/90 border border-indigo-500/30 rounded-3xl p-6 shadow-xl">
              <div class="flex items-center justify-between mb-3">
                <h2 class="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span>🔗</span> ${t('loadTitle')}
                </h2>
                ${expLevel === 'expert' ? `
                  <button id="loader-paste-json-btn" class="nav-focus text-xs text-sky-400 hover:text-sky-300 font-bold underline">
                    ${t('orPasteJson')}
                  </button>
                ` : ''}
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
                  <button id="loader-launch-btn" class="nav-focus w-full py-2.5 bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-300 hover:to-blue-400 active:scale-95 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition shadow-lg">
                    ${t('loadBtn')}
                  </button>
                </div>
              </div>

              <div id="loader-error-box" class="hidden mt-3 p-3 bg-rose-950/70 border border-rose-800 rounded-xl text-rose-300 text-xs"></div>
            </div>
          ` : ''}

        </main>

        <!-- FOOTER: Joyful status bar & TV navigation guide -->
        <footer class="pt-3 border-t border-indigo-900/30 flex flex-wrap items-center justify-between text-xs text-slate-400 font-medium">
          <div class="flex items-center gap-4">
            <span class="flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full ${InputManager.state.gamepadConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}"></span>
              Gamepad: <strong class="text-white">${InputManager.state.gamepadId.substring(0, 20)}</strong>
            </span>
            <span>🔥 Streak: <strong class="text-amber-300 font-bold">${stats.streak} Days</strong></span>
            <span>🏆 Total Steps: <strong class="text-emerald-300 font-bold">${stats.totalSteps}</strong></span>
          </div>

          <div class="flex items-center gap-3 text-sky-300 bg-slate-900/60 px-3 py-1 rounded-xl border border-indigo-500/20 text-[11px]">
            <span>🕹️ ${t('navHint')}</span>
          </div>
        </footer>

      </div>
    `;

    this.bindHomeEvents();
    if (expLevel !== 'normal') {
      this.loadCatalogList();
    }

    // Auto-focus the first activity card on load
    setTimeout(() => {
      const firstCard = document.getElementById('tile-game');
      if (firstCard) firstCard.focus();
    }, 80);
  }

  bindHomeEvents() {
    // Mode Switchers
    document.getElementById('exp-normal-btn')?.addEventListener('click', () => this.setExperienceLevel('normal'));
    document.getElementById('exp-advanced-btn')?.addEventListener('click', () => this.setExperienceLevel('advanced'));
    document.getElementById('exp-expert-btn')?.addEventListener('click', () => this.setExperienceLevel('expert'));

    // Primary Happy Activity Tiles
    document.getElementById('tile-game')?.addEventListener('click', () => {
      this.app.loadActivityFromLinks('', './examples/game-cyber-runner.json');
    });

    document.getElementById('tile-walk')?.addEventListener('click', () => {
      this.app.loadActivityFromLinks('', './examples/walk-alpine-trail.json');
    });

    document.getElementById('tile-cardio')?.addEventListener('click', () => {
      this.app.loadActivityFromLinks('', './examples/cardio-interval-burn.json');
    });

    // Top Navigation actions
    document.getElementById('nav-profiles-btn')?.addEventListener('click', () => this.showProfilesModal());
    document.getElementById('nav-settings-btn')?.addEventListener('click', () => this.showSettingsModal());
    document.getElementById('nav-calibrate-btn')?.addEventListener('click', () => this.showCalibrationWizard());
    document.getElementById('nav-authoring-btn')?.addEventListener('click', () => this.app.openAuthoringStudio());
    document.getElementById('nav-sim-btn')?.addEventListener('click', () => this.app.simulator.toggle());

    // Custom Load Button (in Advanced / Expert)
    document.getElementById('loader-launch-btn')?.addEventListener('click', () => {
      const ytUrl = document.getElementById('input-youtube-url')?.value.trim() || '';
      const scriptUrl = document.getElementById('input-script-url')?.value.trim() || '';

      if (!scriptUrl) {
        this.showLoaderError('Please specify a Script JSON URL or use the "Paste JSON / Local File" option.');
        return;
      }
      this.app.loadActivityFromLinks(ytUrl, scriptUrl);
    });

    // Paste JSON Modal Trigger (in Expert)
    document.getElementById('loader-paste-json-btn')?.addEventListener('click', () => {
      this.showPasteJsonModal();
    });

    // Synchronize mouse hover with keyboard focus for seamless experience
    this.root.querySelectorAll('.nav-focus, button, [tabindex="0"]').forEach(el => {
      el.addEventListener('mouseenter', () => {
        el.focus();
      });
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
      const resp = await fetch('./examples/catalog.json');
      if (resp.ok) {
        this.catalogData = await resp.json();
        this.renderCatalogCards();
      }
    } catch (e) {
      console.warn('[UI] Could not load catalog:', e);
    }
  }

  renderCatalogCards() {
    const container = document.getElementById('catalog-cards-container');
    if (!container || !this.catalogData?.activities) return;

    container.innerHTML = '';
    const lang = SETTINGS.language || 'en';

    this.catalogData.activities.forEach(item => {
      const card = document.createElement('div');
      card.tabIndex = 0;
      card.className = 'nav-focus happy-card group p-4 bg-slate-950/70 hover:bg-slate-800/80 border-2 border-indigo-500/20 hover:border-sky-400 rounded-2xl cursor-pointer transition flex flex-col justify-between shadow';
      card.innerHTML = `
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-[10px] font-black text-amber-300 uppercase">${item.badge || item.type}</span>
            <span class="text-[10px] font-mono text-sky-300">${item.duration}s</span>
          </div>
          <h4 class="font-black text-white text-base group-hover:text-amber-300 transition">${item.title?.[lang] || item.title?.en}</h4>
          <p class="text-xs text-slate-300 line-clamp-2 mt-1">${item.description?.[lang] || item.description?.en}</p>
        </div>
        <div class="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs font-black text-sky-400">
          <span>Launch Adventure →</span>
          <span class="text-amber-400 uppercase text-[10px]">${item.difficulty}</span>
        </div>
      `;

      card.addEventListener('click', () => {
        this.app.loadActivityFromLinks(item.youtubeUrl || '', item.scriptUrl);
      });

      card.addEventListener('mouseenter', () => {
        card.focus();
      });

      container.appendChild(card);
    });
  }

  // --- PASTE JSON & LOCAL FILE MODAL ---
  showPasteJsonModal() {
    const modal = document.createElement('div');
    modal.id = 'paste-json-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-6 select-none';
    modal.innerHTML = `
      <div class="w-full max-w-xl bg-slate-900 border-2 border-indigo-500/40 rounded-3xl p-6 shadow-2xl flex flex-col text-white">
        <div class="flex items-center justify-between pb-3 border-b border-indigo-900/40 mb-4">
          <h3 class="font-black text-base uppercase text-white flex items-center gap-2">
            <span>📝</span> ${t('pasteJsonTitle')}
          </h3>
          <button id="paste-modal-close" class="nav-focus text-slate-400 hover:text-white px-2.5 py-1 rounded-xl bg-slate-800">✕</button>
        </div>

        <div class="mb-3">
          <label class="text-xs text-slate-300 font-semibold mb-1 block">Load from Local Computer File:</label>
          <input type="file" id="local-json-picker" accept=".json" class="nav-focus w-full text-xs text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-sky-500 file:text-slate-950 hover:file:bg-sky-400 cursor-pointer" />
        </div>

        <div class="mb-4">
          <label class="text-xs text-slate-300 font-semibold mb-1 block">Or Paste script.json Code Directly:</label>
          <textarea id="paste-json-textarea" rows="8" placeholder="${t('pastePlaceholder')}" class="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 font-mono text-xs text-sky-200 focus:border-sky-400 focus:outline-none"></textarea>
        </div>

        <div class="flex gap-3">
          <button id="paste-apply-btn" class="nav-focus flex-1 py-3 bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition shadow-lg">
            ${t('applyJson')}
          </button>
          <button id="paste-cancel-btn" class="nav-focus px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition">
            Cancel
          </button>
        </div>
      </div>
    `;

    this.openModal(modal);

    const close = () => this.closeModal(modal);
    modal.querySelector('#paste-modal-close').addEventListener('click', close);
    modal.querySelector('#paste-cancel-btn').addEventListener('click', close);

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

    modal.querySelector('#paste-apply-btn').addEventListener('click', () => {
      const raw = modal.querySelector('#paste-json-textarea').value.trim();
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        close();
        this.app.startActivity(parsed, '');
      } catch (err) {
        showToast('Invalid JSON syntax: ' + err.message, 'error');
      }
    });
  }

  // --- 8-STEP CALIBRATION WIZARD ---
  showCalibrationWizard() {
    const wizardModal = document.createElement('div');
    wizardModal.id = 'mat-calibration-modal';
    wizardModal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-xl p-8 select-none text-white';

    const steps = [
      { id: 'rest', title: 'Step 1 of 8: Baseline Rest', desc: 'Stand completely off the mat or remain motionless.', durationSec: 3 },
      { id: 'center', title: 'Step 2 of 8: Center Position', desc: 'Stand comfortably in the Center lane.', durationSec: 3 },
      { id: 'left', title: 'Step 3 of 8: Left Lane Shift', desc: 'Step your feet into the Left lane.', durationSec: 3 },
      { id: 'right', title: 'Step 4 of 8: Right Lane Shift', desc: 'Step your feet into the Right lane.', durationSec: 3 },
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
        <div class="w-full max-w-xl bg-slate-900 border-2 border-amber-400/50 rounded-3xl p-10 shadow-2xl flex flex-col items-center text-center">
          <div class="text-xs font-black tracking-widest text-amber-300 uppercase mb-2">${step.title}</div>
          <h2 class="text-3xl md:text-4xl font-black text-white uppercase tracking-tight mb-4">${step.desc}</h2>
          
          <!-- Large 3-2-1 Countdown Timer -->
          <div class="w-32 h-32 rounded-full border-4 border-amber-400 flex items-center justify-center my-6 bg-slate-950 shadow-[0_0_35px_rgba(251,191,36,0.4)]">
            <span class="text-6xl font-black font-mono text-amber-300 tabular-nums">${countdownRemaining}</span>
          </div>

          <p class="text-xs text-slate-300 mb-8">Capturing sensor baselines to calibrate personal noise floors and thresholds.</p>

          <button id="wiz-cancel-btn" class="nav-focus px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition">
            Cancel Calibration
          </button>
        </div>
      `;

      wizardModal.querySelector('#wiz-cancel-btn').addEventListener('click', () => {
        clearInterval(intervalId);
        this.closeModal(wizardModal);
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

    this.openModal(wizardModal);
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
      <div class="w-full max-w-md bg-slate-900 border-2 border-emerald-400 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center">
        <div class="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-3xl font-black mb-4">✓</div>
        <h2 class="text-2xl font-black text-white uppercase mb-2">Calibration Complete!</h2>
        <p class="text-xs text-slate-300 mb-6">Your personal sensor sensitivity and cadence benchmarks are saved.</p>
        <button id="wiz-done-btn" class="nav-focus w-full py-3.5 bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition">
          Return to Dashboard
        </button>
      </div>
    `;

    wizardModal.querySelector('#wiz-done-btn').addEventListener('click', () => {
      this.closeModal(wizardModal);
    });
  }

  // --- LIVE TELEMETRY DEBUG PANEL (TOGGLE WITH 'D') ---
  initDebugPanel() {
    this.debugPanelDom = document.createElement('div');
    this.debugPanelDom.id = 'debug-telemetry-panel';
    this.debugPanelDom.className = 'fixed top-4 right-4 z-50 w-80 bg-slate-900/95 border border-indigo-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur text-[11px] text-slate-300 hidden select-none font-mono';
    this.debugPanelDom.innerHTML = `
      <div class="flex items-center justify-between border-b border-indigo-900/40 pb-2 mb-2 font-black text-amber-300">
        <span>DEBUG TELEMETRY [D]</span>
        <button id="debug-close-btn" class="text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800">✕</button>
      </div>

      <div class="space-y-1.5 mb-3">
        <div>Gamepad: <span id="dbg-gamepad-id" class="text-white">None</span></div>
        <div>Cadence: <span id="dbg-cadence" class="text-emerald-400 font-bold">0 SPM</span></div>
        <div>Speed: <span id="dbg-speed" class="text-amber-400 font-bold">0.0 km/h</span></div>
        <div>Lane: <span id="dbg-lane" class="text-sky-300 font-bold">0</span></div>
        <div>Intensity: <span id="dbg-intensity" class="text-indigo-300 font-bold">0.0</span></div>
      </div>

      <div class="border-t border-indigo-900/40 pt-2 mb-2">
        <div class="text-[10px] text-slate-400 mb-1">RECENT ACTIONS:</div>
        <div id="dbg-actions-list" class="h-28 overflow-y-auto space-y-0.5 text-[10px] text-slate-400 bg-slate-950/70 p-1.5 rounded-xl">
          <div>Waiting for input...</div>
        </div>
      </div>
    `;

    document.body.appendChild(this.debugPanelDom);
    this.debugPanelDom.querySelector('#debug-close-btn').addEventListener('click', () => this.toggleDebugPanel());

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
          <div>[${a.time}] <strong class="text-amber-300">${a.action}</strong> (${a.source})</div>
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
    modal.id = 'profiles-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-6 select-none';
    modal.innerHTML = `
      <div class="w-full max-w-md bg-slate-900 border-2 border-indigo-500/40 rounded-3xl p-7 shadow-2xl flex flex-col text-white">
        <div class="flex items-center justify-between pb-3 border-b border-indigo-900/40 mb-4">
          <h3 class="font-black text-lg uppercase text-white flex items-center gap-2">
            <span>👤</span> ${t('profilesTitle')}
          </h3>
          <button id="modal-close-btn" class="nav-focus text-slate-400 hover:text-white px-2.5 py-1 rounded-xl bg-slate-800">✕</button>
        </div>

        <div class="space-y-3 mb-6">
          <div>
            <label class="text-xs text-slate-300 font-semibold mb-1 block">Player Name</label>
            <input type="text" id="prof-name" value="${profile.name}" class="nav-focus w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
          </div>
          <div>
            <label class="text-xs text-slate-300 font-semibold mb-1 block">Height (cm)</label>
            <input type="number" id="prof-height" value="${profile.heightCm || 175}" class="nav-focus w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
          </div>
          <div>
            <label class="text-xs text-slate-300 font-semibold mb-1 block">Weight (kg)</label>
            <input type="number" id="prof-weight" value="${profile.weightKg || 70}" class="nav-focus w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
          </div>
          <div>
            <label class="text-xs text-slate-300 font-semibold mb-1 block">Stride Length (meters) - default 0.7m</label>
            <input type="number" step="0.05" id="prof-stride" value="${profile.strideLength || 0.7}" class="nav-focus w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
          </div>
        </div>

        <div class="flex gap-3">
          <button id="prof-save-btn" class="nav-focus flex-1 py-3 bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-300 hover:to-blue-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition shadow-lg">
            Save Profile
          </button>
          <button id="prof-close-btn" class="nav-focus px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition">
            Cancel
          </button>
        </div>
      </div>
    `;

    this.openModal(modal);

    modal.querySelector('#modal-close-btn').addEventListener('click', () => this.closeModal(modal));
    modal.querySelector('#prof-close-btn').addEventListener('click', () => this.closeModal(modal));
    modal.querySelector('#prof-save-btn').addEventListener('click', () => {
      profile.name = modal.querySelector('#prof-name').value.trim() || 'Player 1';
      profile.heightCm = parseInt(modal.querySelector('#prof-height').value, 10) || 175;
      profile.weightKg = parseInt(modal.querySelector('#prof-weight').value, 10) || 70;
      profile.strideLength = parseFloat(modal.querySelector('#prof-stride').value) || 0.7;
      saveProfile(profile);
      this.closeModal(modal);
      this.renderHomeScreen();
    });
  }

  // --- SETTINGS MODAL ---
  showSettingsModal() {
    const modal = document.createElement('div');
    modal.id = 'settings-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-6 select-none';
    modal.innerHTML = `
      <div class="w-full max-w-md bg-slate-900 border-2 border-indigo-500/40 rounded-3xl p-7 shadow-2xl flex flex-col text-white">
        <div class="flex items-center justify-between pb-3 border-b border-indigo-900/40 mb-4">
          <h3 class="font-black text-lg uppercase text-white flex items-center gap-2">
            <span>⚙️</span> ${t('settingsTitle')}
          </h3>
          <button id="modal-close-btn" class="nav-focus text-slate-400 hover:text-white px-2.5 py-1 rounded-xl bg-slate-800">✕</button>
        </div>

        <div class="space-y-4 mb-6">
          <div>
            <label class="text-xs text-slate-300 font-semibold mb-1 block">Language (Langue / اللغة)</label>
            <select id="setting-lang" class="nav-focus w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white">
              <option value="en" ${SETTINGS.language === 'en' ? 'selected' : ''}>English (EN)</option>
              <option value="fr" ${SETTINGS.language === 'fr' ? 'selected' : ''}>Français (FR)</option>
              <option value="ar" ${SETTINGS.language === 'ar' ? 'selected' : ''}>العربية (AR - RTL)</option>
            </select>
          </div>

          <div class="flex items-center justify-between p-2 rounded-xl bg-slate-950/50">
            <span class="text-xs text-slate-200 font-semibold">Sound Effects</span>
            <input type="checkbox" id="setting-sound-fx" ${SETTINGS.sound.soundFx ? 'checked' : ''} class="nav-focus w-5 h-5 accent-amber-400 cursor-pointer" />
          </div>

          <div class="flex items-center justify-between p-2 rounded-xl bg-slate-950/50">
            <span class="text-xs text-slate-200 font-semibold">Coach Voice Guidance</span>
            <input type="checkbox" id="setting-coach-voice" ${SETTINGS.sound.coachVoice ? 'checked' : ''} class="nav-focus w-5 h-5 accent-amber-400 cursor-pointer" />
          </div>

          <div class="flex items-center justify-between p-2 rounded-xl bg-slate-950/50">
            <span class="text-xs text-slate-200 font-semibold">Target Metronome</span>
            <input type="checkbox" id="setting-metronome" ${SETTINGS.sound.metronome ? 'checked' : ''} class="nav-focus w-5 h-5 accent-amber-400 cursor-pointer" />
          </div>

          <div class="p-3 bg-slate-950 rounded-2xl border border-indigo-900/40 text-[11px] text-slate-300 leading-relaxed">
            <strong class="text-amber-300 block mb-0.5">${t('healthNoticeTitle')}</strong>
            ${t('healthNoticeBody')}
          </div>
        </div>

        <div class="flex gap-3">
          <button id="settings-save-btn" class="nav-focus flex-1 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition shadow-lg">
            Apply & Save
          </button>
          <button id="settings-close-btn" class="nav-focus px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition">
            Close
          </button>
        </div>
      </div>
    `;

    this.openModal(modal);

    modal.querySelector('#modal-close-btn').addEventListener('click', () => this.closeModal(modal));
    modal.querySelector('#settings-close-btn').addEventListener('click', () => this.closeModal(modal));
    modal.querySelector('#settings-save-btn').addEventListener('click', () => {
      SETTINGS.language = modal.querySelector('#setting-lang').value;
      SETTINGS.sound.soundFx = modal.querySelector('#setting-sound-fx').checked;
      SETTINGS.sound.coachVoice = modal.querySelector('#setting-coach-voice').checked;
      SETTINGS.sound.metronome = modal.querySelector('#setting-metronome').checked;
      saveSettings();
      this.closeModal(modal);
      this.renderHomeScreen();
    });
  }
}

/**
 * simulator.js
 * On-screen Floor Mat Simulator overlay panel.
 * Essential for desktop/browser testing without physical floor mat hardware.
 */

import { InputManager } from './input.js';

export class MatSimulator {
  constructor() {
    this.visible = false;
    this.autoWalkActive = false;
    this.targetCadence = 100; // SPM
    this.autoWalkTimer = null;
    this.nextFoot = 'left';
    this.simulatedLatencyMs = 0;
    this.container = null;

    this.initUI();
    this.initShortcuts();
  }

  initShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.code === 'KeyS') {
        this.toggle();
      }
    });
  }

  toggle() {
    this.visible = !this.visible;
    if (this.container) {
      this.container.classList.toggle('hidden', !this.visible);
    }
  }

  initUI() {
    this.container = document.createElement('div');
    this.container.id = 'mat-simulator-panel';
    this.container.className = 'fixed bottom-4 left-4 z-50 w-80 bg-slate-900/95 border border-sky-500/40 rounded-xl p-4 shadow-2xl backdrop-blur text-xs text-slate-200 hidden select-none transition-all';
    this.container.innerHTML = `
      <div class="flex items-center justify-between border-b border-slate-700/80 pb-2 mb-3">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse"></span>
          <span class="font-bold text-sky-400 tracking-wider">MAT SIMULATOR</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-slate-400 text-[10px]">[Key S]</span>
          <button id="sim-close-btn" class="text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800">✕</button>
        </div>
      </div>

      <!-- Auto Walk & Cadence Slider -->
      <div class="space-y-3">
        <div>
          <div class="flex items-center justify-between mb-1">
            <span class="text-slate-300 font-semibold">Cadence (Steps/Min)</span>
            <span id="sim-cadence-val" class="font-mono text-sky-300 font-bold">100 SPM</span>
          </div>
          <input id="sim-cadence-slider" type="range" min="0" max="200" value="100" class="w-full accent-sky-400 cursor-pointer" />
        </div>

        <div class="flex items-center justify-between bg-slate-800/80 px-2.5 py-2 rounded-lg border border-slate-700/60">
          <span class="text-slate-200">Auto-Walk Generator</span>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" id="sim-autowalk-toggle" class="sr-only peer">
            <div class="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>

        <!-- Manual Footsteps -->
        <div class="grid grid-cols-2 gap-2">
          <button id="sim-step-l-btn" class="py-2 px-3 bg-slate-800 hover:bg-sky-600 active:bg-sky-500 rounded-lg font-bold border border-slate-700 text-center transition">
            Left Step (Z)
          </button>
          <button id="sim-step-r-btn" class="py-2 px-3 bg-slate-800 hover:bg-sky-600 active:bg-sky-500 rounded-lg font-bold border border-slate-700 text-center transition">
            Right Step (X)
          </button>
        </div>

        <!-- Jump and Slide Buttons -->
        <div class="grid grid-cols-2 gap-2">
          <button id="sim-jump-btn" class="py-2 px-3 bg-amber-600 hover:bg-amber-500 active:bg-amber-400 text-white rounded-lg font-bold shadow text-center transition">
            JUMP (Space)
          </button>
          <button id="sim-slide-btn" class="py-2 px-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-400 text-white rounded-lg font-bold shadow text-center transition">
            SLIDE (Down)
          </button>
        </div>

        <!-- Lane Position Slider -->
        <div>
          <div class="flex items-center justify-between mb-1">
            <span class="text-slate-300">Lane Shift</span>
            <span id="sim-lane-val" class="font-mono text-sky-300 font-bold">CENTER (0)</span>
          </div>
          <div class="grid grid-cols-3 gap-1 mb-1.5">
            <button id="sim-lane-left-btn" class="py-1 bg-slate-800 hover:bg-slate-700 rounded text-center">LEFT</button>
            <button id="sim-lane-center-btn" class="py-1 bg-slate-800 hover:bg-slate-700 rounded text-center">CTR</button>
            <button id="sim-lane-right-btn" class="py-1 bg-slate-800 hover:bg-slate-700 rounded text-center">RIGHT</button>
          </div>
        </div>

        <!-- Intensity Slider -->
        <div>
          <div class="flex items-center justify-between mb-1">
            <span class="text-slate-300">Intensity (Trigger)</span>
            <span id="sim-intensity-val" class="font-mono text-sky-300 font-bold">0.0</span>
          </div>
          <input id="sim-intensity-slider" type="range" min="0" max="100" value="0" class="w-full accent-amber-400 cursor-pointer" />
        </div>

        <!-- Input Latency Simulator -->
        <div>
          <div class="flex items-center justify-between mb-1">
            <span class="text-slate-400 text-[11px]">Hardware Latency Test</span>
            <span id="sim-latency-val" class="font-mono text-slate-400 text-[11px]">0 ms</span>
          </div>
          <input id="sim-latency-slider" type="range" min="0" max="300" step="25" value="0" class="w-full accent-slate-500 cursor-pointer" />
        </div>

        <!-- Mini Live Action Log -->
        <div class="mt-2 border-t border-slate-700/60 pt-2">
          <div class="text-[10px] text-slate-400 mb-1 flex justify-between">
            <span>LIVE INPUT STREAM:</span>
            <span id="sim-conn-indicator" class="text-slate-400">Merged</span>
          </div>
          <div id="sim-log-box" class="h-16 overflow-y-auto bg-slate-950/70 rounded p-1.5 font-mono text-[10px] space-y-0.5 text-slate-400">
            <div>Engine ready...</div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.container);
    this.bindEvents();
  }

  bindEvents() {
    const cadenceSlider = this.container.querySelector('#sim-cadence-slider');
    const cadenceVal = this.container.querySelector('#sim-cadence-val');
    const autowalkToggle = this.container.querySelector('#sim-autowalk-toggle');
    const intensitySlider = this.container.querySelector('#sim-intensity-slider');
    const intensityVal = this.container.querySelector('#sim-intensity-val');
    const latencySlider = this.container.querySelector('#sim-latency-slider');
    const latencyVal = this.container.querySelector('#sim-latency-val');
    const closeBtn = this.container.querySelector('#sim-close-btn');

    cadenceSlider.addEventListener('input', (e) => {
      this.targetCadence = parseInt(e.target.value, 10);
      cadenceVal.textContent = `${this.targetCadence} SPM`;
      if (this.autoWalkActive) {
        this.restartAutoWalk();
      }
    });

    autowalkToggle.addEventListener('change', (e) => {
      this.autoWalkActive = e.target.checked;
      if (this.autoWalkActive) {
        this.startAutoWalk();
      } else {
        this.stopAutoWalk();
      }
    });

    intensitySlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10) / 100;
      intensityVal.textContent = val.toFixed(2);
      this.scheduleAction(() => {
        InputManager.state.intensity = val;
      });
    });

    latencySlider.addEventListener('input', (e) => {
      this.simulatedLatencyMs = parseInt(e.target.value, 10);
      latencyVal.textContent = `${this.simulatedLatencyMs} ms`;
    });

    closeBtn.addEventListener('click', () => this.toggle());

    // Steps
    this.container.querySelector('#sim-step-l-btn').addEventListener('click', () => {
      this.scheduleAction(() => {
        InputManager.stepDetector.pushStep('left');
        InputManager.dispatchAction('STEP_LEFT', 'simulator');
        InputManager.dispatchAction('ANY', 'simulator');
      });
    });

    this.container.querySelector('#sim-step-r-btn').addEventListener('click', () => {
      this.scheduleAction(() => {
        InputManager.stepDetector.pushStep('right');
        InputManager.dispatchAction('STEP_RIGHT', 'simulator');
        InputManager.dispatchAction('ANY', 'simulator');
      });
    });

    // Jump & Slide
    this.container.querySelector('#sim-jump-btn').addEventListener('click', () => {
      this.scheduleAction(() => {
        InputManager.dispatchAction('JUMP', 'simulator');
        InputManager.dispatchAction('ANY', 'simulator');
      });
    });

    this.container.querySelector('#sim-slide-btn').addEventListener('click', () => {
      this.scheduleAction(() => {
        InputManager.dispatchAction('SLIDE', 'simulator');
        InputManager.dispatchAction('ANY', 'simulator');
      });
    });

    // Lanes
    const laneVal = this.container.querySelector('#sim-lane-val');
    this.container.querySelector('#sim-lane-left-btn').addEventListener('click', () => {
      this.scheduleAction(() => {
        InputManager.setLane(-1, 'simulator');
        laneVal.textContent = 'LEFT (-1)';
      });
    });
    this.container.querySelector('#sim-lane-center-btn').addEventListener('click', () => {
      this.scheduleAction(() => {
        InputManager.setLane(0, 'simulator');
        laneVal.textContent = 'CENTER (0)';
      });
    });
    this.container.querySelector('#sim-lane-right-btn').addEventListener('click', () => {
      this.scheduleAction(() => {
        InputManager.setLane(1, 'simulator');
        laneVal.textContent = 'RIGHT (+1)';
      });
    });

    // Listen to InputManager for log updates
    InputManager.onAction((act, state, src) => {
      const logBox = this.container.querySelector('#sim-log-box');
      if (logBox) {
        const item = document.createElement('div');
        item.textContent = `[${new Date().toLocaleTimeString()}] ${act} (${src})`;
        logBox.insertBefore(item, logBox.firstChild);
        if (logBox.children.length > 15) {
          logBox.removeChild(logBox.lastChild);
        }
      }
    });
  }

  scheduleAction(fn) {
    if (this.simulatedLatencyMs > 0) {
      setTimeout(fn, this.simulatedLatencyMs);
    } else {
      fn();
    }
  }

  startAutoWalk() {
    this.stopAutoWalk();
    if (this.targetCadence <= 0) return;

    const stepIntervalMs = (60 / this.targetCadence) * 1000;
    const runStep = () => {
      if (!this.autoWalkActive) return;
      const foot = this.nextFoot;
      this.nextFoot = this.nextFoot === 'left' ? 'right' : 'left';

      this.scheduleAction(() => {
        InputManager.stepDetector.pushStep(foot);
        InputManager.dispatchAction(foot === 'left' ? 'STEP_LEFT' : 'STEP_RIGHT', 'simulator_auto');
        InputManager.dispatchAction('ANY', 'simulator_auto');
      });

      // Human timing jitter: +/- 15ms
      const jitter = (Math.random() - 0.5) * 30;
      const nextDelay = Math.max(120, stepIntervalMs + jitter);
      this.autoWalkTimer = setTimeout(runStep, nextDelay);
    };

    runStep();
  }

  restartAutoWalk() {
    this.stopAutoWalk();
    if (this.autoWalkActive) {
      this.startAutoWalk();
    }
  }

  stopAutoWalk() {
    if (this.autoWalkTimer) {
      clearTimeout(this.autoWalkTimer);
      this.autoWalkTimer = null;
    }
  }
}

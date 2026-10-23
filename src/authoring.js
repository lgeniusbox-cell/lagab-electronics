/**
 * authoring.js
 * Visual Activity Authoring Studio for GAME, WALK, and CARDIO activities.
 * Features:
 * - Live key/gamepad press recording into the video timeline.
 * - Form editor for action, overlay, effect, and cardio phase events.
 * - Timeline seekbar with event markers and scrollable event editor.
 * - Automated linting/sanity checks (actions < 1.2s, lane changes < 0.8s, out-of-bounds events).
 * - One-click JSON export (clipboard copy & downloadable .json file).
 */

import { createVideoSource } from './videoSource.js';
import { InputManager } from './input.js';

export class AuthoringStudio {
  constructor(container, initialScript = null, initialYoutube = '', onClose = null) {
    this.container = container;
    this.script = initialScript ? JSON.parse(JSON.stringify(initialScript)) : {
      type: 'game',
      meta: { id: 'new-activity', title: { en: 'Custom FloorMat Activity' }, duration: 90, difficulty: 'medium', version: '1.0.0' },
      video: { youtubeId: initialYoutube || '', src: '', startAt: 0, endAt: 90 },
      rules: { lives: 3, comboMultipliers: [1, 2, 3, 5], starsThresholds: [800, 1600, 2400] },
      timeline: []
    };
    this.youtubeId = initialYoutube;
    this.onClose = onClose;

    this.videoSource = null;
    this.isRecording = false;
    this.recordingFilter = 'ALL';
    this.rafId = null;
    this.unsubInput = null;

    this.initUI();
    this.initVideo();
    this.initRecordingListener();
  }

  initUI() {
    this.container.innerHTML = `
      <div id="authoring-studio" class="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col select-none overflow-hidden text-xs">
        
        <!-- TOP TOOLBAR -->
        <div class="h-14 border-b border-slate-800 bg-slate-900 px-6 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="w-3 h-3 rounded-full bg-amber-400"></span>
            <span class="font-black text-sm tracking-wider uppercase text-white">AUTHORING STUDIO</span>
            <span class="px-2 py-0.5 rounded bg-slate-800 text-sky-400 font-mono text-[11px] uppercase">${this.script.type}</span>
          </div>

          <!-- Video Playback & Record Controls -->
          <div class="flex items-center gap-2">
            <button id="auth-play-btn" class="px-4 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-lg transition">
              Play / Pause (Space)
            </button>
            <div class="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">
              <span class="text-slate-400 text-[10px]">Speed:</span>
              <button class="auth-speed-btn px-1.5 py-0.5 rounded text-[11px] hover:bg-slate-700" data-rate="0.5">0.5x</button>
              <button class="auth-speed-btn px-1.5 py-0.5 rounded text-[11px] bg-slate-700 font-bold text-sky-400" data-rate="1.0">1.0x</button>
              <button class="auth-speed-btn px-1.5 py-0.5 rounded text-[11px] hover:bg-slate-700" data-rate="1.5">1.5x</button>
            </div>
            <button id="auth-record-toggle" class="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg flex items-center gap-1.5 transition">
              <span class="w-2 h-2 rounded-full bg-white animate-ping"></span>
              <span>LIVE RECORD [R]</span>
            </button>
          </div>

          <!-- Export & Close -->
          <div class="flex items-center gap-2">
            <button id="auth-check-btn" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 font-semibold transition">
              Validate Rules
            </button>
            <button id="auth-export-btn" class="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition">
              Export script.json
            </button>
            <button id="auth-close-btn" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition">
              ✕ Exit
            </button>
          </div>
        </div>

        <!-- MAIN SPLIT: VIDEO PREVIEW (LEFT) + EVENT FORMS & LIST (RIGHT) -->
        <div class="flex-1 flex overflow-hidden">
          
          <!-- Left: Video Viewport & Timeline Seekbar -->
          <div class="w-7/12 flex flex-col border-r border-slate-800 bg-black relative">
            <div id="auth-video-viewport" class="flex-1 relative overflow-hidden flex items-center justify-center">
              <!-- Video source attaches here -->
            </div>

            <!-- Interactive Seekbar with Event Pins -->
            <div class="h-20 bg-slate-900 border-t border-slate-800 p-3 flex flex-col justify-between">
              <div class="flex items-center justify-between font-mono text-[11px] text-slate-400">
                <span id="auth-time-clock">00:00.00</span>
                <span id="auth-dur-clock">00:00.00</span>
              </div>
              <div class="relative w-full h-4 bg-slate-800 rounded cursor-pointer mt-1" id="auth-seekbar">
                <div id="auth-seekbar-fill" class="h-full bg-sky-500/60 rounded" style="width: 0%;"></div>
                <!-- Dynamic Event Markers Pin Strip -->
                <div id="auth-pins-container" class="absolute inset-0 pointer-events-none"></div>
              </div>
            </div>
          </div>

          <!-- Right: Event Editor & Checks Panel -->
          <div class="w-5/12 flex flex-col bg-slate-900/60 overflow-hidden">
            
            <!-- Quick Add Event Toolbar -->
            <div class="p-4 border-b border-slate-800 bg-slate-900/90 space-y-2">
              <div class="font-bold text-slate-300">ADD TIMELINE EVENT AT CURRENT TIME</div>
              <div class="flex flex-wrap gap-1.5">
                <button class="auth-add-act-btn px-2.5 py-1 bg-slate-800 hover:bg-sky-600 rounded font-semibold text-slate-200" data-act="JUMP">JUMP</button>
                <button class="auth-add-act-btn px-2.5 py-1 bg-slate-800 hover:bg-sky-600 rounded font-semibold text-slate-200" data-act="SLIDE">SLIDE</button>
                <button class="auth-add-act-btn px-2.5 py-1 bg-slate-800 hover:bg-sky-600 rounded font-semibold text-slate-200" data-act="LEFT">LEFT</button>
                <button class="auth-add-act-btn px-2.5 py-1 bg-slate-800 hover:bg-sky-600 rounded font-semibold text-slate-200" data-act="RIGHT">RIGHT</button>
                <button class="auth-add-act-btn px-2.5 py-1 bg-slate-800 hover:bg-sky-600 rounded font-semibold text-slate-200" data-act="STEP_LEFT">STEP L</button>
                <button class="auth-add-act-btn px-2.5 py-1 bg-slate-800 hover:bg-sky-600 rounded font-semibold text-slate-200" data-act="STEP_RIGHT">STEP R</button>
                <button id="auth-add-text-btn" class="px-2.5 py-1 bg-indigo-800 hover:bg-indigo-700 rounded font-semibold text-white">+ Overlay Text</button>
              </div>
            </div>

            <!-- Validation Warnings Strip -->
            <div id="auth-validation-box" class="p-2.5 bg-amber-950/40 border-b border-amber-800/60 text-amber-300 hidden">
              <span id="auth-validation-msg">Validation passed.</span>
            </div>

            <!-- Scrollable Events Table -->
            <div class="flex-1 overflow-y-auto p-4 space-y-2" id="auth-events-list">
              <!-- Rendered items -->
            </div>
          </div>
        </div>

      </div>
    `;

    this.bindControls();
  }

  initVideo() {
    const viewport = this.container.querySelector('#auth-video-viewport');
    this.videoSource = createVideoSource(viewport, {
      youtubeId: this.youtubeId,
      src: this.script.video?.src,
      duration: this.script.meta?.duration || 90
    });

    this.startClockLoop();
    this.renderEventsList();
    this.renderSeekPins();
  }

  bindControls() {
    const playBtn = this.container.querySelector('#auth-play-btn');
    const recordBtn = this.container.querySelector('#auth-record-toggle');
    const closeBtn = this.container.querySelector('#auth-close-btn');
    const exportBtn = this.container.querySelector('#auth-export-btn');
    const checkBtn = this.container.querySelector('#auth-check-btn');
    const seekbar = this.container.querySelector('#auth-seekbar');

    playBtn.addEventListener('click', () => this.togglePlay());
    recordBtn.addEventListener('click', () => this.toggleRecord());
    closeBtn.addEventListener('click', () => this.close());
    exportBtn.addEventListener('click', () => this.exportJson());
    checkBtn.addEventListener('click', () => this.runValidationChecks());

    // Speed buttons
    this.container.querySelectorAll('.auth-speed-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const rate = parseFloat(e.target.dataset.rate);
        this.videoSource.setRate(rate);
        this.container.querySelectorAll('.auth-speed-btn').forEach(b => b.classList.remove('bg-slate-700', 'text-sky-400', 'font-bold'));
        btn.classList.add('bg-slate-700', 'text-sky-400', 'font-bold');
      });
    });

    // Quick add action buttons
    this.container.querySelectorAll('.auth-add-act-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const expect = e.target.dataset.act;
        this.addActionEvent(expect);
      });
    });

    // Add Overlay Text
    this.container.querySelector('#auth-add-text-btn').addEventListener('click', () => {
      const text = prompt('Enter overlay banner text to display:', 'GREAT JUMP!');
      if (text) {
        const t = parseFloat(this.videoSource.getTime().toFixed(2));
        if (!this.script.timeline) this.script.timeline = [];
        this.script.timeline.push({
          t,
          type: 'overlay',
          text,
          duration: 2.0,
          color: '#38bdf8'
        });
        this.sortTimeline();
        this.renderEventsList();
        this.renderSeekPins();
      }
    });

    // Seekbar click
    seekbar.addEventListener('click', (e) => {
      const rect = seekbar.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, clickX / rect.width));
      const dur = this.videoSource.getDuration() || (this.script.meta?.duration || 90);
      const targetTime = ratio * dur;
      this.videoSource.seek(targetTime);
    });

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.code === 'KeyR') {
        this.toggleRecord();
      }
    });
  }

  togglePlay() {
    if (this.videoSource.isPlaying) {
      this.videoSource.pause();
    } else {
      this.videoSource.play();
    }
  }

  toggleRecord() {
    this.isRecording = !this.isRecording;
    const btn = this.container.querySelector('#auth-record-toggle');
    if (btn) {
      btn.className = this.isRecording
        ? 'px-4 py-1.5 bg-rose-600 ring-2 ring-white text-white font-black rounded-lg flex items-center gap-1.5 transition animate-pulse'
        : 'px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg flex items-center gap-1.5 transition';
    }
    if (this.isRecording && !this.videoSource.isPlaying) {
      this.videoSource.play();
    }
  }

  initRecordingListener() {
    this.unsubInput = InputManager.onAction((actionName, state, source) => {
      if (!this.isRecording) return;
      this.addActionEvent(actionName);
    });
  }

  addActionEvent(expect) {
    const t = parseFloat(this.videoSource.getTime().toFixed(2));
    if (!this.script.timeline) this.script.timeline = [];

    this.script.timeline.push({
      t,
      type: 'action',
      expect,
      windowMs: 350,
      perfectWindowMs: 150,
      warnBeforeMs: 1500,
      points: 100
    });

    this.sortTimeline();
    this.renderEventsList();
    this.renderSeekPins();
  }

  sortTimeline() {
    if (Array.isArray(this.script.timeline)) {
      this.script.timeline.sort((a, b) => a.t - b.t);
    }
  }

  renderEventsList() {
    const list = this.container.querySelector('#auth-events-list');
    if (!list) return;
    list.innerHTML = '';

    const timeline = this.script.timeline || [];
    if (timeline.length === 0) {
      list.innerHTML = `<div class="text-slate-500 p-4 text-center">No timeline events yet. Press Live Record or click Quick Add above!</div>`;
      return;
    }

    timeline.forEach((ev, idx) => {
      const item = document.createElement('div');
      item.className = 'flex items-center justify-between p-2.5 bg-slate-800/70 border border-slate-700/80 rounded-xl hover:bg-slate-800 transition';
      item.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="font-mono text-sky-400 font-bold">${ev.t.toFixed(2)}s</span>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${
            ev.type === 'action' ? 'bg-amber-500/20 text-amber-300' : 'bg-indigo-500/20 text-indigo-300'
          }">${ev.type.toUpperCase()}</span>
          <span class="text-white font-semibold">${ev.expect || ev.text || ev.name || ev.action || ''}</span>
        </div>
        <div class="flex items-center gap-1.5">
          <button class="auth-seek-to px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-[10px]" data-t="${ev.t}">Seek</button>
          <button class="auth-del-btn px-2 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded text-[10px]" data-idx="${idx}">✕</button>
        </div>
      `;

      item.querySelector('.auth-seek-to').addEventListener('click', () => {
        this.videoSource.seek(ev.t);
      });

      item.querySelector('.auth-del-btn').addEventListener('click', () => {
        this.script.timeline.splice(idx, 1);
        this.renderEventsList();
        this.renderSeekPins();
      });

      list.appendChild(item);
    });
  }

  renderSeekPins() {
    const container = this.container.querySelector('#auth-pins-container');
    if (!container) return;
    container.innerHTML = '';

    const dur = this.videoSource.getDuration() || (this.script.meta?.duration || 90);
    const timeline = this.script.timeline || [];

    timeline.forEach(ev => {
      const ratio = Math.max(0, Math.min(1, ev.t / dur));
      const pin = document.createElement('div');
      pin.className = `absolute top-0 bottom-0 w-1 ${
        ev.type === 'action' ? 'bg-amber-400' : 'bg-sky-400'
      }`;
      pin.style.left = `${ratio * 100}%`;
      container.appendChild(pin);
    });
  }

  // Automated checks
  runValidationChecks() {
    const warnings = [];
    const timeline = this.script.timeline || [];
    const dur = this.videoSource.getDuration() || (this.script.meta?.duration || 90);

    for (let i = 0; i < timeline.length; i++) {
      const cur = timeline[i];
      if (cur.t > dur) {
        warnings.push(`Event at ${cur.t}s extends beyond video duration (${dur}s).`);
      }
      if (i > 0) {
        const prev = timeline[i - 1];
        const dt = cur.t - prev.t;
        if (cur.type === 'action' && prev.type === 'action' && dt < 1.2) {
          warnings.push(`Actions too close: ${prev.expect} at ${prev.t}s and ${cur.expect} at ${cur.t}s (${dt.toFixed(2)}s apart, recommended >= 1.2s).`);
        }
        if (['LEFT', 'RIGHT', 'CENTER'].includes(cur.expect) && ['LEFT', 'RIGHT', 'CENTER'].includes(prev.expect) && dt < 0.8) {
          warnings.push(`Lane changes within 0.8s: ${prev.expect} to ${cur.expect}.`);
        }
      }
    }

    const box = this.container.querySelector('#auth-validation-box');
    const msg = this.container.querySelector('#auth-validation-msg');
    box.classList.remove('hidden');

    if (warnings.length > 0) {
      msg.innerHTML = `<strong>${warnings.length} Issue(s) Found:</strong><br/>` + warnings.map(w => `• ${w}`).join('<br/>');
      box.className = 'p-3 bg-amber-950/60 border-b border-amber-800 text-amber-200';
    } else {
      msg.textContent = '✓ All sanity checks passed! Timing is optimal for floor mat responsiveness.';
      box.className = 'p-3 bg-emerald-950/60 border-b border-emerald-800 text-emerald-300';
    }
  }

  // Export JSON
  exportJson() {
    const jsonStr = JSON.stringify(this.script, null, 2);
    // Copy to clipboard
    navigator.clipboard?.writeText(jsonStr).then(() => {
      alert('Script JSON copied to clipboard!');
    }).catch(() => {});

    // Trigger file download
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.script.meta?.id || 'script'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  startClockLoop() {
    const loop = () => {
      const cur = this.videoSource.getTime();
      const dur = this.videoSource.getDuration() || (this.script.meta?.duration || 90);

      const timeClock = this.container.querySelector('#auth-time-clock');
      const durClock = this.container.querySelector('#auth-dur-clock');
      const seekFill = this.container.querySelector('#auth-seekbar-fill');

      if (timeClock) {
        const m = Math.floor(cur / 60);
        const s = Math.floor(cur % 60);
        const ms = Math.floor((cur % 1) * 100);
        timeClock.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
      }

      if (durClock) {
        const m = Math.floor(dur / 60);
        const s = Math.floor(dur % 60);
        durClock.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      }

      if (seekFill) {
        seekFill.style.width = `${Math.min(100, (cur / dur) * 100)}%`;
      }

      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  close() {
    this.destroy();
    if (this.onClose) this.onClose();
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.unsubInput) this.unsubInput();
    if (this.videoSource) this.videoSource.destroy();
    this.container.innerHTML = '';
  }
}

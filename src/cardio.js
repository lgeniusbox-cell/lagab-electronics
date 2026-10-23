/**
 * cardio.js
 * Smart Treadmill-style TV Dashboard for CARDIO mode (no video).
 * Features:
 * - Big semicircular speed dial with dynamic color-coded target band & needle.
 * - Large metric tiles (Time elapsed/remaining, Distance, Steps, Cadence SPM, Pace, Approx. kcal).
 * - Workout profile bar with phase height blocks & animated playhead cursor.
 * - Top coach line with instruction text & 'Too Slow / On Target / Too Fast' status gauge.
 * - Spoken cues via SpeechSynthesis with sound chime fallbacks.
 * - Adaptive recovery extension and cadence timeline chart on session summary.
 */

import { SETTINGS, t, recordSession, getCurrentProfile } from './storage.js';
import { AudioManager } from './audio.js';
import { EffectsManager } from './effects.js';
import { InputManager } from './input.js';
import { MatBridge } from './bridge.js';

export class CardioEngine {
  constructor(container, script, options = {}) {
    this.container = container;
    this.script = script;
    this.options = options;

    const rules = script.rules || {};
    this.program = rules.program || [
      { name: 'Warm-up', durationSec: 180, target: { cadence: [70, 95], speedKmh: [3.0, 4.5] }, message: { en: 'Easy stepping to warm up.' } },
      { name: 'Sprint', durationSec: 90, target: { cadence: [135, 165], speedKmh: [5.8, 7.5] }, message: { en: 'Push the pace!' } },
      { name: 'Recovery', durationSec: 120, target: { cadence: [75, 95], speedKmh: [3.2, 4.2] }, message: { en: 'Breathe and recover.' } },
      { name: 'Cool-down', durationSec: 180, target: { cadence: [60, 80], speedKmh: [2.5, 3.6] }, message: { en: 'Gentle cool-down.' } }
    ];
    this.isAdaptive = !!rules.adaptive;
    this.cueCooldownSec = rules.cueCooldownSec || 8;
    this.metronomeActive = rules.metronome || false;
    this.countdownBeepSec = rules.countdownBeepSec || 3;

    // Workout state
    this.currentPhaseIndex = 0;
    this.phaseElapsedSec = 0;
    this.totalElapsedSec = 0;
    this.totalProgramDurationSec = this.program.reduce((acc, p) => acc + p.durationSec, 0);
    this.isRunning = false;
    this.isPaused = false;
    this.manualTargetSpeed = 5.0; // km/h for Quick Start mode

    // Stats tracking
    this.cadenceSamples = []; // sample every second for chart
    this.timeInTargetZoneSec = 0;
    this.maxCadenceRecorded = 0;
    this.cadenceSum = 0;
    this.cadenceCount = 0;

    // Timers
    this.rafId = null;
    this.lastFrameTime = performance.now();
    this.lastSecondTime = performance.now();
    this.lastBeepCount = -1;
    this.metronomeTimer = null;

    this.initUI();
    this.initMetronome();
    this.initGamepadControls();
  }

  initUI() {
    this.container.innerHTML = `
      <div id="cardio-dashboard" class="relative w-full h-full flex flex-col justify-between bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6 md:p-8 tv-safe-area select-none text-white overflow-hidden">
        
        <!-- TOP COACH HEADER -->
        <div class="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div class="flex flex-col">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
              <span id="cardio-phase-title" class="text-xl md:text-2xl font-black text-white uppercase tracking-wider">Phase: Warm-up</span>
            </div>
            <div id="cardio-coach-msg" class="text-xs md:text-sm text-slate-300 italic mt-0.5 max-w-xl">
              Maintain an easy, rhythmic stride.
            </div>
          </div>

          <!-- Coach Guidance Zone Gauge (Too Slow / On Target / Too Fast) -->
          <div class="flex flex-col items-center">
            <div class="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800">
              <div id="zone-badge-slow" class="px-3 py-1.5 text-xs font-bold rounded-lg transition-colors text-slate-500">
                ${t('tooSlow')}
              </div>
              <div id="zone-badge-target" class="px-4 py-1.5 text-xs font-black rounded-lg transition-colors bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                ${t('onTarget')}
              </div>
              <div id="zone-badge-fast" class="px-3 py-1.5 text-xs font-bold rounded-lg transition-colors text-slate-500">
                ${t('tooFast')}
              </div>
            </div>
          </div>

          <!-- Controls -->
          <div class="flex items-center gap-3">
            <button id="cardio-pause-btn" class="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 hover:text-white rounded-xl border border-slate-700 font-bold text-xs uppercase tracking-wider transition">
              ESC · Pause
            </button>
          </div>
        </div>

        <!-- MAIN CENTER COCKPIT: SPEED DIAL GAUGE + METRIC TILES -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 my-auto items-center">
          
          <!-- Semicircular Speed Dial Gauge (Left Column) -->
          <div class="lg:col-span-5 flex flex-col items-center justify-center relative">
            <canvas id="cardio-gauge-canvas" width="420" height="250" class="w-full max-w-[420px]"></canvas>
            <div class="absolute bottom-2 flex flex-col items-center">
              <span id="cardio-gauge-speed" class="text-5xl md:text-6xl font-black font-mono tracking-tight text-white tabular-nums drop-shadow-lg">0.0</span>
              <span class="text-xs uppercase tracking-widest text-slate-400 font-bold -mt-1">km/h · Speed Estimate</span>
            </div>
          </div>

          <!-- Large Metric Tiles Grid (Right Column) -->
          <div class="lg:col-span-7 grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            
            <!-- Time Remaining -->
            <div class="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between shadow">
              <span class="text-xs text-slate-400 uppercase font-semibold">Remaining</span>
              <span id="tile-time-rem" class="text-3xl md:text-4xl font-black font-mono text-sky-400 tabular-nums">00:00</span>
              <span id="tile-time-elap" class="text-[11px] text-slate-500 font-mono">Elapsed: 00:00</span>
            </div>

            <!-- Steps -->
            <div class="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between shadow">
              <span class="text-xs text-slate-400 uppercase font-semibold">${t('steps')}</span>
              <span id="tile-steps" class="text-3xl md:text-4xl font-black font-mono text-emerald-400 tabular-nums">0</span>
              <span class="text-[11px] text-slate-500">Live Mat Sensor</span>
            </div>

            <!-- Cadence SPM -->
            <div class="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between shadow">
              <span class="text-xs text-slate-400 uppercase font-semibold">${t('cadence')}</span>
              <span id="tile-cadence" class="text-3xl md:text-4xl font-black font-mono text-amber-400 tabular-nums">0</span>
              <span id="tile-cadence-target" class="text-[11px] text-slate-400 font-mono">Target: 70-95</span>
            </div>

            <!-- Distance -->
            <div class="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between shadow">
              <span class="text-xs text-slate-400 uppercase font-semibold">${t('distance')}</span>
              <span id="tile-distance" class="text-3xl md:text-4xl font-black font-mono text-indigo-300 tabular-nums">0.00</span>
              <span class="text-[11px] text-slate-500">Kilometers</span>
            </div>

            <!-- Pace (min/km) -->
            <div class="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between shadow">
              <span class="text-xs text-slate-400 uppercase font-semibold">Pace</span>
              <span id="tile-pace" class="text-3xl md:text-4xl font-black font-mono text-rose-400 tabular-nums">--:--</span>
              <span class="text-[11px] text-slate-500">min / km</span>
            </div>

            <!-- Approx Calories -->
            <div class="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between shadow">
              <span class="text-xs text-slate-400 uppercase font-semibold">${t('calories')}</span>
              <span id="tile-calories" class="text-3xl md:text-4xl font-black font-mono text-orange-400 tabular-nums">0</span>
              <span class="text-[11px] text-slate-500">Estimated kcal</span>
            </div>

          </div>
        </div>

        <!-- BOTTOM WORKOUT PROFILE DISPLAY (Treadmill Program Bar) -->
        <div class="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div class="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
            <span>PROGRAM PROFILE</span>
            <span id="cardio-phase-timer" class="font-mono text-sky-400">Phase Time: 00:00 / 03:00</span>
          </div>

          <!-- Blocks representation of phases with moving cursor -->
          <div class="relative w-full h-14 bg-slate-950 rounded-xl overflow-hidden flex items-end p-1 border border-slate-800/80" id="cardio-profile-bar">
            <!-- Phase blocks injected here -->
            <div id="cardio-playhead-cursor" class="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_12px_#ffffff] z-10 transition-all duration-200" style="left: 0%;"></div>
          </div>
        </div>

      </div>
    `;

    this.renderProfileBar();

    const pauseBtn = this.container.querySelector('#cardio-pause-btn');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        this.pause();
      });
    }
  }

  // Draw treadmill workout phase blocks
  renderProfileBar() {
    const bar = this.container.querySelector('#cardio-profile-bar');
    if (!bar) return;
    const cursor = bar.querySelector('#cardio-playhead-cursor');
    bar.innerHTML = '';
    if (cursor) bar.appendChild(cursor);

    const totalDur = this.totalProgramDurationSec;
    const maxSpeed = 10.0; // scale reference

    this.program.forEach((phase, idx) => {
      const widthPct = (phase.durationSec / totalDur) * 100;
      const targetAvgSpeed = ((phase.target.speedKmh[0] + phase.target.speedKmh[1]) / 2);
      const heightPct = Math.max(25, Math.min(100, (targetAvgSpeed / maxSpeed) * 100));

      const isCurrent = idx === this.currentPhaseIndex;
      const block = document.createElement('div');
      block.className = `h-full flex flex-col justify-end transition-all ${isCurrent ? 'opacity-100 ring-1 ring-sky-400' : 'opacity-65'}`;
      block.style.width = `${widthPct}%`;

      const inner = document.createElement('div');
      inner.className = `w-full rounded-t transition-all ${
        idx % 2 === 0 ? 'bg-gradient-to-t from-sky-600 to-sky-400' : 'bg-gradient-to-t from-indigo-600 to-indigo-400'
      }`;
      inner.style.height = `${heightPct}%`;
      block.appendChild(inner);

      bar.appendChild(block);
    });
  }

  // Metronome audio pulse at target cadence
  initMetronome() {
    if (!this.metronomeActive) return;
    const currentPhase = this.program[this.currentPhaseIndex];
    const targetCadence = currentPhase ? (currentPhase.target.cadence[0] + currentPhase.target.cadence[1]) / 2 : 100;
    const intervalMs = (60 / targetCadence) * 1000;

    if (this.metronomeTimer) clearInterval(this.metronomeTimer);
    this.metronomeTimer = setInterval(() => {
      if (this.isRunning && !this.isPaused && SETTINGS.sound.metronome) {
        AudioManager.play('metronome');
      }
    }, intervalMs);
  }

  // Quick Start D-Pad target speed adjustments
  initGamepadControls() {
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.code === 'KeyU') {
        this.manualTargetSpeed = Math.min(16.0, this.manualTargetSpeed + 0.5);
      } else if (e.code === 'KeyJ') {
        this.manualTargetSpeed = Math.max(1.0, this.manualTargetSpeed - 0.5);
      }
    });
  }

  start() {
    this.isRunning = true;
    this.isPaused = false;
    this.lastFrameTime = performance.now();
    this.lastSecondTime = performance.now();
    this.startLoop();
    this.announceCurrentPhase();
    MatBridge.emitEvent('cardio_start', { programName: this.script.meta?.title?.en || 'Cardio Workout' });
  }

  pause() {
    this.isPaused = true;
    const modal = document.createElement('div');
    modal.className = 'absolute inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-6 select-none';
    modal.innerHTML = `
      <div class="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-8 shadow-2xl flex flex-col items-center text-center">
        <h2 class="text-3xl font-black text-white uppercase mb-2">${t('pauseTitle')}</h2>
        <p class="text-sm text-slate-400 mb-8">Workout paused. Resume when ready.</p>
        <div class="w-full space-y-3">
          <button id="cardio-resume-btn" class="w-full py-4 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black rounded-xl text-lg transition">${t('resume')} (ESC)</button>
          <button id="cardio-restart-btn" class="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 transition">${t('restart')}</button>
          <button id="cardio-quit-btn" class="w-full py-3 bg-rose-950/60 hover:bg-rose-900 text-rose-300 font-bold rounded-xl border border-rose-800/60 text-sm transition">${t('quit')}</button>
        </div>
      </div>
    `;
    this.container.appendChild(modal);

    modal.querySelector('#cardio-resume-btn').addEventListener('click', () => {
      modal.remove();
      this.resume();
    });
    modal.querySelector('#cardio-restart-btn').addEventListener('click', () => {
      modal.remove();
      this.restart();
    });
    modal.querySelector('#cardio-quit-btn').addEventListener('click', () => {
      modal.remove();
      this.quit();
    });
  }

  resume() {
    this.isPaused = false;
    this.lastFrameTime = performance.now();
  }

  restart() {
    this.destroy();
    if (this.options.onRestart) this.options.onRestart();
  }

  quit() {
    this.destroy();
    if (this.options.onQuit) this.options.onQuit();
  }

  announceCurrentPhase() {
    const phase = this.program[this.currentPhaseIndex];
    if (!phase) return;

    const lang = SETTINGS.language || 'en';
    const message = phase.message?.[lang] || phase.message?.en || `${phase.name} phase. Let's move!`;
    const phaseTitleEl = this.container.querySelector('#cardio-phase-title');
    const phaseMsgEl = this.container.querySelector('#cardio-coach-msg');
    const targetCadEl = this.container.querySelector('#tile-cadence-target');

    if (phaseTitleEl) phaseTitleEl.textContent = `Phase ${this.currentPhaseIndex + 1}/${this.program.length}: ${phase.name}`;
    if (phaseMsgEl) phaseMsgEl.textContent = message;
    if (targetCadEl) targetCadEl.textContent = `Target: ${phase.target.cadence[0]}-${phase.target.cadence[1]} SPM`;

    AudioManager.coachCue(message, true);
    this.renderProfileBar();
    this.initMetronome();
  }

  // Draw Semicircular Speed Dial Gauge with dynamic target range band & needle
  drawGauge(currentSpeedKmh, targetMinKmh, targetMaxKmh) {
    const canvas = this.container.querySelector('#cardio-gauge-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height * 0.88;
    const radius = Math.min(width * 0.44, height * 0.78);
    const startAngle = Math.PI;
    const endAngle = 0; // Semicircle

    // 1. Background Track
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.lineWidth = 26;
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.7)';
    ctx.stroke();

    // 2. Colored Target Band
    const maxDialSpeed = 16.0; // km/h
    const bandStartRatio = Math.max(0, Math.min(1, targetMinKmh / maxDialSpeed));
    const bandEndRatio = Math.max(0, Math.min(1, targetMaxKmh / maxDialSpeed));
    const bandStartAngle = Math.PI + bandStartRatio * Math.PI;
    const bandEndAngle = Math.PI + bandEndRatio * Math.PI;

    ctx.beginPath();
    ctx.arc(cx, cy, radius, bandStartAngle, bandEndAngle);
    ctx.lineWidth = 26;
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)'; // Green zone
    ctx.stroke();

    // 3. Current Speed Arc
    const speedRatio = Math.max(0, Math.min(1, currentSpeedKmh / maxDialSpeed));
    const speedAngle = Math.PI + speedRatio * Math.PI;

    const grad = ctx.createLinearGradient(0, 0, width, 0);
    grad.addColorStop(0, '#38bdf8');
    grad.addColorStop(0.6, '#34d399');
    grad.addColorStop(1, '#f59e0b');

    ctx.beginPath();
    ctx.arc(cx, cy, radius, Math.PI, speedAngle);
    ctx.lineWidth = 14;
    ctx.strokeStyle = grad;
    ctx.stroke();

    // 4. Needle
    const needleLen = radius - 8;
    const nx = cx + Math.cos(speedAngle) * needleLen;
    const ny = cy + Math.sin(speedAngle) * needleLen;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(nx, ny);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 12;
    ctx.stroke();

    // Needle pivot hub
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#38bdf8';
    ctx.stroke();

    ctx.restore();
  }

  // Update top coach 'Too slow / On target / Too fast' status
  evaluateCoachGuidance(currentCadence, targetMinCad, targetMaxCad) {
    const badgeSlow = this.container.querySelector('#zone-badge-slow');
    const badgeTarget = this.container.querySelector('#zone-badge-target');
    const badgeFast = this.container.querySelector('#zone-badge-fast');
    if (!badgeSlow || !badgeTarget || !badgeFast) return;

    if (currentCadence < targetMinCad) {
      // Too slow
      badgeSlow.className = 'px-3 py-1.5 text-xs font-black rounded-lg transition-colors bg-sky-500/25 text-sky-400 border border-sky-400/40';
      badgeTarget.className = 'px-3 py-1.5 text-xs font-bold rounded-lg transition-colors text-slate-500';
      badgeFast.className = 'px-3 py-1.5 text-xs font-bold rounded-lg transition-colors text-slate-500';
      AudioManager.coachCue('Faster, pick up the rhythm', false, this.cueCooldownSec);
    } else if (currentCadence > targetMaxCad) {
      // Too fast
      badgeSlow.className = 'px-3 py-1.5 text-xs font-bold rounded-lg transition-colors text-slate-500';
      badgeTarget.className = 'px-3 py-1.5 text-xs font-bold rounded-lg transition-colors text-slate-500';
      badgeFast.className = 'px-3 py-1.5 text-xs font-black rounded-lg transition-colors bg-amber-500/25 text-amber-400 border border-amber-400/40';
      AudioManager.coachCue('Slow down a bit, conserve energy', false, this.cueCooldownSec);
    } else {
      // On target
      badgeSlow.className = 'px-3 py-1.5 text-xs font-bold rounded-lg transition-colors text-slate-500';
      badgeTarget.className = 'px-4 py-1.5 text-xs font-black rounded-lg transition-colors bg-emerald-500/25 text-emerald-400 border border-emerald-400/40';
      badgeFast.className = 'px-3 py-1.5 text-xs font-bold rounded-lg transition-colors text-slate-500';
      this.timeInTargetZoneSec += 0.05;
    }
  }

  finish() {
    this.isRunning = false;
    if (this.metronomeTimer) clearInterval(this.metronomeTimer);

    const steps = InputManager.stepDetector.getTotalSteps();
    const distanceKm = InputManager.stepDetector.getDistanceKm();
    const calories = InputManager.stepDetector.getEstimatedCalories(this.totalElapsedSec);
    const avgCadence = this.cadenceCount > 0 ? Math.round(this.cadenceSum / this.cadenceCount) : 0;
    const targetZonePct = this.totalElapsedSec > 0 ? Math.min(100, Math.round((this.timeInTargetZoneSec / this.totalElapsedSec) * 100)) : 0;

    // Save session
    recordSession({
      activityType: 'cardio',
      scriptId: this.script.meta?.id || 'cardio',
      duration: Math.round(this.totalElapsedSec),
      steps,
      distanceKm,
      calories,
      avgCadence,
      maxCadence: this.maxCadenceRecorded,
      targetZonePct
    });

    this.showCardioSummary({
      steps,
      distanceKm,
      calories,
      duration: Math.round(this.totalElapsedSec),
      avgCadence,
      maxCadence: this.maxCadenceRecorded,
      targetZonePct
    });
  }

  // Session Summary Modal with Canvas Cadence Chart & History
  showCardioSummary({ steps, distanceKm, calories, duration, avgCadence, maxCadence, targetZonePct }) {
    AudioManager.play('win');
    const profile = getCurrentProfile();
    const history = profile.history || [];

    const modal = document.createElement('div');
    modal.className = 'absolute inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-lg p-6 select-none';
    modal.innerHTML = `
      <div class="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl p-8 shadow-2xl flex flex-col text-white max-h-[90vh] overflow-y-auto">
        <div class="text-center mb-6">
          <div class="text-xs font-black tracking-widest text-emerald-400 uppercase mb-1">CARDIO WORKOUT SUMMARY</div>
          <h2 class="text-3xl md:text-4xl font-black uppercase tracking-tight">Fantastic Session!</h2>
        </div>

        <!-- Metrics Grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800 mb-6">
          <div>
            <div class="text-[11px] text-slate-400 font-semibold uppercase">Duration</div>
            <div class="text-xl md:text-2xl font-black font-mono text-white">${Math.floor(duration / 60)}m ${duration % 60}s</div>
          </div>
          <div>
            <div class="text-[11px] text-slate-400 font-semibold uppercase">Total Steps</div>
            <div class="text-xl md:text-2xl font-black font-mono text-emerald-400">${steps.toLocaleString()}</div>
          </div>
          <div>
            <div class="text-[11px] text-slate-400 font-semibold uppercase">Avg Cadence</div>
            <div class="text-xl md:text-2xl font-black font-mono text-amber-400">${avgCadence} SPM</div>
          </div>
          <div>
            <div class="text-[11px] text-slate-400 font-semibold uppercase">In Target Zone</div>
            <div class="text-xl md:text-2xl font-black font-mono text-sky-400">${targetZonePct}%</div>
          </div>
        </div>

        <!-- Cadence Over Time Chart -->
        <div class="mb-6 bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
          <div class="text-xs text-slate-400 font-bold mb-2">CADENCE TIMELINE (SPM)</div>
          <canvas id="summary-cadence-chart" width="560" height="120" class="w-full h-28"></canvas>
        </div>

        <!-- Recent History & Streak Strip -->
        <div class="mb-6 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800 pt-3">
          <span>Logged Sessions: <strong class="text-white">${history.length}</strong></span>
          <span class="text-slate-500 italic">Speed is an estimate (cadence x stride length)</span>
        </div>

        <!-- Actions -->
        <div class="flex gap-3">
          <button id="cardio-sum-restart" class="flex-1 py-4 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black rounded-xl text-base transition">
            ${t('restart')}
          </button>
          <button id="cardio-sum-quit" class="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-base border border-slate-700 transition">
            ${t('quit')}
          </button>
        </div>
      </div>
    `;

    this.container.appendChild(modal);

    // Draw the cadence chart
    const chartCanvas = modal.querySelector('#summary-cadence-chart');
    if (chartCanvas && this.cadenceSamples.length > 1) {
      const ctx = chartCanvas.getContext('2d');
      const w = chartCanvas.width;
      const h = chartCanvas.height;
      const maxCad = Math.max(180, ...this.cadenceSamples);

      ctx.clearRect(0, 0, w, h);
      ctx.beginPath();
      this.cadenceSamples.forEach((val, i) => {
        const x = (i / (this.cadenceSamples.length - 1)) * w;
        const y = h - (val / maxCad) * (h - 10);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Area fill
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.fill();
    }

    modal.querySelector('#cardio-sum-restart').addEventListener('click', () => {
      modal.remove();
      this.restart();
    });
    modal.querySelector('#cardio-sum-quit').addEventListener('click', () => {
      modal.remove();
      this.quit();
    });
  }

  startLoop() {
    const loop = () => {
      if (!this.isRunning) return;

      const now = performance.now();
      const dt = (now - this.lastFrameTime) / 1000;
      this.lastFrameTime = now;

      if (!this.isPaused) {
        this.phaseElapsedSec += dt;
        this.totalElapsedSec += dt;

        // Sample cadence every second for post-workout chart
        if (now - this.lastSecondTime >= 1000) {
          this.lastSecondTime = now;
          const curCad = InputManager.state.cadence;
          this.cadenceSamples.push(curCad);
          this.cadenceSum += curCad;
          this.cadenceCount++;
          if (curCad > this.maxCadenceRecorded) {
            this.maxCadenceRecorded = curCad;
          }
        }

        const currentPhase = this.program[this.currentPhaseIndex];
        if (currentPhase) {
          const phaseRemaining = Math.max(0, currentPhase.durationSec - this.phaseElapsedSec);
          const totalRemaining = Math.max(0, this.totalProgramDurationSec - this.totalElapsedSec);

          // Phase transition countdown beeps (3, 2, 1)
          const ceilRem = Math.ceil(phaseRemaining);
          if (ceilRem <= this.countdownBeepSec && ceilRem > 0 && ceilRem !== this.lastBeepCount) {
            this.lastBeepCount = ceilRem;
            AudioManager.play('countdown');
          }

          // Check Phase Advancement
          if (this.phaseElapsedSec >= currentPhase.durationSec) {
            // Adaptive recovery logic
            if (this.isAdaptive && currentPhase.name.toLowerCase().includes('sprint')) {
              const avgPhaseCadence = InputManager.state.cadence;
              if (avgPhaseCadence < currentPhase.target.cadence[0]) {
                // Struggling with target: extend subsequent recovery phase by 15s
                const nextPhase = this.program[this.currentPhaseIndex + 1];
                if (nextPhase) nextPhase.durationSec += 15;
              }
            }

            this.currentPhaseIndex++;
            this.phaseElapsedSec = 0;
            this.lastBeepCount = -1;

            if (this.currentPhaseIndex >= this.program.length) {
              this.finish();
              return;
            } else {
              AudioManager.play('levelUp');
              this.announceCurrentPhase();
            }
          }

          // Update Displays
          const speed = InputManager.state.speedKmh;
          const cadence = InputManager.state.cadence;
          const targetMinSpeed = currentPhase.target.speedKmh[0];
          const targetMaxSpeed = currentPhase.target.speedKmh[1];
          const targetMinCad = currentPhase.target.cadence[0];
          const targetMaxCad = currentPhase.target.cadence[1];

          this.drawGauge(speed, targetMinSpeed, targetMaxSpeed);
          this.evaluateCoachGuidance(cadence, targetMinCad, targetMaxCad);

          // Update text tiles
          const gaugeSpeedEl = this.container.querySelector('#cardio-gauge-speed');
          if (gaugeSpeedEl) gaugeSpeedEl.textContent = speed.toFixed(1);

          const timeRemEl = this.container.querySelector('#tile-time-rem');
          if (timeRemEl) {
            const m = Math.floor(totalRemaining / 60);
            const s = Math.floor(totalRemaining % 60);
            timeRemEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
          }

          const timeElapEl = this.container.querySelector('#tile-time-elap');
          if (timeElapEl) {
            const m = Math.floor(this.totalElapsedSec / 60);
            const s = Math.floor(this.totalElapsedSec % 60);
            timeElapEl.textContent = `Elapsed: ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
          }

          const stepsEl = this.container.querySelector('#tile-steps');
          if (stepsEl) stepsEl.textContent = InputManager.stepDetector.getTotalSteps().toLocaleString();

          const cadEl = this.container.querySelector('#tile-cadence');
          if (cadEl) cadEl.textContent = cadence;

          const distEl = this.container.querySelector('#tile-distance');
          if (distEl) distEl.textContent = InputManager.stepDetector.getDistanceKm().toFixed(2);

          const paceEl = this.container.querySelector('#tile-pace');
          if (paceEl) paceEl.textContent = InputManager.stepDetector.getPaceString();

          const calEl = this.container.querySelector('#tile-calories');
          if (calEl) calEl.textContent = InputManager.stepDetector.getEstimatedCalories(this.totalElapsedSec);

          const phaseTimerEl = this.container.querySelector('#cardio-phase-timer');
          if (phaseTimerEl) {
            const curM = Math.floor(this.phaseElapsedSec / 60);
            const curS = Math.floor(this.phaseElapsedSec % 60);
            const durM = Math.floor(currentPhase.durationSec / 60);
            const durS = Math.floor(currentPhase.durationSec % 60);
            phaseTimerEl.textContent = `Phase Time: ${String(curM).padStart(2, '0')}:${String(curS).padStart(2, '0')} / ${String(durM).padStart(2, '0')}:${String(durS).padStart(2, '0')}`;
          }

          // Cursor position in bottom workout profile
          const cursor = this.container.querySelector('#cardio-playhead-cursor');
          if (cursor) {
            const progPct = (this.totalElapsedSec / this.totalProgramDurationSec) * 100;
            cursor.style.left = `${Math.min(100, progPct)}%`;
          }
        }
      }

      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  destroy() {
    this.isRunning = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.metronomeTimer) clearInterval(this.metronomeTimer);
  }
}

/**
 * walk.js
 * Virtual Walk engine for scenic walking routes.
 * Synchronizes video playback rate with player step cadence,
 * pauses video with "Keep Walking!" indicator on idle timeout,
 * displays Points of Interest (POI), milestones, and workout summary.
 */

import { SETTINGS, t, recordSession } from './storage.js';
import { AudioManager } from './audio.js';
import { EffectsManager } from './effects.js';
import { InputManager } from './input.js';
import { MatBridge } from './bridge.js';

export class WalkEngine {
  constructor(videoSource, script, hud, options = {}) {
    this.video = videoSource;
    this.script = script;
    this.hud = hud;
    this.options = options;

    const rules = script.rules || {};
    this.goalType = rules.goalType || 'none'; // 'time' | 'steps' | 'distance' | 'none'
    this.goalValue = rules.goalValue || 1000;
    this.referenceCadence = rules.referenceCadence || 100; // SPM for 1.0x
    this.idleTimeoutMs = rules.idleTimeoutMs || 3000;
    this.cadenceRateMapping = rules.cadenceRateMapping || [
      { cadenceMin: 0, cadenceMax: 40, rate: 0.5 },
      { cadenceMin: 41, cadenceMax: 75, rate: 0.75 },
      { cadenceMin: 76, cadenceMax: 105, rate: 1.0 },
      { cadenceMin: 106, cadenceMax: 130, rate: 1.25 },
      { cadenceMin: 131, cadenceMax: 155, rate: 1.5 },
      { cadenceMin: 156, cadenceMax: 999, rate: 1.75 }
    ];
    this.milestones = rules.milestones || [];
    this.pointsOfInterest = rules.pointsOfInterest || [];

    // Milestone tracking
    this.achievedMilestones = new Set();
    this.shownPOIs = new Set();

    this.isRunning = false;
    this.isPaused = false;
    this.isIdlePaused = false;
    this.lastStepRegisteredTime = performance.now();
    this.startTime = performance.now();
    this.rafId = null;
    this.unsubStep = null;

    this.initStepListener();
  }

  initStepListener() {
    this.unsubStep = InputManager.onAction((actionName, state, source) => {
      if (['STEP_LEFT', 'STEP_RIGHT', 'ANY'].includes(actionName)) {
        this.lastStepRegisteredTime = performance.now();
        const foot = actionName === 'STEP_RIGHT' ? 'right' : 'left';
        this.hud.pulseFoot(foot);

        // Resume if idle paused
        if (this.isIdlePaused) {
          this.isIdlePaused = false;
          this.video.play();
          AudioManager.play('good');
          EffectsManager.floatingText('WALKING RESUMED', undefined, 140, '#22c55e', 24, 1500);
        }
      }
    });
  }

  start() {
    this.isRunning = true;
    this.isPaused = false;
    this.isIdlePaused = false;
    this.startTime = performance.now();
    this.lastStepRegisteredTime = performance.now();
    this.video.play();
    this.startLoop();
    MatBridge.emitEvent('walk_start', { scriptId: this.script.meta?.id });
  }

  pause() {
    this.isPaused = true;
    this.video.pause();
    this.hud.showPauseMenu({
      onResume: () => this.resume(),
      onRestart: () => this.restart(),
      onQuit: () => this.quit(),
      onCalibrate: () => {
        if (this.options.onCalibrate) this.options.onCalibrate();
      }
    });
  }

  resume() {
    this.isPaused = false;
    this.lastStepRegisteredTime = performance.now();
    this.video.play();
  }

  restart() {
    this.destroy();
    if (this.options.onRestart) this.options.onRestart();
  }

  quit() {
    this.destroy();
    if (this.options.onQuit) this.options.onQuit();
  }

  // Map real-time step cadence to discrete video playback speed
  computeTargetRate(cadence) {
    if (cadence <= 0) return 0.5;
    for (const item of this.cadenceRateMapping) {
      if (cadence >= item.cadenceMin && cadence <= item.cadenceMax) {
        return item.rate;
      }
    }
    return 1.0;
  }

  // Check milestones (e.g. 250 steps, 500 steps)
  checkMilestones(steps, distanceKm) {
    for (let i = 0; i < this.milestones.length; i++) {
      if (this.achievedMilestones.has(i)) continue;
      const m = this.milestones[i];
      let reached = false;
      if (m.type === 'steps' && steps >= m.value) reached = true;
      else if (m.type === 'distance' && distanceKm >= m.value) reached = true;

      if (reached) {
        this.achievedMilestones.add(i);
        AudioManager.play('levelUp');
        EffectsManager.popText('MILESTONE REACHED!', '#38bdf8', m.message || '');
        EffectsManager.particles('confetti', undefined, undefined, 35);
        if (m.effect === 'flash') EffectsManager.flash();
        else if (m.effect === 'borderGlow') EffectsManager.borderGlow();
        break;
      }
    }
  }

  // Check Points of Interest (POIs) along route
  checkPOIs(videoTime) {
    for (let i = 0; i < this.pointsOfInterest.length; i++) {
      if (this.shownPOIs.has(i)) continue;
      const poi = this.pointsOfInterest[i];
      if (videoTime >= poi.t && videoTime <= poi.t + 3) {
        this.shownPOIs.add(i);
        AudioManager.play('coin');
        this.hud.showPOI(poi);
        break;
      }
    }
  }

  checkGoalCompletion(steps, distanceKm, currentTime) {
    let complete = false;
    if (this.goalType === 'steps' && steps >= this.goalValue) complete = true;
    else if (this.goalType === 'distance' && distanceKm >= this.goalValue) complete = true;
    else if (this.goalType === 'time' && currentTime >= this.goalValue) complete = true;

    if (complete) {
      this.finish();
    }
  }

  finish() {
    this.isRunning = false;
    this.video.pause();

    const elapsedSec = Math.round((performance.now() - this.startTime) / 1000);
    const steps = InputManager.stepDetector.getTotalSteps();
    const distanceKm = InputManager.stepDetector.getDistanceKm();
    const calories = InputManager.stepDetector.getEstimatedCalories(elapsedSec);

    // Save to session history
    recordSession({
      activityType: 'walk',
      scriptId: this.script.meta?.id || 'walk',
      duration: elapsedSec,
      steps,
      distanceKm,
      calories
    });

    this.hud.showResultsModal({
      activityId: this.script.meta?.id || 'walk',
      score: steps * 10,
      maxCombo: 0,
      stars: 3,
      steps,
      distanceKm,
      calories,
      onRestart: () => this.restart(),
      onQuit: () => this.quit()
    });
  }

  startLoop() {
    const tick = () => {
      if (!this.isRunning) return;

      if (!this.isPaused) {
        const now = performance.now();
        const idleTime = now - this.lastStepRegisteredTime;
        const videoTime = this.video.getTime();
        const duration = this.video.getDuration() || (this.script.meta?.duration || 600);
        const cadence = InputManager.state.cadence;
        const steps = InputManager.stepDetector.getTotalSteps();
        const speedKmh = InputManager.state.speedKmh;
        const distanceKm = InputManager.state.distanceKm;
        const elapsedSec = (now - this.startTime) / 1000;
        const calories = InputManager.stepDetector.getEstimatedCalories(elapsedSec);

        // 1. Idle Detection: if user stops walking for > idleTimeoutMs, pause video
        if (idleTime > this.idleTimeoutMs && !this.isIdlePaused) {
          this.isIdlePaused = true;
          this.video.pause();
        }

        // 2. Playback speed follows cadence when actively walking
        if (!this.isIdlePaused) {
          const targetRate = this.computeTargetRate(cadence);
          this.video.setRate(targetRate);
        }

        // 3. Milestones & POIs
        this.checkMilestones(steps, distanceKm);
        this.checkPOIs(videoTime);
        this.checkGoalCompletion(steps, distanceKm, videoTime);

        // 4. Update Walk HUD
        const progress = duration > 0 ? (videoTime / duration) : 0;
        this.hud.updateWalkHUD({
          steps,
          cadence,
          speedKmh,
          distanceKm,
          calories,
          progress,
          currentTime: videoTime,
          duration,
          idlePaused: this.isIdlePaused
        });
        this.hud.updateMatLighting();
      }

      this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
  }

  destroy() {
    this.isRunning = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.unsubStep) this.unsubStep();
    if (this.video) this.video.pause();
  }
}

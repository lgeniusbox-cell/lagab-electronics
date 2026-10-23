/**
 * timeline.js
 * Timeline engine for GAME mode.
 * Synchronized with the high-precision video clock.
 * Dispatches action events with timing windows (PERFECT / GOOD / MISS), overlays,
 * sound cues, rate changes, checkpoints, and score/combo logic.
 */

import { SETTINGS, t } from './storage.js';
import { AudioManager } from './audio.js';
import { EffectsManager } from './effects.js';
import { InputManager } from './input.js';
import { MatBridge } from './bridge.js';

export class TimelineEngine {
  constructor(videoSource, script, hud, options = {}) {
    this.video = videoSource;
    this.script = script;
    this.hud = hud;
    this.options = options;

    // Rules
    const rules = script.rules || {};
    this.lives = rules.lives !== undefined ? rules.lives : 3;
    this.initialLives = this.lives;
    this.comboMultipliers = rules.comboMultipliers || [1, 2, 3, 5];
    this.starsThresholds = rules.starsThresholds || [1000, 2000, 3000];
    this.intensityMapping = rules.intensityMapping || null;

    // Timeline state
    this.timeline = [...(script.timeline || [])].sort((a, b) => a.t - b.t);
    this.eventsState = this.timeline.map(ev => ({
      event: ev,
      warned: false,
      resolved: false,
      active: false
    }));

    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.currentSection = 'Start';
    this.checkpointTime = 0;
    this.isRunning = false;
    this.isPaused = false;
    this.pauseDurationRemaining = 0;
    this.unsubAction = null;
    this.rafId = null;

    this.initActionSubscription();
  }

  initActionSubscription() {
    this.unsubAction = InputManager.onAction((actionName, state, source) => {
      if (!this.isRunning || this.isPaused) return;
      this.evaluateActionHit(actionName);
    });
  }

  start() {
    this.isRunning = true;
    this.isPaused = false;
    this.video.play();
    this.startLoop();
    MatBridge.emitEvent('game_start', { scriptId: this.script.meta?.id });
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

  // Evaluate user action against currently active pending action events
  evaluateActionHit(actionName) {
    const currentTime = this.video.getTime();
    const isYoutube = !!this.script.video?.youtubeId;
    const defaultWindow = isYoutube ? SETTINGS.timingWindows.youtube : SETTINGS.timingWindows.local;

    // Find closest pending action event in time window
    for (const item of this.eventsState) {
      if (item.resolved || item.event.type !== 'action') continue;
      const ev = item.event;
      const windowMs = ev.windowMs || defaultWindow.goodMs;
      const perfectMs = ev.perfectWindowMs || defaultWindow.perfectMs;
      const timeDiffMs = Math.abs(currentTime - ev.t) * 1000;

      if (timeDiffMs <= windowMs) {
        // Match expectation
        const matches = (ev.expect === 'ANY') ||
                        (ev.expect === actionName) ||
                        (ev.expect === 'STEP_LEFT' && actionName === 'STEP_LEFT') ||
                        (ev.expect === 'STEP_RIGHT' && actionName === 'STEP_RIGHT');

        if (matches) {
          item.resolved = true;
          this.hud.hideActionWarning();

          const isPerfect = timeDiffMs <= perfectMs;
          this.handleHitSuccess(ev, isPerfect);
          return;
        }
      }
    }
  }

  handleHitSuccess(ev, isPerfect) {
    // Multiplier calculation
    let mult = 1;
    if (this.combo >= 20) mult = this.comboMultipliers[3] || 5;
    else if (this.combo >= 10) mult = this.comboMultipliers[2] || 3;
    else if (this.combo >= 5) mult = this.comboMultipliers[1] || 2;

    const basePoints = ev.points || 100;
    const pointsGained = (basePoints * (isPerfect ? 1.5 : 1.0)) * mult;

    this.score += Math.round(pointsGained);
    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;

    // Audio & Visual feedback
    if (isPerfect) {
      AudioManager.play(ev.onPerfect?.sound || 'perfect');
      EffectsManager.popText('PERFECT!', '#22c55e', `+${pointsGained}`);
      EffectsManager.particles('sparkle', undefined, undefined, 25);
      if (ev.onPerfect?.effect) this.triggerNamedEffect(ev.onPerfect.effect);
    } else {
      AudioManager.play(ev.onSuccess?.sound || 'good');
      EffectsManager.popText('GOOD!', '#38bdf8', `+${pointsGained}`);
      if (ev.onSuccess?.effect) this.triggerNamedEffect(ev.onSuccess.effect);
    }

    MatBridge.emitEvent('game_hit', {
      feedback: isPerfect ? 'PERFECT' : 'GOOD',
      score: this.score,
      combo: this.combo,
      feedbackColor: isPerfect ? '#22c55e' : '#38bdf8'
    });
  }

  handleMiss(ev) {
    this.combo = 0; // Combo reset
    AudioManager.play(ev.onFail?.sound || 'hit');
    EffectsManager.popText('MISS!', '#ef4444', '');
    EffectsManager.screenShake(14, 300);
    EffectsManager.vignette('rgba(239, 68, 68, 0.45)', 0.5, 400);

    if (ev.onFail?.loseLife) {
      this.lives = Math.max(0, this.lives - ev.onFail.loseLife);
      if (this.lives <= 0) {
        this.gameOver();
        return;
      }
    }

    if (ev.onFail?.effect) this.triggerNamedEffect(ev.onFail.effect);

    MatBridge.emitEvent('game_miss', {
      feedback: 'MISS',
      score: this.score,
      combo: 0,
      feedbackColor: '#ef4444',
      lives: this.lives
    });
  }

  triggerNamedEffect(effectNameOrObj) {
    if (typeof effectNameOrObj === 'string') {
      const custom = this.script.effects?.[effectNameOrObj];
      if (custom) {
        if (custom.type === 'flash') EffectsManager.flash(custom.color, custom.duration);
        else if (custom.type === 'particles') EffectsManager.particles(custom.particleType, undefined, undefined, custom.count);
        else if (custom.type === 'screenShake') EffectsManager.screenShake(custom.intensity, custom.duration);
      } else {
        // Built-in presets
        if (effectNameOrObj === 'flash') EffectsManager.flash();
        else if (effectNameOrObj === 'zoomPulse') EffectsManager.zoomPulse();
        else if (effectNameOrObj === 'borderGlow') EffectsManager.borderGlow();
        else if (effectNameOrObj === 'shockwave') EffectsManager.shockwave();
        else if (effectNameOrObj === 'screenShake') EffectsManager.screenShake();
        else if (effectNameOrObj === 'particles') EffectsManager.particles('burst');
      }
    } else if (typeof effectNameOrObj === 'object') {
      if (effectNameOrObj.effect === 'laneHighlight') {
        EffectsManager.laneHighlight(effectNameOrObj.lane);
      }
    }
  }

  gameOver() {
    this.video.pause();
    this.isRunning = false;
    AudioManager.play('lose');
    EffectsManager.popText('GAME OVER', '#ef4444', '0 Lives Remaining');

    setTimeout(() => {
      this.hud.showResultsModal({
        activityId: this.script.meta?.id || 'game',
        score: this.score,
        maxCombo: this.maxCombo,
        stars: 0,
        onRestart: () => this.restart(),
        onQuit: () => this.quit()
      });
    }, 1500);
  }

  victory() {
    this.isRunning = false;
    this.video.pause();

    // Determine stars
    let stars = 1;
    if (this.score >= this.starsThresholds[2]) stars = 3;
    else if (this.score >= this.starsThresholds[1]) stars = 2;

    this.hud.showResultsModal({
      activityId: this.script.meta?.id || 'game',
      score: this.score,
      maxCombo: this.maxCombo,
      stars,
      onRestart: () => this.restart(),
      onQuit: () => this.quit()
    });
  }

  // Dynamic Intensity Mapping: adjust video speed based on player intensity slider
  updateIntensityRate() {
    if (!this.intensityMapping) return;
    const curIntensity = InputManager.state.intensity;
    const { minRate, maxRate, steps } = this.intensityMapping;
    if (steps && steps.length > 0) {
      const idx = Math.min(steps.length - 1, Math.floor(curIntensity * steps.length));
      this.video.setRate(steps[idx]);
    } else {
      const rate = minRate + curIntensity * (maxRate - minRate);
      this.video.setRate(rate);
    }
  }

  startLoop() {
    let lastTick = performance.now();
    const tick = () => {
      if (!this.isRunning) return;

      const now = performance.now();
      const dt = (now - lastTick) / 1000;
      lastTick = now;

      if (!this.isPaused) {
        // Handle video pause events (e.g. time freeze)
        if (this.pauseDurationRemaining > 0) {
          this.pauseDurationRemaining -= dt;
          if (this.pauseDurationRemaining <= 0) {
            this.video.play();
          }
        }

        const currentTime = this.video.getTime();
        const duration = this.video.getDuration() || (this.script.meta?.duration || 60);

        this.processTimelineEvents(currentTime);
        this.updateIntensityRate();

        // Check if finished
        if (currentTime >= duration - 0.5) {
          this.victory();
          return;
        }

        // Update HUD
        const progress = duration > 0 ? (currentTime / duration) : 0;
        this.hud.updateGameHUD({
          score: this.score,
          combo: this.combo,
          lives: this.lives,
          progress,
          currentTime,
          duration,
          sectionName: this.currentSection
        });
        this.hud.updateMatLighting();
      }

      this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
  }

  processTimelineEvents(currentTime) {
    const isYoutube = !!this.script.video?.youtubeId;
    const defaultWindow = isYoutube ? SETTINGS.timingWindows.youtube : SETTINGS.timingWindows.local;

    for (const item of this.eventsState) {
      const ev = item.event;
      if (item.resolved) continue;

      // 1. Action Warnings (countdown ring or UI badge)
      if (ev.type === 'action') {
        const warnBeforeSec = (ev.warnBeforeMs || 1500) / 1000;
        const timeUntilHit = ev.t - currentTime;

        if (!item.warned && timeUntilHit <= warnBeforeSec && timeUntilHit > 0) {
          item.warned = true;
          this.hud.showActionWarning(ev.expect);
          EffectsManager.ring(undefined, undefined, 70, '#38bdf8', ev.warnBeforeMs || 1500);
        }

        // Miss detection: event window expired without input
        const windowSec = (ev.windowMs || defaultWindow.goodMs) / 1000;
        if (currentTime > ev.t + windowSec) {
          item.resolved = true;
          this.hud.hideActionWarning();
          this.handleMiss(ev);
        }
      }

      // 2. Overlay Events (Text, Shapes)
      else if (ev.type === 'overlay') {
        if (!item.resolved && currentTime >= ev.t) {
          item.resolved = true;
          if (ev.text) {
            EffectsManager.floatingText(ev.text, undefined, undefined, ev.color || '#38bdf8', 36, (ev.duration || 2.5) * 1000);
          }
          if (ev.shape) {
            EffectsManager.addPrimitive({
              type: ev.shape,
              color: ev.color,
              duration: ev.duration || 2.0
            });
          }
        }
      }

      // 3. Effect Events
      else if (ev.type === 'effect') {
        if (!item.resolved && currentTime >= ev.t) {
          item.resolved = true;
          this.triggerNamedEffect(ev.name);
        }
      }

      // 4. Video Events (rate, pause, seek)
      else if (ev.type === 'video') {
        if (!item.resolved && currentTime >= ev.t) {
          item.resolved = true;
          if (ev.action === 'setRate') {
            this.video.setRate(ev.rate || 1.0);
          } else if (ev.action === 'pause') {
            this.video.pause();
            this.pauseDurationRemaining = ev.duration || 1.5;
          } else if (ev.action === 'seek') {
            this.video.seek(ev.targetTime);
          }
        }
      }

      // 5. Sound Events
      else if (ev.type === 'sound') {
        if (!item.resolved && currentTime >= ev.t) {
          item.resolved = true;
          AudioManager.play(ev.preset || 'countdown');
        }
      }

      // 6. Section Events
      else if (ev.type === 'section') {
        if (!item.resolved && currentTime >= ev.t) {
          item.resolved = true;
          this.currentSection = ev.name;
          EffectsManager.floatingText(ev.name, undefined, 120, '#f8fafc', 24, 2500);
        }
      }

      // 7. Checkpoint Events
      else if (ev.type === 'checkpoint') {
        if (!item.resolved && currentTime >= ev.t) {
          item.resolved = true;
          this.checkpointTime = ev.t;
          EffectsManager.popText('CHECKPOINT', '#38bdf8', ev.name || '');
        }
      }

      // 8. Branch Events
      else if (ev.type === 'branch') {
        if (!item.resolved && currentTime >= ev.t) {
          item.resolved = true;
          const conditionMet = (ev.condition === 'minScore' && this.score >= (ev.value || 0));
          if (conditionMet && ev.targetTime !== undefined) {
            this.video.seek(ev.targetTime);
          } else if (!conditionMet && ev.elseTargetTime !== undefined) {
            this.video.seek(ev.elseTargetTime);
          }
        }
      }
    }
  }

  destroy() {
    this.isRunning = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.unsubAction) this.unsubAction();
    if (this.video) this.video.pause();
  }
}

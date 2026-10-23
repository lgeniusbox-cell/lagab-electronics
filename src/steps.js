/**
 * steps.js
 * Real-time step detection, sliding-window cadence (SPM), speed estimation (km/h),
 * distance accumulator, pace calculation, left/right balance, and gait classification.
 */

import { getCurrentProfile } from './storage.js';

export class StepDetector {
  constructor(options = {}) {
    this.windowDurationSec = options.windowDurationSec || 6.0;
    this.stepHistory = []; // { t: seconds, foot: 'left' | 'right' }
    this.totalSteps = 0;
    this.leftSteps = 0;
    this.rightSteps = 0;
    this.totalDistanceMeters = 0;
    this.lastStepTime = 0;
    this.minStepIntervalMs = 200; // anti-chatter / debounce

    // Alternative peak detector state for analog axis triggers
    this.lastAxisSample = 0;
    this.axisVelocity = 0;
    this.peakThreshold = 0.45;
  }

  reset() {
    this.stepHistory = [];
    this.totalSteps = 0;
    this.leftSteps = 0;
    this.rightSteps = 0;
    this.totalDistanceMeters = 0;
    this.lastStepTime = 0;
  }

  // Register a confirmed discrete step event (e.g. from button 4 or 5 or keyboard Z/X or simulator)
  pushStep(foot = 'left', customTime = null) {
    const now = customTime !== null ? customTime : (performance.now() / 1000);
    const dtMs = (now - this.lastStepTime) * 1000;
    if (this.lastStepTime > 0 && dtMs < this.minStepIntervalMs) {
      return false; // Debounce anti-chatter
    }

    this.lastStepTime = now;
    this.totalSteps++;
    if (foot === 'left') this.leftSteps++;
    else this.rightSteps++;

    const profile = getCurrentProfile();
    const stride = profile.strideLength || 0.7; // meters
    this.totalDistanceMeters += stride;

    this.stepHistory.push({ t: now, foot });
    this.cleanHistory(now);
    return true;
  }

  // Alternative analog peak detector for raw sensor axis / accelerometer
  processAxisSample(value, nowSec) {
    const now = nowSec || (performance.now() / 1000);
    const diff = value - this.lastAxisSample;
    this.lastAxisSample = value;

    // Detect positive zero-crossing / crest
    if (diff > 0) {
      this.axisVelocity = diff;
    } else if (this.axisVelocity > this.peakThreshold && diff < 0) {
      // Crest reached
      const foot = this.leftSteps <= this.rightSteps ? 'left' : 'right';
      this.pushStep(foot, now);
      this.axisVelocity = 0;
    }
  }

  // Remove steps older than the sliding window
  cleanHistory(now) {
    const cutoff = now - this.windowDurationSec;
    while (this.stepHistory.length > 0 && this.stepHistory[0].t < cutoff) {
      this.stepHistory.shift();
    }
  }

  // Current Cadence in steps per minute (SPM)
  getCadence() {
    const now = performance.now() / 1000;
    this.cleanHistory(now);

    // If idle for over 3 seconds, drop cadence to zero
    if (now - this.lastStepTime > 3.0) {
      return 0;
    }

    if (this.stepHistory.length < 2) {
      return 0;
    }

    const count = this.stepHistory.length;
    // Window span in seconds
    const span = Math.max(1.0, this.stepHistory[count - 1].t - this.stepHistory[0].t);
    const spm = ((count - 1) / span) * 60;
    return Math.round(Math.min(spm, 240));
  }

  // Speed in km/h: (cadence * strideLength * 60) / 1000
  getSpeedKmh() {
    const spm = this.getCadence();
    if (spm <= 0) return 0.0;
    const profile = getCurrentProfile();
    const stride = profile.strideLength || 0.7;
    const kmh = (spm * stride * 60) / 1000;
    return parseFloat(kmh.toFixed(1));
  }

  // Distance in kilometers
  getDistanceKm() {
    return parseFloat((this.totalDistanceMeters / 1000).toFixed(2));
  }

  // Distance in meters
  getDistanceMeters() {
    return Math.round(this.totalDistanceMeters);
  }

  // Total steps count
  getTotalSteps() {
    return this.totalSteps;
  }

  // Left vs right balance percentage [leftPct, rightPct]
  getBalance() {
    const total = this.leftSteps + this.rightSteps;
    if (total === 0) return [50, 50];
    const leftPct = Math.round((this.leftSteps / total) * 100);
    return [leftPct, 100 - leftPct];
  }

  // Pace: minutes and seconds per km (e.g. "06:30" or "--:--")
  getPaceString() {
    const speed = this.getSpeedKmh();
    if (speed <= 0.5) return '--:--';
    const totalMinutes = 60 / speed;
    const mins = Math.floor(totalMinutes);
    const secs = Math.round((totalMinutes - mins) * 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  // Gait classification: Idle, Walking, Running
  getClassification() {
    const spm = this.getCadence();
    if (spm < 20) return 'idle';
    if (spm < 130) return 'walking';
    return 'running';
  }

  // Estimate calories burned (based on METs and user weight)
  getEstimatedCalories(durationSec = 0) {
    const profile = getCurrentProfile();
    const weightKg = profile.weightKg || 70;
    const speed = this.getSpeedKmh();
    
    // MET estimation formula based on walking/running speeds
    let met = 1.0;
    if (speed > 0.5 && speed < 3.5) met = 2.8;
    else if (speed >= 3.5 && speed < 5.5) met = 3.8;
    else if (speed >= 5.5 && speed < 7.5) met = 6.0;
    else if (speed >= 7.5 && speed < 9.5) met = 8.5;
    else if (speed >= 9.5) met = 11.0;

    // Calories = (MET * 3.5 * weightKg / 200) * (durationMin)
    const minutes = durationSec / 60;
    const kcal = (met * 3.5 * weightKg / 200) * minutes;
    return Math.round(kcal);
  }
}

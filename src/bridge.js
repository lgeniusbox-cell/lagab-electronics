/**
 * bridge.js
 * External bridge API for Android TV WebView integration.
 * Exposes window.MatEngine for Android JS injection and emits LED / haptic events
 * to window.Android or window.MatBridge when available.
 */

import { InputManager } from './input.js';

class MatBridgeClass {
  constructor() {
    this.eventListeners = [];
    this.initExternalEngineApi();
  }

  // Subscribe to internal engine event notifications
  onEvent(callback) {
    this.eventListeners.push(callback);
    return () => {
      this.eventListeners = this.eventListeners.filter(cb => cb !== callback);
    };
  }

  // Dispatches an event payload out to both registered JS listeners and the Android Native bridge
  emitEvent(eventType, payload = {}) {
    const eventData = {
      type: eventType,
      timestamp: Date.now(),
      lane: InputManager.state.lane,
      intensity: InputManager.state.intensity,
      cadence: InputManager.state.cadence,
      speedKmh: InputManager.state.speedKmh,
      ...payload
    };

    // 1. Notify web listeners
    for (const cb of this.eventListeners) {
      try {
        cb(eventData);
      } catch (e) {
        console.error('[MatBridge] Error in JS listener:', e);
      }
    }

    // 2. Safely call Android / MatBridge native container for LED reactive light feedback
    const jsonStr = JSON.stringify(eventData);
    if (typeof window !== 'undefined') {
      try {
        if (window.Android && typeof window.Android.onMatEvent === 'function') {
          window.Android.onMatEvent(jsonStr);
        }
      } catch (err) {
        console.warn('[MatBridge] window.Android.onMatEvent failed:', err);
      }

      try {
        if (window.MatBridge && typeof window.MatBridge.onMatEvent === 'function') {
          window.MatBridge.onMatEvent(jsonStr);
        }
      } catch (err) {
        console.warn('[MatBridge] window.MatBridge.onMatEvent failed:', err);
      }
    }
  }

  // Expose window.MatEngine
  initExternalEngineApi() {
    if (typeof window === 'undefined') return;

    window.MatEngine = {
      // Load an activity dynamically from native code
      loadActivity: ({ youtube, script }) => {
        if (window.App && typeof window.App.loadActivityFromLinks === 'function') {
          window.App.loadActivityFromLinks(youtube || '', script || '');
        } else {
          console.warn('[MatEngine] App instance not yet ready.');
        }
      },

      // Push raw multi-axis input state
      pushInput: (data = {}) => {
        if (typeof data.lane === 'number') {
          InputManager.setLane(data.lane, 'android');
        }
        if (typeof data.intensity === 'number') {
          InputManager.state.intensity = Math.max(0, Math.min(data.intensity, 1));
        }
        if (data.jump) {
          InputManager.dispatchAction('JUMP', 'android');
        }
        if (data.slide) {
          InputManager.dispatchAction('SLIDE', 'android');
        }
        if (data.stepLeft) {
          InputManager.stepDetector.pushStep('left');
          InputManager.dispatchAction('STEP_LEFT', 'android');
        }
        if (data.stepRight) {
          InputManager.stepDetector.pushStep('right');
          InputManager.dispatchAction('STEP_RIGHT', 'android');
        }
        if (typeof data.cadence === 'number') {
          InputManager.state.cadence = data.cadence;
        }
      },

      pushStep: (foot = 'left') => {
        const side = foot === 'right' ? 'right' : 'left';
        InputManager.stepDetector.pushStep(side);
        InputManager.dispatchAction(side === 'left' ? 'STEP_LEFT' : 'STEP_RIGHT', 'android');
        InputManager.dispatchAction('ANY', 'android');
      },

      setLane: (lane) => {
        const l = lane < -0.3 ? -1 : (lane > 0.3 ? 1 : 0);
        InputManager.setLane(l, 'android');
      },

      setIntensity: (val) => {
        InputManager.state.intensity = Math.max(0, Math.min(val, 1.0));
      },

      triggerJump: () => {
        InputManager.dispatchAction('JUMP', 'android');
        InputManager.dispatchAction('ANY', 'android');
      },

      triggerSlide: () => {
        InputManager.dispatchAction('SLIDE', 'android');
        InputManager.dispatchAction('ANY', 'android');
      },

      getState: () => {
        return { ...InputManager.state };
      },

      onEvent: (cb) => {
        return this.onEvent(cb);
      }
    };
  }
}

export const MatBridge = new MatBridgeClass();

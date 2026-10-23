/**
 * input.js
 * Merged input layer polling Gamepad API, Keyboard, On-Screen Simulator,
 * and External Android WebView injection API.
 */

import { SETTINGS } from './storage.js';
import { StepDetector } from './steps.js';

export class InputManagerClass {
  constructor() {
    this.stepDetector = new StepDetector();
    
    // Unified state
    this.state = {
      lane: 0, // -1 (Left), 0 (Center), 1 (Right)
      intensity: 0.0, // 0.0 to 1.0
      jump: false,
      slide: false,
      stepLeft: false,
      stepRight: false,
      cadence: 0,
      speedKmh: 0,
      distanceKm: 0,
      gamepadConnected: false,
      gamepadId: 'None'
    };

    // Edge tracking
    this.prevButtons = [];
    this.prevAxes = [];
    this.prevLane = 0;
    this.lastActionTimes = {};
    this.actionListeners = [];
    this.recentActions = []; // Rolling log of last 20 actions

    // Keyboard state
    this.keysDown = {};

    this.initKeyboard();
    this.initGamepadEvents();
    this.startPollingLoop();
  }

  // Subscribe to action events: 'JUMP', 'SLIDE', 'LEFT', 'RIGHT', 'CENTER', 'STEP_LEFT', 'STEP_RIGHT', 'ANY'
  onAction(cb) {
    this.actionListeners.push(cb);
    return () => {
      this.actionListeners = this.actionListeners.filter(l => l !== cb);
    };
  }

  dispatchAction(actionName, source = 'gamepad') {
    const now = performance.now();
    const lastTime = this.lastActionTimes[actionName] || 0;
    const debounceMs = SETTINGS.gamepad.debounceMs || 120;

    if (now - lastTime < debounceMs) {
      return; // Debounced
    }
    this.lastActionTimes[actionName] = now;

    // Log action
    this.recentActions.unshift({
      action: actionName,
      source,
      time: new Date().toLocaleTimeString(),
      tMs: Math.round(now)
    });
    if (this.recentActions.length > 20) {
      this.recentActions.pop();
    }

    // Fire listeners
    for (const listener of this.actionListeners) {
      try {
        listener(actionName, this.state, source);
      } catch (err) {
        console.error('[InputManager] Error in action listener:', err);
      }
    }
  }

  initKeyboard() {
    window.addEventListener('keydown', (e) => {
      // Don't capture when typing in text inputs or textareas
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      this.keysDown[e.code] = true;

      if (e.code === 'ArrowUp' || e.code === 'Space') {
        this.dispatchAction('JUMP', 'keyboard');
        this.state.jump = true;
      } else if (e.code === 'ArrowDown') {
        this.dispatchAction('SLIDE', 'keyboard');
        this.state.slide = true;
      } else if (e.code === 'ArrowLeft') {
        this.setLane(-1, 'keyboard');
      } else if (e.code === 'ArrowRight') {
        this.setLane(1, 'keyboard');
      } else if (e.code === 'KeyZ') {
        this.stepDetector.pushStep('left');
        this.dispatchAction('STEP_LEFT', 'keyboard');
        this.dispatchAction('ANY', 'keyboard');
      } else if (e.code === 'KeyX') {
        this.stepDetector.pushStep('right');
        this.dispatchAction('STEP_RIGHT', 'keyboard');
        this.dispatchAction('ANY', 'keyboard');
      }
    });

    window.addEventListener('keyup', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      this.keysDown[e.code] = false;

      if (e.code === 'ArrowUp' || e.code === 'Space') {
        this.state.jump = false;
      } else if (e.code === 'ArrowDown') {
        this.state.slide = false;
      } else if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        if (!this.keysDown['ArrowLeft'] && !this.keysDown['ArrowRight']) {
          this.setLane(0, 'keyboard');
        }
      }
    });
  }

  initGamepadEvents() {
    window.addEventListener('gamepadconnected', (e) => {
      this.state.gamepadConnected = true;
      this.state.gamepadId = e.gamepad.id || 'Connected Gamepad';
    });

    window.addEventListener('gamepaddisconnected', () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const stillConnected = Array.from(gamepads).some(gp => gp !== null);
      this.state.gamepadConnected = stillConnected;
      if (!stillConnected) this.state.gamepadId = 'None';
    });
  }

  setLane(laneVal, source = 'system') {
    if (this.state.lane !== laneVal) {
      this.state.lane = laneVal;
      if (laneVal === -1) this.dispatchAction('LEFT', source);
      else if (laneVal === 1) this.dispatchAction('RIGHT', source);
      else if (laneVal === 0) this.dispatchAction('CENTER', source);
    }
  }

  // Merged polling loop executed every requestAnimationFrame
  poll() {
    // 1. Poll Gamepads
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    let activePad = null;
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) {
        activePad = gamepads[i];
        break;
      }
    }

    if (activePad) {
      this.state.gamepadConnected = true;
      this.state.gamepadId = activePad.id;

      // Axis 0 for Lane (Left / Center / Right) with hysteresis
      const axis0 = activePad.axes[SETTINGS.gamepad.axisLane || 0] || 0;
      const thLeft = SETTINGS.gamepad.thresholdLeft || -0.5;
      const thRight = SETTINGS.gamepad.thresholdRight || 0.5;
      const hyst = SETTINGS.gamepad.hysteresis || 0.12;

      let detectedLane = this.state.lane;
      if (axis0 < thLeft) {
        detectedLane = -1;
      } else if (axis0 > thRight) {
        detectedLane = 1;
      } else if (Math.abs(axis0) < (0.3 - hyst)) {
        detectedLane = 0;
      }

      // Check D-pad buttons (14 = left, 15 = right) as backup
      if (activePad.buttons[14] && activePad.buttons[14].pressed) {
        detectedLane = -1;
      } else if (activePad.buttons[15] && activePad.buttons[15].pressed) {
        detectedLane = 1;
      }

      if (detectedLane !== this.state.lane) {
        this.setLane(detectedLane, 'gamepad');
      }

      // Jump button (button 0 or D-pad Up button 12) - rising edge
      const btnJump = activePad.buttons[SETTINGS.gamepad.buttonJump || 0]?.pressed ||
                      activePad.buttons[12]?.pressed || false;
      const prevJump = this.prevButtons[SETTINGS.gamepad.buttonJump || 0] || false;
      if (btnJump && !prevJump) {
        this.dispatchAction('JUMP', 'gamepad');
        this.dispatchAction('ANY', 'gamepad');
      }
      this.state.jump = btnJump;

      // Slide button (button 1 or D-pad Down button 13 or axis 1 > 0.6) - rising edge
      const axis1 = activePad.axes[SETTINGS.gamepad.axisSlide || 1] || 0;
      const btnSlide = activePad.buttons[SETTINGS.gamepad.buttonSlide || 1]?.pressed ||
                       activePad.buttons[13]?.pressed ||
                       (axis1 > (SETTINGS.gamepad.axisSlideThreshold || 0.6));
      const prevSlide = this.prevButtons[SETTINGS.gamepad.buttonSlide || 1] || false;
      if (btnSlide && !prevSlide) {
        this.dispatchAction('SLIDE', 'gamepad');
        this.dispatchAction('ANY', 'gamepad');
      }
      this.state.slide = btnSlide;

      // Steps buttons (button 4 = Step Left, button 5 = Step Right)
      const btnStepL = activePad.buttons[SETTINGS.gamepad.buttonStepLeft || 4]?.pressed || false;
      const prevStepL = this.prevButtons[SETTINGS.gamepad.buttonStepLeft || 4] || false;
      if (btnStepL && !prevStepL) {
        this.stepDetector.pushStep('left');
        this.dispatchAction('STEP_LEFT', 'gamepad');
        this.dispatchAction('ANY', 'gamepad');
      }

      const btnStepR = activePad.buttons[SETTINGS.gamepad.buttonStepRight || 5]?.pressed || false;
      const prevStepR = this.prevButtons[SETTINGS.gamepad.buttonStepRight || 5] || false;
      if (btnStepR && !prevStepR) {
        this.stepDetector.pushStep('right');
        this.dispatchAction('STEP_RIGHT', 'gamepad');
        this.dispatchAction('ANY', 'gamepad');
      }

      // Analog Intensity (Button 7 trigger or Axis 5)
      let rawIntensity = 0;
      if (activePad.buttons[SETTINGS.gamepad.triggerIntensity || 7]) {
        rawIntensity = activePad.buttons[SETTINGS.gamepad.triggerIntensity || 7].value || 0;
      }
      if (activePad.axes[SETTINGS.gamepad.axisIntensity || 5] !== undefined) {
        const axVal = (activePad.axes[SETTINGS.gamepad.axisIntensity || 5] + 1) / 2; // normalize -1..1 to 0..1
        rawIntensity = Math.max(rawIntensity, axVal);
      }
      // Keyboard shift intensity
      if (this.keysDown['ShiftLeft'] || this.keysDown['ShiftRight']) {
        rawIntensity = Math.max(rawIntensity, 0.85);
      }
      // Smooth intensity
      this.state.intensity += (rawIntensity - this.state.intensity) * 0.2;

      // Cache previous button states
      this.prevButtons = activePad.buttons.map(b => b.pressed);
      this.prevAxes = [...activePad.axes];
    } else {
      this.state.gamepadConnected = false;
      this.state.gamepadId = 'None';
      if (this.keysDown['ShiftLeft'] || this.keysDown['ShiftRight']) {
        this.state.intensity += (0.85 - this.state.intensity) * 0.2;
      } else {
        this.state.intensity += (0.0 - this.state.intensity) * 0.2;
      }
    }

    // 2. Sync computed step metrics
    this.state.cadence = this.stepDetector.getCadence();
    this.state.speedKmh = this.stepDetector.getSpeedKmh();
    this.state.distanceKm = this.stepDetector.getDistanceKm();
  }

  startPollingLoop() {
    const loop = () => {
      this.poll();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

export const InputManager = new InputManagerClass();

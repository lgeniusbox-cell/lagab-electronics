/**
 * audio.js
 * WebAudio synthesizer for zero-dependency sound effects, countdowns, metronome,
 * and SpeechSynthesis coach vocal cues with audio fallback.
 */

import { SETTINGS } from './storage.js';

class AudioManagerClass {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.lastCoachCueTime = 0;
    this.lastCueSpoken = '';
    this.speechAvailable = typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  // Lazy initialize AudioContext on first user gesture
  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setMuted(muted) {
    this.isMuted = !!muted;
    if (this.isMuted && this.speechAvailable) {
      window.speechSynthesis.cancel();
    }
  }

  toggleMute() {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  // Play synthesized preset sound
  play(presetName) {
    if (this.isMuted || !SETTINGS.sound.soundFx) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(SETTINGS.sound.masterVolume || 0.8, t);
    masterGain.connect(this.ctx.destination);

    switch (presetName) {
      case 'jump': {
        // Swooping resonant upward slide
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, t);
        osc.frequency.exponentialRampToValueAtTime(520, t + 0.18);
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.25);
        break;
      }

      case 'slide': {
        // Low whooshing resonant sweep
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(260, t);
        osc.frequency.exponentialRampToValueAtTime(65, t + 0.28);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, t);
        filter.frequency.exponentialRampToValueAtTime(120, t + 0.28);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.32);
        break;
      }

      case 'coin': {
        // Crisp dual chime
        [987, 1318].forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t + idx * 0.08);
          gain.gain.setValueAtTime(0, t);
          gain.gain.setValueAtTime(0.35, t + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.25);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(t + idx * 0.08);
          osc.stop(t + idx * 0.08 + 0.28);
        });
        break;
      }

      case 'perfect': {
        // Celebratory major arpeggio sparkle
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t + idx * 0.05);
          gain.gain.setValueAtTime(0, t);
          gain.gain.setValueAtTime(0.28, t + idx * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + 0.35);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(t + idx * 0.05);
          osc.stop(t + idx * 0.05 + 0.38);
        });
        break;
      }

      case 'good': {
        // Bright friendly double chime
        [440, 554.37].forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t + idx * 0.06);
          gain.gain.setValueAtTime(0.3, t + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + 0.2);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(t + idx * 0.06);
          osc.stop(t + idx * 0.06 + 0.22);
        });
        break;
      }

      case 'hit':
      case 'loseLife': {
        // Punchy thud with low noise
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(110, t);
        osc.frequency.exponentialRampToValueAtTime(35, t + 0.22);
        gain.gain.setValueAtTime(0.45, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.26);
        break;
      }

      case 'levelUp': {
        // 5-note fanfare
        const notes = [440, 554.37, 659.25, 880, 1108.73];
        notes.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t + idx * 0.08);
          gain.gain.setValueAtTime(0.25, t + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.3);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(t + idx * 0.08);
          osc.stop(t + idx * 0.08 + 0.35);
        });
        break;
      }

      case 'win': {
        // Victory harmonic cadence
        const chords = [
          [523.25, 659.25, 783.99],
          [587.33, 739.99, 880],
          [659.25, 830.61, 987.77],
          [1046.5, 1318.51, 1567.98]
        ];
        chords.forEach((chord, cIdx) => {
          chord.forEach(freq => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t + cIdx * 0.22);
            gain.gain.setValueAtTime(0.18, t + cIdx * 0.22);
            gain.gain.exponentialRampToValueAtTime(0.001, t + cIdx * 0.22 + 0.5);
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(t + cIdx * 0.22);
            osc.stop(t + cIdx * 0.22 + 0.55);
          });
        });
        break;
      }

      case 'lose': {
        // Descending sad warble
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, t);
        osc.frequency.linearRampToValueAtTime(140, t + 0.45);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.55);
        break;
      }

      case 'countdown': {
        // Clean high cue beep
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, t);
        gain.gain.setValueAtTime(0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.1);
        break;
      }

      case 'tick':
      case 'metronome': {
        // Crisp percussion tick
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200, t);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.04);
        break;
      }

      default:
        break;
    }
  }

  // Spoken coach cue with audio beep fallback and cooldown
  coachCue(cueText, force = false, cooldownSec = 8) {
    if (this.isMuted || !SETTINGS.sound.coachVoice) return;
    const now = performance.now() / 1000;
    if (!force && (now - this.lastCoachCueTime < cooldownSec) && this.lastCueSpoken === cueText) {
      return;
    }
    this.lastCoachCueTime = now;
    this.lastCueSpoken = cueText;

    if (this.speechAvailable && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cueText);
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        utterance.volume = SETTINGS.sound.masterVolume || 0.8;
        
        // Select language
        const lang = SETTINGS.language || 'en';
        if (lang === 'fr') utterance.lang = 'fr-FR';
        else if (lang === 'ar') utterance.lang = 'ar-SA';
        else utterance.lang = 'en-US';

        window.speechSynthesis.speak(utterance);
        return;
      } catch (e) {
        console.warn('[Audio] Speech synthesis failed, fallback to tone:', e);
      }
    }

    // Audio fallback chime if speech is unavailable
    this.play('good');
  }
}

export const AudioManager = new AudioManagerClass();

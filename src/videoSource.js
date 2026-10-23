/**
 * videoSource.js
 * Video abstraction layer with three implementations:
 * 1. YouTubeSource: uses YouTube IFrame Player API with rate snapping, hysteresis,
 *    interpolated high-precision clock, muted autoplay, and error resilience.
 * 2. HtmlVideoSource: HTML5 MP4 video element.
 * 3. PlaceholderSource: 60fps procedural animated cyber-gradient canvas with running timecode.
 */

// Helper to extract 11-char YouTube ID from any URL format
export function parseYouTubeUrl(input) {
  if (!input) return null;
  const str = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) {
    return str;
  }
  // Patterns: watch?v=, youtu.be/, embed/, shorts/, live/
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = str.match(regExp);
  return match && match[1] ? match[1] : null;
}

/**
 * PlaceholderSource
 * Animated procedural backdrop with timecode clock, ideal for zero-internet testing.
 */
export class PlaceholderSource {
  constructor(container, options = {}) {
    this.container = container;
    this.duration = options.duration || 600;
    this.currentTime = options.startAt || 0;
    this.rate = 1.0;
    this.isPlaying = false;
    this.onStateCb = null;
    this.onErrorCb = null;
    this.rafId = null;
    this.lastFrameTime = performance.now();

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'absolute inset-0 w-full h-full object-cover';
    this.ctx = this.canvas.getContext('2d');
    this.container.innerHTML = '';
    this.container.appendChild(this.canvas);

    this.resize();
    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);

    this.draw();
  }

  resize() {
    this.canvas.width = this.container.clientWidth || 1280;
    this.canvas.height = this.container.clientHeight || 720;
  }

  play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.lastFrameTime = performance.now();
    this.tick();
    if (this.onStateCb) this.onStateCb('PLAYING');
  }

  pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.onStateCb) this.onStateCb('PAUSED');
  }

  seek(seconds) {
    this.currentTime = Math.max(0, Math.min(seconds, this.duration));
  }

  setRate(rate) {
    this.rate = Math.max(0.25, Math.min(rate, 2.0));
  }

  getTime() {
    return this.currentTime;
  }

  getDuration() {
    return this.duration;
  }

  isBuffering() {
    return false;
  }

  onState(cb) {
    this.onStateCb = cb;
  }

  onError(cb) {
    this.onErrorCb = cb;
  }

  tick() {
    if (!this.isPlaying) return;
    const now = performance.now();
    const dt = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;

    this.currentTime += dt * this.rate;
    if (this.currentTime >= this.duration) {
      this.currentTime = this.duration;
      this.pause();
      if (this.onStateCb) this.onStateCb('ENDED');
      return;
    }

    this.draw();
    this.rafId = requestAnimationFrame(() => this.tick());
  }

  draw() {
    const { width, height } = this.canvas;
    const ctx = this.ctx;
    const t = this.currentTime;

    // Rich animated background gradient
    const grad = ctx.createLinearGradient(0, 0, width, height);
    const hue1 = (t * 12) % 360;
    const hue2 = (t * 12 + 60) % 360;
    grad.addColorStop(0, `hsl(${hue1}, 45%, 10%)`);
    grad.addColorStop(0.5, `hsl(${hue2}, 35%, 8%)`);
    grad.addColorStop(1, '#050814');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Dynamic 3D perspective grid ground
    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
    ctx.lineWidth = 1.5;
    const horizon = height * 0.55;

    // Horizon line
    ctx.beginPath();
    ctx.moveTo(0, horizon);
    ctx.lineTo(width, horizon);
    ctx.stroke();

    // Vanishing perspective lines
    const cx = width / 2;
    for (let x = -width; x <= width * 2; x += 90) {
      ctx.beginPath();
      ctx.moveTo(cx, horizon);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Moving horizontal grid lines
    const offset = (t * this.rate * 80) % 60;
    for (let y = horizon; y <= height; y += 45) {
      const py = y + offset;
      if (py >= horizon && py <= height) {
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(width, py);
        ctx.stroke();
      }
    }
    ctx.restore();

    // Central aesthetic simulation badge
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 2;
    const badgeW = 340;
    const badgeH = 110;
    const bx = (width - badgeW) / 2;
    const by = 80;
    ctx.fillRect(bx, by, badgeW, badgeH);
    ctx.strokeRect(bx, by, badgeW, badgeH);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SIMULATED ENGINE BACKDROP', width / 2, by + 30);

    // Running clock
    const mins = Math.floor(t / 60);
    const secs = Math.floor(t % 60);
    const ms = Math.floor((t % 1) * 100);
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 36px monospace';
    ctx.fillText(timeStr, width / 2, by + 74);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.fillText(`RATE: ${this.rate.toFixed(2)}x · PROCEDURAL SYNC`, width / 2, by + 96);
    ctx.restore();
  }

  destroy() {
    this.pause();
    window.removeEventListener('resize', this._onResize);
    this.container.innerHTML = '';
  }
}

/**
 * HtmlVideoSource
 * Handles direct HTML5 mp4 video files.
 */
export class HtmlVideoSource {
  constructor(container, src, options = {}) {
    this.container = container;
    this.video = document.createElement('video');
    this.video.className = 'w-full h-full object-cover pointer-events-none';
    this.video.playsInline = true;
    this.video.src = src;
    this.video.muted = true; // start muted for autoplay
    this.rate = 1.0;
    this.onStateCb = null;
    this.onErrorCb = null;

    this.container.innerHTML = '';
    this.container.appendChild(this.video);

    if (options.startAt) {
      this.video.currentTime = options.startAt;
    }

    this.video.addEventListener('playing', () => {
      if (this.onStateCb) this.onStateCb('PLAYING');
    });
    this.video.addEventListener('pause', () => {
      if (this.onStateCb) this.onStateCb('PAUSED');
    });
    this.video.addEventListener('waiting', () => {
      if (this.onStateCb) this.onStateCb('BUFFERING');
    });
    this.video.addEventListener('ended', () => {
      if (this.onStateCb) this.onStateCb('ENDED');
    });
    this.video.addEventListener('error', (e) => {
      if (this.onErrorCb) this.onErrorCb(400, 'HTML5 Video Error loading source.');
    });
  }

  play() {
    this.video.muted = false;
    this.video.play().catch(e => {
      // Retry muted if browser blocks audio autoplay
      this.video.muted = true;
      this.video.play().catch(() => {});
    });
  }

  pause() {
    this.video.pause();
  }

  seek(seconds) {
    this.video.currentTime = seconds;
  }

  setRate(rate) {
    this.rate = rate;
    this.video.playbackRate = rate;
  }

  getTime() {
    return this.video.currentTime;
  }

  getDuration() {
    return this.video.duration || 0;
  }

  isBuffering() {
    return this.video.readyState < 3;
  }

  onState(cb) {
    this.onStateCb = cb;
  }

  onError(cb) {
    this.onErrorCb = cb;
  }

  destroy() {
    this.pause();
    this.container.innerHTML = '';
  }
}

/**
 * YouTubeSource
 * High-precision YouTube IFrame Player wrapper with clock interpolation,
 * rate snapping with hysteresis, and error codes resilience.
 */
export class YouTubeSource {
  constructor(container, youtubeId, options = {}) {
    this.container = container;
    this.youtubeId = youtubeId;
    this.startAt = options.startAt || 0;
    this.player = null;
    this.isReady = false;
    this.onStateCb = null;
    this.onErrorCb = null;

    // Discrete rate snapping & hysteresis
    this.availableRates = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
    this.currentRate = 1.0;
    this.requestedRate = 1.0;
    this.rateHysteresisThreshold = 0.12;

    // High precision interpolated clock: (videoTime, performance.now())
    this.lastSampleVideoTime = 0;
    this.lastSamplePerfTime = performance.now();
    this.currentState = 'UNSTARTED';
    this.buffering = false;
    this.pollInterval = null;

    this.initPlayer();
  }

  initPlayer() {
    const playerDiv = document.createElement('div');
    playerDiv.id = 'yt-player-iframe-' + Math.floor(Math.random() * 100000);
    playerDiv.className = 'w-full h-full';
    this.container.innerHTML = '';
    this.container.appendChild(playerDiv);

    const onYouTubeReady = () => {
      try {
        this.player = new window.YT.Player(playerDiv.id, {
          videoId: this.youtubeId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            enablejsapi: 1,
            origin: window.location.origin,
            start: Math.floor(this.startAt)
          },
          events: {
            onReady: (event) => {
              this.isReady = true;
              try {
                this.availableRates = this.player.getAvailablePlaybackRates() || this.availableRates;
                this.player.mute(); // Muted autoplay compliance
              } catch (e) {}
              if (this.onStateCb) this.onStateCb('READY');
            },
            onStateChange: (event) => {
              this.handleStateChange(event.data);
            },
            onPlaybackRateChange: (event) => {
              this.currentRate = event.data;
              this.resyncClock();
            },
            onError: (event) => {
              this.handleError(event.data);
            }
          }
        });
      } catch (err) {
        console.error('[YouTubeSource] Error instantiating YT.Player:', err);
        if (this.onErrorCb) this.onErrorCb(999, 'Failed to initialize YouTube Player.');
      }
    };

    if (window.YT && window.YT.Player) {
      onYouTubeReady();
    } else {
      // Wait for YT script or global callback
      const existingCb = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof existingCb === 'function') existingCb();
        onYouTubeReady();
      };
    }

    // Start coarse resync loop
    this.pollInterval = setInterval(() => {
      this.checkClockDrift();
    }, 100);
  }

  handleStateChange(stateCode) {
    // YT.PlayerState: -1 (UNSTARTED), 0 (ENDED), 1 (PLAYING), 2 (PAUSED), 3 (BUFFERING), 5 (CUED)
    if (stateCode === 1) { // PLAYING
      this.currentState = 'PLAYING';
      this.buffering = false;
      this.resyncClock();
      if (this.onStateCb) this.onStateCb('PLAYING');
    } else if (stateCode === 2) { // PAUSED
      this.currentState = 'PAUSED';
      this.buffering = false;
      this.resyncClock();
      if (this.onStateCb) this.onStateCb('PAUSED');
    } else if (stateCode === 3) { // BUFFERING
      this.currentState = 'BUFFERING';
      this.buffering = true;
      if (this.onStateCb) this.onStateCb('BUFFERING');
    } else if (stateCode === 0) { // ENDED
      this.currentState = 'ENDED';
      this.buffering = false;
      if (this.onStateCb) this.onStateCb('ENDED');
    } else {
      this.buffering = false;
    }
  }

  handleError(code) {
    let msg = 'YouTube Player encountered an error.';
    if (code === 2) {
      msg = 'Invalid video ID parameter.';
    } else if (code === 100) {
      msg = 'Video not found or marked private.';
    } else if (code === 101 || code === 150) {
      msg = 'Video owner does not allow embedded playback outside YouTube. Try another video link or use Placeholder.';
    }
    if (this.onErrorCb) {
      this.onErrorCb(code, msg);
    }
  }

  // Resync our high-resolution clock from YouTube sample
  resyncClock() {
    if (!this.player || !this.isReady) return;
    try {
      const ytTime = this.player.getCurrentTime() || 0;
      this.lastSampleVideoTime = ytTime;
      this.lastSamplePerfTime = performance.now();
    } catch (e) {}
  }

  // Resync if drift exceeds 0.25 seconds
  checkClockDrift() {
    if (this.currentState !== 'PLAYING' || !this.player || !this.isReady) return;
    try {
      const ytTime = this.player.getCurrentTime();
      if (typeof ytTime === 'number') {
        const estimated = this.getTime();
        const drift = Math.abs(ytTime - estimated);
        if (drift > 0.25) {
          this.lastSampleVideoTime = ytTime;
          this.lastSamplePerfTime = performance.now();
        }
      }
    } catch (e) {}
  }

  play() {
    if (!this.player || !this.isReady) return;
    try {
      this.player.unMute();
      this.player.playVideo();
    } catch (e) {
      console.warn('[YouTubeSource] playVideo error:', e);
    }
  }

  pause() {
    if (!this.player || !this.isReady) return;
    try {
      this.player.pauseVideo();
    } catch (e) {
      console.warn('[YouTubeSource] pauseVideo error:', e);
    }
  }

  seek(seconds) {
    if (!this.player || !this.isReady) return;
    try {
      this.player.seekTo(seconds, true);
      this.lastSampleVideoTime = seconds;
      this.lastSamplePerfTime = performance.now();
    } catch (e) {
      console.warn('[YouTubeSource] seekTo error:', e);
    }
  }

  // Rate snapping with hysteresis
  setRate(targetRate) {
    if (!this.player || !this.isReady) return;
    this.requestedRate = targetRate;

    // Find nearest supported playback rate
    let nearest = this.availableRates[0];
    let minDiff = Math.abs(targetRate - nearest);
    for (let i = 1; i < this.availableRates.length; i++) {
      const diff = Math.abs(targetRate - this.availableRates[i]);
      if (diff < minDiff) {
        minDiff = diff;
        nearest = this.availableRates[i];
      }
    }

    // Apply hysteresis check against current rate
    if (Math.abs(nearest - this.currentRate) >= this.rateHysteresisThreshold) {
      try {
        this.currentRate = nearest;
        this.player.setPlaybackRate(nearest);
        this.resyncClock();
      } catch (e) {
        console.warn('[YouTubeSource] setPlaybackRate error:', e);
      }
    }
  }

  // High-precision clock query (replaces coarse getCurrentTime)
  getTime() {
    if (this.currentState !== 'PLAYING') {
      return this.lastSampleVideoTime;
    }
    const elapsed = (performance.now() - this.lastSamplePerfTime) / 1000;
    return this.lastSampleVideoTime + elapsed * this.currentRate;
  }

  getDuration() {
    if (!this.player || !this.isReady) return 0;
    try {
      return this.player.getDuration() || 0;
    } catch (e) {
      return 0;
    }
  }

  isBuffering() {
    return this.buffering;
  }

  onState(cb) {
    this.onStateCb = cb;
  }

  onError(cb) {
    this.onErrorCb = cb;
  }

  destroy() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    if (this.player && typeof this.player.destroy === 'function') {
      try {
        this.player.destroy();
      } catch (e) {}
    }
    this.container.innerHTML = '';
  }
}

/**
 * Factory to instantiate suitable VideoSource
 */
export function createVideoSource(container, options = {}) {
  const { youtubeId, src, duration, startAt } = options;

  if (youtubeId) {
    return new YouTubeSource(container, youtubeId, { startAt });
  } else if (src && src.endsWith('.mp4')) {
    return new HtmlVideoSource(container, src, { startAt });
  } else {
    // Default to high-performance procedural animated placeholder
    return new PlaceholderSource(container, { duration: duration || 600, startAt });
  }
}

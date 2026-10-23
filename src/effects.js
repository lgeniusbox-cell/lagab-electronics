/**
 * effects.js
 * GPU-accelerated visual effects engine (Canvas 2D + Hardware-accelerated DOM layer).
 * Renders flashes, screen shake, vignettes, zoom pulses, floating/pop text,
 * particle cascades (burst, sparkle, confetti, coins), rings, lane highlights, shockwaves,
 * and JSON-defined primitive shapes at 60 fps.
 */

export class EffectsManagerClass {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.overlayDom = null;
    this.particlesList = [];
    this.floatingTexts = [];
    this.customRings = [];
    this.shockwaves = [];
    this.primitives = [];
    this.rafId = null;
    this.shakeRemainingMs = 0;
    this.shakeIntensity = 0;
    this.laneGlows = { '-1': 0, '0': 0, '1': 0 }; // Left, Center, Right glow opacity
    this.lastFrameTime = performance.now();
  }

  init(container) {
    this.destroy();

    // DOM Container for hardware-composited full-screen filters
    this.overlayDom = document.createElement('div');
    this.overlayDom.id = 'effects-dom-overlay';
    this.overlayDom.className = 'absolute inset-0 pointer-events-none z-30 overflow-hidden';
    container.appendChild(this.overlayDom);

    // 2D Canvas for high-performance particles and geometric rings
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'effects-canvas-overlay';
    this.canvas.className = 'absolute inset-0 pointer-events-none z-20 w-full h-full';
    this.ctx = this.canvas.getContext('2d');
    container.appendChild(this.canvas);

    this.resize();
    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);

    this.startLoop();
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = this.canvas.clientWidth || window.innerWidth;
    this.canvas.height = this.canvas.clientHeight || window.innerHeight;
  }

  startLoop() {
    this.lastFrameTime = performance.now();
    const render = () => {
      const now = performance.now();
      const dt = (now - this.lastFrameTime) / 1000;
      this.lastFrameTime = now;

      this.update(dt);
      this.draw();

      this.rafId = requestAnimationFrame(render);
    };
    this.rafId = requestAnimationFrame(render);
  }

  // --- PRESET EFFECTS (CALLABLE BY NAME FROM SCRIPT.JSON) ---

  // Fullscreen flash
  flash(color = 'rgba(255, 255, 255, 0.75)', durationMs = 250) {
    if (!this.overlayDom) return;
    const el = document.createElement('div');
    el.className = 'absolute inset-0 transition-opacity pointer-events-none';
    el.style.backgroundColor = color;
    el.style.opacity = '1';
    el.style.transitionDuration = `${durationMs}ms`;
    this.overlayDom.appendChild(el);

    requestAnimationFrame(() => {
      el.style.opacity = '0';
    });
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, durationMs + 50);
  }

  // Camera camera screen shake
  screenShake(intensity = 12, durationMs = 300) {
    this.shakeIntensity = intensity;
    this.shakeRemainingMs = durationMs;
  }

  // Perimeter vignette
  vignette(color = 'rgba(239, 68, 68, 0.45)', intensity = 0.5, durationMs = 600) {
    if (!this.overlayDom) return;
    const el = document.createElement('div');
    el.className = 'absolute inset-0 transition-opacity pointer-events-none';
    el.style.boxShadow = `inset 0 0 120px 40px ${color}`;
    el.style.opacity = '1';
    el.style.transitionDuration = `${durationMs}ms`;
    this.overlayDom.appendChild(el);

    setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, durationMs);
    }, 150);
  }

  // Color tint overlay
  colorTint(color = 'rgba(56, 189, 248, 0.25)', durationMs = 400) {
    this.flash(color, durationMs);
  }

  // Quick camera zoom pulse
  zoomPulse(scale = 1.04, durationMs = 250) {
    const root = document.getElementById('activity-viewport') || document.body;
    root.style.transition = `transform ${durationMs / 2}ms cubic-bezier(0.16, 1, 0.3, 1)`;
    root.style.transform = `scale(${scale})`;
    setTimeout(() => {
      root.style.transform = 'scale(1)';
    }, durationMs / 2);
  }

  // Glowing boundary pulse
  borderGlow(color = '#38bdf8', pulseCount = 2) {
    if (!this.overlayDom) return;
    const border = document.createElement('div');
    border.className = 'absolute inset-0 border-4 pointer-events-none transition-opacity duration-300';
    border.style.borderColor = color;
    border.style.boxShadow = `0 0 25px ${color}, inset 0 0 25px ${color}`;
    this.overlayDom.appendChild(border);

    let count = 0;
    const interval = setInterval(() => {
      count++;
      border.style.opacity = count % 2 === 0 ? '1' : '0.2';
      if (count >= pulseCount * 2) {
        clearInterval(interval);
        border.style.opacity = '0';
        setTimeout(() => {
          if (border.parentNode) border.parentNode.removeChild(border);
        }, 300);
      }
    }, 140);
  }

  // Floating score or hint text
  floatingText(text, x, y, color = '#f8fafc', size = 32, durationMs = 900) {
    const posX = x !== undefined ? x : (this.canvas ? this.canvas.width / 2 : window.innerWidth / 2);
    const posY = y !== undefined ? y : (this.canvas ? this.canvas.height / 2 : window.innerHeight / 2);
    this.floatingTexts.push({
      text,
      x: posX,
      y: posY,
      vy: -70, // Float upward
      color,
      size,
      alpha: 1.0,
      life: durationMs / 1000,
      totalLife: durationMs / 1000
    });
  }

  // Big pop action text (PERFECT, GOOD, MISS)
  popText(text, color = '#22c55e', subtext = '') {
    if (!this.overlayDom) return;
    const el = document.createElement('div');
    el.className = 'absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-40';
    el.innerHTML = `
      <div class="transform scale-50 opacity-0 transition-all duration-200 ease-out text-center drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]" style="transform: scale(0.6);">
        <div class="text-5xl md:text-7xl font-black italic tracking-wider uppercase" style="color: ${color}; text-shadow: 0 0 30px ${color};">
          ${text}
        </div>
        ${subtext ? `<div class="text-xl md:text-2xl font-bold tracking-widest text-white mt-1 opacity-90">${subtext}</div>` : ''}
      </div>
    `;
    this.overlayDom.appendChild(el);

    const inner = el.firstElementChild;
    requestAnimationFrame(() => {
      inner.style.transform = 'scale(1.15)';
      inner.style.opacity = '1';
      setTimeout(() => {
        inner.style.transform = 'scale(1.0) translateY(-20px)';
        inner.style.opacity = '0';
      }, 350);
    });

    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 700);
  }

  // Particle explosion (burst, sparkle, confetti, coins)
  particles(type = 'burst', x, y, count = 30) {
    if (!this.canvas) return;
    const originX = x !== undefined ? x : this.canvas.width / 2;
    const originY = y !== undefined ? y : this.canvas.height / 2;

    const colors = type === 'coins' ? ['#f59e0b', '#fbbf24', '#fef08a'] :
                   type === 'confetti' ? ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#a855f7'] :
                   type === 'sparkle' ? ['#38bdf8', '#e0f2fe', '#bae6fd'] :
                   ['#38bdf8', '#f8fafc', '#818cf8'];

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = Math.random() * 260 + 80;
      this.particlesList.push({
        type,
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (type === 'coins' ? 120 : 0),
        gravity: type === 'confetti' || type === 'coins' ? 320 : 120,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: type === 'coins' ? 8 : (Math.random() * 5 + 3),
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 8,
        alpha: 1.0,
        life: Math.random() * 0.6 + 0.6,
        totalLife: 1.0
      });
    }
  }

  // Shockwave expanding ring
  shockwave(x, y, color = '#38bdf8') {
    if (!this.canvas) return;
    const originX = x !== undefined ? x : this.canvas.width / 2;
    const originY = y !== undefined ? y : this.canvas.height / 2;
    this.shockwaves.push({
      x: originX,
      y: originY,
      radius: 10,
      maxRadius: Math.max(this.canvas.width, this.canvas.height) * 0.45,
      color,
      alpha: 1.0,
      life: 0.55
    });
  }

  // Concentric warning / timing ring
  ring(x, y, radius = 70, color = '#eab308', durationMs = 1200) {
    if (!this.canvas) return;
    const originX = x !== undefined ? x : this.canvas.width / 2;
    const originY = y !== undefined ? y : this.canvas.height / 2;
    this.customRings.push({
      x: originX,
      y: originY,
      initialRadius: radius * 2.2,
      targetRadius: radius,
      color,
      progress: 0,
      duration: durationMs / 1000
    });
  }

  // Lane vertical highway highlight (-1: Left, 0: Center, 1: Right)
  laneHighlight(lane = 0, color = 'rgba(56, 189, 248, 0.4)', durationMs = 350) {
    this.laneGlows[String(lane)] = 1.0;
  }

  // JSON-defined geometric primitive overlay
  addPrimitive(primitive) {
    this.primitives.push({
      ...primitive,
      elapsed: 0
    });
  }

  // --- ENGINE UPDATE & RENDER LOOP ---

  update(dt) {
    // 1. Screen Shake Decay
    if (this.shakeRemainingMs > 0) {
      this.shakeRemainingMs -= dt * 1000;
      const root = document.getElementById('activity-viewport') || document.body;
      if (this.shakeRemainingMs > 0) {
        const dx = (Math.random() - 0.5) * this.shakeIntensity;
        const dy = (Math.random() - 0.5) * this.shakeIntensity;
        root.style.transform = `translate(${dx}px, ${dy}px)`;
      } else {
        root.style.transform = 'translate(0px, 0px)';
      }
    }

    // 2. Lane glow decay
    for (const key of ['-1', '0', '1']) {
      if (this.laneGlows[key] > 0) {
        this.laneGlows[key] = Math.max(0, this.laneGlows[key] - dt * 3.5);
      }
    }

    // 3. Floating Texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const item = this.floatingTexts[i];
      item.y += item.vy * dt;
      item.life -= dt;
      item.alpha = Math.max(0, item.life / item.totalLife);
      if (item.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // 4. Particles
    for (let i = this.particlesList.length - 1; i >= 0; i--) {
      const p = this.particlesList[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.rotation += p.vRot * dt;
      p.life -= dt;
      p.alpha = Math.max(0, p.life / p.totalLife);
      if (p.life <= 0) {
        this.particlesList.splice(i, 1);
      }
    }

    // 5. Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.radius += (s.maxRadius - s.radius) * dt * 5.0;
      s.life -= dt;
      s.alpha = Math.max(0, s.life / 0.55);
      if (s.life <= 0) {
        this.shockwaves.splice(i, 1);
      }
    }

    // 6. Rings
    for (let i = this.customRings.length - 1; i >= 0; i--) {
      const r = this.customRings[i];
      r.progress += dt / r.duration;
      if (r.progress >= 1.0) {
        this.customRings.splice(i, 1);
      }
    }

    // 7. Primitives
    for (let i = this.primitives.length - 1; i >= 0; i--) {
      const prim = this.primitives[i];
      prim.elapsed += dt;
      if (prim.duration && prim.elapsed >= prim.duration) {
        this.primitives.splice(i, 1);
      }
    }
  }

  draw() {
    if (!this.ctx || !this.canvas) return;
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    // 1. Draw Lane Glows (highway 3-lane visualization overlay)
    const laneWidth = width / 3;
    const laneCoords = { '-1': 0, '0': laneWidth, '1': laneWidth * 2 };
    for (const key of ['-1', '0', '1']) {
      const alpha = this.laneGlows[key];
      if (alpha > 0.01) {
        const lx = laneCoords[key];
        const grad = this.ctx.createLinearGradient(0, height, 0, height * 0.4);
        grad.addColorStop(0, `rgba(56, 189, 248, ${alpha * 0.4})`);
        grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(lx, height * 0.4, laneWidth, height * 0.6);
      }
    }

    // 2. Draw Shockwaves
    for (const s of this.shockwaves) {
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = s.color;
      this.ctx.lineWidth = 4 * s.alpha;
      this.ctx.globalAlpha = s.alpha;
      this.ctx.stroke();
      this.ctx.restore();
    }

    // 3. Draw Countdown Rings
    for (const r of this.customRings) {
      this.ctx.save();
      const curRadius = r.initialRadius - (r.initialRadius - r.targetRadius) * r.progress;
      this.ctx.beginPath();
      this.ctx.arc(r.x, r.y, curRadius, 0, Math.PI * 2);
      this.ctx.strokeStyle = r.color;
      this.ctx.lineWidth = 3.5;
      this.ctx.globalAlpha = 1.0 - r.progress * 0.3;
      this.ctx.stroke();
      this.ctx.restore();
    }

    // 4. Draw Particles
    for (const p of this.particlesList) {
      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation);

      if (p.type === 'coins') {
        this.ctx.beginPath();
        this.ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = '#d97706';
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();
      } else if (p.type === 'confetti') {
        this.ctx.fillRect(-p.size / 2, -p.size, p.size, p.size * 2);
      } else {
        this.ctx.beginPath();
        this.ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.restore();
    }

    // 5. Draw Floating Texts
    for (const t of this.floatingTexts) {
      this.ctx.save();
      this.ctx.globalAlpha = t.alpha;
      this.ctx.fillStyle = t.color;
      this.ctx.font = `bold ${t.size}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      this.ctx.shadowBlur = 8;
      this.ctx.fillText(t.text, t.x, t.y);
      this.ctx.restore();
    }

    // 6. Draw Primitives
    for (const prim of this.primitives) {
      this.drawPrimitive(prim);
    }
  }

  drawPrimitive(prim) {
    this.ctx.save();
    this.ctx.fillStyle = prim.fill || 'transparent';
    this.ctx.strokeStyle = prim.stroke || 'transparent';
    this.ctx.lineWidth = prim.lineWidth || 2;
    this.ctx.globalAlpha = prim.opacity !== undefined ? prim.opacity : 1.0;

    const x = prim.x || 0;
    const y = prim.y || 0;

    if (prim.type === 'rect') {
      this.ctx.fillRect(x, y, prim.width || 50, prim.height || 50);
      if (prim.stroke) this.ctx.strokeRect(x, y, prim.width || 50, prim.height || 50);
    } else if (prim.type === 'circle') {
      this.ctx.beginPath();
      this.ctx.arc(x, y, prim.radius || 30, 0, Math.PI * 2);
      if (prim.fill) this.ctx.fill();
      if (prim.stroke) this.ctx.stroke();
    } else if (prim.type === 'arrow') {
      const size = prim.size || 40;
      this.ctx.beginPath();
      this.ctx.moveTo(x, y - size);
      this.ctx.lineTo(x + size, y + size);
      this.ctx.lineTo(x, y + size * 0.6);
      this.ctx.lineTo(x - size, y + size);
      this.ctx.closePath();
      if (prim.fill) this.ctx.fill();
      if (prim.stroke) this.ctx.stroke();
    }
    this.ctx.restore();
  }

  destroy() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this._onResize) {
      window.removeEventListener('resize', this._onResize);
    }
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    if (this.overlayDom && this.overlayDom.parentNode) {
      this.overlayDom.parentNode.removeChild(this.overlayDom);
    }
    this.particlesList = [];
    this.floatingTexts = [];
    this.customRings = [];
    this.shockwaves = [];
    this.primitives = [];
  }
}

export const EffectsManager = new EffectsManagerClass();

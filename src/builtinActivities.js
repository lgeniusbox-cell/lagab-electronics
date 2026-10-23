/**
 * builtinActivities.js
 * In-memory built-in activities for offline, GitHub Pages, and zero-fetch instant execution.
 * Provides a rich multi-activity selection for GAME, WALK, and CARDIO categories.
 */

export const BUILTIN_ACTIVITIES = {
  // ===================== GAMES =====================

  'game-cyber-runner': {
    "type": "game",
    "meta": {
      "id": "game-cyber-runner",
      "icon": "⚡",
      "badge": "Rhythm Gates",
      "title": {
        "en": "Neon Beat Runner",
        "fr": "Course Rythmique Néon",
        "ar": "عدّاء الإيقاع النيوني"
      },
      "description": {
        "en": "Hit musical gates, leap hurdles, and duck under energy beams with precision mat timing.",
        "fr": "Franchissez des portes musicales, sautez des haies et esquivez les lasers en rythme.",
        "ar": "اعبر بوابات النغمات الموسيقية، واقفز فوق الحواجز، وانحنِ تحت أشعة الطاقة بدقة وتوقيت مثالي."
      },
      "duration": 90,
      "difficulty": "medium",
      "version": "1.0.0"
    },
    "video": {
      "youtubeId": "",
      "src": "",
      "startAt": 0,
      "endAt": 90
    },
    "rules": {
      "lives": 3,
      "comboMultipliers": [1, 2, 3, 5],
      "starsThresholds": [800, 1600, 2400],
      "intensityMapping": {
        "minRate": 0.75,
        "maxRate": 1.5,
        "steps": [0.75, 1.0, 1.25, 1.5]
      }
    },
    "effects": {
      "laserWarning": { "type": "flash", "color": "rgba(239, 68, 68, 0.4)", "duration": 250 },
      "starBurst": { "type": "particles", "particleType": "sparkle", "count": 25 }
    },
    "timeline": [
      { "t": 1.0, "type": "section", "name": "Phase 1: Warm-up Rhythm" },
      { "t": 2.5, "type": "overlay", "text": "READY... STEP IN TIME!", "duration": 2.5, "position": "center", "color": "#38bdf8", "animation": "pop" },
      { "t": 5.0, "type": "sound", "preset": "countdown" },
      { "t": 7.0, "type": "action", "expect": "JUMP", "windowMs": 350, "perfectWindowMs": 150, "warnBeforeMs": 1800, "points": 100, "onSuccess": { "effect": "flash", "sound": "jump" }, "onPerfect": { "effect": "zoomPulse", "sound": "perfect" }, "onFail": { "effect": "screenShake", "sound": "hit", "loseLife": 1 } },
      { "t": 11.5, "type": "action", "expect": "SLIDE", "windowMs": 350, "perfectWindowMs": 150, "warnBeforeMs": 1800, "points": 100, "onSuccess": { "effect": "borderGlow", "sound": "slide" }, "onPerfect": { "effect": "particles", "sound": "perfect" }, "onFail": { "effect": "screenShake", "sound": "hit", "loseLife": 1 } },
      { "t": 15.0, "type": "checkpoint", "id": "cp1", "name": "Checkpoint Alpha" },
      { "t": 16.5, "type": "action", "expect": "LEFT", "windowMs": 350, "perfectWindowMs": 150, "warnBeforeMs": 1500, "points": 100, "onSuccess": { "effect": "laneHighlight", "lane": -1, "sound": "good" }, "onPerfect": { "effect": "shockwave", "sound": "perfect" }, "onFail": { "effect": "screenShake", "sound": "hit", "loseLife": 1 } },
      { "t": 20.0, "type": "action", "expect": "RIGHT", "windowMs": 350, "perfectWindowMs": 150, "warnBeforeMs": 1500, "points": 100, "onSuccess": { "effect": "laneHighlight", "lane": 1, "sound": "good" }, "onPerfect": { "effect": "shockwave", "sound": "perfect" }, "onFail": { "effect": "screenShake", "sound": "hit", "loseLife": 1 } },
      { "t": 23.5, "type": "action", "expect": "CENTER", "windowMs": 350, "perfectWindowMs": 150, "warnBeforeMs": 1400, "points": 100, "onSuccess": { "effect": "laneHighlight", "lane": 0, "sound": "good" }, "onPerfect": { "effect": "zoomPulse", "sound": "perfect" }, "onFail": { "effect": "screenShake", "sound": "hit", "loseLife": 1 } },
      { "t": 26.0, "type": "effect", "name": "laserWarning" },
      { "t": 27.0, "type": "video", "action": "setRate", "rate": 1.25 },
      { "t": 28.5, "type": "action", "expect": "STEP_LEFT", "windowMs": 350, "perfectWindowMs": 150, "warnBeforeMs": 1200, "points": 80, "onSuccess": { "effect": "floatingText", "text": "LEFT FOOT!", "sound": "good" }, "onPerfect": { "sound": "perfect" }, "onFail": { "sound": "hit", "loseLife": 1 } },
      { "t": 31.0, "type": "action", "expect": "STEP_RIGHT", "windowMs": 350, "perfectWindowMs": 150, "warnBeforeMs": 1200, "points": 80, "onSuccess": { "effect": "floatingText", "text": "RIGHT FOOT!", "sound": "good" }, "onPerfect": { "sound": "perfect" }, "onFail": { "sound": "hit", "loseLife": 1 } },
      { "t": 34.0, "type": "overlay", "shape": "circle", "duration": 2.0, "position": "center", "color": "rgba(234, 179, 8, 0.3)", "animation": "pulse" },
      { "t": 36.0, "type": "action", "expect": "ANY", "windowMs": 400, "perfectWindowMs": 180, "warnBeforeMs": 1500, "points": 150, "onSuccess": { "effect": "starBurst", "sound": "coin" }, "onPerfect": { "sound": "perfect" }, "onFail": { "sound": "hit", "loseLife": 1 } },
      { "t": 40.0, "type": "video", "action": "pause", "duration": 1.5 },
      { "t": 40.1, "type": "overlay", "text": "TIME FREEZE! REPAIRING ENERGY GRID...", "duration": 1.4, "position": "top", "color": "#a855f7", "animation": "fade" },
      { "t": 43.0, "type": "section", "name": "Phase 2: High Velocity Rush" },
      { "t": 45.0, "type": "action", "expect": "JUMP", "windowMs": 320, "perfectWindowMs": 140, "warnBeforeMs": 1400, "points": 120, "onSuccess": { "effect": "flash", "sound": "jump" }, "onPerfect": { "effect": "zoomPulse", "sound": "perfect" }, "onFail": { "effect": "screenShake", "sound": "hit", "loseLife": 1 } },
      { "t": 50.0, "type": "action", "expect": "SLIDE", "windowMs": 320, "perfectWindowMs": 140, "warnBeforeMs": 1300, "points": 120, "onSuccess": { "effect": "borderGlow", "sound": "slide" }, "onPerfect": { "effect": "particles", "sound": "perfect" }, "onFail": { "effect": "screenShake", "sound": "hit", "loseLife": 1 } },
      { "t": 55.0, "type": "action", "expect": "LEFT", "windowMs": 300, "perfectWindowMs": 130, "warnBeforeMs": 1200, "points": 100, "onSuccess": { "sound": "good" }, "onFail": { "sound": "hit", "loseLife": 1 } },
      { "t": 58.0, "type": "action", "expect": "RIGHT", "windowMs": 300, "perfectWindowMs": 130, "warnBeforeMs": 1200, "points": 100, "onSuccess": { "sound": "good" }, "onFail": { "sound": "hit", "loseLife": 1 } },
      { "t": 62.0, "type": "sound", "preset": "levelUp" },
      { "t": 63.0, "type": "overlay", "text": "FINAL SPRINT!", "duration": 2.5, "position": "center", "color": "#22c55e", "animation": "pop" },
      { "t": 66.0, "type": "action", "expect": "JUMP", "windowMs": 300, "perfectWindowMs": 120, "warnBeforeMs": 1100, "points": 150, "onSuccess": { "sound": "jump" }, "onFail": { "sound": "hit", "loseLife": 1 } },
      { "t": 70.0, "type": "action", "expect": "SLIDE", "windowMs": 300, "perfectWindowMs": 120, "warnBeforeMs": 1100, "points": 150, "onSuccess": { "sound": "slide" }, "onFail": { "sound": "hit", "loseLife": 1 } },
      { "t": 75.0, "type": "action", "expect": "CENTER", "windowMs": 320, "perfectWindowMs": 140, "warnBeforeMs": 1200, "points": 120, "onSuccess": { "sound": "good" } },
      { "t": 82.0, "type": "action", "expect": "JUMP", "windowMs": 350, "perfectWindowMs": 150, "warnBeforeMs": 1500, "points": 200, "onSuccess": { "effect": "starBurst", "sound": "win" } }
    ],
    "sections": [
      { "name": "Warm-up Rhythm", "start": 0, "end": 42 },
      { "name": "High Velocity Rush", "start": 43, "end": 90 }
    ],
    "endings": { "victorySound": "win", "defeatSound": "lose" }
  },

  'game-beat-sync': {
    "type": "game",
    "meta": {
      "id": "game-beat-sync",
      "icon": "🎵",
      "badge": "Techno 130 BPM",
      "title": {
        "en": "Beat Sync: Rhythm Arena",
        "fr": "Beat Sync : Arène Rythmique",
        "ar": "تزامن الإيقاع: حلبة النغمات"
      },
      "description": {
        "en": "Fast-paced floor mat rhythm trainer! Synchronize rapid lane switches, high jumps, and duck slides.",
        "fr": "Entraînement rythmique effréné ! Enchaînez changements de couloir, sauts et glissades.",
        "ar": "مدرب الإيقاع السريع على السجادة! تزامن مع تبديل المسارات السريع والقفزات العالية والانزلاقات."
      },
      "duration": 60,
      "difficulty": "hard",
      "version": "1.0.0"
    },
    "video": { "youtubeId": "", "src": "", "startAt": 0, "endAt": 60 },
    "rules": {
      "lives": 4,
      "comboMultipliers": [1, 2, 4, 8],
      "starsThresholds": [900, 1800, 2800],
      "intensityMapping": { "minRate": 1.0, "maxRate": 1.5, "steps": [1.0, 1.25, 1.5] }
    },
    "effects": {},
    "timeline": [
      { "t": 1.0, "type": "overlay", "text": "BEAT SYNC: TECHNO ARENA", "duration": 2.0, "position": "center", "color": "#a855f7", "animation": "pop" },
      { "t": 3.0, "type": "sound", "preset": "countdown" },
      { "t": 5.0, "type": "action", "expect": "CENTER", "windowMs": 300, "perfectWindowMs": 120, "warnBeforeMs": 1500, "points": 100, "onSuccess": { "sound": "good" } },
      { "t": 8.0, "type": "action", "expect": "LEFT", "windowMs": 300, "perfectWindowMs": 120, "warnBeforeMs": 1400, "points": 100, "onSuccess": { "sound": "good" } },
      { "t": 11.0, "type": "action", "expect": "RIGHT", "windowMs": 300, "perfectWindowMs": 120, "warnBeforeMs": 1400, "points": 100, "onSuccess": { "sound": "good" } },
      { "t": 14.0, "type": "action", "expect": "CENTER", "windowMs": 300, "perfectWindowMs": 120, "warnBeforeMs": 1300, "points": 100, "onSuccess": { "sound": "good" } },
      { "t": 17.0, "type": "action", "expect": "JUMP", "windowMs": 280, "perfectWindowMs": 110, "warnBeforeMs": 1300, "points": 150, "onSuccess": { "effect": "flash", "sound": "jump" } },
      { "t": 20.5, "type": "action", "expect": "SLIDE", "windowMs": 280, "perfectWindowMs": 110, "warnBeforeMs": 1300, "points": 150, "onSuccess": { "effect": "borderGlow", "sound": "slide" } },
      { "t": 24.0, "type": "action", "expect": "LEFT", "windowMs": 260, "perfectWindowMs": 100, "warnBeforeMs": 1200, "points": 120, "onSuccess": { "sound": "good" } },
      { "t": 26.5, "type": "action", "expect": "JUMP", "windowMs": 260, "perfectWindowMs": 100, "warnBeforeMs": 1200, "points": 150, "onSuccess": { "sound": "jump" } },
      { "t": 29.0, "type": "action", "expect": "RIGHT", "windowMs": 260, "perfectWindowMs": 100, "warnBeforeMs": 1200, "points": 120, "onSuccess": { "sound": "good" } },
      { "t": 31.5, "type": "action", "expect": "SLIDE", "windowMs": 260, "perfectWindowMs": 100, "warnBeforeMs": 1200, "points": 150, "onSuccess": { "sound": "slide" } },
      { "t": 35.0, "type": "checkpoint", "id": "cp_beat", "name": "Drop Checkpoint" },
      { "t": 37.0, "type": "overlay", "text": "DOUBLE COMBO DROP!", "duration": 2.0, "position": "center", "color": "#f59e0b", "animation": "shake" },
      { "t": 40.0, "type": "action", "expect": "JUMP", "windowMs": 250, "perfectWindowMs": 90, "warnBeforeMs": 1100, "points": 180, "onSuccess": { "sound": "jump" } },
      { "t": 43.0, "type": "action", "expect": "JUMP", "windowMs": 250, "perfectWindowMs": 90, "warnBeforeMs": 1000, "points": 180, "onSuccess": { "sound": "jump" } },
      { "t": 47.0, "type": "action", "expect": "SLIDE", "windowMs": 250, "perfectWindowMs": 90, "warnBeforeMs": 1000, "points": 180, "onSuccess": { "sound": "slide" } },
      { "t": 51.0, "type": "action", "expect": "LEFT", "windowMs": 250, "perfectWindowMs": 90, "warnBeforeMs": 1000, "points": 150, "onSuccess": { "sound": "good" } },
      { "t": 53.5, "type": "action", "expect": "RIGHT", "windowMs": 250, "perfectWindowMs": 90, "warnBeforeMs": 1000, "points": 150, "onSuccess": { "sound": "good" } },
      { "t": 57.0, "type": "action", "expect": "JUMP", "windowMs": 300, "perfectWindowMs": 120, "warnBeforeMs": 1200, "points": 250, "onSuccess": { "sound": "win" } }
    ],
    "sections": [{ "name": "Build Up", "start": 0, "end": 35 }, { "name": "The Drop", "start": 36, "end": 60 }],
    "endings": { "victorySound": "win", "defeatSound": "lose" }
  },

  'game-neon-velocity': {
    "type": "game",
    "meta": {
      "id": "game-neon-velocity",
      "icon": "🏎️",
      "badge": "Speed Modulated",
      "title": {
        "en": "Neon Velocity: Highway Run",
        "fr": "Neon Velocity : Course d'Autoroute",
        "ar": "السرعة النيونية: طريق المستقبل السريع"
      },
      "description": {
        "en": "Run fast on your mat! Foot intensity modulates speed from 0.75x to 1.5x while dodging hurdles and laser beams.",
        "fr": "Courez vite sur le tapis ! La cadence accélère la vitesse tout en esquivant lasers et barrières.",
        "ar": "اركض بسرعة على سجادتك! يرفع إيقاع خطواتك سرعة الحركة مع تفادي حواجز الليزر والعوائق."
      },
      "duration": 75,
      "difficulty": "medium",
      "version": "1.0.0"
    },
    "video": { "youtubeId": "", "src": "", "startAt": 0, "endAt": 75 },
    "rules": {
      "lives": 3,
      "comboMultipliers": [1, 2, 3, 5],
      "starsThresholds": [700, 1500, 2300],
      "intensityMapping": { "minRate": 0.75, "maxRate": 1.5, "steps": [0.75, 1.0, 1.25, 1.5] }
    },
    "effects": {},
    "timeline": [
      { "t": 1.0, "type": "overlay", "text": "IGNITION! ACCELERATE!", "duration": 2.0, "position": "center", "color": "#06b6d4", "animation": "pop" },
      { "t": 4.0, "type": "action", "expect": "CENTER", "windowMs": 350, "perfectWindowMs": 150, "warnBeforeMs": 1500, "points": 100, "onSuccess": { "sound": "good" } },
      { "t": 8.0, "type": "action", "expect": "LEFT", "windowMs": 350, "perfectWindowMs": 150, "warnBeforeMs": 1500, "points": 100, "onSuccess": { "sound": "good" } },
      { "t": 12.0, "type": "action", "expect": "JUMP", "windowMs": 320, "perfectWindowMs": 140, "warnBeforeMs": 1400, "points": 120, "onSuccess": { "sound": "jump" } },
      { "t": 16.5, "type": "action", "expect": "RIGHT", "windowMs": 320, "perfectWindowMs": 140, "warnBeforeMs": 1400, "points": 120, "onSuccess": { "sound": "good" } },
      { "t": 21.0, "type": "action", "expect": "SLIDE", "windowMs": 320, "perfectWindowMs": 140, "warnBeforeMs": 1400, "points": 120, "onSuccess": { "sound": "slide" } },
      { "t": 26.0, "type": "video", "action": "setRate", "rate": 1.25 },
      { "t": 27.0, "type": "overlay", "text": "HYPERSPEED ENGAGED!", "duration": 2.0, "position": "top", "color": "#38bdf8", "animation": "fade" },
      { "t": 30.0, "type": "action", "expect": "STEP_LEFT", "windowMs": 350, "perfectWindowMs": 150, "warnBeforeMs": 1200, "points": 90, "onSuccess": { "sound": "good" } },
      { "t": 33.0, "type": "action", "expect": "STEP_RIGHT", "windowMs": 350, "perfectWindowMs": 150, "warnBeforeMs": 1200, "points": 90, "onSuccess": { "sound": "good" } },
      { "t": 37.0, "type": "action", "expect": "JUMP", "windowMs": 300, "perfectWindowMs": 130, "warnBeforeMs": 1200, "points": 150, "onSuccess": { "sound": "jump" } },
      { "t": 42.0, "type": "action", "expect": "SLIDE", "windowMs": 300, "perfectWindowMs": 130, "warnBeforeMs": 1200, "points": 150, "onSuccess": { "sound": "slide" } },
      { "t": 48.0, "type": "action", "expect": "CENTER", "windowMs": 320, "perfectWindowMs": 130, "warnBeforeMs": 1300, "points": 100, "onSuccess": { "sound": "good" } },
      { "t": 54.0, "type": "action", "expect": "LEFT", "windowMs": 300, "perfectWindowMs": 120, "warnBeforeMs": 1200, "points": 120, "onSuccess": { "sound": "good" } },
      { "t": 60.0, "type": "action", "expect": "RIGHT", "windowMs": 300, "perfectWindowMs": 120, "warnBeforeMs": 1200, "points": 120, "onSuccess": { "sound": "good" } },
      { "t": 68.0, "type": "action", "expect": "JUMP", "windowMs": 320, "perfectWindowMs": 140, "warnBeforeMs": 1300, "points": 200, "onSuccess": { "sound": "win" } }
    ],
    "sections": [{ "name": "Cruise", "start": 0, "end": 26 }, { "name": "Hyperspeed", "start": 27, "end": 75 }],
    "endings": { "victorySound": "win", "defeatSound": "lose" }
  },

  'game-cyber-shinobi': {
    "type": "game",
    "meta": {
      "id": "game-cyber-shinobi",
      "icon": "🥷",
      "badge": "Family / Fun",
      "title": {
        "en": "Shinobi Path: Forest Trial",
        "fr": "Shinobi Path : L'Épreuve Sylvestre",
        "ar": "مسار النينجا: اختبار الغابة"
      },
      "description": {
        "en": "Kid-friendly ninja adventure! Jump over bamboo logs, crouch under swinging lanterns, and test quick reflexes.",
        "fr": "Aventure ninja idéale pour toute la famille ! Sautez par-dessus les bambous et baissez-vous sous les lanternes.",
        "ar": "مغامرة نينجا ممتعة لجميع أفراد العائلة! اقفز فوق جذوع الخيزران وانحنِ تحت الفوانيس المعلقة واختبر ردود أفعالك."
      },
      "duration": 60,
      "difficulty": "easy",
      "version": "1.0.0"
    },
    "video": { "youtubeId": "", "src": "", "startAt": 0, "endAt": 60 },
    "rules": {
      "lives": 5,
      "comboMultipliers": [1, 2, 3],
      "starsThresholds": [500, 1000, 1500],
      "intensityMapping": { "minRate": 0.8, "maxRate": 1.2, "steps": [0.8, 1.0, 1.2] }
    },
    "effects": {},
    "timeline": [
      { "t": 1.0, "type": "overlay", "text": "SHINOBI TRIAL BEGINS!", "duration": 2.5, "position": "center", "color": "#10b981", "animation": "pop" },
      { "t": 4.5, "type": "action", "expect": "CENTER", "windowMs": 400, "perfectWindowMs": 180, "warnBeforeMs": 1800, "points": 80, "onSuccess": { "sound": "good" } },
      { "t": 9.0, "type": "action", "expect": "JUMP", "windowMs": 380, "perfectWindowMs": 160, "warnBeforeMs": 1700, "points": 100, "onSuccess": { "sound": "jump" } },
      { "t": 14.0, "type": "action", "expect": "SLIDE", "windowMs": 380, "perfectWindowMs": 160, "warnBeforeMs": 1700, "points": 100, "onSuccess": { "sound": "slide" } },
      { "t": 19.0, "type": "action", "expect": "LEFT", "windowMs": 380, "perfectWindowMs": 160, "warnBeforeMs": 1600, "points": 80, "onSuccess": { "sound": "good" } },
      { "t": 23.5, "type": "action", "expect": "RIGHT", "windowMs": 380, "perfectWindowMs": 160, "warnBeforeMs": 1600, "points": 80, "onSuccess": { "sound": "good" } },
      { "t": 28.0, "type": "action", "expect": "CENTER", "windowMs": 380, "perfectWindowMs": 160, "warnBeforeMs": 1500, "points": 80, "onSuccess": { "sound": "good" } },
      { "t": 33.0, "type": "overlay", "text": "SHADOW LEAP!", "duration": 2.0, "position": "center", "color": "#34d399", "animation": "pulse" },
      { "t": 36.0, "type": "action", "expect": "JUMP", "windowMs": 360, "perfectWindowMs": 150, "warnBeforeMs": 1500, "points": 120, "onSuccess": { "sound": "jump" } },
      { "t": 41.0, "type": "action", "expect": "SLIDE", "windowMs": 360, "perfectWindowMs": 150, "warnBeforeMs": 1500, "points": 120, "onSuccess": { "sound": "slide" } },
      { "t": 46.5, "type": "action", "expect": "ANY", "windowMs": 450, "perfectWindowMs": 200, "warnBeforeMs": 1600, "points": 150, "onSuccess": { "sound": "coin" } },
      { "t": 53.0, "type": "action", "expect": "JUMP", "windowMs": 380, "perfectWindowMs": 160, "warnBeforeMs": 1600, "points": 200, "onSuccess": { "sound": "win" } }
    ],
    "sections": [{ "name": "Forest Trail", "start": 0, "end": 60 }],
    "endings": { "victorySound": "win", "defeatSound": "lose" }
  },

  // ===================== WALKS =====================

  'walk-alpine-trail': {
    "type": "walk",
    "meta": {
      "id": "walk-alpine-trail",
      "icon": "🏔️",
      "badge": "Mountain Panorama",
      "title": {
        "en": "Scenic Alpine Trail Walk",
        "fr": "Balade Alpine Panoramique",
        "ar": "المسار الألبي البانورامي"
      },
      "description": {
        "en": "A 10-minute virtual nature walk along mountain pines and glacial streams. Video playback rate syncs smoothly with your steps.",
        "fr": "Une promenade virtuelle de 10 minutes à travers les pins de montagne et les ruisseaux glaciaires. La vitesse vidéo s'adapte à vos pas.",
        "ar": "مسار طبيعي افتراضي لمدة 10 دقائق بين صنوبر الجبال وجداول المياه الجليدية. تتزامن سرعة الفيديو بسلاسة مع خطواتك."
      },
      "duration": 600,
      "difficulty": "easy",
      "version": "1.0.0"
    },
    "video": { "youtubeId": "", "src": "", "startAt": 0, "endAt": 600 },
    "rules": {
      "goalType": "steps",
      "goalValue": 1000,
      "referenceCadence": 100,
      "idleTimeoutMs": 3000,
      "idleResumeGraceMs": 1500,
      "cadenceRateMapping": [
        { "cadenceMin": 0, "cadenceMax": 40, "rate": 0.5 },
        { "cadenceMin": 41, "cadenceMax": 75, "rate": 0.75 },
        { "cadenceMin": 76, "cadenceMax": 105, "rate": 1.0 },
        { "cadenceMin": 106, "cadenceMax": 130, "rate": 1.25 },
        { "cadenceMin": 131, "cadenceMax": 155, "rate": 1.5 },
        { "cadenceMin": 156, "cadenceMax": 999, "rate": 1.75 }
      ],
      "milestones": [
        { "type": "steps", "value": 250, "message": "Quarter-way achieved! Keep that steady stride.", "effect": "flash" },
        { "type": "steps", "value": 500, "message": "Halfway milestone reached! 500 Steps!", "effect": "particles" },
        { "type": "steps", "value": 750, "message": "750 Steps! Almost at the summit overlook.", "effect": "borderGlow" },
        { "type": "steps", "value": 1000, "message": "Goal Achieved! Outstanding Alpine trek!", "effect": "zoomPulse" }
      ],
      "pointsOfInterest": [
        { "t": 15.0, "duration": 8.0, "title": "Glacial Stream Crossing", "description": "Clear meltwater flows down from the northern peaks, rich in pure alpine minerals.", "icon": "water" },
        { "t": 90.0, "duration": 8.0, "title": "Historic Timber Bridge", "description": "Built in 1912 by valley mountain guides connecting old high-altitude sheep pastures.", "icon": "bridge" },
        { "t": 210.0, "duration": 9.0, "title": "Ancient Swiss Pine Grove", "description": "Known as the King of the Alps, these hardy pines endure temperatures down to -40°C.", "icon": "tree" },
        { "t": 360.0, "duration": 9.0, "title": "Eagle Point Overlook", "description": "Elevation 2,150 m. On clear mornings you can spot Golden Eagles circling the thermals.", "icon": "mountain" },
        { "t": 510.0, "duration": 9.0, "title": "High Alpine Refuge", "description": "A welcome sanctuary serving hot tea and warm sourdough bread to weary travelers.", "icon": "home" }
      ]
    },
    "effects": {},
    "timeline": [],
    "endings": { "victorySound": "win" }
  },

  'walk-tokyo-night': {
    "type": "walk",
    "meta": {
      "id": "walk-tokyo-night",
      "icon": "🏮",
      "badge": "City Discovery",
      "title": {
        "en": "Tokyo Neon Night Walk",
        "fr": "Balade Nocturne à Tokyo",
        "ar": "مسار طوكيو الليلي المتلألئ"
      },
      "description": {
        "en": "An 8-minute journey across illuminated pedestrian crossings, retro arcade alleys, and serene shrines.",
        "fr": "Un parcours de 8 minutes entre passages piétons illuminés, ruelles rétro et sanctuaires paisibles.",
        "ar": "رحلة مشي لمدة 8 دقائق عبر ممرات المشاة المضاءة وأزقة ألعاب الأركيد الكلاسيكية والمعابد الهادئة."
      },
      "duration": 480,
      "difficulty": "easy",
      "version": "1.0.0"
    },
    "video": { "youtubeId": "", "src": "", "startAt": 0, "endAt": 480 },
    "rules": {
      "goalType": "steps",
      "goalValue": 800,
      "referenceCadence": 95,
      "idleTimeoutMs": 3000,
      "idleResumeGraceMs": 1500,
      "cadenceRateMapping": [
        { "cadenceMin": 0, "cadenceMax": 40, "rate": 0.5 },
        { "cadenceMin": 41, "cadenceMax": 75, "rate": 0.75 },
        { "cadenceMin": 76, "cadenceMax": 105, "rate": 1.0 },
        { "cadenceMin": 106, "cadenceMax": 130, "rate": 1.25 },
        { "cadenceMin": 131, "cadenceMax": 999, "rate": 1.5 }
      ],
      "milestones": [
        { "type": "steps", "value": 200, "message": "Entering the neon avenue! 200 Steps.", "effect": "flash" },
        { "type": "steps", "value": 400, "message": "Halfway through Tokyo Night! 400 Steps.", "effect": "particles" },
        { "type": "steps", "value": 600, "message": "600 Steps! Crossing the grand boulevard.", "effect": "borderGlow" },
        { "type": "steps", "value": 800, "message": "Tokyo Night Walk Completed! Great stride!", "effect": "zoomPulse" }
      ],
      "pointsOfInterest": [
        { "t": 15.0, "duration": 8.0, "title": "Shibuya Crossing Entrance", "description": "Iconic world intersection glowing with towering multi-story animated billboards.", "icon": "compass" },
        { "t": 100.0, "duration": 8.0, "title": "Traditional Ramen Alley", "description": "Cozy noodle shops with crimson paper lanterns and fragrant steaming broth.", "icon": "cup" },
        { "t": 220.0, "duration": 8.0, "title": "Akihabara Electric Arcade", "description": "Dazzling multi-level retro arcades celebrating decades of gaming culture.", "icon": "sparkle" },
        { "t": 340.0, "duration": 8.0, "title": "Quiet Shinto Garden Shrine", "description": "Warm stone lanterns and moss gardens nestled peacefully between towers.", "icon": "temple" },
        { "t": 420.0, "duration": 8.0, "title": "Sumida River Sky View", "description": "Cool breeze from the river with stunning panoramic reflections.", "icon": "water" }
      ]
    },
    "effects": {},
    "timeline": [],
    "endings": { "victorySound": "win" }
  },

  'walk-sunny-beach': {
    "type": "walk",
    "meta": {
      "id": "walk-sunny-beach",
      "icon": "🌴",
      "badge": "Ocean Breeze",
      "title": {
        "en": "Sunset Coastline Stride",
        "fr": "Foulée Côtière au Couchant",
        "ar": "مسار الشاطئ عند الغروب"
      },
      "description": {
        "en": "A relaxing 12-minute seaside stroll on a wooden boardwalk with rolling waves, dunes, and lighthouse views.",
        "fr": "Une agréable promenade de 12 minutes sur ponton en bois avec vagues douces et phare marin.",
        "ar": "نزهة شاطئية مريحة لمدة 12 دقيقة على ممشى خشبي وسط هدير الأمواج والنسيم البحري ومنارة الشاطئ."
      },
      "duration": 720,
      "difficulty": "easy",
      "version": "1.0.0"
    },
    "video": { "youtubeId": "", "src": "", "startAt": 0, "endAt": 720 },
    "rules": {
      "goalType": "steps",
      "goalValue": 1200,
      "referenceCadence": 100,
      "idleTimeoutMs": 3000,
      "idleResumeGraceMs": 1500,
      "cadenceRateMapping": [
        { "cadenceMin": 0, "cadenceMax": 40, "rate": 0.5 },
        { "cadenceMin": 41, "cadenceMax": 75, "rate": 0.75 },
        { "cadenceMin": 76, "cadenceMax": 105, "rate": 1.0 },
        { "cadenceMin": 106, "cadenceMax": 130, "rate": 1.25 },
        { "cadenceMin": 131, "cadenceMax": 999, "rate": 1.5 }
      ],
      "milestones": [
        { "type": "steps", "value": 300, "message": "300 Steps! The sea breeze feels wonderful.", "effect": "flash" },
        { "type": "steps", "value": 600, "message": "Halfway mark! 600 Steps along the coast.", "effect": "particles" },
        { "type": "steps", "value": 900, "message": "900 Steps! Passing the palm grove.", "effect": "borderGlow" },
        { "type": "steps", "value": 1200, "message": "Coastline Stride Complete! Amazing stroll!", "effect": "zoomPulse" }
      ],
      "pointsOfInterest": [
        { "t": 20.0, "duration": 8.0, "title": "Golden Coastal Boardwalk", "description": "Wide timber promenade overlooking white sand and rolling gentle waves.", "icon": "water" },
        { "t": 140.0, "duration": 8.0, "title": "Historic Wooden Fisher's Pier", "description": "Classic wooden pillars stretching 400 meters into the sparkling ocean.", "icon": "bridge" },
        { "t": 280.0, "duration": 8.0, "title": "Tropical Palm Oasis", "description": "Tall swaying coconut palms catching the warm orange rays of the sunset.", "icon": "tree" },
        { "t": 460.0, "duration": 8.0, "title": "Clifftop Lookout Point", "description": "Panoramic vista where dolphins can frequently be spotted on calm evenings.", "icon": "mountain" },
        { "t": 620.0, "duration": 8.0, "title": "Historic Coastal Lighthouse", "description": "Built in 1888, guiding coastal mariners with its iconic rhythmic beacon.", "icon": "home" }
      ]
    },
    "effects": {},
    "timeline": [],
    "endings": { "victorySound": "win" }
  },

  // ===================== CARDIO =====================

  'cardio-interval-burn': {
    "type": "cardio",
    "meta": {
      "id": "cardio-interval-burn",
      "icon": "🔥",
      "badge": "HIIT 4 Rounds",
      "title": {
        "en": "HIIT Treadmill Interval Burn",
        "fr": "Brûleur HIIT par Intervalles",
        "ar": "حارق التمارين المتقطعة عالي الكثافة"
      },
      "description": {
        "en": "A 20-minute guided interval workout featuring a 3-minute warm-up, 4 intense sprint & recovery rounds, and cool-down.",
        "fr": "Un entraînement guidé de 20 minutes avec échauffement, 4 séries de sprint/récupération, et retour au calme.",
        "ar": "تمرين فترات متقطعة موجه لمدة 20 دقيقة يتضمن 3 دقائق إحماء، 4 جولات ركض سريع واستعادة لياقة، وتهدئة."
      },
      "duration": 1200,
      "difficulty": "hard",
      "version": "1.0.0"
    },
    "rules": {
      "adaptive": true,
      "cueCooldownSec": 8,
      "metronome": false,
      "countdownBeepSec": 3,
      "program": [
        {
          "name": "Warm-up",
          "durationSec": 180,
          "target": { "cadence": [70, 95], "speedKmh": [3.0, 4.5] },
          "message": {
            "en": "Gentle marching in place to awaken your joints and raise core temperature.",
            "fr": "Marche douce sur place pour réveiller les articulations et chauffer le corps.",
            "ar": "مشية خفيفة في المكان لتنشيط المفاصل ورفع حرارة الجسم."
          }
        },
        {
          "name": "Sprint Round 1",
          "durationSec": 90,
          "target": { "cadence": [135, 165], "speedKmh": [5.8, 7.5] },
          "message": {
            "en": "First power sprint! Pump your knees high and find a fast rhythm.",
            "fr": "Premier sprint intense ! Montez les genoux et trouvez un rythme rapide.",
            "ar": "الانطلاقة السريعة الأولى! ارفع الركبتين واعثر على إيقاع سريع."
          }
        },
        {
          "name": "Active Recovery 1",
          "durationSec": 120,
          "target": { "cadence": [75, 95], "speedKmh": [3.2, 4.2] },
          "message": {
            "en": "Catch your breath with steady, easy stepping. Deep inhales.",
            "fr": "Reprenez votre souffle avec des pas réguliers et tranquilles. Inspirez profondément.",
            "ar": "استرجع أنفاسك بخطوات ثابتة وسهلة. تنفس بعمق."
          }
        },
        {
          "name": "Sprint Round 2",
          "durationSec": 90,
          "target": { "cadence": [140, 170], "speedKmh": [6.0, 7.8] },
          "message": {
            "en": "Accelerate! Push your tempo into the green target band.",
            "fr": "Accélérez ! Poussez votre tempo dans la zone verte cible.",
            "ar": "تسارع! ادفع إيقاعك داخل النطاق الأخضر المستهدف."
          }
        },
        {
          "name": "Active Recovery 2",
          "durationSec": 120,
          "target": { "cadence": [75, 95], "speedKmh": [3.2, 4.2] },
          "message": {
            "en": "Ease off the gas. Maintain light foot contact and relax your shoulders.",
            "fr": "Relâchez la pression. Gardez des appuis légers et détendez les épaules.",
            "ar": "خفف الجهد. حافظ على تلامس خفيف واسترخاء الكتفين."
          }
        },
        {
          "name": "Sprint Round 3",
          "durationSec": 90,
          "target": { "cadence": [140, 170], "speedKmh": [6.0, 7.8] },
          "message": {
            "en": "Round three! Keep your cadence rock solid and stay tall.",
            "fr": "Troisième série ! Gardez une cadence inébranlable et tenez-vous droit.",
            "ar": "الجولة الثالثة! حافظ على إيقاعك الصامد واستقامة جسمك."
          }
        },
        {
          "name": "Active Recovery 3",
          "durationSec": 120,
          "target": { "cadence": [75, 95], "speedKmh": [3.2, 4.2] },
          "message": {
            "en": "Great effort! Recover your oxygen for the grand finale.",
            "fr": "Super effort ! Faites le plein d'oxygène pour la grande finale.",
            "ar": "مجهود رائع! استعد طاقتك للجولة الختامية الكبرى."
          }
        },
        {
          "name": "Peak Sprint Round 4",
          "durationSec": 90,
          "target": { "cadence": [145, 175], "speedKmh": [6.2, 8.2] },
          "message": {
            "en": "FINAL SPRINT! Empty the tank and give it everything you have!",
            "fr": "DERNIER SPRINT ! Donnez tout ce que vous avez jusqu'au bout !",
            "ar": "الانطلاقة السريعة الأخيرة! أخرج كل طاقتك حتى الثانية الأخيرة!"
          }
        },
        {
          "name": "Cool-down & Stretch",
          "durationSec": 240,
          "target": { "cadence": [60, 80], "speedKmh": [2.5, 3.6] },
          "message": {
            "en": "Slow gentle cool-down. Lower heart rate gradually and celebrate your workout.",
            "fr": "Retour au calme doux et progressif. Laissez le cœur redescendre et savourez la séance.",
            "ar": "تهدئة تدريجية ولطيفة. دع نبضات القلب تنخفض واحتفل بإنجازك."
          }
        }
      ]
    },
    "effects": {},
    "timeline": [],
    "endings": { "victorySound": "win" }
  },

  'cardio-steady-endurance': {
    "type": "cardio",
    "meta": {
      "id": "cardio-steady-endurance",
      "icon": "⏱️",
      "badge": "Aerobic Builder",
      "title": {
        "en": "Steady Aerobic Builder",
        "fr": "Endurance Aérobie Régulière",
        "ar": "بناء التحمل الهوائي المستقر"
      },
      "description": {
        "en": "A comfortable 15-minute steady rhythm workout designed for consistent aerobic conditioning and calorie burning.",
        "fr": "Séance accessible de 15 minutes à rythme régulier pour renforcer l'endurance et brûler des calories.",
        "ar": "تمرين مريح لمدة 15 دقيقة بإيقاع ثابت مصمم لتعزيز اللياقة الهوائية وحرق السعرات الحرارية."
      },
      "duration": 900,
      "difficulty": "medium",
      "version": "1.0.0"
    },
    "rules": {
      "adaptive": true,
      "cueCooldownSec": 8,
      "metronome": false,
      "countdownBeepSec": 3,
      "program": [
        {
          "name": "Warm-up",
          "durationSec": 180,
          "target": { "cadence": [70, 90], "speedKmh": [3.0, 4.0] },
          "message": {
            "en": "Easy stepping to loosen up and prepare your body.",
            "fr": "Pas légers pour vous délier et préparer le corps.",
            "ar": "خطوات سهلة لتليين العضلات وتهيئة الجسم."
          }
        },
        {
          "name": "Cruising Zone 1",
          "durationSec": 240,
          "target": { "cadence": [95, 115], "speedKmh": [4.2, 5.2] },
          "message": {
            "en": "Find a sustainable aerobic pace. Breathe evenly.",
            "fr": "Trouvez une vitesse de croisière agréable. Respirez calmement.",
            "ar": "اعثر على وتيرة مريحة مستدامة. تنفس بانتظام."
          }
        },
        {
          "name": "Tempo Surge",
          "durationSec": 180,
          "target": { "cadence": [115, 135], "speedKmh": [5.0, 6.2] },
          "message": {
            "en": "Pick up the tempo slightly! Keep rhythm steady.",
            "fr": "Augmentez légèrement le rythme ! Maintenez la cadence.",
            "ar": "ارفع الإيقاع قليلاً! حافظ على ثبات خطواتك."
          }
        },
        {
          "name": "Cruising Zone 2",
          "durationSec": 180,
          "target": { "cadence": [95, 115], "speedKmh": [4.2, 5.2] },
          "message": {
            "en": "Return to cruising zone. Smooth and relaxed.",
            "fr": "Retour à la zone de confort. Souple et décontracté.",
            "ar": "عد لمنطقة الراحة والوتيرة المنتظمة. خطوات سلسة ومسترخية."
          }
        },
        {
          "name": "Cool-down",
          "durationSec": 120,
          "target": { "cadence": [60, 80], "speedKmh": [2.5, 3.5] },
          "message": {
            "en": "Gentle finish. Deep breaths as your heart rate settles.",
            "fr": "Fin en douceur. Respirez profondément pendant la récupération.",
            "ar": "ختام لطيف. تنفس بعمق مع استقرار نبضك."
          }
        }
      ]
    },
    "effects": {},
    "timeline": [],
    "endings": { "victorySound": "win" }
  },

  'cardio-pyramid-power': {
    "type": "cardio",
    "meta": {
      "id": "cardio-pyramid-power",
      "icon": "⛰️",
      "badge": "Pyramid Climb",
      "title": {
        "en": "Pyramid Power Climb",
        "fr": "Montée Pyramide Puissance",
        "ar": "صعود هرم الطاقة"
      },
      "description": {
        "en": "A 12-minute step-by-step pyramid climbing workout ramping tempo every 2 minutes up to peak intensity and stepping down.",
        "fr": "Un parcours de 12 minutes en pyramide qui monte en intensité toutes les 2 minutes jusqu'au sommet avant de redescendre.",
        "ar": "تمرين هرمي لمدة 12 دقيقة يصعد بالإيقاع كل دقيقتين حتى ذروة الشدة ثم يتدرج هبوطاً."
      },
      "duration": 720,
      "difficulty": "hard",
      "version": "1.0.0"
    },
    "rules": {
      "adaptive": true,
      "cueCooldownSec": 8,
      "metronome": false,
      "countdownBeepSec": 3,
      "program": [
        {
          "name": "Base Tier 1",
          "durationSec": 120,
          "target": { "cadence": [75, 95], "speedKmh": [3.2, 4.2] },
          "message": {
            "en": "Pyramid Step 1: Moderate warm-up pace.",
            "fr": "Étage 1 : Échauffement à allure modérée.",
            "ar": "المستوى الأول: وتيرة إحماء معتدلة."
          }
        },
        {
          "name": "Climb Tier 2",
          "durationSec": 120,
          "target": { "cadence": [105, 125], "speedKmh": [4.6, 5.8] },
          "message": {
            "en": "Pyramid Step 2: Ramping up the tempo!",
            "fr": "Étage 2 : Accélération progressive !",
            "ar": "المستوى الثاني: زيادة تصاعدية في الإيقاع!"
          }
        },
        {
          "name": "Peak Tier 3",
          "durationSec": 150,
          "target": { "cadence": [140, 170], "speedKmh": [6.0, 7.8] },
          "message": {
            "en": "THE PYRAMID PEAK! Maximum intensity drive!",
            "fr": "LE SOMMET DE LA PYRAMIDE ! Intensité maximale !",
            "ar": "قمة الهرم! أقصى درجات الطاقة والجهد!"
          }
        },
        {
          "name": "Descent Tier 4",
          "durationSec": 150,
          "target": { "cadence": [100, 120], "speedKmh": [4.4, 5.4] },
          "message": {
            "en": "Step down the mountain. Steady aerobic recovery.",
            "fr": "Descente progressive. Récupération active et régulière.",
            "ar": "النزول التدريجي. استعادة لياقة هوائية ثابتة."
          }
        },
        {
          "name": "Base Cool-down",
          "durationSec": 180,
          "target": { "cadence": [60, 80], "speedKmh": [2.5, 3.5] },
          "message": {
            "en": "Pyramid conquered! Relax your arms and catch your breath.",
            "fr": "Pyramide gravie avec succès ! Relâchez les bras et respirez.",
            "ar": "تم تسلق الهرم بنجاح! ارخِ ذراعيك واستعد أنفاسك."
          }
        }
      ]
    },
    "effects": {},
    "timeline": [],
    "endings": { "victorySound": "win" }
  }
};

/**
 * Helper to get built-in activities filtered by type ("game", "walk", "cardio")
 */
export function getActivitiesByType(type) {
  return Object.values(BUILTIN_ACTIVITIES).filter(a => a.type === type);
}

/**
 * builtinActivities.js
 * In-memory built-in activities for offline, GitHub Pages, and zero-fetch instant execution.
 */

export const BUILTIN_ACTIVITIES = {
  'game-cyber-runner': {
    "type": "game",
    "meta": {
      "id": "game-cyber-runner",
      "title": {
        "en": "Neon Beat Runner",
        "fr": "Course Rythmique Néon",
        "ar": "عدّاء الإيقاع النيوني"
      },
      "description": {
        "en": "A rhythm obstacle run demonstrating all timeline event types, video rate changes, checkpoints, and effects.",
        "fr": "Une course d'obstacles rythmée de 90 secondes démontrant tous les types d'événements, changements de vitesse et effets.",
        "ar": "تحدي عقبات إيقاعي مدته 90 ثانية يستعرض كافة أنواع الأحداث وتغييرات السرعة ونقاط الحفظ."
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
      "laserWarning": {
        "type": "flash",
        "color": "rgba(239, 68, 68, 0.4)",
        "duration": 250
      },
      "starBurst": {
        "type": "particles",
        "particleType": "sparkle",
        "count": 25
      }
    },
    "timeline": [
      { "t": 1.0, "type": "section", "name": "Phase 1: Calibration Start" },
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
      { "t": 49.0, "type": "branch", "condition": "minScore", "value": 500, "targetTime": 54.0, "elseTargetTime": 50.0 },
      { "t": 55.0, "type": "action", "expect": "SLIDE", "windowMs": 320, "perfectWindowMs": 140, "warnBeforeMs": 1300, "points": 120, "onSuccess": { "effect": "borderGlow", "sound": "slide" }, "onPerfect": { "effect": "particles", "sound": "perfect" }, "onFail": { "effect": "screenShake", "sound": "hit", "loseLife": 1 } },
      { "t": 60.0, "type": "sound", "preset": "levelUp" },
      { "t": 61.0, "type": "overlay", "text": "FINAL SPRINT!", "duration": 2.5, "position": "center", "color": "#22c55e", "animation": "pop" }
    ],
    "sections": [
      { "name": "Calibration Start", "start": 0, "end": 42 },
      { "name": "High Velocity Rush", "start": 43, "end": 90 }
    ],
    "endings": {
      "victorySound": "win",
      "defeatSound": "lose"
    }
  },

  'walk-alpine-trail': {
    "type": "walk",
    "meta": {
      "id": "walk-alpine-trail",
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
    "video": {
      "youtubeId": "",
      "src": "",
      "startAt": 0,
      "endAt": 600
    },
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
    "endings": {
      "victorySound": "win"
    }
  },

  'cardio-interval-burn': {
    "type": "cardio",
    "meta": {
      "id": "cardio-interval-burn",
      "title": {
        "en": "HIIT Treadmill Interval Burn",
        "fr": "Brûleur HIIT par Intervalles",
        "ar": "حارق التمارين المتقطعة عالي الكثافة"
      },
      "description": {
        "en": "A 20-minute guided interval workout featuring a 3-minute warm-up, 4 intense sprint & recovery rounds, and a 3-minute cool-down.",
        "fr": "Un entraînement guidé par intervalles de 20 minutes comprenant 3 min d'échauffement, 4 séries de sprint et récupération, et 3 min de retour au calme.",
        "ar": "تمرين فترات متقطعة موجه لمدة 20 دقيقة يتضمن 3 دقائق إحماء، 4 جولات ركض سريع واستعادة لياقة، و3 دقائق تهدئة."
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
    "endings": {
      "victorySound": "win"
    }
  }
};

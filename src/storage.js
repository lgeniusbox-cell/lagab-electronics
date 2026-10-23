/**
 * storage.js
 * Settings, profiles, session history, and localized strings for FloorMat Studio TV.
 * Backed by localStorage with safe in-memory fallback.
 */

// Default settings object
export const SETTINGS = {
  version: '1.0.0',
  language: 'en', // 'en' | 'fr' | 'ar'
  experienceLevel: 'normal', // 'normal' | 'advanced' | 'expert'
  sound: {
    masterVolume: 0.8,
    soundFx: true,
    coachVoice: true,
    metronome: false
  },
  timingWindows: {
    youtube: {
      perfectMs: 150,
      goodMs: 350
    },
    local: {
      perfectMs: 100,
      goodMs: 250
    }
  },
  gamepad: {
    axisLane: 0,
    thresholdLeft: -0.5,
    thresholdRight: 0.5,
    hysteresis: 0.12,
    buttonJump: 0,
    buttonSlide: 1,
    buttonStepLeft: 4,
    buttonStepRight: 5,
    axisSlide: 1,
    axisSlideThreshold: 0.6,
    triggerIntensity: 7, // analog trigger
    axisIntensity: 5,
    debounceMs: 120,
    deadzone: 0.15
  },
  currentProfileId: 'default',
  profiles: {
    default: {
      id: 'default',
      name: 'Player 1',
      heightCm: 175,
      weightKg: 70,
      strideLength: 0.7, // meters
      language: 'en',
      calibration: {
        baselineNoise: 0.05,
        laneLeft: -0.8,
        laneCenter: 0.0,
        laneRight: 0.8,
        jumpThreshold: 0.8,
        slideThreshold: 0.7,
        walkCadenceAvg: 105,
        runCadenceAvg: 155
      },
      bests: {},
      history: [] // Last 30 sessions
    }
  }
};

// Safe storage access
const STORAGE_KEY = 'floormat_studio_settings_v1';

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Deep merge
      Object.assign(SETTINGS, parsed);
      if (parsed.profiles) {
        SETTINGS.profiles = parsed.profiles;
      }
      if (parsed.gamepad) {
        Object.assign(SETTINGS.gamepad, parsed.gamepad);
      }
      if (parsed.sound) {
        Object.assign(SETTINGS.sound, parsed.sound);
      }
    }
  } catch (e) {
    console.warn('[Storage] Could not load localStorage settings:', e);
  }
  return SETTINGS;
}

export function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SETTINGS));
  } catch (e) {
    console.warn('[Storage] Could not save localStorage settings:', e);
  }
}

export function getCurrentProfile() {
  const pid = SETTINGS.currentProfileId || 'default';
  if (!SETTINGS.profiles[pid]) {
    SETTINGS.profiles[pid] = {
      id: pid,
      name: 'Player 1',
      heightCm: 175,
      weightKg: 70,
      strideLength: 0.7,
      language: SETTINGS.language || 'en',
      calibration: { ...SETTINGS.profiles.default.calibration },
      bests: {},
      history: []
    };
  }
  return SETTINGS.profiles[pid];
}

export function saveProfile(profile) {
  if (!profile || !profile.id) return;
  SETTINGS.profiles[profile.id] = profile;
  saveSettings();
}

export function saveRecord(activityId, recordData) {
  const profile = getCurrentProfile();
  if (!profile.bests) profile.bests = {};
  const currentBest = profile.bests[activityId] || { score: 0, stars: 0 };
  if ((recordData.score || 0) > (currentBest.score || 0)) {
    profile.bests[activityId] = {
      ...recordData,
      timestamp: Date.now()
    };
    saveSettings();
    return true; // New record!
  }
  return false;
}

export function recordSession(session) {
  const profile = getCurrentProfile();
  if (!Array.isArray(profile.history)) {
    profile.history = [];
  }
  profile.history.unshift({
    id: 'sess_' + Date.now(),
    date: new Date().toISOString(),
    ...session
  });
  // Keep max 30 sessions
  if (profile.history.length > 30) {
    profile.history = profile.history.slice(0, 30);
  }
  saveSettings();
}

export function getWeeklyStats() {
  const profile = getCurrentProfile();
  const history = profile.history || [];
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  
  let totalDuration = 0;
  let totalSteps = 0;
  let totalCalories = 0;
  let sessionCount = 0;
  const activeDays = new Set();

  history.forEach(item => {
    const t = new Date(item.date).getTime();
    if (t >= oneWeekAgo) {
      sessionCount++;
      totalDuration += (item.duration || 0);
      totalSteps += (item.steps || 0);
      totalCalories += (item.calories || 0);
      activeDays.add(new Date(item.date).toDateString());
    }
  });

  // Calculate streak
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dayStr = d.toDateString();
    const hasWorkout = history.some(h => new Date(h.date).toDateString() === dayStr);
    if (hasWorkout) {
      streak++;
    } else if (i > 0) {
      // Allow today to not be worked out yet
      break;
    }
  }

  return {
    totalDuration,
    totalSteps,
    totalCalories,
    sessionCount,
    streak,
    activeDaysCount: activeDays.size
  };
}

// Translations dictionary
export const I18N = {
  en: {
    appTitle: 'FloorMat Studio TV',
    tagline: 'Interactive Engine for Body-Sensing Floor Mats',
    game: 'Action Game',
    walk: 'Virtual Walk',
    cardio: 'Smart Cardio',
    loadTitle: 'Load Activity',
    youtubeLink: 'YouTube Link or ID',
    scriptLink: 'Script Link (JSON URL)',
    loadBtn: 'Launch Activity',
    orPasteJson: 'Paste JSON / Local File',
    pasteJsonTitle: 'Direct Script JSON',
    pastePlaceholder: 'Paste script.json code here...',
    chooseFile: 'Browse File',
    applyJson: 'Apply Script',
    catalogTitle: 'Ready-Made Activities',
    profilesTitle: 'Player Profiles',
    calibrationTitle: 'Mat Calibration',
    settingsTitle: 'Settings',
    authoringTitle: 'Authoring Studio',
    debugPanel: 'Debug Telemetry',
    simulatorTitle: 'Mat Simulator',
    keepWalking: 'KEEP WALKING!',
    pauseTitle: 'Activity Paused',
    resume: 'Resume',
    restart: 'Restart',
    quit: 'Quit to Home',
    mute: 'Mute Audio',
    unmute: 'Unmute Audio',
    score: 'Score',
    combo: 'Combo',
    lives: 'Lives',
    steps: 'Steps',
    cadence: 'SPM',
    speed: 'km/h',
    distance: 'Distance',
    calories: 'Approx. kcal',
    time: 'Time',
    phase: 'Phase',
    tooSlow: 'Speed Up',
    onTarget: 'On Rhythm',
    tooFast: 'Slow Down',
    jump: 'JUMP!',
    slide: 'SLIDE!',
    stepLeft: 'STEP L',
    stepRight: 'STEP R',
    perfect: 'PERFECT!',
    good: 'GOOD!',
    miss: 'MISS!',
    victory: 'ACTIVITY COMPLETE',
    stars: 'Stars',
    newRecord: 'NEW PERSONAL BEST!',
    healthNoticeTitle: 'Health & Safety Advisory',
    healthNoticeBody: 'Speed and distance are estimates calculated from cadence and stride length. Stop immediately if you experience pain, dizziness, or chest tightness. Always consult a physician before starting any vigorous exercise program.',
    healthAcknowledge: 'I Understand and Agree',
    accuracyZone: 'In Target Zone',
    streakDays: 'Days Streak',
    expLevel: 'Mode',
    normalMode: 'Simple & Fun',
    advancedMode: 'Advanced',
    expertMode: 'Expert / Dev',
    navHint: 'Use Arrow Keys / D-Pad + Enter to Navigate',
    selectGame: 'Select an Action Game',
    selectWalk: 'Select a Virtual Walk',
    selectCardio: 'Select a Cardio Workout',
    chooseActivity: 'Choose Your Adventure',
    backToHome: 'Back to Menu',
    playGame: 'Play Game →',
    startWalk: 'Start Walk →',
    startWorkout: 'Start Workout →',
    allGames: 'Available Action Games',
    allWalks: 'Scenic Virtual Routes',
    allCardio: 'Guided Treadmill Programs'
  },
  fr: {
    appTitle: 'FloorMat Studio TV',
    tagline: 'Moteur Interactif pour Tapis de Détection Corporelle',
    game: 'Jeu d\'Action',
    walk: 'Balade Virtuelle',
    cardio: 'Cardio Connecté',
    loadTitle: 'Charger une Activité',
    youtubeLink: 'Lien YouTube ou ID',
    scriptLink: 'Lien Script (URL JSON)',
    loadBtn: 'Lancer l\'Activité',
    orPasteJson: 'Coller JSON / Fichier Local',
    pasteJsonTitle: 'Script JSON Direct',
    pastePlaceholder: 'Collez le code script.json ici...',
    chooseFile: 'Parcourir un Fichier',
    applyJson: 'Appliquer le Script',
    catalogTitle: 'Activités Prêtes à l\'Emploi',
    profilesTitle: 'Profils Joueur',
    calibrationTitle: 'Calibration Tapis',
    settingsTitle: 'Paramètres',
    authoringTitle: 'Studio d\'Auteur',
    debugPanel: 'Télémétrie Débogage',
    simulatorTitle: 'Simulateur de Tapis',
    keepWalking: 'CONTINUEZ À MARCHER !',
    pauseTitle: 'Activité en Pause',
    resume: 'Reprendre',
    restart: 'Recommencer',
    quit: 'Retour à l\'Accueil',
    mute: 'Couper le Son',
    unmute: 'Activer le Son',
    score: 'Score',
    combo: 'Combo',
    lives: 'Vies',
    steps: 'Pas',
    cadence: 'PPM',
    speed: 'km/h',
    distance: 'Distance',
    calories: 'kcal approx.',
    time: 'Temps',
    phase: 'Phase',
    tooSlow: 'Accélérez',
    onTarget: 'Bon Rythme',
    tooFast: 'Ralentissez',
    jump: 'SAUTEZ !',
    slide: 'GLISSEZ !',
    stepLeft: 'PAS G',
    stepRight: 'PAS D',
    perfect: 'PARFAIT !',
    good: 'BIEN !',
    miss: 'MANQUÉ !',
    victory: 'ACTIVITÉ TERMINÉE',
    stars: 'Étoiles',
    newRecord: 'NOUVEAU RECORD PERSONNEL !',
    healthNoticeTitle: 'Avis de Santé et Sécurité',
    healthNoticeBody: 'La vitesse et la distance sont des estimations calculées à partir de la cadence et de la longueur de foulée. Arrêtez immédiatement en cas de douleur, vertige ou essoufflement anormal. Consultez un médecin avant d\'entamer un programme d\'effort.',
    healthAcknowledge: 'J\'ai Compris et J\'accepte',
    accuracyZone: 'Dans la Zone Cible',
    streakDays: 'Jours Consécutifs',
    expLevel: 'Mode',
    normalMode: 'Simple & Amusant',
    advancedMode: 'Avancé',
    expertMode: 'Expert / Dév',
    navHint: 'Flèches directionnelles / Manette + Entrée',
    selectGame: 'Choisir un Jeu d\'Action',
    selectWalk: 'Choisir une Balade Virtuelle',
    selectCardio: 'Choisir un Entraînement Cardio',
    chooseActivity: 'Choisissez Votre Aventure',
    backToHome: 'Retour au Menu',
    playGame: 'Jouer →',
    startWalk: 'Commencer la Balade →',
    startWorkout: 'Commencer l\'Entraînement →',
    allGames: 'Jeux d\'Action Disponibles',
    allWalks: 'Parcours Virtuels Panoramiques',
    allCardio: 'Programmes Tapis Guidés'
  },
  ar: {
    appTitle: 'FloorMat Studio TV',
    tagline: 'محرك تفاعلي لسجاد استشعار حركة الجسم',
    game: 'لعبة حركية',
    walk: 'مسار افتراضي',
    cardio: 'تمارين الكارديو الذكية',
    loadTitle: 'تحميل نشاط',
    youtubeLink: 'رابط يوتيوب أو المعرّف',
    scriptLink: 'رابط النص (URL JSON)',
    loadBtn: 'بدء النشاط',
    orPasteJson: 'لصق JSON / ملف محلي',
    pasteJsonTitle: 'كود JSON المباشر',
    pastePlaceholder: 'الصق كود script.json هنا...',
    chooseFile: 'استعراض ملف',
    applyJson: 'تطبيق النص',
    catalogTitle: 'الأنشطة الجاهزة',
    profilesTitle: 'ملفات اللاعبين',
    calibrationTitle: 'معايرة السجادة',
    settingsTitle: 'الإعدادات',
    authoringTitle: 'استوديو التأليف',
    debugPanel: 'لوحة التصحيح',
    simulatorTitle: 'محاكي السجادة',
    keepWalking: 'واصل المشي!',
    pauseTitle: 'النشاط متوقف مؤقتاً',
    resume: 'استئناف',
    restart: 'إعادة البدء',
    quit: 'العودة للرئيسية',
    mute: 'كتم الصوت',
    unmute: 'تشغيل الصوت',
    score: 'النقاط',
    combo: 'المضاعف',
    lives: 'المحاولات',
    steps: 'الخطوات',
    cadence: 'خطوة/د',
    speed: 'كم/ساعة',
    distance: 'المسافة',
    calories: 'سعرة تقريبية',
    time: 'الوقت',
    phase: 'المرحلة',
    tooSlow: 'زد السرعة',
    onTarget: 'إيقاع مثالي',
    tooFast: 'خفف السرعة',
    jump: 'اقفز!',
    slide: 'انزلق!',
    stepLeft: 'خطوة يسار',
    stepRight: 'خطوة يمين',
    perfect: 'ممتاز!',
    good: 'جيد!',
    miss: 'فائت!',
    victory: 'اكتمل النشاط بنجاح',
    stars: 'النجوم',
    newRecord: 'رقم قياسي شخصي جديد!',
    healthNoticeTitle: 'إرشادات الصحة والسلامة',
    healthNoticeBody: 'السرعة والمسافة تقديرات محسوبة من إيقاع الخطى وطول الخطوة. توقف فوراً إذا شعرت بألم أو دوار أو ضيق تنفس. استشر طبيباً قبل ممارسة أي تمرين مكثف.',
    healthAcknowledge: 'أفهم وأوافق',
    accuracyZone: 'في النطاق المستهدف',
    streakDays: 'أيام متتالية',
    expLevel: 'المستوى',
    normalMode: 'بسيط وممتع',
    advancedMode: 'متقدم',
    expertMode: 'خبير ومطور',
    navHint: 'استخدم الأسهم / يد التحكم + Enter للتنقل',
    selectGame: 'اختر لعبة حركية',
    selectWalk: 'اختر مساراً افتراضياً',
    selectCardio: 'اختر تمرين كارديو',
    chooseActivity: 'اختر مغامرتك',
    backToHome: 'رجوع للقائمة',
    playGame: 'العب الآن ←',
    startWalk: 'ابدأ المسار ←',
    startWorkout: 'ابدأ التمرين ←',
    allGames: 'الألعاب الحركية المتوفرة',
    allWalks: 'المسارات الطبيعية الخلابة',
    allCardio: 'برامج الجري الموجهة'
  }
};

export function t(key) {
  const lang = SETTINGS.language || 'en';
  const dict = I18N[lang] || I18N.en;
  return dict[key] || I18N.en[key] || key;
}

// Initialize on load
loadSettings();

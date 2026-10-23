# FloorMat Studio TV - Activity Script & Catalog Specification

This document provides the complete, authoritative specification for `script.json` (the three activity types: `game`, `walk`, and `cardio`) and `catalog.json`.

---

## 1. Top-Level `script.json` Schema

Every activity script is a JSON object with the following top-level structure:

```json
{
  "type": "game" | "walk" | "cardio",
  "meta": {
    "id": "unique-activity-slug",
    "title": {
      "en": "English Title",
      "fr": "Titre Français",
      "ar": "العنوان بالعربية"
    },
    "description": {
      "en": "English description...",
      "fr": "Description en français...",
      "ar": "الوصف بالعربية..."
    },
    "duration": 90,
    "difficulty": "easy" | "medium" | "hard",
    "version": "1.0.0"
  },
  "video": {
    "youtubeId": "dQw4w9WgXcQ",
    "src": "optional_local_or_cdn_path.mp4",
    "startAt": 0,
    "endAt": null
  },
  "rules": { ... },
  "effects": { ... },
  "timeline": [ ... ],
  "sections": [ ... ],
  "endings": { ... }
}
```

### Top-Level Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `"game"` \| `"walk"` \| `"cardio"` | **Yes** | Activity mode engine to launch. |
| `meta` | `Object` | **Yes** | Activity metadata (id, title, description, duration, difficulty, version). |
| `video` | `Object` | Optional | Video configuration for `game` and `walk`. If omitted or empty, runs the 60fps procedural animated simulation canvas. |
| `rules` | `Object` | **Yes** | Mode-specific gameplay, cadence, or workout rules. |
| `effects` | `Object` | Optional | Named custom visual effect definitions. |
| `timeline` | `Array<Event>` | **Yes** (for `game`) | Chronologically ordered event timeline in video seconds. |
| `sections` | `Array<Section>` | Optional | Section markers (e.g., phases or stages). |
| `endings` | `Object` | Optional | Audio and effect cues played on completion or defeat. |

---

## 2. Activity Type Specifications

### A. GAME Mode (`"type": "game"`)

In Game mode, the video plays at a base rate (or modulated by player intensity) and the player must react to timeline events using their feet on the floor mat.

#### `rules` Object (Game)
- `lives` (`number`, default `3`): Number of miss attempts allowed before game over.
- `comboMultipliers` (`Array<number>`, default `[1, 2, 3, 5]`): Score multipliers reached at combos (5x, 10x, 20x).
- `starsThresholds` (`[number, number, number]`, default `[800, 1600, 2400]`): Minimum points to achieve 1, 2, or 3 stars.
- `intensityMapping` (`Object`, optional):
  - `minRate` (`number`, default `0.75`): Video speed at 0.0 intensity.
  - `maxRate` (`number`, default `1.50`): Video speed at 1.0 intensity.
  - `steps` (`Array<number>`, optional): Snapped rates `[0.75, 1.0, 1.25, 1.5]`.

#### `timeline` Events (Game)
Each item in `timeline` has `t` (seconds from video start) and `type`:

1. **`action`**: Demands a physical response from the player on the floor mat.
   - `expect`: `"JUMP"` | `"SLIDE"` | `"LEFT"` | `"RIGHT"` | `"CENTER"` | `"STEP_LEFT"` | `"STEP_RIGHT"` | `"ANY"`.
   - `windowMs` (`number`, default `350`): Timing window (in milliseconds) before/after `t` for a GOOD hit.
   - `perfectWindowMs` (`number`, default `150`): Tighter timing window for a PERFECT hit.
   - `warnBeforeMs` (`number`, default `1500`): Display countdown ring and incoming action badge ahead of time.
   - `points` (`number`, default `100`): Base score awarded for success.
   - `onSuccess`: `{ "effect": "flash" | "borderGlow" | "laneHighlight", "sound": "good" | "coin" }`.
   - `onPerfect`: `{ "effect": "zoomPulse" | "particles" | "shockwave", "sound": "perfect" }`.
   - `onFail`: `{ "effect": "screenShake", "sound": "hit", "loseLife": 1 }`.

2. **`overlay`**: Displays on-screen text, shapes, or icons.
   - `text` (`string`): Message to render.
   - `shape` (`"circle"` | `"rect"` | `"arrow"`): Optional geometric primitive.
   - `duration` (`number`, in seconds).
   - `position`: `"center"` | `"top"` | `"bottom"`.
   - `color` (`string`, CSS hex or rgba).
   - `animation`: `"pop"` | `"fade"` | `"pulse"` | `"slide"`.

3. **`effect`**:
   - `name` (`string`): Triggers a built-in or custom effect (e.g. `"flash"`, `"screenShake"`, `"vignette"`).

4. **`video`**:
   - `action`: `"setRate"` | `"pause"` | `"seek"`.
   - `rate` (`number`): New playback rate (e.g. `1.25`).
   - `duration` (`number`): Duration of pause in seconds (e.g. `1.5` for time-freeze).
   - `targetTime` (`number`): Target second to seek to.

5. **`sound`**:
   - `preset`: `"jump"` | `"slide"` | `"coin"` | `"perfect"` | `"good"` | `"hit"` | `"levelUp"` | `"win"` | `"lose"` | `"countdown"` | `"tick"` | `"metronome"`.

6. **`section`**:
   - `name` (`string`): Name of new chapter/section.

7. **`checkpoint`**:
   - `id` (`string`), `name` (`string`).

8. **`branch`**:
   - `condition`: `"minScore"` | `"minCombo"`.
   - `value` (`number`): Threshold required to take `targetTime`.
   - `targetTime` (`number`): Timestamp to jump to if condition passes.
   - `elseTargetTime` (`number`): Timestamp to jump to if condition fails.

---

### B. WALK Mode (`"type": "walk"`)

In Walk mode, the video playback rate is dynamically governed by the player's walking cadence (steps per minute). If the player halts for longer than `idleTimeoutMs`, the video pauses and displays an encouraging "Keep Walking!" indicator.

#### `rules` Object (Walk)
- `goalType`: `"steps"` | `"distance"` | `"time"` | `"none"`.
- `goalValue` (`number`): Target value (e.g. `1000` steps, `2.5` km, or `600` seconds).
- `referenceCadence` (`number`, default `100`): Cadence at which playback is 1.0x.
- `idleTimeoutMs` (`number`, default `3000`): Milliseconds without a step before video automatically pauses.
- `cadenceRateMapping` (`Array<{cadenceMin, cadenceMax, rate}>`): Maps cadence ranges to discrete YouTube-compatible playback rates (`0.5`, `0.75`, `1.0`, `1.25`, `1.5`, `1.75`).
- `milestones` (`Array`):
  - `{ "type": "steps" | "distance", "value": 500, "message": "Halfway there!", "effect": "particles" }`.
- `pointsOfInterest` (`Array`):
  - `{ "t": 90.0, "duration": 8.0, "title": "Alpine Bridge", "description": "Historic crossing built in 1912.", "icon": "bridge" }`.

---

### C. CARDIO Mode (`"type": "cardio"`)

Cardio mode does **not** use video. Instead, it renders a high-performance smart treadmill cockpit with:
- Semicircular speed dial gauge (0 to 16+ km/h) with dynamic green target band and live needle.
- Metric tiles: Time remaining/elapsed, Steps, Cadence (SPM), Distance (km), Pace (min/km), Approx. Calories (kcal).
- Top coach line with instruction text and real-time status indicator (`Too Slow` | `On Target` | `Too Fast`).
- Bottom workout profile bar with phase height blocks and an animated playhead cursor.
- SpeechSynthesis vocal cues ("Faster", "Good rhythm", "Slow down a bit", "10 seconds left", "Recovery time").

#### `rules` Object (Cardio)
- `adaptive` (`boolean`, default `true`): Automatically extends recovery intervals by 15s if the player is struggling to meet sprint pace.
- `cueCooldownSec` (`number`, default `8`): Minimum seconds between repeated vocal coach cues.
- `metronome` (`boolean`, default `false`): Plays synchronized audio ticks at the target cadence.
- `countdownBeepSec` (`number`, default `3`): 3-2-1 audio countdown beeps before phase transitions.
- `program` (`Array<Phase>`):
  ```json
  {
    "name": "Sprint Round 1",
    "durationSec": 90,
    "target": {
      "cadence": [140, 170],
      "speedKmh": [6.0, 7.8]
    },
    "message": {
      "en": "Accelerate! Push your tempo into the green target band.",
      "fr": "Accélérez ! Poussez votre tempo dans la zone verte cible.",
      "ar": "تسارع! ادفع إيقاعك داخل النطاق الأخضر المستهدف."
    }
  }
  ```

---

## 3. `catalog.json` Schema

The catalog provides a list of ready-made activities shown on the Home Screen.

```json
{
  "activities": [
    {
      "id": "game-cyber-runner",
      "type": "game",
      "title": {
        "en": "Neon Beat Runner",
        "fr": "Course Rythmique Néon",
        "ar": "عدّاء الإيقاع النيوني"
      },
      "description": {
        "en": "Dodge obstacles and jump hurdles in rhythm.",
        "fr": "Évitez les obstacles et sautez les barrières.",
        "ar": "تفاد الحواجز وافقز فوق العقبات."
      },
      "duration": 90,
      "difficulty": "medium",
      "scriptUrl": "./examples/game-cyber-runner.json",
      "youtubeUrl": "",
      "badge": "Action Game"
    }
  ]
}
```

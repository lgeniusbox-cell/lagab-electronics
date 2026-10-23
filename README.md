# FloorMat Studio TV

> **Interactive Engine for Body-Sensing Floor Mats on Web and Android TV**  
> A pure static web app (HTML + CSS + ES Modules, **NO build step**, **NO npm required**, **NO external frameworks**, **NO CDN**). Works natively on desktop, tablet, and inside Android TV WebView containers.

The only external script used is the official [YouTube IFrame Player API](https://www.youtube.com/iframe_api).

---

## 📁 File Tree

```
├── index.html                           # Entry HTML point with YouTube API & relative imports
├── style.css                            # Clean TV-safe styles, focus rings, RTL support
├── SCRIPT_SPEC.md                       # Comprehensive JSON specification for activities & catalog
├── README.md                            # Complete deployment and integration guide
├── examples/                            # Built-in ready-to-play activity scripts
│   ├── catalog.json                     # Ready-made activity list
│   ├── game-cyber-runner.json           # Action game with 15+ events demonstrating all types
│   ├── walk-alpine-trail.json           # 10-minute virtual scenic walk with POIs & milestones
│   └── cardio-interval-burn.json        # 20-minute guided HIIT cardio interval workout
├── public/examples/                     # Mirrored for Vite and dev server compatibility
└── src/
    ├── storage.js                       # SETTINGS object, profiles, history, and i18n
    ├── audio.js                         # WebAudio synthesizer presets & SpeechSynthesis coach
    ├── videoSource.js                   # VideoSource (YouTube, HTML5 MP4, Procedural Canvas)
    ├── steps.js                         # Cadence (SPM), speed (km/h), distance, pace, and steps
    ├── input.js                         # Gamepad API polling, keyboard, debouncing & hysteresis
    ├── bridge.js                        # window.MatEngine & native Android / MatBridge calls
    ├── simulator.js                     # On-screen Floor Mat Simulator testing overlay
    ├── effects.js                       # 60fps GPU-accelerated canvas & DOM visual effects
    ├── hud.js                           # HUD overlay, Mat Preview corner widget, pause & results
    ├── timeline.js                      # GAME mode engine with video clock synchronization
    ├── walk.js                          # WALK mode engine with cadence sync & idle pause
    ├── cardio.js                        # CARDIO smart treadmill dashboard (no video)
    ├── authoring.js                     # In-engine Authoring Studio with live recording
    ├── ui.js                            # TV menus, activity loader, calibration wizard, debug
    └── main.js                          # App coordinator, URL params, and engine lifecycle
```

---

## 🚀 How to Publish to GitHub Pages (Step by Step)

Because this application uses **zero build steps** and **pure relative imports (`./`)**, publishing it to GitHub Pages takes less than 60 seconds:

1. **Create or push to a GitHub Repository**:
   ```bash
   git init
   git add .
   git commit -m "Initial FloorMat Studio TV commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```
2. **Enable GitHub Pages**:
   - Go to your repository on GitHub.
   - Click **Settings** → **Pages** (under the "Code and automation" menu on the left).
   - Under **Build and deployment** > **Source**, select **Deploy from a branch**.
   - Under **Branch**, choose `main` and set folder to `/(root)`.
   - Click **Save**.
3. **Done!**
   GitHub Pages will publish your site in a few moments at:
   `https://<your-username>.github.io/<your-repo-name>/`
   Everything (including the YouTube IFrame API, local JSON files, sounds, and animations) runs immediately out of the box with HTTPS.

---

## 🕹️ Testing in the Browser with the Mat Simulator

You don't need a physical floor mat connected to test gameplay, virtual walking, or cardio tracking!

1. Press **`S`** on your keyboard (or click **`🕹️ Sim [S]`** in the top header) to open the **Mat Simulator**.
2. **Cadence & Auto-Walk**:
   - Adjust the **Cadence Slider** (0 to 200 SPM).
   - Toggle **Auto-Walk Generator**: it automatically produces natural alternating left/right footstep events with realistic human timing jitter (±15 ms).
   - Watch the virtual walk video accelerate or decelerate in real time!
3. **Lane Position**:
   - Click **LEFT (-1)**, **CTR (0)**, or **RIGHT (+1)** or use the arrow keys.
4. **Action Triggers**:
   - Click **JUMP** (or press Space / Up Arrow).
   - Click **SLIDE** (or press Down Arrow).
   - Click **Left Step** (`Z`) or **Right Step** (`X`).
5. **Latency Simulation**:
   - Drag the **Hardware Latency Test** slider (0 to 300 ms) to simulate real-world Bluetooth or TV input delays.
6. **Mat Preview Widget**:
   - Notice the glowing mat diagram in the bottom-right corner. It illuminates the corresponding foot sensors in real-time (white for jumps, amber for slides, green pulses for footsteps).

---

## 🔗 Loading Content (YouTube Links & Script Links)

The engine separates video visuals from interactive game scripts:

### 1. Through the Home Screen UI:
- **YouTube Link**: Paste any valid link:
  - `https://www.youtube.com/watch?v=VIDEO_ID`
  - `https://youtu.be/VIDEO_ID`
  - `https://www.youtube.com/shorts/VIDEO_ID`
  - Or a bare 11-character ID: `dQw4w9WgXcQ`
  *(Note: If left empty, the engine uses its built-in 60fps procedural animated simulation canvas, so internet access to YouTube is completely optional!)*
- **Script Link**: Paste any CORS-enabled URL (e.g. from GitHub Pages or raw.githubusercontent.com) or a relative path:
  - `./examples/game-cyber-runner.json`
  - `./examples/walk-alpine-trail.json`
  - `./examples/cardio-interval-burn.json`
- **Paste JSON directly**: Click **"Paste JSON / Local File"** to directly paste raw JSON or choose a local file from your disk.

### 2. Through URL Parameters:
You can bookmark or launch activities directly via URL query parameters:
```
# Load a custom YouTube video with an online script:
index.html?yt=https://www.youtube.com/watch?v=XXXXX&script=https://example.com/myscript.json

# Load a custom catalog of activities:
index.html?catalog=https://example.com/custom-catalog.json
```

---

## 📱 Calling `window.MatEngine` from an Android WebView

When embedding the web app inside an Android TV or tablet native application:

### 1. Enabling JavaScript and WebAudio in Android:
```java
WebView webView = findViewById(R.id.mat_webview);
WebSettings settings = webView.getSettings();
settings.setJavaScriptEnabled(true);
settings.setDomStorageEnabled(true);
settings.setMediaPlaybackRequiresUserGesture(false); // Allows video & audio autoplay
```

### 2. Injecting Mat Input from Android:
Call methods on `window.MatEngine` via `evaluateJavascript`:

```java
// Inject a footstep
webView.evaluateJavascript("window.MatEngine.pushStep('left');", null);

// Inject full multi-axis input state
webView.evaluateJavascript(
  "window.MatEngine.pushInput({" +
  "  lane: 1," +
  "  intensity: 0.8," +
  "  jump: false," +
  "  slide: false," +
  "  stepRight: true" +
  "});", null);

// Load an activity remotely
webView.evaluateJavascript(
  "window.MatEngine.loadActivity({" +
  "  youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'," +
  "  script: 'https://example.com/activity.json'" +
  "});", null);
```

### 3. Receiving Reactive LED & Haptic Events from the Web App:
The engine automatically detects `window.Android` or `window.MatBridge` and safely invokes `onMatEvent(jsonString)` inside a `try/catch` block:

```java
public class MatJavascriptInterface {
    @JavascriptInterface
    public void onMatEvent(String jsonEvent) {
        try {
            JSONObject obj = new JSONObject(jsonEvent);
            String type = obj.getString("type");
            String color = obj.optString("feedbackColor", "#38bdf8");
            int score = obj.optInt("score", 0);
            
            // Trigger physical floor mat LED lights or rumble motors!
            FloorMatController.setLedColor(color);
        } catch (JSONException e) {
            e.printStackTrace();
        }
    }
}

// Attach the interface in Android:
webView.addJavascriptInterface(new MatJavascriptInterface(), "Android");
```

---

## 🎮 Recommended Gamepad Mapping for Floor Mats

When the floor mat presents itself as a standard Gamepad via the Gamepad API (`navigator.getGamepads()`), the engine recognizes the following standard layout:

| Physical Mat Sensor | Gamepad API Mapping | Recommended Signal Type | Description |
|---|---|---|---|
| **Left Lane Zone** | `axes[0] < -0.5` or `buttons[14]` (D-pad Left) | Analog axis or discrete button | Shifts active position to Left lane. |
| **Center Lane Zone** | `-0.3 < axes[0] < 0.3` | Default resting position | Shifts active position to Center lane. |
| **Right Lane Zone** | `axes[0] > 0.5` or `buttons[15]` (D-pad Right) | Analog axis or discrete button | Shifts active position to Right lane. |
| **Jump (Front Zone)** | `buttons[0]` (A) or `buttons[12]` (D-pad Up) | Rising-edge pulse | Triggered when both feet leave the mat. |
| **Slide (Low Stance)** | `buttons[1]` (B) or `buttons[13]` (D-pad Down) or `axes[1] > 0.6` | Rising-edge pulse | Triggered when squatting or touching rear sensor. |
| **Left Footstep** | `buttons[4]` (L1 / Left Bumper) | Pulse (minimum 200 ms debounce) | Step count and left/right cadence balance. |
| **Right Footstep** | `buttons[5]` (R1 / Right Bumper) | Pulse (minimum 200 ms debounce) | Step count and left/right cadence balance. |
| **Pressure / Intensity** | `buttons[7].value` (R2 Trigger) or `axes[5]` | Continuous (0.0 to 1.0) | Smoothly scales speed and intensity multiplier. |

### Built-in Calibration Wizard
Press **`⚖️ Mat Calibration`** from the Home screen or pause menu to run the 8-step wizard. It captures baseline resting noise, lane thresholds, jump/slide sensitivity, and walking/running cadence, storing the calibrated values directly into the user profile in `localStorage`.

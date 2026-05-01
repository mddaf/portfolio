# 🌌 Deep Space Portfolio — Md. Dodi Al Fayed

A fully immersive, physics-driven personal portfolio built as a scroll-driven journey through deep space. Every section is mapped to a real astrophysical object — rendered in real-time with custom GLSL shaders, procedural geometry, and scientifically accurate physics.

> **Live Stack:** Vanilla HTML/CSS/JS · Three.js r0.165 · GSAP 3.12 · Web Audio API · Custom GLSL Shaders

---

## Table of Contents

- [Architecture](#architecture)
- [The 3D Universe](#the-3d-universe)
  - [Station Map](#station-map)
  - [1. Deep Space Starfield](#1-deep-space-starfield)
  - [2. Hero Planet & Moon System](#2-hero-planet--moon-system)
  - [3. Asteroid Belt](#3-asteroid-belt)
  - [4. About — Constellation](#4-about--constellation)
  - [5. Skills — Spiral Galaxy](#5-skills--spiral-galaxy)
  - [6. Projects — Schwarzschild Black Hole](#6-projects--schwarzschild-black-hole)
  - [7. Journey — Morris-Thorne Wormhole](#7-journey--morris-thorne-wormhole)
  - [8. Profiles — Active Galactic Nucleus (Quasar)](#8-profiles--active-galactic-nucleus-quasar)
  - [9. Contact — Core-Collapse Supernova](#9-contact--core-collapse-supernova)
- [Post-Processing Pipeline](#post-processing-pipeline)
- [Audio Engine](#audio-engine)
- [Design System](#design-system)
- [Scroll & Camera System](#scroll--camera-system)
- [Easter Eggs](#easter-eggs)
- [Performance](#performance)
- [File Structure](#file-structure)
- [Running Locally](#running-locally)
- [Repository](#repository)
- [Inspiration & Creative Influences](#inspiration--creative-influences)
- [References](#references)

---

## Architecture

The application follows a modular ES Module architecture. A single `scene.js` creates the WebGL renderer, camera, post-processing composer, and animation loop. All other modules register their objects and animation callbacks into this shared pipeline via `startLoop()`.

```
index.html
├── assets/css/
│   ├── tokens.css        ← Design tokens (single source of truth)
│   ├── reset.css         ← CSS reset + base styles
│   ├── layout.css        ← Grid systems + responsive breakpoints
│   ├── components.css    ← All UI components (~31KB)
│   └── animations.css    ← Keyframe animations
├── js/
│   ├── main.js           ← Entry point, module loader, filters, forms
│   ├── scene.js          ← WebGL renderer, EffectComposer, animation loop
│   ├── world.js          ← Starfield, planet, asteroids, black hole, pulsar
│   ├── skills-galaxy.js  ← Spiral galaxy for Skills section
│   ├── journey-wormhole.js ← Morris-Thorne traversable wormhole
│   ├── github-quasar.js  ← Active galactic nucleus / quasar
│   ├── contact-supernova.js ← Core-collapse supernova
│   ├── journey.js        ← Scroll-driven camera rail system
│   ├── cursor.js         ← Custom cursor + raycasting hover detection
│   ├── nebula.js         ← Fullscreen nebula background (fBm shader)
│   ├── audio.js          ← Web Audio API + YouTube IFrame API
│   ├── magnetic.js       ← Magnetic button hover effects
│   ├── nav.js            ← Navigation logic (non-module)
│   ├── scroll.js         ← Scroll-reveal intersection observer
│   └── stats.js          ← Animated stat counter
└── assets/
    ├── images/           ← Project screenshots, wallpapers
    └── docs/             ← Resume PDF
```

### Module Loading Chain

```
scene.js → world.js → skills-galaxy.js → github-quasar.js
→ journey-wormhole.js → contact-supernova.js → journey.js
→ [cursor.js + nebula.js] → audio.js → magnetic.js
```

Each module calls `startLoop(callback)` to register its per-frame animation function. The central `animate()` loop in `scene.js` iterates all callbacks at 60fps.

---

## The 3D Universe

### Station Map

The entire portfolio is a **1,500-unit deep space corridor** along the negative Z-axis. The camera travels through this corridor as the user scrolls:

```
Z Position   Section           3D Object
──────────────────────────────────────────────────────
  +100       ← Far background  Starfield extends here
     0       Hero              Planet + Moon + Asteroid Belt
  -120       (Hidden)          Pulsar Easter Egg
  -200       About             Constellation Network
  -400       Skills            Spiral Galaxy
  -600       Projects          Schwarzschild Black Hole
  -800       Journey           Morris-Thorne Wormhole
 -1000       Profiles          Active Galactic Nucleus (Quasar)
 -1200       Contact           Core-Collapse Supernova
 -1400       ← Far background  Starfield extends here
```

---

### 1. Deep Space Starfield

**File:** `world.js` lines 12–125  
**Physics:** OBAFGKM spectral classification, Kroupa (2001) IMF, magnitude power-law, Airy disk PSF

The starfield uses **three brightness tiers** mimicking astronomical apparent magnitude:

| Tier | Count | Spread (XY) | Size Range | Parallax | Magnitude |
|------|-------|-------------|------------|----------|-----------|
| Bright | 80 | 800 | 3.0–7.0 | 1.2x | 0–2 |
| Medium | 400 | 1,000 | 1.2–3.0 | 0.6x | 2–4 |
| Faint | 4,000 | 1,400 | 0.3–1.2 | 0.15x | 4–6+ |

**Spectral Color Distribution** (visible-star weighted):

```
Type    Color           Weight    Description
─────────────────────────────────────────────────
O       (0.61,0.69,1.0)  3%      Pale blue — hottest, rarest
B       (0.67,0.75,1.0)  5%      Blue-white
A       (0.79,0.84,1.0) 10%      White
F       (0.97,0.97,1.0) 12%      Warm white
G       (1.0,0.96,0.92) 20%      Yellow (Sun-like)
K       (1.0,0.82,0.63) 30%      Orange — most common visible
M       (1.0,0.80,0.50) 20%      Red-orange giants
```

**Shader Math:**
- **Scintillation (twinkling):** `flicker = sin(uTime * 0.5 + aPhase) * 0.03 + 1.0`
- **Airy disk PSF:** Core + halo profile: `core = 1.0 - smoothstep(0.0, 0.12, d)` and `halo = (1.0 - smoothstep(0.1, 0.5, d)) * 0.25`
- **Warp stretch:** On fast scroll, `gl_PointSize` is multiplied by `mix(1.0, 10.0, uWarp)`, creating a hyperspace streak effect

**Milky Way Band** is a fullscreen plane at Z=-700 using **6-octave fBm** (fractional Brownian motion) with dust lane masking:

```glsl
float band = exp(-pow((vUv.y - 0.5) * 2.0, 2.0) * 6.0);  // Gaussian profile
float clouds = fbm(vUv * vec2(8.0, 4.0));                   // 6-octave turbulence
float dust = smoothstep(0.45, 0.65, fbm(...));               // Dark dust lanes
density *= (1.0 - dust * 0.7);                               // Subtract dust
```

---

### 2. Hero Planet & Moon System

**File:** `world.js` lines 153–317

#### Planet Shader

The planet uses a **Fresnel atmosphere shader** with five visual layers computed per-fragment:

1. **Continental Terrain** — 6-octave fBm generates a heightmap. A threshold at `smoothstep(0.42, 0.52, terrain)` separates ocean from land.
2. **Ocean** — Two-color gradient (deep blue → teal) with `noise(uv * 30.0)` wave perturbation.
3. **Land** — Three-tier elevation: lowland (dark purple) → highland (medium purple) → mountain peaks (bright purple).
4. **Cloud Layer** — Separate scrolling UV offset (`uTime * 0.006`) on a second fBm pass, creating drifting cloud cover.
5. **Night-side City Lights** — On the dark hemisphere (`dot(normal, sunDir) < 0`), procedural noise creates sparse emissive dots simulating city glow.
6. **Fresnel Atmosphere** — `fresnel = pow(1.0 - dot(N, V), 3.0)` creates a bright blue-cyan limb glow.

#### Moon Shader

The moon implements **physically-based lunar surface features**:

- **Mare/Highland dichotomy** — fBm threshold separates dark basaltic maria from bright anorthosite highlands.
- **Crater function** — Parametric distance-based profile per crater:
  ```glsl
  float floor_depth = smoothstep(0.0, 0.7, d) * 0.3;   // depressed floor
  float rim = smoothstep(0.5, 0.75, d) * 0.5;           // raised rim
  float falloff = smoothstep(0.95, 1.1, d);              // smooth edge
  ```
- 7 large impact craters + 8 hash-placed small craters.

#### Moon Orbit

Keplerian elliptical orbit:
```js
x = cos(phase) * radius
y = sin(phase) * radius * sin(inclination)
z = sin(phase) * radius * 0.4
```

---

### 3. Asteroid Belt

**File:** `world.js` lines 319–612  
**Physics:** Main Belt zones I/II/III, Kirkwood gaps (Kirkwood 1866), C/S/M spectral types (DeMeo et al. 2015), power-law size distribution, rubble pile morphology (OSIRIS-REx/DART), NPA tumbling

This is the most physically accurate component. It simulates **500 asteroids** using:

#### Kirkwood Gap Implementation

Orbital resonance gaps with Jupiter are modeled as density suppressors:

```
3:1 resonance at 2.50 AU → scene radius ≈ 16.4 units
5:2 resonance at 2.82 AU → scene radius ≈ 19.5 units
```

```js
// Density suppression at gap
if (d < GAP_WIDTH) {
    density *= pow(d / GAP_WIDTH, 2) * 0.1 + 0.02;
}
```

Asteroids are placed via **rejection sampling** against this density function.

#### Spectral Type Zonation (DeMeo et al. 2015)

| Zone | S-type (Silicate) | C-type (Carbonaceous) | M-type (Metallic) |
|------|-------------------|----------------------|-------------------|
| Inner (< 2.5 AU) | **80%** | 5% | 15% |
| Middle | 50% | 40% | 10% |
| Outer (> 2.82 AU) | 5% | **90%** | 5% |

#### Size Distribution — Power Law

```js
// Number ∝ D^(-2.5) approximately
size = 0.10 + pow(random(), 2.5) * 0.40;
```

#### Orbital Mechanics

- **Inclination:** Rayleigh distribution via Box-Muller transform: `σ ≈ 0.13 rad ≈ 7.5°`
- **Eccentricity:** Uniform 0.05–0.33
- **Kepler's Third Law:** `orbitSpeed *= pow(innerRadius / r, 0.5)` — inner asteroids orbit faster
- **NPA Tumbling:** 10% of asteroids rotate around two simultaneous axes (non-principal axis rotation), compound via quaternion multiplication

#### Rubble Pile Geometry

Each asteroid mesh has per-vertex displacement using 3-frequency noise:

```js
disp = noise3(x, y, z, 42) * 0.35        // large-scale irregularity
     + noise3(x*3, y*3, z*3, 99) * 0.18   // medium craters
     + noise3(x*7, y*7, z*7, 17) * 0.08   // micro-roughness
```

---

### 4. About — Constellation

**File:** `world.js` lines 614–657  
**Position:** Z = -200

60 star particles connected by lines where distance < 12 units. Implements a nearest-neighbor graph visualization. Slowly rotates; speeds up on hover.

---

### 5. Skills — Spiral Galaxy

**File:** `skills-galaxy.js` (~10.7KB)  
**Position:** Z = -400

Procedural spiral galaxy with logarithmic spiral arms, bulge component, and dust lanes.

---

### 6. Projects — Schwarzschild Black Hole

**File:** `world.js` lines 662–825  
**Physics:** Schwarzschild metric, Event Horizon Telescope M87* (2019), NASA Goddard (2024), IXPE 2024  
**Position:** Z = -600

Seven physically motivated layers:

| Layer | Object | Physics |
|-------|--------|---------|
| 1–2 | Event Horizon | Pure black sphere at 2R_s (shadow with lensing) |
| 3 | Photon Ring | Torus at 1.5R_s with Doppler beaming |
| 4–5 | Accretion Disk | Temperature gradient + Keplerian spiral + Doppler shift |
| 6 | Corona | Flat X-ray plasma (IXPE 2024 confirmed geometry) |
| 7 | Relativistic Jets | Bipolar synchrotron radiation cones |

#### Key Constants

```
R_s (Schwarzschild radius) = 1.0 (normalized)
R_ph (photon sphere) = 1.5 R_s
R_isco (innermost stable circular orbit) = 3.0 R_s
R_disk (outer disk edge) = 12.0 R_s
R_corona = 18.0 R_s
Jet height = 40.0 R_s
Scene scale = 4.0×
```

#### Doppler Beaming

The approaching side of the disk appears brighter due to relativistic beaming. The beam angle is dynamically computed from the camera's viewing direction:

```js
bhCamAngle = atan2(camera.x - bhGroup.x, camera.z - bhGroup.z);
```

```glsl
float beaming = sin(vAngle - uBeamAngle) * 0.5 + 0.5;
float doppler = mix(0.4, 2.8, beaming);  // 0.4x to 2.8x brightness
```

#### Accretion Disk Temperature Gradient

Inner disk is white-hot (~10,000K), middle is orange (~3,000K), outer is deep red (~1,000K):

```glsl
vec3 colorInner = vec3(1.00, 0.98, 0.95);  // white
vec3 colorMid   = vec3(1.00, 0.55, 0.10);  // orange
vec3 colorOuter = vec3(0.80, 0.15, 0.05);  // deep red
```

#### Keplerian Spiral Pattern

```glsl
float kepler = pow(max(radius / R_isco, 1.0), -1.5);  // Kepler's 3rd law
float spiralAngle = angle - uTime * kepler * 0.3;      // differential rotation
float spiral = sin(spiralAngle * 4.0 + t * 6.0) * 0.15 + 0.85;
```

#### Secondary Lensed Image

A gravitationally lensed copy of the far-side disk is rendered above the shadow, scaled to `y = -0.3` and at 35% opacity — matching the EHT M87* observations.

---

### 7. Journey — Morris-Thorne Wormhole

**File:** `journey-wormhole.js` (~21KB)  
**Physics:** Morris & Thorne (1988), Flamm catenoid (1916), Kip Thorne/Interstellar VFX (arXiv:1502.03809), Müller (2004)  
**Position:** Z = -800

Eight layers:

| Layer | Object | Physics |
|-------|--------|---------|
| 1 | ~~Ambient Glow~~ | Removed (user preference) |
| 2 | Gravitational Lensing Halo | Deflection ∝ r_throat / r, lensed starfield |
| 3 | Einstein Ring (×2) | Photon capture orbits at 1.5r₀ |
| 4 | Mouth Portal | Custom shader galaxy/nebula interior |
| 5 | Exotic Matter Shell | Casimir-field shimmer at equator |
| 6 | Catenoid Throat | Flamm embedding: `r(ℓ) = r₀ · cosh(ℓ/r₀)` |
| 7 | Particle Infall Stream | Radial geodesic particles |
| 8 | Spacetime Grid | 2D curvature embedding diagram overlay |

#### Throat Geometry — Flamm Catenoid

The wormhole throat is generated as a catenoid of revolution:

```
r(ℓ) = r₀ · cosh(ℓ / r₀)
```

Where `r₀` is the throat radius and `ℓ` is the proper radial distance. In code:

```js
const r = r0 * Math.cosh(l / r0);
vertex.set(r * cos(theta), l * WH_SCALE, r * sin(theta));
```

#### Gravitational Lensing

Light deflection follows the weak-field approximation:

```glsl
float deflect = uThroat / (uRadius * max(r, 0.05));
vec2 lensedUv = 0.5 + vec2(cos(angle), sin(angle)) * r * (1.0 + deflect * 0.12);
```

#### Spacetime Grid (Embedding Diagram)

A 128×128 subdivided plane with vertex shader displacement creating the classic "rubber sheet" visualization:

```glsl
float plunge = exp(-r * 12.0);   // exponential throat
pos.y = -60.0 * plunge;          // deep pinch at center
```

Color shifts from cyan (flat spacetime) to purple (deep curvature) based on depth.

---

### 8. Profiles — Active Galactic Nucleus (Quasar)

**File:** `github-quasar.js` (~23KB)  
**Position:** Z = -1000

Multi-layered quasar with accretion disk, broad-line region, bipolar jets, and synchrotron radiation.

---

### 9. Contact — Core-Collapse Supernova

**File:** `contact-supernova.js` (~6KB)  
**Position:** Z = -1200

Expanding supernova remnant with core, ejecta shells, and shockwave effects.

---

## Post-Processing Pipeline

**File:** `scene.js`

The EffectComposer chain processes every frame in order:

```
RenderPass → UnrealBloomPass → FilmGrainPass → GravLensPass → ChromaticAberrationPass → OutputPass
```

| Pass | Purpose | Parameters |
|------|---------|------------|
| **UnrealBloom** | Deep space glow | strength=0.5, radius=0.4, threshold=0.85 |
| **Film Grain** | Cinematic noise | intensity=0.04, animated seed |
| **Grav Lens** | Spacetime curvature distortion | Disabled (user preference) |
| **Chromatic Aberration** | RGB split on warp/easter eggs | strength=0, spikes to 3.0 on Konami |

### Film Grain Shader

```glsl
float grain = rand(vUv + fract(uTime)) * uIntensity;
color.rgb += grain - uIntensity * 0.5;  // centered around 0
```

### Chromatic Aberration Shader

```glsl
float r = texture2D(tDiffuse, vUv + offset + vertOffset).r;
float g = texture2D(tDiffuse, vUv).g;
float b = texture2D(tDiffuse, vUv - offset - vertOffset).b;
```

The vertical offset includes a sinusoidal wave for organic distortion:
```glsl
vertOffset = vec2(0.0, uStrength * 0.004 * sin(vUv.y * 10.0 + uTime));
```

---

## Audio Engine

**File:** `audio.js`

All sounds are **procedurally synthesized** using the Web Audio API — no audio files are loaded.

| Sound | Trigger | Synthesis |
|-------|---------|-----------|
| **Chime** | Crystal hover | Sine oscillator, 880Hz, exponential decay |
| **Ting** | Any click | Dual sine (1800Hz + 2400Hz), sharp attack |
| **Portal Hum** | Scroll > 88% | Triangle wave, 220Hz, 1.5s decay |
| **Pulsar Burst** | Pulsar easter egg | 4-note arpeggio (440-554-659-880Hz) |
| **Gravity Wave** | Konami code | Sawtooth → lowpass filter sweep (4kHz→50Hz) |

**Background Music:** Hans Zimmer — Interstellar, via YouTube IFrame API (hidden player, user-gesture gated).

---

## Design System

**File:** `assets/css/tokens.css`

### Color Palette (Strict — 3 accents only)

| Token | Hex | Usage |
|-------|-----|-------|
| `--accent-nebula` | `#6c63ff` | Primary purple — CTAs, active states |
| `--accent-pulsar` | `#00d4ff` | Secondary cyan — links, tags |
| `--accent-nova` | `#ff6b9d` | Tertiary pink — achievements only |

### Background Scale (5 depths)

```
--space-void:    #03040f   ← deepest black (page bg)
--space-deep:    #080d1e   ← section alternating
--space-mid:     #0d1535   ← card backgrounds
--space-surface: #131d45   ← elevated surfaces
--space-border:  #1e2d6b   ← borders, dividers
```

### Typography

| Role | Font | Weights |
|------|------|---------|
| Display (h1–h3) | Syne | 400, 500, 700 |
| Body | Inter | 400, 500, 700 |
| Mono (tags, labels) | JetBrains Mono | 400, 500 |

### Spacing Scale

```
xs: 0.25rem → sm: 0.5rem → md: 1rem → lg: 2rem → xl: 4rem → xxl: 8rem
```

---

## Scroll & Camera System

**File:** `journey.js`

The camera is mounted on a scroll-driven rail. As `window.scrollY` progresses from 0% to 100%, the camera interpolates through predefined waypoints along the Z-axis using GSAP ScrollTrigger.

Each section's `overlay-panel` has transparent background with a subtle border, allowing the 3D scene to remain visible between and behind content panels.

**Warp Effect:** Fast scrolling triggers a velocity tracker in `world.js` that stretches star points, creating a "hyperspace jump" visual:

```js
const delta = abs(scrollY - lastScrollY);
warpValue = min(delta / 200, 1.0);  // 0 → 1 mapped to 0–200px/frame
```

---

## Easter Eggs

### 🌸 Hidden Pulsar

- **Location:** Z = -120, X = 15 (between Hero and About)
- **Hint:** Console message reveals coordinates
- **Trigger:** Click the glowing pink sphere
- **Effect:** Pulsar burst sound + GSAP scale animation + console celebration

### 🎮 Konami Code

- **Sequence:** ↑↑↓↓←→←→BA
- **Effect:** `playGravityWave()` — descending sawtooth with lowpass sweep + massive chromatic aberration spike across the entire viewport
- **Visual:** Chromatic aberration ramps to 3.0 over 1 second with a sine envelope

### 🖥️ Console Art

Opening DevTools reveals ASCII art with developer coordinates:

```
◆ ·  ·  ·  ◆ ·  ·  · ◆
  ·   ·  ·  ·  ·  ·  · · ·
◆  ·  ╔══════════════════╗  ·
   ·  ║  MD. DODI AL FAY ║  ◆
·  ◆  ║    ED PORTFOLIO  ║  ·
```

---

## Performance

| Optimization | Implementation |
|-------------|---------------|
| Pixel ratio cap | `Math.min(devicePixelRatio, 1.5)` |
| Instanced rendering | Asteroid belt uses 3 `InstancedMesh` (one per spectral type) — 500 asteroids in 3 draw calls |
| Shader early-exit | Post-processing shaders skip computation when `uStrength < 0.005` |
| Additive blending | Most transparent objects use additive blending — avoids sort overhead |
| Passive scroll listeners | All scroll handlers use `{ passive: true }` |
| Lazy audio imports | Audio module loaded only after 3D pipeline is ready |
| Fog culling | `FogExp2` with density 0.008 naturally fades distant objects |

---

## File Structure

```
portfolio/
├── index.html              (52KB — 937 lines)
├── README.md               (this file)
├── assets/
│   ├── css/
│   │   ├── tokens.css      (2.9KB — design tokens)
│   │   ├── reset.css       (1.9KB — CSS reset)
│   │   ├── layout.css      (4.8KB — grids + responsive)
│   │   ├── components.css  (31KB — all UI components)
│   │   └── animations.css  (3KB — keyframes)
│   ├── images/
│   │   ├── p1.png–p4.png   (project screenshots)
│   │   ├── banner.jpg      (hero banner)
│   │   └── duke_of_edinburgh.jpg
│   └── docs/
│       └── Md Dodi Al Fayed_Resume.pdf
└── js/
    ├── main.js             (12KB — entry + bootstrap)
    ├── scene.js            (8KB — renderer + composer)
    ├── world.js            (47KB — starfield + planet + asteroids + black hole)
    ├── skills-galaxy.js    (11KB — spiral galaxy)
    ├── journey-wormhole.js (21KB — traversable wormhole)
    ├── github-quasar.js    (23KB — quasar / AGN)
    ├── contact-supernova.js(6KB — supernova)
    ├── journey.js          (6KB — scroll camera rail)
    ├── cursor.js           (4KB — custom cursor + raycasting)
    ├── nebula.js           (4KB — fBm nebula background)
    ├── audio.js            (10KB — Web Audio + YouTube)
    ├── magnetic.js         (2.4KB — magnetic hover)
    ├── nav.js              (3KB — navigation)
    ├── scroll.js           (2.1KB — scroll reveal)
    └── stats.js            (1.2KB — animated counters)
```

---

## Running Locally

```bash
# Any static server works — no build step required
cd portfolio
python -m http.server 3000

# Then open http://localhost:3000
```

> **Requirements:** Modern browser with WebGL2 support (Chrome 90+, Firefox 89+, Safari 15+, Edge 90+)

## Repository

🔗 **GitHub:** [github.com/mddaf/portfolio](https://github.com/mddaf/portfolio)

```bash
git clone https://github.com/mddaf/portfolio.git
cd portfolio
python -m http.server 3000
```

---

## Inspiration & Creative Influences

This portfolio draws from a wide range of scientific, cinematic, and web design sources. Every visual decision is rooted in real physics or established creative works.

### 🎬 Film & Visual Media

| Source | Influence |
|--------|-----------|
| **Interstellar** (2014) — Christopher Nolan, VFX by DNEG | The primary visual inspiration. The wormhole implementation directly follows the rendering techniques described by Kip Thorne and the DNEG VFX team in their 2015 paper (arXiv:1502.03809). The black hole's accretion disk, Doppler beaming, and secondary lensed image are modeled after the Gargantua visualization. The Interstellar soundtrack by Hans Zimmer serves as the ambient background music. |
| **2001: A Space Odyssey** (1968) — Stanley Kubrick | Inspired the "Stargate" warp effect — the hyperspace star-stretch that activates during fast scrolling. Also influenced the minimalist, methodical pacing of the scroll journey. |
| **Gravity** (2013) — Alfonso Cuarón | Influenced the floating debris aesthetic of the asteroid belt and the sense of isolated objects drifting in vast emptiness. |
| **Cosmos: A Spacetime Odyssey** (2014) — Neil deGrasse Tyson | Inspired the educational approach of mapping each portfolio section to a real astrophysical phenomenon, turning the portfolio into a science communication piece. |

### 🔭 Scientific Imagery

| Source | Influence |
|--------|-----------|
| **Event Horizon Telescope — M87\* Image** (2019) | The black hole's orange-red accretion disk crescent, asymmetric Doppler brightening, and dark central shadow are directly based on the first-ever photograph of a black hole. |
| **NASA Goddard Black Hole Visualizations** (2019–2024) | Informed the multi-layer approach: separate event horizon, photon ring, accretion disk, corona, and jet components. |
| **IXPE X-ray Polarimetry** (2024) | Confirmed the flat, pancake-like geometry of AGN coronae — implemented as a flattened sphere (`scale.y = 0.12`) rather than a spherical halo. |
| **OSIRIS-REx / Bennu** (2020) | The rubble-pile asteroid geometry with per-vertex displacement noise is inspired by the surface imagery of asteroid Bennu. |
| **DART / Dimorphos** (2022) | Reinforced the rubble-pile morphology approach and informed the asteroid color palette (very dark C-type surfaces). |
| **Hubble Deep Field / JWST** | The multi-tier starfield with spectral color distribution mimics the appearance of long-exposure deep-field observations. |

### 🌐 Web & Interactive Design

| Source | Influence |
|--------|-----------|
| **Bruno Simon — threejs-journey.com** | Pioneer of Three.js portfolio experiences. Inspired the concept of using a 3D canvas as the primary visual layer with HTML content overlaid on top. |
| **Awwwards / FWA** | General design inspiration for dark-mode aesthetics, glassmorphism panels, and micro-animation patterns. |
| **Stripe.com** | Influenced the design system approach — strict token-based CSS with limited color palette, consistent spacing scale, and typographic hierarchy. |
| **Linear.app** | Inspired the minimalist dark UI with subtle borders, monospace labels, and the "precision engineering" aesthetic of the component design. |
| **Vercel.com** | Influenced the scroll-reveal animation timing, badge styling, and the overall "developer-first" portfolio vibe. |

### 🎵 Audio Design

| Source | Influence |
|--------|-----------|
| **Hans Zimmer — Interstellar OST** | Background soundtrack. The organ-heavy, building crescendos match the cosmic journey metaphor. |
| **No Man's Sky** (2016) — 65daysofstatic | Inspired the procedural audio approach — generating all UI sounds via Web Audio API oscillators rather than loading audio files, creating a unique soundscape per session. |
| **EVE Online** | Influenced the ambient "space station" feel — subtle hums, crystalline chimes, and the overall audioscape of navigating through deep space. |

### 📐 Physics & Mathematics

| Concept | Application |
|---------|------------|
| **General Relativity** — Einstein (1915) | Foundational framework for black hole, wormhole, and gravitational lensing implementations. |
| **Schwarzschild Solution** (1916) | Black hole event horizon radius, photon sphere, and ISCO calculations. |
| **Flamm's Paraboloid** (1916) | Wormhole throat geometry as a catenoid of revolution: `r(ℓ) = r₀·cosh(ℓ/r₀)`. |
| **Morris-Thorne Metric** (1988) | Traversable wormhole structure, exotic matter requirements, and throat stability. |
| **Kepler's Third Law** (1619) | Orbital mechanics for asteroid belt (`v ∝ r^(-0.5)`) and black hole accretion disk differential rotation. |
| **Doppler Effect / Relativistic Beaming** | Brightness asymmetry in rotating accretion disks — approaching side appears brighter. |
| **Fresnel Equations** | Atmosphere rim lighting on the planet: reflectance increases at grazing angles. |
| **Fractional Brownian Motion (fBm)** | Procedural terrain generation for planet surface, moon craters, and Milky Way clouds. |
| **Box-Muller Transform** | Gaussian random number generation for asteroid orbital inclination distribution. |
| **Rayleigh Distribution** | Asteroid belt vertical thickness modeling. |
| **OBAFGKM Classification** | Star color assignment based on spectral type frequency distribution. |
| **Kroupa IMF** (2001) | Initial mass function determining star count per brightness tier. |

---

## References

### Astrophysics Papers

| Paper | Used For |
|-------|---------|
| Morris & Thorne (1988) — *Wormholes in spacetime and their use for interstellar travel* | Wormhole throat geometry |
| Flamm (1916) — *Beiträge zur allgemeinen Relativitätstheorie* | Catenoid embedding diagram |
| Thorne et al. (2015) — arXiv:1502.03809 — *Gravitational lensing by spinning black holes in astrophysics, and in the movie Interstellar* | Wormhole & black hole visual appearance |
| Müller (2004) — *Visual Appearance of a Morris-Thorne Wormhole* | Lensing halo rendering |
| Kroupa (2001) — *On the variation of the initial mass function* | Star count distribution |
| DeMeo et al. (2015) — *An asteroid belt compositional gradient* | C/S/M spectral zonation |
| Kirkwood (1866) — *Meteoric Astronomy* | Orbital resonance gaps |
| Event Horizon Telescope Collaboration (2019) — *First M87 Event Horizon Telescope Results* | Black hole shadow + photon ring |
| NASA IXPE (2024) — *X-ray Polarimetry of AGN Coronae* | Flat corona geometry |
| Schwarzschild (1916) — *Über das Gravitationsfeld eines Massenpunktes* | Event horizon, photon sphere, ISCO radii |

### Technologies

| Technology | Version | Purpose |
|-----------|---------|---------|
| [Three.js](https://threejs.org/) | r0.165.0 | 3D rendering engine |
| [GSAP](https://gsap.com/) | 3.12.5 | Animation + ScrollTrigger |
| [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) | — | Procedural audio synthesis |
| [YouTube IFrame API](https://developers.google.com/youtube/iframe_api_reference) | — | Background music |
| [UseBasin](https://usebasin.com/) | — | Contact form backend |
| [Devicons](https://devicon.dev/) | — | Skill icons via CDN |
| [Google Fonts](https://fonts.google.com/) | — | Syne, Inter, JetBrains Mono |

### External APIs

| API | Purpose |
|-----|---------|
| [alfa-leetcode-api](https://github.com/alfaarghya/alfa-leetcode-api) | LeetCode stats (problems solved, ranking, submissions) |
| [Codeforces API](https://codeforces.com/apiHelp) | Codeforces rating, rank, contribution |
| [github-readme-stats](https://github.com/anuraghazra/github-readme-stats) | GitHub stats cards (via personal Vercel deployment) |
| [github-readme-streak-stats](https://github.com/DenverCoder1/github-readme-streak-stats) | GitHub contribution streak card |

---

## License

© 2025–2026 Md. Dodi Al Fayed. All rights reserved.

---

*Built with Three.js · GSAP · Raw ambition · Crafted in the void ◈*

// ═══════════════════════════════════════════════════════════
// WORLD.JS — All 3D Objects
// v5 ENHANCED — Full cosmic world
// Contains: 5-layer starfield, planet + moon + asteroids,
//   constellation, galaxy, black hole, wormhole, quasar,
//   supernova, hidden pulsar easter egg
// ═══════════════════════════════════════════════════════════

import * as THREE from 'three';
import { scene, startLoop, camera } from './scene.js';

// ═══════════════════════════════════════════════════════════
// PHYSICALLY ACCURATE DEEP-SPACE STARFIELD
// Physics: OBAFGKM spectral classification, Kroupa (2001) IMF,
//   magnitude power-law, Airy disk PSF, Milky Way galactic band
// Coverage: Z = +100 to Z = -1400 (all stations)
// Total: ~4,480 stars + 1 Milky Way plane = 4 draw calls
// ═══════════════════════════════════════════════════════════

// Per-star spectral color (visible-star weighted OBAFGKM distribution)
function randomStarColor() {
  let r = Math.random();
  const types = [
    { rgb: [0.61, 0.69, 1.00], w: 0.03 },  // O — pale blue
    { rgb: [0.67, 0.75, 1.00], w: 0.05 },  // B — blue-white
    { rgb: [0.79, 0.84, 1.00], w: 0.10 },  // A — white
    { rgb: [0.97, 0.97, 1.00], w: 0.12 },  // F — warm white
    { rgb: [1.00, 0.96, 0.92], w: 0.20 },  // G — yellow (Sun-like)
    { rgb: [1.00, 0.82, 0.63], w: 0.30 },  // K — orange
    { rgb: [1.00, 0.80, 0.50], w: 0.20 },  // M — red-orange (giants)
  ];
  for (const s of types) { r -= s.w; if (r <= 0) return s.rgb; }
  return types[4].rgb;
}

const SCENE_Z_MIN = -1400, SCENE_Z_MAX = 100;
const SCENE_Z_SPAN = SCENE_Z_MAX - SCENE_Z_MIN;

const STAR_TIERS = [
  { count: 80,   spreadXY: 800,  sizeRange: [3.0, 7.0], parallax: 1.2 },  // bright (mag 0–2)
  { count: 400,  spreadXY: 1000, sizeRange: [1.2, 3.0], parallax: 0.6 },  // medium (mag 2–4)
  { count: 4000, spreadXY: 1400, sizeRange: [0.3, 1.2], parallax: 0.15 }, // faint (mag 4–6+)
];

const deepStarVS = `
  uniform float uTime; uniform float uWarp;
  attribute float aSize; attribute float aPhase; attribute vec3 aColor;
  varying vec3 vColor; varying float vBright;
  void main() {
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    float flicker = sin(uTime * 0.5 + aPhase) * 0.03 + 1.0;
    vBright = flicker; vColor = aColor;
    gl_PointSize = aSize * flicker * mix(1.0, 10.0, uWarp) * (300.0 / -mvPos.z);
    gl_Position = projectionMatrix * mvPos;
  }
`;
const deepStarFS = `
  varying vec3 vColor; varying float vBright;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float core = 1.0 - smoothstep(0.0, 0.12, d);
    float halo = (1.0 - smoothstep(0.1, 0.5, d)) * 0.25;
    float alpha = (core + halo) * vBright;
    gl_FragColor = vec4(vColor * (core * 1.8 + 0.4), alpha);
  }
`;

const starLayers = STAR_TIERS.map((tier) => {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(tier.count * 3);
  const sizes = new Float32Array(tier.count);
  const phases = new Float32Array(tier.count);
  const colors = new Float32Array(tier.count * 3);
  for (let i = 0; i < tier.count; i++) {
    pos[i*3]   = (Math.random() - 0.5) * tier.spreadXY;
    pos[i*3+1] = (Math.random() - 0.5) * tier.spreadXY * 0.4;
    pos[i*3+2] = SCENE_Z_MIN + Math.random() * SCENE_Z_SPAN;
    sizes[i]   = tier.sizeRange[0] + Math.random() * (tier.sizeRange[1] - tier.sizeRange[0]);
    phases[i]  = Math.random() * Math.PI * 2;
    const rgb  = randomStarColor();
    colors[i*3] = rgb[0]; colors[i*3+1] = rgb[1]; colors[i*3+2] = rgb[2];
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSize',    new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute('aPhase',   new THREE.BufferAttribute(phases, 1));
  geo.setAttribute('aColor',   new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uWarp: { value: 0 } },
    vertexShader: deepStarVS, fragmentShader: deepStarFS,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, mat);
  scene.add(points);
  return { points, mat, speedMult: tier.parallax };
});

// ── MILKY WAY BAND — fBm starlight + dust lanes + nebula patches ────────
const milkyWayMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `
    uniform float uTime; varying vec2 vUv;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);}
    float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<6;i++){v+=a*noise(p);p*=2.1;a*=0.48;}return v;}
    void main(){
      float band=exp(-pow((vUv.y-0.5)*2.0,2.0)*6.0);
      float clouds=fbm(vUv*vec2(8.0,4.0)+vec2(uTime*0.002,0.0));
      float density=band*clouds;
      float dust=smoothstep(0.45,0.65,fbm(vUv*vec2(12.0,6.0)+vec2(50.0,30.0)));
      density*=(1.0-dust*0.7);
      float neb=smoothstep(0.55,0.7,fbm(vUv*vec2(6.0,3.0)+vec2(100.0)))*band;
      vec3 col=vec3(0.85,0.82,0.95)*density+mix(vec3(0.5,0.15,0.3),vec3(0.1,0.4,0.5),fbm(vUv*vec2(6.0,3.0)+vec2(100.0)))*neb*0.15;
      float micro=step(0.985,hash(vUv*500.0))*band*0.3;
      col+=micro;
      gl_FragColor=vec4(col,density*0.12+neb*0.04+micro);
    }
  `,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
});
const milkyWayBand = new THREE.Mesh(new THREE.PlaneGeometry(2000, 300), milkyWayMat);
milkyWayBand.position.set(-50, 20, -700);
milkyWayBand.rotation.z = Math.PI * 0.33;
milkyWayBand.renderOrder = -1;
scene.add(milkyWayBand);

// ═══════════════════════════════════════════════════════════
// MOUSE NDC TRACKER (smoothed, for star parallax)
// ═══════════════════════════════════════════════════════════

const mouseNDC = { x: 0, y: 0 };
window.addEventListener('mousemove', (e) => {
  const rawX = (e.clientX / window.innerWidth) * 2 - 1;
  const rawY = -(e.clientY / window.innerHeight) * 2 + 1;
  mouseNDC.x += (rawX - mouseNDC.x) * 0.08;
  mouseNDC.y += (rawY - mouseNDC.y) * 0.08;
});

// ═══════════════════════════════════════════════════════════
// WARP VELOCITY TRACKER — drives star stretch on fast scroll
// ═══════════════════════════════════════════════════════════

let _warpValue = 0;
let _lastScrollY = 0;

window.addEventListener('scroll', () => {
  const delta = Math.abs(window.scrollY - _lastScrollY);
  _lastScrollY = window.scrollY;
  // Map scroll delta to warp 0→1 (clamp at 200px/frame)
  _warpValue = Math.min(delta / 200, 1.0);
}, { passive: true });

// ═══════════════════════════════════════════════════════════
// HERO STATION (Z = 0) — Planet + Moon + Asteroid Belt
// ═══════════════════════════════════════════════════════════

// ── PLANET (Fresnel atmosphere shader) ──
const planetGeo = new THREE.IcosahedronGeometry(12, 12);
const planetMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader: `
    varying vec3 vNormal; varying vec3 vViewDir; varying vec2 vUv;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
      vViewDir = normalize(-mvPos.xyz);
      vUv = uv;
      gl_Position = projectionMatrix * mvPos;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    varying vec3 vNormal; varying vec3 vViewDir; varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5); }
    float noise(vec2 p) {
      vec2 i=floor(p),f=fract(p); vec2 u=f*f*(3.0-2.0*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
    }
    float fbm(vec2 p) {
      float v=0.0, a=0.5;
      for(int i=0; i<6; i++) { v+=a*noise(p); p*=2.1; a*=0.48; }
      return v;
    }
    void main() {
      vec2 uv = vUv + vec2(uTime*0.002, 0.0);

      // Continental terrain — 6-octave fBm
      float terrain = fbm(uv * 5.0);
      float landMask = smoothstep(0.42, 0.52, terrain); // ocean vs land threshold

      // Ocean: deep blue to teal gradient with subtle waves
      vec3 deepOcean = vec3(0.02, 0.03, 0.18);
      vec3 shallowOcean = vec3(0.05, 0.10, 0.32);
      float oceanWave = noise(uv * 30.0 + uTime * 0.01) * 0.12;
      vec3 ocean = mix(deepOcean, shallowOcean, terrain * 1.5 + oceanWave);

      // Land: lowlands → highlands → mountain peaks
      vec3 lowland  = vec3(0.06, 0.04, 0.22);  // dark purple-blue lowland
      vec3 highland = vec3(0.12, 0.06, 0.35);  // medium purple highland
      vec3 mountain = vec3(0.20, 0.12, 0.50);  // bright purple mountain peaks
      float elevation = smoothstep(0.52, 0.80, terrain);
      vec3 land = mix(lowland, mix(highland, mountain, elevation), elevation);

      // Surface color (ocean + land)
      vec3 surface = mix(ocean, land, landMask);

      // Cloud layer — separate scrolling UV
      vec2 cloudUv = vUv + vec2(uTime * 0.006, uTime * 0.001);
      float clouds = fbm(cloudUv * 4.0);
      clouds = smoothstep(0.45, 0.72, clouds) * 0.55;
      vec3 cloudCol = vec3(0.55, 0.50, 0.90); // wispy purple-white clouds
      surface = mix(surface, cloudCol, clouds);

      // Diffuse lighting from directional sun
      vec3 sunDir = normalize(vec3(1.0, 0.4, 0.5));
      float diffuse = max(dot(vNormal, sunDir), 0.0) * 0.70 + 0.08;
      surface *= diffuse;

      // Nightside city glow — faint emissive dots on dark side of planet
      float nightFace = 1.0 - smoothstep(-0.1, 0.15, dot(vNormal, sunDir));
      float cityNoise = noise(vUv * 40.0) * noise(vUv * 80.0);
      float cities = smoothstep(0.35, 0.55, cityNoise) * landMask * nightFace;
      surface += vec3(0.50, 0.40, 1.0) * cities * 0.4;

      // Fresnel atmosphere rim
      float fresnel = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 3.0);
      vec3 atmo = mix(vec3(0.42, 0.39, 1.0), vec3(0.0, 0.83, 1.0), fresnel);
      vec3 col = mix(surface, atmo, fresnel * 0.65);

      gl_FragColor = vec4(col, 1.0);
    }
  `,
});
const planet = new THREE.Mesh(planetGeo, planetMat);
planet.position.set(0, 0, 0);
scene.add(planet);

// Atmosphere glow ring
const atmoGeo = new THREE.SphereGeometry(13.2, 32, 32);
const atmoMat = new THREE.ShaderMaterial({
  uniforms: {},
  vertexShader: `varying vec3 vNormal; varying vec3 vViewDir;
    void main(){ vNormal=normalize(normalMatrix*normal); vViewDir=normalize(-(modelViewMatrix*vec4(position,1.0)).xyz); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `varying vec3 vNormal; varying vec3 vViewDir;
    void main(){ float f=pow(1.0-max(dot(vNormal,vViewDir),0.0),4.0); gl_FragColor=vec4(0.42,0.39,1.0, f*0.4); }`,
  transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
});
scene.add(new THREE.Mesh(atmoGeo, atmoMat));

// ── MOON ──
const moonGeo = new THREE.SphereGeometry(1.8, 32, 32);
const moonMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0x8888aa) } },
  vertexShader: `varying vec3 vNormal; varying vec2 vUv;
    void main(){ vNormal=normalize(normalMatrix*normal); vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `
    uniform float uTime; uniform vec3 uColor; varying vec3 vNormal; varying vec2 vUv;
    float hash(vec2 p){return fract(sin(dot(p,vec2(311.7,127.1)))*43758.5);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);float a=hash(i),b=hash(i+vec2(1,0)),c=hash(i+vec2(0,1)),d=hash(i+vec2(1,1));vec2 u=f*f*(3.0-2.0*f);return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.x*u.y;}
    float fbm(vec2 p) {
      float v=0.0, a=0.5;
      for(int i=0; i<5; i++) { v+=a*noise(p); p*=2.0; a*=0.5; }
      return v;
    }
    // Procedural crater — distance-based ring shape
    float crater(vec2 uv, vec2 center, float radius) {
      float d = length(uv - center) / radius;
      // Crater profile: raised rim + depressed floor
      float floor_depth = smoothstep(0.0, 0.7, d) * 0.3; // dark floor
      float rim = (1.0 - smoothstep(0.7, 1.0, d)) * smoothstep(0.5, 0.75, d) * 0.5; // bright rim
      float outside = smoothstep(0.95, 1.1, d); // falloff
      return mix(-floor_depth + rim, 0.0, outside);
    }
    void main(){
      vec2 uv = vUv + vec2(uTime * 0.003, 0.0);

      // Base surface: mare (dark basaltic plains) vs highland (bright rough terrain)
      float mareMask = smoothstep(0.40, 0.55, fbm(uv * 3.0 + 42.0));
      vec3 mare     = vec3(0.22, 0.22, 0.30); // dark blue-grey basalt
      vec3 highland = vec3(0.50, 0.48, 0.55); // bright anorthosite
      vec3 baseCol  = mix(mare, highland, mareMask);

      // Surface roughness — multi-frequency noise
      float rough = fbm(uv * 12.0) * 0.15 + noise(uv * 30.0) * 0.08;

      // Large impact craters
      float craterEffect = 0.0;
      craterEffect += crater(uv, vec2(0.25, 0.40), 0.08) * 0.6;
      craterEffect += crater(uv, vec2(0.65, 0.30), 0.06) * 0.5;
      craterEffect += crater(uv, vec2(0.50, 0.70), 0.10) * 0.7;
      craterEffect += crater(uv, vec2(0.15, 0.75), 0.05) * 0.4;
      craterEffect += crater(uv, vec2(0.80, 0.60), 0.07) * 0.55;
      craterEffect += crater(uv, vec2(0.35, 0.20), 0.04) * 0.35;
      craterEffect += crater(uv, vec2(0.70, 0.80), 0.055) * 0.45;

      // Small craters (hash-based placement)
      for(int i = 0; i < 8; i++) {
        vec2 cPos = vec2(hash(vec2(float(i)*7.3, 1.1)), hash(vec2(float(i)*3.7, 9.3)));
        float cRad = 0.015 + hash(vec2(float(i)*5.1, 2.9)) * 0.025;
        craterEffect += crater(uv, cPos, cRad) * 0.25;
      }

      vec3 surfaceCol = baseCol + rough + craterEffect;

      // Diffuse lighting
      vec3 sunDir = normalize(vec3(1.0, 0.4, 0.5));
      float diffuse = max(dot(vNormal, sunDir), 0.0) * 0.70 + 0.12;

      // Rim/terminator lighting — subtle brightening at the day/night boundary
      float rim = pow(1.0 - max(dot(vNormal, normalize(vec3(0.0, 0.0, 1.0))), 0.0), 3.0) * 0.08;

      gl_FragColor = vec4(surfaceCol * diffuse + rim, 1.0);
    }`,
});
const moon = new THREE.Mesh(moonGeo, moonMat);
scene.add(moon);
const moonOrbit = { radius: 24, speed: 0.00012, inclination: 0.4, phase: 0.0 };

// ═══════════════════════════════════════════════════════════════════════════
// ASTEROID BELT — Scientifically Accurate Implementation
// Physics: Main Belt zones I/II/III, Kirkwood gaps (2.5 AU, 2.82 AU),
//   C/S/M-type spectral classes, rubble pile morphology (OSIRIS-REx/DART),
//   power-law size distribution, thick torus (orbital inclinations up to 20°),
//   non-principal axis (NPA) tumbling rotation
//
// DeMeo et al. 2015, Bennu OSIRIS-REx, Dimorphos DART, Kirkwood 1866
// ═══════════════════════════════════════════════════════════════════════════

// ── GAUSSIAN RANDOM (Box-Muller) for orbital inclination distribution ──────
// HOISTED: must be defined before asteroid data generation loop
function gaussRandom() {
  const u1 = Math.random(), u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// ── BELT GEOMETRY CONSTANTS ──────────────────────────────────────────────────
// Belt ring: inner edge at ~14 units, outer edge at ~26 units
// Mapped to real belt: 2.06–3.27 AU → 14–26 scene units
const BELT_INNER    = 14.0;
const BELT_OUTER    = 26.0;
const BELT_SPAN     = BELT_OUTER - BELT_INNER;

// Kirkwood gaps: radii in scene units
// 3:1 resonance at 2.50 AU → ~16.4 scene units
// 5:2 resonance at 2.82 AU → ~19.5 scene units
const GAP_3_1 = BELT_INNER + (2.50 - 2.06) / (3.27 - 2.06) * BELT_SPAN;
const GAP_5_2 = BELT_INNER + (2.82 - 2.06) / (3.27 - 2.06) * BELT_SPAN;
const GAP_WIDTH = 0.6;

// ── SPECTRAL TYPE COLORS (physically accurate albedos and colors) ──────────
const ASTEROID_TYPES = {
  // C-type: 75% of belt, dominates outer zone
  // Very dark, almost black. Albedo 0.03–0.09. Slight blue-grey tint (Bennu)
  C: {
    colors: [0x2a2a2e, 0x303036, 0x353540, 0x2e3038, 0x333338],
    roughness: 0.95,
    metalness: 0.02,
    weight: 0.75,
  },
  // S-type: 17% of belt, dominates inner zone
  // Warm grey-brown to orange-tan. Albedo 0.10–0.22. "Sandstone"
  S: {
    colors: [0x6b5a4e, 0x7a6355, 0x6e5c50, 0x8a7060, 0x7d6858],
    roughness: 0.88,
    metalness: 0.05,
    weight: 0.17,
  },
  // M-type: ~5%, scattered throughout belt
  // Warm metallic grey-bronze. Exposed iron-nickel core.
  M: {
    colors: [0x8a8278, 0x9a9088, 0x7e7870, 0x908880, 0xa09080],
    roughness: 0.70,
    metalness: 0.30,
    weight: 0.08,
  },
};

// ── SIZE DISTRIBUTION — Power Law (many small, few large) ────────────────
// Number ∝ D^(-2.5) approximately
function randomAsteroidSize() {
  const u = Math.random();
  return 0.10 + Math.pow(u, 2.5) * 0.40;
}

// ── DENSITY FUNCTION — encodes Kirkwood gaps ───────────────────────────────
function beltDensityAt(r) {
  const center = (BELT_INNER + BELT_OUTER) / 2.0;
  const sigma  = BELT_SPAN * 0.35;
  let density  = Math.exp(-0.5 * Math.pow((r - center) / sigma, 2));

  // Kirkwood gap at 3:1 resonance
  const d1 = Math.abs(r - GAP_3_1);
  if (d1 < GAP_WIDTH) {
    density *= Math.pow(d1 / GAP_WIDTH, 2) * 0.1 + 0.02;
  }

  // Kirkwood gap at 5:2 resonance
  const d2 = Math.abs(r - GAP_5_2);
  if (d2 < GAP_WIDTH) {
    density *= Math.pow(d2 / GAP_WIDTH, 2) * 0.1 + 0.02;
  }

  return density;
}

// ── SPECTRAL TYPE BY RADIUS — zone-based composition ─────────────────────
// DeMeo et al. 2015 compositional structure
function asteroidTypeAt(r) {
  const u = Math.random();
  if (r < GAP_3_1) {
    // Inner belt — S-type dominant
    if (u < 0.80) return 'S';
    if (u < 0.95) return 'M';
    return 'C';
  } else if (r < GAP_5_2) {
    // Middle belt — mixed
    if (u < 0.50) return 'S';
    if (u < 0.60) return 'M';
    return 'C';
  } else {
    // Outer belt — C-type dominant
    if (u < 0.90) return 'C';
    if (u < 0.95) return 'M';
    return 'S';
  }
}

// ── PER-ASTEROID DATA ARRAY ─────────────────────────────────────────────────
const ASTEROID_COUNT = 500;
const asteroidData   = [];

// Generate placement data using rejection sampling (respects density function)
let attempts = 0;
while (asteroidData.length < ASTEROID_COUNT && attempts < ASTEROID_COUNT * 20) {
  attempts++;

  const r = BELT_INNER + Math.random() * BELT_SPAN;
  if (Math.random() > beltDensityAt(r)) continue;

  const angle = Math.random() * Math.PI * 2;

  // THICK TORUS: orbital inclinations up to 20° (Rayleigh distribution)
  const inclination = Math.abs(gaussRandom() * 0.13);
  const yScale      = Math.tan(inclination) * r;
  const ySign       = Math.random() < 0.5 ? 1 : -1;

  // Orbital eccentricity: 0.05–0.33
  const ecc  = 0.05 + Math.random() * 0.28;
  const rEff = r * (1 + ecc * Math.sin(angle));

  const type = asteroidTypeAt(r);
  const size = randomAsteroidSize();

  // NPA tumbling: ~10% of asteroids tumble on multiple axes
  const isNPA = Math.random() < 0.10;

  asteroidData.push({
    r:     rEff,
    angle,
    x:     Math.cos(angle) * rEff,
    y:     ySign * yScale * 0.5,
    z:     Math.sin(angle) * rEff,
    orbitSpeed:  0.00008 + Math.random() * 0.00030,
    keplerFactor: Math.pow(BELT_INNER / Math.max(rEff, BELT_INNER), 0.5),
    size,
    type,
    rotAxis1: new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5
    ).normalize(),
    rotSpeed1: (0.003 + Math.random() * 0.012) * (Math.random() < 0.5 ? 1 : -1),
    rotAxis2: isNPA ? new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5
    ).normalize() : null,
    rotSpeed2: isNPA ? (0.001 + Math.random() * 0.005) * (Math.random() < 0.5 ? 1 : -1) : 0,
    rotAngle1: Math.random() * Math.PI * 2,
    rotAngle2: Math.random() * Math.PI * 2,
    shapeSeed: Math.random() * 100,
    colorIdx: Math.floor(Math.random() * ASTEROID_TYPES[type].colors.length),
  });
}

// ── CREATE 3 INSTANCED MESHES (one per spectral type) ─────────────────────
// Separate InstancedMesh per type allows different materials (color, roughness)
function createBeltMesh(type) {
  const geo = new THREE.IcosahedronGeometry(1.0, 1);

  // Per-vertex displacement: irregular, cratered, rubble-pile appearance
  const posAttr = geo.attributes.position;
  const vertCount = posAttr.count;
  const noise3 = (x, y, z, seed) => {
    const n = Math.sin(x * 127.1 + seed) * 43758.5 +
              Math.sin(y * 311.7 + seed) * 12345.6 +
              Math.sin(z * 74.7  + seed) * 98765.4;
    return (n - Math.floor(n)) * 2.0 - 1.0;
  };

  for (let v = 0; v < vertCount; v++) {
    const x = posAttr.getX(v);
    const y = posAttr.getY(v);
    const z = posAttr.getZ(v);
    const disp = noise3(x, y, z, 42) * 0.35
               + noise3(x * 3, y * 3, z * 3, 99) * 0.18
               + noise3(x * 7, y * 7, z * 7, 17) * 0.08;
    posAttr.setXYZ(v, x + x * disp, y + y * disp, z + z * disp);
  }
  geo.computeVertexNormals();

  const typeData = ASTEROID_TYPES[type];
  // Rocky surface material — emissive gives subtle self-illumination for depth
  const emissiveColors = { C: 0x0a0a10, S: 0x1a1208, M: 0x141210 };
  const mat = new THREE.MeshStandardMaterial({
    color:     typeData.colors[0],
    roughness: typeData.roughness,
    metalness: typeData.metalness,
    emissive:  new THREE.Color(emissiveColors[type]),
    emissiveIntensity: 0.4,
    envMapIntensity: type === 'M' ? 1.5 : 0.5,
  });

  const typeAsteroids = asteroidData.filter(d => d.type === type);
  const mesh = new THREE.InstancedMesh(geo, mat, typeAsteroids.length);

  const _d    = new THREE.Object3D();
  const color = new THREE.Color();
  const colors3 = ASTEROID_TYPES[type].colors;

  typeAsteroids.forEach((d, i) => {
    _d.position.set(d.x, d.y, d.z);
    _d.scale.setScalar(d.size);
    _d.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );
    _d.updateMatrix();
    mesh.setMatrixAt(i, _d.matrix);
    // Per-instance color variation within type
    color.setHex(colors3[d.colorIdx]);
    const brighten = 0.92 + Math.random() * 0.16;
    color.r *= brighten;
    color.g *= brighten;
    color.b *= brighten;
    mesh.setColorAt(i, color);
  });

  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow    = false;
  mesh.receiveShadow = false;
  scene.add(mesh);

  return { mesh, asteroids: typeAsteroids };
}

const beltC = createBeltMesh('C');
const beltS = createBeltMesh('S');
const beltM = createBeltMesh('M');

const allBeltMeshes = [
  { ...beltC, type: 'C' },
  { ...beltS, type: 'S' },
  { ...beltM, type: 'M' },
];

// ── ZODIACAL DUST — fine particle haze in the belt plane ─────────────────
const dustGeo = new THREE.RingGeometry(BELT_INNER * 0.9, BELT_OUTER * 1.1, 128, 4);
const dustMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader: `
    varying float vRadius;
    void main() {
      vRadius = length(position.xy);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    varying float vRadius;
    void main() {
      float inner = ${(BELT_INNER * 0.9).toFixed(1)};
      float outer = ${(BELT_OUTER * 1.1).toFixed(1)};
      float t = (vRadius - inner) / (outer - inner);
      float dustDensity = exp(-4.0 * pow(t - 0.5, 2.0));
      float shimmer = sin(uTime * 0.3 + vRadius * 0.8) * 0.05 + 0.95;
      gl_FragColor = vec4(1.0, 0.96, 0.88, dustDensity * shimmer * 0.04);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  side: THREE.DoubleSide,
});
const zodiacalDust = new THREE.Mesh(dustGeo, dustMat);
zodiacalDust.rotation.x = Math.PI / 2;
scene.add(zodiacalDust);

// ── Animation helpers (module scope — reused every frame) ──
const _dummy = new THREE.Object3D();
const _quat1 = new THREE.Quaternion();
const _quat2 = new THREE.Quaternion();
scene.add(new THREE.PointLight(0x6c63ff, 2, 60)); // hero station light

// ── BELT LIGHTING — directional sunlight + ambient for rocky surface visibility ──
const beltSunlight = new THREE.DirectionalLight(0xfff4e6, 1.2); // warm sunlight
beltSunlight.position.set(30, 20, 15); // angled from upper-right — creates shadow relief on rocky surfaces
scene.add(beltSunlight);
const beltAmbient = new THREE.AmbientLight(0x1a1a2e, 0.6); // faint deep-space ambient
scene.add(beltAmbient);

// ═══════════════════════════════════════════════════════════
// ABOUT STATION (Z = -200) — Constellation
// ═══════════════════════════════════════════════════════════
const constGroup = new THREE.Group();
constGroup.position.set(10, 0, -200);

// Generate stars
const constGeo = new THREE.BufferGeometry();
const constCount = 60;
const constPos = new Float32Array(constCount * 3);
for(let i=0; i<constCount; i++) {
  constPos[i*3] = (Math.random()-0.5)*40;
  constPos[i*3+1] = (Math.random()-0.5)*30;
  constPos[i*3+2] = (Math.random()-0.5)*20;
}
constGeo.setAttribute('position', new THREE.BufferAttribute(constPos, 3));
const constMat = new THREE.PointsMaterial({ color: 0x00d4ff, size: 0.6, transparent: true, opacity: 0.8 });
const constPoints = new THREE.Points(constGeo, constMat);
constGroup.add(constPoints);

// Generate lines (connect nearby stars)
const linePos = [];
for(let i=0; i<constCount; i++) {
  for(let j=i+1; j<constCount; j++) {
    const dx = constPos[i*3] - constPos[j*3];
    const dy = constPos[i*3+1] - constPos[j*3+1];
    const dz = constPos[i*3+2] - constPos[j*3+2];
    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
    if(dist < 12) {
      linePos.push(constPos[i*3], constPos[i*3+1], constPos[i*3+2]);
      linePos.push(constPos[j*3], constPos[j*3+1], constPos[j*3+2]);
    }
  }
}
const lineGeo = new THREE.BufferGeometry();
lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePos, 3));
const lineMat = new THREE.LineBasicMaterial({ color: 0x6c63ff, transparent: true, opacity: 0.3 });
const constLines = new THREE.LineSegments(lineGeo, lineMat);
constGroup.add(constLines);

const constHitbox = new THREE.Mesh(new THREE.SphereGeometry(25), new THREE.MeshBasicMaterial({visible:false}));
constHitbox.userData = { isHoverable: true };
constGroup.add(constHitbox);
scene.add(constGroup);

// ═══════════════════════════════════════════════════════════
// SKILLS STATION (Z = -400) — Spiral Galaxy (Now in skills-galaxy.js)
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
// PROJECTS STATION (Z = -600) — Scientifically Accurate Black Hole
// Physics: Schwarzschild metric, EHT M87* (2019), NASA Goddard (2024)
// ═══════════════════════════════════════════════════════════
const BH_Rs = 1.0, BH_Rph = 1.5, BH_Risco = 3.0, BH_Rdisk = 12.0, BH_Rcorona = 18.0, BH_JetH = 40.0, BH_SCALE = 4.0;

const blackHoleGroup = new THREE.Group();
blackHoleGroup.position.set(15, 5, -600);
blackHoleGroup.rotation.x = Math.PI / 6;

// Layer 1+2: Event Horizon — pure black sphere (shadow ~2Rs with lensing)
const bhHorizon = new THREE.Mesh(
  new THREE.SphereGeometry(BH_Rs * 2.0 * BH_SCALE, 64, 64),
  new THREE.MeshBasicMaterial({ color: 0x000000, depthWrite: true })
);
blackHoleGroup.add(bhHorizon);

// Layer 3: Photon Ring — razor-thin, Doppler beaming
const bhPhotonGeo = new THREE.TorusGeometry(BH_Rph * BH_SCALE, 0.06 * BH_SCALE, 8, 180);
const bhPhotonMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uBeamAngle: { value: 0 } },
  vertexShader: `
    varying float vAngle;
    void main() {
      vAngle = atan(position.z, position.x) + 3.14159;
      gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: `
    uniform float uBeamAngle;
    varying float vAngle;
    void main() {
      float beaming = sin(vAngle - uBeamAngle) * 0.5 + 0.5;
      float doppler = mix(0.5, 2.5, beaming);
      gl_FragColor = vec4(vec3(1.0, 0.97, 0.90) * doppler, doppler * 0.9);
    }`,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
});
const bhPhotonRing = new THREE.Mesh(bhPhotonGeo, bhPhotonMat);
blackHoleGroup.add(bhPhotonRing);

// Layer 4+5: Accretion Disk — temperature gradient + Doppler + Keplerian spiral
const bhDiskGeo = new THREE.RingGeometry(BH_Risco * BH_SCALE, BH_Rdisk * BH_SCALE, 256, 64);
const bhDiskMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 }, uBeamAngle: { value: 0 },
    uInnerRadius: { value: BH_Risco * BH_SCALE }, uOuterRadius: { value: BH_Rdisk * BH_SCALE },
    uColorInner: { value: new THREE.Color(1.00, 0.98, 0.95) },
    uColorMid:   { value: new THREE.Color(1.00, 0.55, 0.10) },
    uColorOuter: { value: new THREE.Color(0.80, 0.15, 0.05) },
    uOpacity: { value: 0.95 },
  },
  vertexShader: `
    varying float vRadius, vAngle;
    void main() {
      vRadius = length(position.xy);
      vAngle  = atan(position.y, position.x);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: `
    uniform float uTime, uBeamAngle, uInnerRadius, uOuterRadius, uOpacity;
    uniform vec3 uColorInner, uColorMid, uColorOuter;
    varying float vRadius, vAngle;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.0-2.0*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);}
    void main() {
      float t = clamp((vRadius-uInnerRadius)/(uOuterRadius-uInnerRadius),0.0,1.0);
      vec3 col = t < 0.4 ? mix(uColorInner,uColorMid,t/0.4) : mix(uColorMid,uColorOuter,(t-0.4)/0.6);
      float kepler = pow(max(vRadius/uInnerRadius,1.0),-1.5);
      float sAngle = vAngle - uTime*kepler*0.3;
      float spiral = sin(sAngle*4.0+t*6.0)*0.15+0.85+noise(vec2(sAngle*3.0,t*8.0))*0.3;
      float doppler = mix(0.4,2.8,sin(vAngle-uBeamAngle+3.14159)*0.5+0.5);
      float redshift = 1.0-0.35*(1.0-t);
      vec3 final = col*spiral*doppler*redshift;
      float fade = smoothstep(0.0,0.06,t)*smoothstep(1.0,0.85,t)*smoothstep(0.0,0.04,t);
      gl_FragColor = vec4(final, fade*uOpacity);
    }`,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
});
const bhAccretionDisk = new THREE.Mesh(bhDiskGeo, bhDiskMat);
bhAccretionDisk.rotation.x = Math.PI / 2;
bhAccretionDisk.rotation.z = 0.26;
blackHoleGroup.add(bhAccretionDisk);

// Secondary lensed image (far side visible above black hole)
const bhSecGeo = new THREE.RingGeometry(BH_Rph * BH_SCALE, BH_Risco * BH_SCALE * 1.5, 128, 16);
const bhSecMat = bhDiskMat.clone();
bhSecMat.uniforms = { ...bhDiskMat.uniforms };
bhSecMat.uniforms.uOpacity = { value: 0.35 };
const bhSecDisk = new THREE.Mesh(bhSecGeo, bhSecMat);
bhSecDisk.rotation.x = Math.PI / 2;
bhSecDisk.rotation.z = 0.26;
bhSecDisk.scale.y = -0.3;
bhSecDisk.position.y = BH_Rs * BH_SCALE * 2.2;
blackHoleGroup.add(bhSecDisk);

// Layer 6: Corona — flat horizontal X-ray plasma (IXPE 2024 confirmed shape)
const bhCoronaMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0.6, 0.8, 1.0) }, uOpacity: { value: 0.06 } },
  vertexShader: `varying float vHeight;
    void main() { vHeight = abs(position.y) / ${(BH_Rcorona * BH_SCALE).toFixed(1)};
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform float uTime; uniform vec3 uColor; uniform float uOpacity; varying float vHeight;
    void main() { float eq = 1.0-smoothstep(0.0,0.4,vHeight); float p = sin(uTime*0.8)*0.15+0.85;
      gl_FragColor = vec4(uColor, eq*uOpacity*p); }`,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
});
const bhCorona = new THREE.Mesh(new THREE.SphereGeometry(BH_Rcorona * BH_SCALE, 32, 16), bhCoronaMat);
bhCorona.scale.y = 0.12;
blackHoleGroup.add(bhCorona);

// Layer 7: Relativistic Jets — cyan synchrotron radiation
function createBHJet(dir) {
  const g = new THREE.Group();
  const jMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uDirection: { value: dir }, uColor: { value: new THREE.Color(0.0, 0.83, 1.0) } },
    vertexShader: `uniform float uDirection; varying float vP;
      void main() { vP = position.y*uDirection/${(BH_JetH * BH_SCALE).toFixed(1)}+0.5;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uTime,uDirection; uniform vec3 uColor; varying float vP;
      void main() { float df=pow(1.0-smoothstep(0.0,1.0,vP),1.5); float bp=sin((vP-uTime*0.4)*20.0)*0.3+0.7;
        float bm=uDirection>0.0?1.8:0.6; gl_FragColor=vec4(uColor*(df*1.5+0.5),df*bp*bm*0.5); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const jMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.1*BH_SCALE, 0.5*BH_SCALE, BH_JetH*BH_SCALE, 16, 32, true), jMat);
  jMesh.position.y = dir * BH_JetH * BH_SCALE * 0.5;
  g.add(jMesh);
  const sheath = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5*BH_SCALE, 2.0*BH_SCALE, BH_JetH*BH_SCALE*0.6, 16, 8, true),
    new THREE.MeshBasicMaterial({ color: 0x003344, transparent: true, opacity: 0.04, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  sheath.position.y = dir * BH_JetH * BH_SCALE * 0.3;
  g.add(sheath);
  return { group: g, mat: jMat };
}
const bhTopJet = createBHJet(1), bhBotJet = createBHJet(-1);
blackHoleGroup.add(bhTopJet.group);
blackHoleGroup.add(bhBotJet.group);

// Ambient glow sprite (M87*-like orange-purple halo)
const bhGlowCanvas = document.createElement('canvas');
bhGlowCanvas.width = bhGlowCanvas.height = 256;
const bhGlowCtx = bhGlowCanvas.getContext('2d');
const bhGrad = bhGlowCtx.createRadialGradient(128,128,0,128,128,128);
bhGrad.addColorStop(0,'rgba(255,120,30,0.25)');
bhGrad.addColorStop(0.25,'rgba(108,63,255,0.15)');
bhGrad.addColorStop(0.6,'rgba(0,10,40,0.08)');
bhGrad.addColorStop(1,'rgba(0,0,0,0)');
bhGlowCtx.fillStyle = bhGrad;
bhGlowCtx.fillRect(0,0,256,256);
const bhGlow = new THREE.Sprite(new THREE.SpriteMaterial({
  map: new THREE.CanvasTexture(bhGlowCanvas), blending: THREE.AdditiveBlending, transparent: true, opacity: 0.8, depthWrite: false,
}));
bhGlow.scale.set(BH_Rdisk*BH_SCALE*3.5, BH_Rdisk*BH_SCALE*3.5, 1);
blackHoleGroup.add(bhGlow);

// Disk light (pulsing accretion variability)
const bhDiskLight = new THREE.PointLight(0xff6030, 2, 80 * BH_SCALE);
blackHoleGroup.add(bhDiskLight);

const bhHitbox = new THREE.Mesh(new THREE.SphereGeometry(35), new THREE.MeshBasicMaterial({visible:false}));
bhHitbox.userData = { isHoverable: true };
blackHoleGroup.add(bhHitbox);
scene.add(blackHoleGroup);

// ═══════════════════════════════════════════════════════════
// JOURNEY STATION (Z = -800) — Wormhole (Now in journey-wormhole.js)
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
// GITHUB STATION (Z = -1000) — Now in github-quasar.js
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// CONTACT STATION (Z = -1200) — Supernova
// ═══════════════════════════════════════════════════════════
const novaGroup = new THREE.Group();
novaGroup.position.set(0, 0, -1200);

// Core
const novaCore = new THREE.Mesh(new THREE.SphereGeometry(12, 32, 32), new THREE.MeshBasicMaterial({ color: 0xffddaa }));
novaGroup.add(novaCore);

// ═══════════════════════════════════════════════════════════
// CONTACT STATION (Z = -1200) — Supernova (Now in contact-supernova.js)
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// EASTER EGG — Hidden Pulsar (Z = -120)
// ═══════════════════════════════════════════════════════════

const pulsarGeo = new THREE.SphereGeometry(0.5, 16, 16);
const pulsarMat = new THREE.MeshStandardMaterial({ color: 0xff6b9d, emissive: 0xff2266, emissiveIntensity: 1.5 });
const pulsar = new THREE.Mesh(pulsarGeo, pulsarMat);
pulsar.position.set(15, 3, -120);
pulsar.userData = { pulsar: true };
scene.add(pulsar);

// ═══════════════════════════════════════════════════════════
// ANIMATION LOOP — Register with scene.js
// ═══════════════════════════════════════════════════════════

startLoop((elapsed) => {
  // Decay warp value smoothly
  _warpValue *= 0.88;

  // Stars parallax + warp stretch
  starLayers.forEach(layer => {
    layer.mat.uniforms.uTime.value = elapsed;
    layer.mat.uniforms.uWarp.value = _warpValue;
    layer.points.position.x += (mouseNDC.x * layer.speedMult * 3 - layer.points.position.x) * 0.05;
    layer.points.position.y += (mouseNDC.y * layer.speedMult * 2 - layer.points.position.y) * 0.05;
  });
  milkyWayMat.uniforms.uTime.value = elapsed;

  // Planet
  planet.rotation.y += 0.001;
  planetMat.uniforms.uTime.value = elapsed;

  // Moon orbit
  moonOrbit.phase += moonOrbit.speed;
  moon.position.set(
    Math.cos(moonOrbit.phase) * moonOrbit.radius,
    Math.sin(moonOrbit.phase) * moonOrbit.radius * Math.sin(moonOrbit.inclination),
    Math.sin(moonOrbit.phase) * moonOrbit.radius * 0.4
  );
  moon.rotation.y += 0.0005;
  moonMat.uniforms.uTime.value = elapsed;

  // ── ASTEROID BELT ANIMATION ─────────────────────────────────────────────────
  // Per-type InstancedMesh update: Keplerian orbits, NPA tumbling, vertical bob
  allBeltMeshes.forEach(({ mesh, asteroids: typeAsteroids }) => {
    typeAsteroids.forEach((d, i) => {
      // Keplerian orbital motion: inner asteroids orbit faster
      d.angle += d.orbitSpeed * d.keplerFactor;

      // Eccentric orbit: modulate radius with angle
      const ecc = 0.10;
      const rEff = d.r * (1.0 + ecc * Math.sin(d.angle * 3.7 + d.shapeSeed));

      _dummy.position.set(
        Math.cos(d.angle) * rEff,
        d.y + Math.sin(elapsed * 0.4 + d.shapeSeed) * d.r * 0.02,
        Math.sin(d.angle) * rEff
      );

      // Rotation 1: primary spin axis
      d.rotAngle1 += d.rotSpeed1;
      _quat1.setFromAxisAngle(d.rotAxis1, d.rotAngle1);

      if (d.rotAxis2) {
        // NPA tumbling: compound rotation around second axis
        d.rotAngle2 += d.rotSpeed2;
        _quat2.setFromAxisAngle(d.rotAxis2, d.rotAngle2);
        _dummy.quaternion.multiplyQuaternions(_quat1, _quat2);
      } else {
        _dummy.quaternion.copy(_quat1);
      }

      _dummy.scale.setScalar(d.size);
      _dummy.updateMatrix();
      mesh.setMatrixAt(i, _dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  dustMat.uniforms.uTime.value = elapsed;

  // Constellation
  let constHover = constHitbox.userData.isHovered ? 1 : 0;
  constLines.material.opacity = 0.3 + Math.sin(elapsed * 2) * 0.1 + constHover * 0.4;
  constGroup.rotation.y = elapsed * 0.05 + constHover * elapsed * 0.1;

  // Galaxy — animation now in skills-galaxy.js

  // Black Hole (scientifically accurate)
  let bhHover = bhHitbox.userData.isHovered ? 1 : 0;
  const bhCamAngle = Math.atan2(
    camera.position.x - blackHoleGroup.position.x,
    camera.position.z - blackHoleGroup.position.z
  );
  bhDiskMat.uniforms.uTime.value = elapsed;
  bhDiskMat.uniforms.uBeamAngle.value = bhCamAngle;
  bhPhotonMat.uniforms.uTime.value = elapsed;
  bhPhotonMat.uniforms.uBeamAngle.value = bhCamAngle;
  bhCoronaMat.uniforms.uTime.value = elapsed;
  bhTopJet.mat.uniforms.uTime.value = elapsed;
  bhBotJet.mat.uniforms.uTime.value = elapsed;
  bhAccretionDisk.rotation.y += 0.0004 + bhHover * 0.002;
  bhSecDisk.rotation.y += 0.0004 + bhHover * 0.002;
  bhPhotonRing.rotation.z += 0.002 + bhHover * 0.005;
  bhDiskLight.intensity = 2.0 + Math.sin(elapsed*1.3)*0.6 + Math.sin(elapsed*3.7)*0.3 + bhHover*2;
  bhDiskLight.color.setHSL(0.06 + Math.sin(elapsed*0.4)*0.02, 0.9, 0.5);

  // Wormhole — animation now in journey-wormhole.js

  // Quasar — animation now in github-quasar.js

  // Supernova — animation now in contact-supernova.js


  // Pulsar glow
  const pPulse = Math.sin(elapsed * 4) * 0.5 + 0.5;
  pulsar.material.emissiveIntensity = 1.0 + pPulse * 2.0;
  pulsar.scale.setScalar(0.5 + pPulse * 0.15);
});

export {
  starLayers, mouseNDC,
  planet, moon, moonOrbit, beltC, beltS, beltM, allBeltMeshes,
  constGroup, constHitbox,
  blackHoleGroup, bhHitbox,
  pulsar,
};

// ── Pulsar click easter egg (lazy audio import) ──
// Uses raycasting from cursor.js mouse position
// camera already imported at top
const _pulsarRaycaster = new THREE.Raycaster();
const _pulsarMouse = new THREE.Vector2();

window.addEventListener('mousemove', (e) => {
  _pulsarMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  _pulsarMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

window.addEventListener('click', () => {
  _pulsarRaycaster.setFromCamera(_pulsarMouse, camera);
  const hits = _pulsarRaycaster.intersectObject(pulsar, false);
  if (hits.length > 0) {
    import('./audio.js').then(({ playPulsarBurst }) => playPulsarBurst());
    // Flash pink + scale burst
    pulsar.material.emissiveIntensity = 8;
    if (typeof gsap !== 'undefined') {
      gsap.to(pulsar.scale, { x: 3, y: 3, z: 3, duration: 0.2, yoyo: true, repeat: 1, ease: 'power2.out' });
      gsap.to(pulsar.material, { emissiveIntensity: 1.5, duration: 1.0, delay: 0.4 });
    }
    console.log('%c🌸 Pulsar Easter Egg Found! The cosmos applauds you.', 'color:#ff6b9d;font-weight:bold;font-family:monospace;');
  }
});



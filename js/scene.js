// ═══════════════════════════════════════════════════════════
// SCENE.JS — Single WebGLRenderer, EffectComposer, Animation Loop
// v5 ENHANCED — Foundation module
// ═══════════════════════════════════════════════════════════

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ── Canvas + Renderer ──
const canvas = document.getElementById('bg-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
canvas.style.cssText = 'position:fixed;top:0;left:0;z-index:-1;pointer-events:none';

// ── Scene + Camera ──
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.008); // Exponential fog looks more natural for space
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 0, 30); // Hero view — will be overridden by journey.js

// ── Ambient light (very dim, just to prevent total black on unlit faces) ──
scene.add(new THREE.AmbientLight(0x111133, 0.3));

// ── EffectComposer + Post-Processing Chain ──
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

// Bloom
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.5,   // strength
  0.4,   // radius
  0.85   // threshold
);
composer.addPass(bloomPass);

// Film Grain
const filmGrainPass = new ShaderPass({
  uniforms: {
    tDiffuse:    { value: null },
    uTime:       { value: 0 },
    uIntensity:  { value: 0.04 },
  },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uIntensity;
    varying vec2 vUv;
    float rand(vec2 co) { return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float grain = rand(vUv + fract(uTime)) * uIntensity;
      color.rgb += grain - uIntensity * 0.5;
      gl_FragColor = color;
    }
  `,
});
composer.addPass(filmGrainPass);

// Gravitational Lens (starts at 0 — activated near contact)
const gravLensPass = new ShaderPass({
  uniforms: {
    tDiffuse:  { value: null },
    uStrength: { value: 0 },
    uCenter:   { value: new THREE.Vector2(0.5, 0.5) },
    uTime:     { value: 0 },
    uAspect:   { value: window.innerWidth / window.innerHeight },
  },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uStrength;
    uniform vec2 uCenter;
    uniform float uTime;
    uniform float uAspect;
    varying vec2 vUv;
    void main() {
      if (uStrength < 0.005) { gl_FragColor = texture2D(tDiffuse, vUv); return; }
      vec2 delta = vUv - uCenter;
      // Correct for aspect ratio to make the lens perfectly circular
      delta.x *= uAspect;
      float dist = length(delta);
      float lensStrength = uStrength * 0.15;
      float lens = lensStrength / (dist * dist + 0.1);
      float angle = lens * 0.5 + uTime * 0.2;
      float cosA = cos(angle * 0.05);
      float sinA = sin(angle * 0.05);
      vec2 rotated = vec2(cosA * delta.x - sinA * delta.y, sinA * delta.x + cosA * delta.y);
      // Remove aspect correction before applying back to UV coordinates
      rotated.x /= uAspect;
      delta.x /= uAspect;
      vec2 distortedUv = clamp(uCenter + rotated - delta * lens, 0.0, 1.0);
      gl_FragColor = texture2D(tDiffuse, distortedUv);
    }
  `,
});
composer.addPass(gravLensPass);
gravLensPass.enabled = false; // Permanently disabled — user preference

// Chromatic Aberration (starts at 0 — spikes on warp)
const chromaticAberrationPass = new ShaderPass({
  uniforms: {
    tDiffuse:  { value: null },
    uStrength: { value: 0 },
    uTime:     { value: 0 },
  },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uStrength;
    uniform float uTime;
    varying vec2 vUv;
    void main() {
      if (uStrength < 0.005) { gl_FragColor = texture2D(tDiffuse, vUv); return; }
      vec2 offset = vec2(uStrength * 0.012, 0.0);
      vec2 vertOffset = vec2(0.0, uStrength * 0.004 * sin(vUv.y * 10.0 + uTime));
      float r = texture2D(tDiffuse, vUv + offset + vertOffset).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - offset - vertOffset).b;
      gl_FragColor = vec4(r, g, b, 1.0);
    }
  `,
});
composer.addPass(chromaticAberrationPass);

// Output
composer.addPass(new OutputPass());

// ── WebGL2 fallback ──
if (!renderer.capabilities.isWebGL2) {
  gravLensPass.enabled = false;
  chromaticAberrationPass.enabled = false;
}

// ── Export pass uniforms for other modules ──
const chromaticUniforms = chromaticAberrationPass.uniforms;
const gravLensUniforms = gravLensPass.uniforms;
const filmGrainUniforms = filmGrainPass.uniforms;

// ── Animation Loop ──
const clock = new THREE.Clock();
const loopCallbacks = [];

function startLoop(callback) {
  if (callback) loopCallbacks.push(callback);
}

// Nebula scene hook (populated by nebula.js after import)
let _nebulaScene = null;
let _nebulaCamera = null;
function setNebulaScene(ns, nc) { _nebulaScene = ns; _nebulaCamera = nc; }

// Scroll-driven effect state
let _scrollProgress = 0;
window.addEventListener('scroll', () => {
  _scrollProgress = window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight);
}, { passive: true });

function animate() {
  requestAnimationFrame(animate);
  const elapsed = clock.getElapsedTime();

  // Render nebula fullscreen quad first (additive on top later)
  if (_nebulaScene && _nebulaCamera) {
    renderer.autoClear = false;
    renderer.clear();
    renderer.render(_nebulaScene, _nebulaCamera);
    renderer.autoClear = true;
  }

  // Update post-processing time uniforms
  filmGrainUniforms.uTime.value = elapsed;
  chromaticUniforms.uTime.value = elapsed;
  // gravLensPass permanently disabled — no update needed

  // Run all registered callbacks
  loopCallbacks.forEach(cb => cb(elapsed));

  composer.render();
}
animate();

// ── Resize ──
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  bloomPass.resolution.set(w, h);
  gravLensPass.uniforms.uAspect.value = w / h;
});

export {
  scene, camera, renderer, composer, canvas,
  startLoop, setNebulaScene,
  chromaticUniforms, gravLensUniforms, filmGrainUniforms,
  bloomPass, gravLensPass, chromaticAberrationPass,
};

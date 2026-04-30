// ═══════════════════════════════════════════════════════════
// NEBULA.JS — Raymarched Volumetric Fog Layer
// v5 ENHANCED Module 6
// Fullscreen quad shader — layered FBM noise volumetric nebula
// ═══════════════════════════════════════════════════════════

import * as THREE from 'three';
import { scene, startLoop } from './scene.js';

const nebulaVert = `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
`;

const nebulaFrag = `
uniform float uTime;
uniform float uDensity;    // 0.0 → 1.0, driven by scroll
uniform vec2  uMouse;

// FBM noise
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i + vec2(1,0)), c = hash(i + vec2(0,1)), d = hash(i + vec2(1,1));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.1; a *= 0.5; }
  return v;
}

varying vec2 vUv;

void main() {
  vec2 uv = vUv * 2.0 - 1.0;
  uv.x += uMouse.x * 0.04;
  uv.y += uMouse.y * 0.04;

  // Layered nebula clouds
  float t = uTime * 0.04;
  float n1 = fbm(uv * 1.8 + vec2(t, t * 0.7));
  float n2 = fbm(uv * 2.8 + vec2(-t * 0.6, t * 1.1) + n1 * 0.4);
  float n3 = fbm(uv * 4.0 + n2 * 0.5 + vec2(t * 0.3, -t * 0.4));

  // Three nebula color bands
  vec3 c1 = vec3(0.25, 0.10, 0.60); // deep purple
  vec3 c2 = vec3(0.00, 0.40, 0.80); // electric blue
  vec3 c3 = vec3(0.60, 0.05, 0.40); // magenta
  vec3 nebula = mix(mix(c1, c2, n2), c3, n3 * 0.5);

  // Radial vignette to keep edges dark
  float vignette = 1.0 - smoothstep(0.3, 1.0, length(uv * 0.7));
  float alpha = n1 * n2 * vignette * uDensity * 0.22;

  gl_FragColor = vec4(nebula, alpha);
}
`;

// Fullscreen quad — rendered BEHIND everything else
const nebulaGeo = new THREE.PlaneGeometry(2, 2);
const nebulaMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime:    { value: 0 },
    uDensity: { value: 0.0 },
    uMouse:   { value: new THREE.Vector2(0, 0) },
  },
  vertexShader:   nebulaVert,
  fragmentShader: nebulaFrag,
  transparent:    true,
  depthWrite:     false,
  depthTest:      false,
  blending:       THREE.AdditiveBlending,
});

// Use a separate orthographic camera scene for the fullscreen quad
const nebulaScene  = new THREE.Scene();
const nebulaCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const nebulaMesh   = new THREE.Mesh(nebulaGeo, nebulaMat);
nebulaScene.add(nebulaMesh);

// ── Mouse tracking ──
window.addEventListener('mousemove', (e) => {
  nebulaMat.uniforms.uMouse.value.set(
    (e.clientX / window.innerWidth) * 2 - 1,
    -(e.clientY / window.innerHeight) * 2 + 1
  );
});

// ── Density driven by scroll (0 at hero, peaks at skills Z=-400, drops at contact) ──
let targetDensity = 0;
window.addEventListener('scroll', () => {
  const progress = window.scrollY / (document.body.scrollHeight - window.innerHeight);
  // Bell curve: peak density around 30-60% scroll
  targetDensity = Math.sin(progress * Math.PI) * 0.8;
}, { passive: true });

// ── Animation loop ──
startLoop((elapsed) => {
  nebulaMat.uniforms.uTime.value = elapsed;
  nebulaMat.uniforms.uDensity.value += (targetDensity - nebulaMat.uniforms.uDensity.value) * 0.03;
});

export { nebulaScene, nebulaCamera, nebulaMat };

// ═══════════════════════════════════════════════════════════
// SKILLS-GALAXY.JS — Scientifically Accurate Spiral Galaxy
// Placement: Skills Station, Z = -400
// Features: Core, Bulge, Bar, Disk, Spiral Arms, Dust Lanes, Halo
// ═══════════════════════════════════════════════════════════

import * as THREE from 'three';
import { scene, startLoop } from './scene.js';

// ── SCALE SETTINGS ──────────────────────────────────────────
const R = {
  core: 1.5,
  bulgeR: 8.0,
  bulgeH: 4.0,
  bar: 12.0,
  diskR: 45.0,
  diskH: 0.6,
  haloR: 60.0
};

// ── GROUP SETUP ─────────────────────────────────────────────
const galaxyGroup = new THREE.Group();
galaxyGroup.position.set(-10, -5, -400);
// Tilt to show both face and edge details
galaxyGroup.rotation.x = Math.PI * 0.35;
galaxyGroup.rotation.z = Math.PI * 0.15;
scene.add(galaxyGroup);

// ── PALETTE ─────────────────────────────────────────────────
const C = {
  core: new THREE.Color(0xffffff),
  bulge: new THREE.Color(0xffcc88),
  arm: new THREE.Color(0x88ccff),
  nebula: new THREE.Color(0xff66aa),
  interarm: new THREE.Color(0xffddaa),
  halo: new THREE.Color(0xaa5544)
};

// ═══════════════════════════════════════════════════════════
// STARS (BULGE, BAR, DISK, ARMS, HALO)
// ═══════════════════════════════════════════════════════════
const starCount = 60000;
const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(starCount * 3);
const starCol = new Float32Array(starCount * 3);
const starSizes = new Float32Array(starCount);

const arms = 2;
const spiralWinding = 3.5;

function gaussianRandom(mean = 0, stdev = 1) {
  const u = 1 - Math.random();
  const v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdev + mean;
}

for (let i = 0; i < starCount; i++) {
  let x, y, z;
  let color = new THREE.Color();
  let size = 1.0;
  
  const rand = Math.random();
  
  if (rand < 0.05) {
    // 1. HALO (5%)
    const r = Math.pow(Math.random(), 0.5) * R.haloR;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    x = r * Math.sin(phi) * Math.cos(theta);
    y = r * Math.sin(phi) * Math.sin(theta);
    z = r * Math.cos(phi);
    color.copy(C.halo).lerp(C.interarm, Math.random());
    size = 0.5;
  } 
  else if (rand < 0.25) {
    // 2. BULGE (20%)
    const r = Math.abs(gaussianRandom(0, R.bulgeR * 0.4));
    const theta = Math.random() * Math.PI * 2;
    x = r * Math.cos(theta);
    y = gaussianRandom(0, R.bulgeH * 0.4) * (1.0 - r/R.bulgeR);
    z = r * Math.sin(theta);
    color.copy(C.bulge).lerp(C.core, 1.0 - (r / R.bulgeR));
    size = 1.2;
  }
  else if (rand < 0.35) {
    // 3. BAR (10%)
    const r = gaussianRandom(0, R.bar);
    const theta = gaussianRandom(0, 0.2); // tight angle
    x = r * Math.cos(theta);
    y = gaussianRandom(0, R.diskH);
    z = r * Math.sin(theta);
    color.copy(C.bulge);
    size = 1.0;
  }
  else {
    // 4. DISK & ARMS (65%)
    const r = Math.pow(Math.random(), 0.7) * R.diskR;
    
    // Logarithmic spiral base angle
    const spiralAngle = Math.log(r / R.core) * spiralWinding;
    const armOffset = (Math.floor(Math.random() * arms) * Math.PI * 2) / arms;
    
    // Arm vs Interarm distribution
    const isArm = Math.random() < 0.6; // 60% of disk stars are concentrated in arms
    
    let theta;
    if (isArm) {
      // Clustered tightly around arm curve
      theta = spiralAngle + armOffset + gaussianRandom(0, 0.2);
      
      // HII regions and OB clusters in arms
      if (Math.random() < 0.05) {
        color.copy(C.nebula); // Pink HII
        size = 3.0;
      } else if (Math.random() < 0.1) {
        color.copy(C.arm); // Electric blue OB
        size = 2.5;
      } else {
        color.copy(C.arm).lerp(C.interarm, Math.random() * 0.5);
      }
    } else {
      // Scattered across interarm
      theta = Math.random() * Math.PI * 2;
      color.copy(C.interarm).lerp(C.halo, Math.random() * 0.5);
      size = 0.8;
    }
    
    // Disk thickness flares out at edges
    const thickness = R.diskH * (1.0 + r / R.diskR * 2.0);
    x = r * Math.cos(theta);
    y = gaussianRandom(0, thickness);
    z = r * Math.sin(theta);
  }

  starPos[i*3] = x;
  starPos[i*3+1] = y;
  starPos[i*3+2] = z;
  starCol[i*3] = color.r;
  starCol[i*3+1] = color.g;
  starCol[i*3+2] = color.b;
  starSizes[i] = size;
}

starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
starGeo.setAttribute('aSize', new THREE.BufferAttribute(starSizes, 1));

const starMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
  },
  vertexShader: `
    attribute float aSize;
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
      vColor = color;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = aSize * (150.0 / -mvPosition.z);
      vAlpha = clamp(1.0 - (-mvPosition.z / 600.0), 0.2, 1.0); // depth fade
      gl_Position = projectionMatrix * mvPosition;
    }`,
  fragmentShader: `
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
      float d = distance(gl_PointCoord, vec2(0.5));
      if (d > 0.5) discard;
      float intensity = 1.0 - (d * 2.0);
      intensity = pow(intensity, 1.5);
      gl_FragColor = vec4(vColor, intensity * vAlpha * 0.8);
    }`,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  vertexColors: true
});

const starPoints = new THREE.Points(starGeo, starMat);
galaxyGroup.add(starPoints);

// ═══════════════════════════════════════════════════════════
// DUST LANES — Volumetric brownish-red clouds
// ═══════════════════════════════════════════════════════════
const dustCanvas = document.createElement('canvas');
dustCanvas.width = dustCanvas.height = 128;
const dCtx = dustCanvas.getContext('2d');
const dGrad = dCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
dGrad.addColorStop(0, 'rgba(40, 20, 10, 0.4)');
dGrad.addColorStop(0.5, 'rgba(20, 10, 5, 0.1)');
dGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
dCtx.fillStyle = dGrad;
dCtx.fillRect(0, 0, 128, 128);
const dustTex = new THREE.CanvasTexture(dustCanvas);

const dustMat = new THREE.SpriteMaterial({
  map: dustTex,
  transparent: true,
  opacity: 0.6,
  blending: THREE.NormalBlending, // Normal blending blocks light behind it
  depthWrite: false
});

for (let i = 0; i < 400; i++) {
  const r = Math.pow(Math.random(), 0.5) * R.diskR * 0.9;
  // Place dust on the *inside* edge of the spiral arms
  const spiralAngle = Math.log(r / R.core) * spiralWinding;
  const armOffset = (Math.floor(Math.random() * arms) * Math.PI * 2) / arms;
  const theta = spiralAngle + armOffset - 0.2; // -0.2 puts it on leading edge
  
  const sprite = new THREE.Sprite(dustMat);
  sprite.position.x = r * Math.cos(theta) + gaussianRandom(0, 1.5);
  sprite.position.y = gaussianRandom(0, 0.5);
  sprite.position.z = r * Math.sin(theta) + gaussianRandom(0, 1.5);
  
  const s = gaussianRandom(6, 2);
  sprite.scale.set(s, s, 1);
  galaxyGroup.add(sprite);
}

// ═══════════════════════════════════════════════════════════
// CORE LIGHT & HALO GLOW
// ═══════════════════════════════════════════════════════════
const coreLight = new THREE.PointLight(0xffffee, 8.0, 100);
galaxyGroup.add(coreLight);

// Dark matter / halo glow
const haloCanvas = document.createElement('canvas');
haloCanvas.width = haloCanvas.height = 256;
const hCtx = haloCanvas.getContext('2d');
const hGrad = hCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
hGrad.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
hGrad.addColorStop(0.1, 'rgba(255, 230, 200, 0.15)');
hGrad.addColorStop(0.3, 'rgba(100, 150, 255, 0.05)'); // blue-grey dark matter
hGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
hCtx.fillStyle = hGrad;
hCtx.fillRect(0, 0, 256, 256);
const haloSprite = new THREE.Sprite(new THREE.SpriteMaterial({
  map: new THREE.CanvasTexture(haloCanvas),
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false
}));
haloSprite.scale.set(R.haloR * 2, R.haloR * 2, 1);
galaxyGroup.add(haloSprite);

// ═══════════════════════════════════════════════════════════
// INTERACTION HITBOX
// ═══════════════════════════════════════════════════════════
const galHitbox = new THREE.Mesh(
  new THREE.SphereGeometry(R.diskR * 1.2),
  new THREE.MeshBasicMaterial({ visible: false })
);
galHitbox.userData = { isHoverable: true };
galaxyGroup.add(galHitbox);

// ═══════════════════════════════════════════════════════════
// ANIMATION
// ═══════════════════════════════════════════════════════════
startLoop((elapsed) => {
  const hover = galHitbox.userData.isHovered ? 1 : 0;
  
  // Slow majestic rotation
  galaxyGroup.rotation.y = elapsed * 0.02 + hover * 0.05;
  
  // Core pulses slightly
  coreLight.intensity = 8.0 + Math.sin(elapsed * 2) * 1.5 + hover * 4.0;
  
  starMat.uniforms.uTime.value = elapsed;
});

export { galaxyGroup, galHitbox };

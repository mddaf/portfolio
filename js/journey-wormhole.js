// ═══════════════════════════════════════════════════════════
// JOURNEY-WORMHOLE.JS — Morris-Thorne Traversable Wormhole
// Placement: Journey Station, Z = -800
// Physics: Morris & Thorne (1988), Flamm catenoid (1916),
//   Kip Thorne/Interstellar VFX (arXiv:1502.03809),
//   Visual Appearance of a Morris-Thorne Wormhole (Müller 2004)
// 7 Layers: ambient glow, lensing halo, Einstein ring (×2),
//   mouth portal, exotic matter shell, catenoid, tidal field lines,
//   + particle infall stream
// ═══════════════════════════════════════════════════════════

import * as THREE from 'three';
import { scene, startLoop } from './scene.js';

// ── SCALE CONSTANTS ────────────────────────────────────────
const WH_r0    = 1.0;   // throat radius (normalized)
const WH_SCALE = 12.0;  // scene scale multiplier
const WH_S     = WH_SCALE;

const WH_R = {
  throat:  WH_r0       * WH_S,    // 8.0
  photon:  1.5 * WH_r0 * WH_S,    // 12.0
  mouth:   WH_r0       * WH_S,    // 8.0
  lens:    3.0 * WH_r0 * WH_S,    // 24.0
  field:   5.0 * WH_r0 * WH_S,    // 40.0
  ambient: 7.0 * WH_r0 * WH_S,    // 56.0
};

const wormholeGroup = new THREE.Group();
wormholeGroup.position.set(8, 0, -800);
wormholeGroup.rotation.y = -Math.PI / 6;
scene.add(wormholeGroup);

// ═══════════════════════════════════════════════════════════
// LAYER 1: AMBIENT OUTER GLOW (far-field curvature hint) - REMOVED PER USER REQUEST
// ═══════════════════════════════════════════════════════════
/*
const ambGlowCanvas = document.createElement('canvas');
ambGlowCanvas.width = ambGlowCanvas.height = 256;
const ambCtx = ambGlowCanvas.getContext('2d');
const ambGrad = ambCtx.createRadialGradient(128,128,0,128,128,128);
ambGrad.addColorStop(0,    'rgba(0, 0, 0, 0)');
ambGrad.addColorStop(0.5,  'rgba(50, 30, 120, 0.03)');
ambGrad.addColorStop(0.8,  'rgba(30, 60, 180, 0.06)');
ambGrad.addColorStop(1.0,  'rgba(0, 20, 100, 0.12)');
ambCtx.fillStyle = ambGrad;
ambCtx.fillRect(0,0,256,256);
const ambGlow = new THREE.Sprite(new THREE.SpriteMaterial({
  map: new THREE.CanvasTexture(ambGlowCanvas),
  blending: THREE.AdditiveBlending, transparent: true, opacity: 1.0, depthWrite: false,
}));
ambGlow.scale.set(WH_R.ambient * 2.2, WH_R.ambient * 2.2, 1);
wormholeGroup.add(ambGlow);
*/

// ═══════════════════════════════════════════════════════════
// LAYER 2: GRAVITATIONAL LENSING HALO
// ═══════════════════════════════════════════════════════════
const lensMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime:   { value: 0 },
    uRadius: { value: WH_R.lens },
    uThroat: { value: WH_R.throat },
  },
  vertexShader: `
    varying vec3 vNormal; varying vec2 vUv;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime, uRadius, uThroat;
    varying vec3 vNormal; varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5); }
    float noise(vec2 p) {
      vec2 i = floor(p); vec2 f = fract(p); vec2 u = f*f*(3.0-2.0*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
    }
    void main() {
      vec2 centered = vUv - 0.5;
      float r = length(centered);
      float deflect = uThroat / (uRadius * max(r, 0.05));
      deflect = clamp(deflect, 0.0, 3.5);
      float angle = atan(centered.y, centered.x) + uTime * 0.04;
      vec2 lensedUv = 0.5 + vec2(cos(angle), sin(angle)) * r * (1.0 + deflect * 0.12);
      float starNoise = noise(lensedUv * 60.0);
      float starNoise2 = noise(lensedUv * 130.0 + vec2(100.0));
      float stars = step(0.88, starNoise) * 0.8 + step(0.94, starNoise2) * 0.4;
      vec3 starColor = mix(vec3(0.7, 0.85, 1.0), vec3(1.0, 1.0, 1.0), starNoise2);
      float innerCut = 0.15;
      float rimFade = smoothstep(innerCut, 0.38, r) * smoothstep(0.5, 0.35, r);
      float alpha = rimFade * (stars * 0.7 + 0.05);
      gl_FragColor = vec4(starColor * stars + vec3(0.05, 0.08, 0.2) * rimFade * 0.3, alpha);
    }
  `,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide,
});
const lensHalo = new THREE.Mesh(new THREE.SphereGeometry(WH_R.lens, 48, 48), lensMat);
wormholeGroup.add(lensHalo);

// ═══════════════════════════════════════════════════════════
// LAYER 3: EINSTEIN RING / PHOTON SPHERE
// ═══════════════════════════════════════════════════════════
const einsteinRingMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader: `
    varying float vAngle;
    void main() {
      vAngle = atan(position.z, position.x) + 3.14159;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime; varying float vAngle;
    void main() {
      float pulse = sin(vAngle * 2.0 + uTime * 0.3) * 0.08 + 0.92;
      vec3 ringColor = vec3(1.0, 0.98, 0.95) * pulse;
      gl_FragColor = vec4(ringColor, pulse * 0.95);
    }
  `,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
});
const einsteinRing = new THREE.Mesh(
  new THREE.TorusGeometry(WH_R.photon, 0.07 * WH_S, 8, 200), einsteinRingMat
);
wormholeGroup.add(einsteinRing);

// Secondary Einstein ring (higher-order lensing)
const einsteinRing2 = new THREE.Mesh(
  new THREE.TorusGeometry(WH_R.photon * 1.12, 0.03 * WH_S, 6, 160),
  new THREE.MeshBasicMaterial({
    color: 0x88aaff, transparent: true, opacity: 0.25,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })
);
wormholeGroup.add(einsteinRing2);

// ═══════════════════════════════════════════════════════════
// LAYER 4: WORMHOLE MOUTH (other universe portal)
// ═══════════════════════════════════════════════════════════
const mouthMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uRadius: { value: WH_R.mouth } },
  vertexShader: `
    varying vec3 vNormal; varying vec3 vViewDir; varying vec2 vUv;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vViewDir = normalize(-mv.xyz);
      vUv = uv;
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: `
    uniform float uTime; varying vec3 vNormal; varying vec3 vViewDir; varying vec2 vUv;
    float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5); }
    float noise2(vec2 p) {
      vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);
      return mix(mix(hash2(i),hash2(i+vec2(1,0)),u.x),mix(hash2(i+vec2(0,1)),hash2(i+vec2(1,1)),u.x),u.y);
    }
    void main() {
      vec2 c = vUv - 0.5;
      float r = length(c);
      float distort = 1.0 + r * r * 2.5;
      vec2 distortedUv = fract(0.5 + c * distort);
      vec2 otherUv = distortedUv + vec2(uTime * 0.006, uTime * 0.004);
      float stars1 = noise2(otherUv * 80.0);
      float stars2 = noise2(otherUv * 170.0 + vec2(50.0));
      float stars3 = noise2(otherUv * 40.0 + vec2(200.0, 100.0));
      float starField = step(0.88, stars1) * 1.0 + step(0.92, stars2) * 0.6;
      float nebula = smoothstep(0.55, 0.65, stars3) * 0.3;
      vec3 starColor = mix(vec3(0.6, 0.8, 1.0), vec3(1.0, 1.0, 1.0), stars2);
      vec3 nebulaColor = vec3(0.1, 0.4, 0.9);
      vec3 bgColor = vec3(0.01, 0.02, 0.08);
      vec3 otherUniverseColor = bgColor + starColor * starField + nebulaColor * nebula;
      float edgeFresnel = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 2.5);
      vec3 rimGlow = vec3(0.4, 0.6, 1.0) * edgeFresnel * 0.8;
      float centerGlow = (1.0 - smoothstep(0.0, 0.25, r)) * 0.15;
      vec3 exoticBleed = vec3(0.0, 0.8, 0.6) * centerGlow;
      vec3 finalColor = otherUniverseColor + rimGlow + exoticBleed;
      gl_FragColor = vec4(finalColor, 0.95);
    }
  `,
  transparent: true, depthWrite: true, side: THREE.FrontSide,
});
const wormholeMouth = new THREE.Mesh(new THREE.SphereGeometry(WH_R.mouth, 64, 64), mouthMat);
wormholeGroup.add(wormholeMouth);

// ═══════════════════════════════════════════════════════════
// LAYER 5: EXOTIC MATTER GLOW (throat boundary)
// ═══════════════════════════════════════════════════════════
const exoticMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime:   { value: 0 },
    uColor1: { value: new THREE.Color(0.0, 1.0, 0.67) },
    uColor2: { value: new THREE.Color(0.42, 0.39, 1.0) },
  },
  vertexShader: `
    varying vec3 vNormal; varying vec3 vViewDir;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vViewDir = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: `
    uniform float uTime; uniform vec3 uColor1; uniform vec3 uColor2;
    varying vec3 vNormal; varying vec3 vViewDir;
    void main() {
      float fresnel = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 3.5);
      float pulse = sin(uTime * 3.2) * 0.3 + sin(uTime * 7.1) * 0.15 + 0.55;
      pulse = clamp(pulse, 0.2, 1.0);
      float colorPhase = sin(uTime * 1.4) * 0.5 + 0.5;
      vec3 exoticColor = mix(uColor1, uColor2, colorPhase);
      gl_FragColor = vec4(exoticColor, fresnel * pulse * 0.85);
    }
  `,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide,
});
const exoticShell = new THREE.Mesh(
  new THREE.SphereGeometry(WH_R.mouth * 1.02, 48, 48), exoticMat
);
wormholeGroup.add(exoticShell);

// ═══════════════════════════════════════════════════════════
// LAYER 6: CATENOID GEOMETRY (Flamm paraboloid tunnel)
// r = r₀ × cosh(z/r₀) — hyperbolic funnel
// ═══════════════════════════════════════════════════════════
const CATENOID_SEGMENTS = 40;
const CATENOID_RADIAL   = 32;
const catenoidPoints    = [];
const zExtent = WH_R.throat * 3.0;

for (let i = 0; i <= CATENOID_SEGMENTS; i++) {
  const t = (i / CATENOID_SEGMENTS) * 2.0 - 1.0;
  const z = t * zExtent;
  const r = WH_R.throat * Math.cosh(z / WH_R.throat);
  catenoidPoints.push(new THREE.Vector2(r, z));
}

const catenoidGeo = new THREE.LatheGeometry(catenoidPoints, CATENOID_RADIAL);
const catenoidMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uRadius: { value: WH_R.throat } },
  vertexShader: `
    varying float vZ; varying vec3 vNormal;
    void main() {
      vZ = position.y;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime, uRadius; varying float vZ; varying vec3 vNormal;
    void main() {
      float zFade = 1.0 - smoothstep(0.0, uRadius * 2.5, abs(vZ));
      float throatGlow = 1.0 - smoothstep(0.0, uRadius * 0.8, abs(vZ));
      float flow = sin(vZ * 0.8 - uTime * 1.5) * 0.15 + 0.85;
      vec3 col = mix(vec3(0.42, 0.39, 1.0), vec3(0.0, 0.83, 1.0), throatGlow);
      gl_FragColor = vec4(col, zFade * flow * 0.18);
    }
  `,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
});
const catenoidMesh = new THREE.Mesh(catenoidGeo, catenoidMat);
catenoidMesh.rotation.x = Math.PI / 2;
wormholeGroup.add(catenoidMesh);

// ═══════════════════════════════════════════════════════════
// LAYER 7: TIDAL FORCE FIELD LINES
// ═══════════════════════════════════════════════════════════
const fieldLineCount = 16;
for (let i = 0; i < fieldLineCount; i++) {
  const angle = (i / fieldLineCount) * Math.PI * 2;
  const pts = [];
  for (let j = 0; j <= 12; j++) {
    const t = j / 12;
    const r = THREE.MathUtils.lerp(WH_R.field, WH_R.throat * 1.05, t);
    pts.push(new THREE.Vector3(
      Math.cos(angle) * r * (1.0 - t * 0.3),
      Math.sin(angle) * r * (1.0 - t * 0.3),
      (Math.random() - 0.5) * WH_R.throat * 0.5 * t
    ));
  }
  const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
  wormholeGroup.add(new THREE.Line(lineGeo, new THREE.LineBasicMaterial({
    color: 0x4466ff, transparent: true, opacity: 0.07,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })));
}

// ═══════════════════════════════════════════════════════════
// PARTICLE STREAM (spiraling infall)
// ═══════════════════════════════════════════════════════════
const streamCount = 600;
const streamGeo   = new THREE.BufferGeometry();
const streamPos   = new Float32Array(streamCount * 3);
const streamPhase = new Float32Array(streamCount);
const streamR     = new Float32Array(streamCount);
const streamSpeed = new Float32Array(streamCount);

for (let i = 0; i < streamCount; i++) {
  const phi   = Math.random() * Math.PI * 2;
  const theta = Math.acos(2 * Math.random() - 1);
  const r     = WH_R.lens * (0.5 + Math.random() * 0.5);
  streamPos[i*3]   = Math.sin(theta) * Math.cos(phi) * r;
  streamPos[i*3+1] = Math.sin(theta) * Math.sin(phi) * r;
  streamPos[i*3+2] = Math.cos(theta) * r;
  streamPhase[i]   = Math.random() * Math.PI * 2;
  streamR[i]       = r;
  streamSpeed[i]   = 0.3 + Math.random() * 0.7;
}
streamGeo.setAttribute('position', new THREE.BufferAttribute(streamPos, 3));
streamGeo.setAttribute('aPhase',   new THREE.BufferAttribute(streamPhase, 1));
streamGeo.setAttribute('aR',       new THREE.BufferAttribute(streamR, 1));
streamGeo.setAttribute('aSpeed',   new THREE.BufferAttribute(streamSpeed, 1));

const streamMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime:    { value: 0 },
    uThroatR: { value: WH_R.throat },
    uOuterR:  { value: WH_R.lens },
  },
  vertexShader: `
    uniform float uTime, uThroatR, uOuterR;
    attribute float aPhase, aR, aSpeed;
    varying float vAlpha;
    void main() {
      float t = mod(uTime * aSpeed * 0.25 + aPhase, 1.0);
      float r = mix(aR, uThroatR * 1.1, t);
      float spiralAngle = aPhase + t * aSpeed * 8.0;
      vec3 spiralPos = normalize(position) * r;
      float ca = cos(spiralAngle * 0.3), sa = sin(spiralAngle * 0.3);
      spiralPos = vec3(ca*spiralPos.x - sa*spiralPos.y, sa*spiralPos.x + ca*spiralPos.y, spiralPos.z);
      vAlpha = (1.0 - t) * 0.5;
      vec4 mvPos = modelViewMatrix * vec4(spiralPos, 1.0);
      gl_PointSize = 1.5 * (200.0 / -mvPos.z);
      gl_Position = projectionMatrix * mvPos;
    }
  `,
  fragmentShader: `
    varying float vAlpha;
    void main() {
      float d = distance(gl_PointCoord, vec2(0.5));
      float alpha = (1.0 - smoothstep(0.3, 0.5, d)) * vAlpha;
      gl_FragColor = vec4(0.65, 0.82, 1.0, alpha);
    }
  `,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
});
wormholeGroup.add(new THREE.Points(streamGeo, streamMat));

// ═══════════════════════════════════════════════════════════
// LAYER 8: SPACETIME GRID (Embedding Diagram)
// ═══════════════════════════════════════════════════════════
const gridGeo = new THREE.PlaneGeometry(WH_R.ambient * 3.5, WH_R.ambient * 3.5, 128, 128);
gridGeo.rotateX(-Math.PI / 2);

const gridMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uThroat: { value: WH_R.throat },
  },
  vertexShader: `
    uniform float uTime;
    uniform float uThroat;
    varying vec2 vUv;
    varying float vDepth;
    void main() {
      vUv = uv;
      vec3 pos = position;
      
      vec2 centered = uv - 0.5;
      float r = length(centered) * 2.0; // 0 at center, 1 at edge
      
      // Exponential plunge to simulate the wormhole throat embedding diagram
      float plunge = exp(-r * 12.0); 
      
      pos.y = -60.0 * plunge; // deep pinch
      vDepth = plunge;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    varying vec2 vUv;
    varying float vDepth;
    void main() {
      // Cartesian grid
      vec2 grid = fract(vUv * 60.0);
      
      float lineThickness = 0.05;
      float lineX = smoothstep(1.0 - lineThickness, 1.0, grid.x) + smoothstep(lineThickness, 0.0, grid.x);
      float lineY = smoothstep(1.0 - lineThickness, 1.0, grid.y) + smoothstep(lineThickness, 0.0, grid.y);
      float lines = max(lineX, lineY);
      
      // Radial fade to blend smoothly into space
      vec2 centered = vUv - 0.5;
      float r = length(centered) * 2.0;
      float alpha = lines * smoothstep(1.0, 0.3, r) * smoothstep(0.01, 0.1, r);
      
      // Shift color based on gravity depth (vDepth)
      vec3 color = mix(vec3(0.1, 0.6, 1.0), vec3(0.8, 0.2, 1.0), vDepth * 1.5);
      
      gl_FragColor = vec4(color, alpha * 0.45);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  side: THREE.DoubleSide
});

const spacetimeGridMesh = new THREE.Mesh(gridGeo, gridMat);
spacetimeGridMesh.position.y = 5; // slight offset
wormholeGroup.add(spacetimeGridMesh);

// ═══════════════════════════════════════════════════════════
// LIGHTING & HITBOX
// ═══════════════════════════════════════════════════════════
const whLight = new THREE.PointLight(0x4466ff, 1.5, WH_R.field * 1.5);
wormholeGroup.add(whLight);

const wormHitbox = new THREE.Mesh(
  new THREE.SphereGeometry(WH_R.photon * 1.2),
  new THREE.MeshBasicMaterial({ visible: false })
);
wormHitbox.userData = { isHoverable: true };
wormholeGroup.add(wormHitbox);

// ═══════════════════════════════════════════════════════════
// ANIMATION LOOP
// ═══════════════════════════════════════════════════════════
startLoop((elapsed) => {
  const hover = wormHitbox.userData.isHovered ? 1 : 0;

  // Update all time uniforms
  lensMat.uniforms.uTime.value       = elapsed;
  einsteinRingMat.uniforms.uTime.value = elapsed;
  mouthMat.uniforms.uTime.value      = elapsed;
  exoticMat.uniforms.uTime.value     = elapsed;
  catenoidMat.uniforms.uTime.value   = elapsed;
  streamMat.uniforms.uTime.value     = elapsed;
  gridMat.uniforms.uTime.value       = elapsed;

  // Einstein rings: slight, calm rotation
  einsteinRing.rotation.y  += 0.001;
  einsteinRing2.rotation.y -= 0.0007;
  einsteinRing.rotation.z  += 0.0003;

  // Wormhole light pulsing (calm exotic matter energy fluctuation)
  let lightPulse = Math.sin(elapsed * 2.8) * 0.4 + Math.sin(elapsed * 7.1) * 0.15;
  whLight.intensity = 1.5 + lightPulse;
  whLight.color.setHSL(0.65 + Math.sin(elapsed * 0.5) * 0.05, 0.8, 0.6);

  // Constant calm drift physics
  lensMat.uniforms.uThroat.value += (WH_R.throat - lensMat.uniforms.uThroat.value) * 0.1;
  streamMat.uniforms.uThroatR.value = WH_R.throat;
  
  exoticMat.uniforms.uColor1.value.setRGB(0.0, 1.0, 0.67);
  spacetimeGridMesh.rotation.z -= 0.0005; // Very slow drift normally
});

export { wormholeGroup, wormHitbox };

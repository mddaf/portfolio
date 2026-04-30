// ═══════════════════════════════════════════════════════════
// GITHUB-QUASAR.JS — Scientifically Accurate Type 1 Radio-Loud Quasar
// Placement: GitHub Station, Z = -1000
// Physics: Antonucci Unified Model (1993), Elvis Structure (2000),
//   Reverberation mapping (Kaspi 2000), IXPE corona shape (2024)
// 9 Layers: horizon, disk, corona, BLR, torus, ionization cones, jets, radio lobes, host galaxy
// ═══════════════════════════════════════════════════════════

import * as THREE from 'three';
import { scene, camera, startLoop } from './scene.js';

// ── ARTISTIC SCALE (visually balanced for ~60-unit zone) ──────────────────────
const R = {
  horizon:     1.5,
  photon:      2.0,
  diskInner:   2.5,
  diskOuter:   18,
  corona:      4,
  blr:         24,
  torusInner:  10,
  torusOuter:  22,
  torusHeight: 8,
  cone:        35,
  jet:         50,
  lobeCenter:  58,
  lobeRadius:  12,
  host:        45,
};

// ── GROUP SETUP ──────────────────────────────────────────────────────────────
const githubQuasarGroup = new THREE.Group();
githubQuasarGroup.position.set(0, 5, -1000);
githubQuasarGroup.rotation.x = Math.PI / 6;
githubQuasarGroup.rotation.z = -Math.PI / 8;
scene.add(githubQuasarGroup);

// ═══════════════════════════════════════════════════════════
// LAYER 1: EVENT HORIZON — pure black sphere
// ═══════════════════════════════════════════════════════════
const horizonMesh = new THREE.Mesh(
  new THREE.SphereGeometry(R.horizon, 48, 48),
  new THREE.MeshBasicMaterial({ color: 0x000000, depthWrite: true })
);
githubQuasarGroup.add(horizonMesh);

// ═══════════════════════════════════════════════════════════
// LAYER 2: PHOTON RING — razor-thin Doppler-beamed ring
// ═══════════════════════════════════════════════════════════
const photonRingMat = new THREE.ShaderMaterial({
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
  transparent: true, depthWrite: false,
  blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
});
const photonRingMesh = new THREE.Mesh(
  new THREE.TorusGeometry(R.photon, 0.06, 8, 180), photonRingMat
);
githubQuasarGroup.add(photonRingMesh);

// ═══════════════════════════════════════════════════════════
// LAYER 2b: ACCRETION DISK — blue-white Keplerian + Doppler
// ═══════════════════════════════════════════════════════════
const diskMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime:       { value: 0 },
    uBeamAngle:  { value: 0 },
    uInnerR:     { value: R.diskInner },
    uOuterR:     { value: R.diskOuter },
    uOpacity:    { value: 1.0 },
    uColorInner: { value: new THREE.Color(0.95, 0.97, 1.00) },
    uColorMid:   { value: new THREE.Color(1.00, 0.85, 0.50) },
    uColorOuter: { value: new THREE.Color(0.70, 0.30, 0.08) },
  },
  vertexShader: `
    varying float vRadius, vAngle;
    void main() {
      vRadius = length(position.xy);
      vAngle  = atan(position.y, position.x);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: `
    uniform float uTime, uBeamAngle, uInnerR, uOuterR, uOpacity;
    uniform vec3 uColorInner, uColorMid, uColorOuter;
    varying float vRadius, vAngle;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),
                 mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
    }
    void main() {
      float t = clamp((vRadius - uInnerR) / (uOuterR - uInnerR), 0.0, 1.0);
      vec3 col = t < 0.35
        ? mix(uColorInner, uColorMid, t / 0.35)
        : mix(uColorMid, uColorOuter, (t - 0.35) / 0.65);
      float kepSpeed = pow(max(vRadius / uInnerR, 1.0), -1.5);
      float spiralAngle = vAngle - uTime * kepSpeed * 0.25;
      float turbulence = noise(vec2(spiralAngle * 2.0, t * 6.0)) * 0.25;
      float spiral = sin(spiralAngle * 3.0 + t * 5.0) * 0.15 + 0.85 + turbulence;
      float relAngle = vAngle - uBeamAngle + 3.14159;
      float doppler = mix(0.35, 3.2, sin(relAngle) * 0.5 + 0.5);
      float gravRedshift = 1.0 - 0.3 * (1.0 - t);
      vec3 final = col * spiral * doppler * gravRedshift;
      float edgeFade = smoothstep(0.0, 0.05, t) * smoothstep(1.0, 0.88, t);
      float innerFade = smoothstep(0.0, 0.03, t);
      gl_FragColor = vec4(final, edgeFade * innerFade * uOpacity);
    }`,
  transparent: true, depthWrite: false,
  blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
});
const diskMesh = new THREE.Mesh(
  new THREE.RingGeometry(R.diskInner, R.diskOuter, 256, 64), diskMat
);
diskMesh.rotation.x = Math.PI / 2;
githubQuasarGroup.add(diskMesh);

// Secondary lensed disk arc
const secDiskMat = diskMat.clone();
secDiskMat.uniforms = {
  uTime:       { value: 0 },
  uBeamAngle:  { value: 0 },
  uInnerR:     { value: R.photon },
  uOuterR:     { value: R.diskInner * 2.0 },
  uOpacity:    { value: 0.3 },
  uColorInner: diskMat.uniforms.uColorInner,
  uColorMid:   diskMat.uniforms.uColorMid,
  uColorOuter: diskMat.uniforms.uColorOuter,
};
const secDisk = new THREE.Mesh(
  new THREE.RingGeometry(R.photon, R.diskInner * 2.0, 128, 16), secDiskMat
);
secDisk.rotation.x = Math.PI / 2;
secDisk.scale.y = -0.25;
secDisk.position.y = R.horizon * 1.8;
githubQuasarGroup.add(secDisk);

// ═══════════════════════════════════════════════════════════
// LAYER 3: CORONA — flat equatorial X-ray plasma (IXPE 2024)
// ═══════════════════════════════════════════════════════════
const coronaMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uOpacity: { value: 0.07 }, uRadius: { value: R.corona } },
  vertexShader: `
    uniform float uRadius;
    varying float vHeight;
    void main() {
      vHeight = abs(position.y) / uRadius;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: `
    uniform float uTime, uOpacity;
    varying float vHeight;
    void main() {
      float eq = 1.0 - smoothstep(0.0, 0.35, vHeight);
      float pulse = sin(uTime * 0.9) * 0.1 + 0.9;
      gl_FragColor = vec4(0.65, 0.82, 1.0, eq * uOpacity * pulse);
    }`,
  transparent: true, depthWrite: false,
  blending: THREE.AdditiveBlending, side: THREE.FrontSide,
});
const coronaMesh = new THREE.Mesh(
  new THREE.SphereGeometry(R.corona, 24, 12), coronaMat
);
coronaMesh.scale.y = 0.1;
githubQuasarGroup.add(coronaMesh);

// ═══════════════════════════════════════════════════════════
// LAYER 4: BROAD LINE REGION — 300 swirling ionized particles
// ═══════════════════════════════════════════════════════════
const blrCount = 300;
const blrGeo = new THREE.BufferGeometry();
const blrPos = new Float32Array(blrCount * 3);
const blrSpeeds = new Float32Array(blrCount);
const blrPhases = new Float32Array(blrCount);
for (let i = 0; i < blrCount; i++) {
  const r = R.blr * (0.4 + Math.random() * 0.6);
  const theta = Math.random() * Math.PI * 2;
  const phi = (Math.random() - 0.5) * 0.5;
  blrPos[i * 3]     = r * Math.cos(theta) * Math.cos(phi);
  blrPos[i * 3 + 1] = r * Math.sin(phi) * 0.4;
  blrPos[i * 3 + 2] = r * Math.sin(theta) * Math.cos(phi);
  blrSpeeds[i] = 0.3 + Math.random() * 0.7;
  blrPhases[i] = Math.random() * Math.PI * 2;
}
blrGeo.setAttribute('position', new THREE.BufferAttribute(blrPos, 3));
blrGeo.setAttribute('aSpeed', new THREE.BufferAttribute(blrSpeeds, 1));
blrGeo.setAttribute('aPhase', new THREE.BufferAttribute(blrPhases, 1));

const blrMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader: `
    attribute float aSpeed, aPhase;
    uniform float uTime;
    varying float vAlpha;
    void main() {
      float angle = uTime * aSpeed * 0.15 + aPhase;
      float r = length(position.xz);
      vec3 pos = vec3(r * cos(angle), position.y, r * sin(angle));
      vAlpha = sin(uTime * aSpeed + aPhase) * 0.2 + 0.6;
      vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
      gl_PointSize = 2.0 * (150.0 / -mvPos.z);
      gl_Position = projectionMatrix * mvPos;
    }`,
  fragmentShader: `
    varying float vAlpha;
    void main() {
      float d = distance(gl_PointCoord, vec2(0.5));
      float alpha = (1.0 - smoothstep(0.3, 0.5, d)) * vAlpha * 0.4;
      gl_FragColor = vec4(0.75, 0.82, 1.0, alpha);
    }`,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
});
githubQuasarGroup.add(new THREE.Points(blrGeo, blrMat));

// ═══════════════════════════════════════════════════════════
// LAYER 5: DUSTY TORUS — clumpy FBM-noise orange donut
// ═══════════════════════════════════════════════════════════
const torusMidR = (R.torusInner + R.torusOuter) / 2.0;
const torusTube = R.torusHeight;

const torusMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime:      { value: 0 },
    uHotColor:  { value: new THREE.Color(1.0, 0.38, 0.06) },
    uCoolColor: { value: new THREE.Color(0.28, 0.10, 0.02) },
    uOpacity:   { value: 0.85 },
    uInnerDist: { value: torusMidR - torusTube },
    uDiameter:  { value: torusTube * 2.0 },
  },
  vertexShader: `
    uniform float uInnerDist, uDiameter;
    varying vec2 vUv;
    varying float vInnerFactor;
    void main() {
      vUv = uv;
      float dist = length(position.xz);
      vInnerFactor = clamp((dist - uInnerDist) / uDiameter, 0.0, 1.0);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: `
    uniform float uTime, uOpacity;
    uniform vec3 uHotColor, uCoolColor;
    varying vec2 vUv;
    varying float vInnerFactor;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),
                 mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
    }
    float fbm(vec2 p) {
      float v = 0.0, a = 0.5;
      for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.1 + vec2(13.0); a *= 0.5; }
      return v;
    }
    void main() {
      vec2 uv = vUv + vec2(uTime * 0.005, 0.0);
      float clump = fbm(uv * 8.0);
      vec3 dustColor = mix(uHotColor, uCoolColor, vInnerFactor);
      float clumpFactor = clump * 0.6 + 0.4;
      float innerGlow = 1.0 - smoothstep(0.0, 0.3, vInnerFactor);
      vec3 final = dustColor * clumpFactor * (1.0 + innerGlow * 0.8);
      float alpha = clumpFactor * uOpacity * (0.5 + innerGlow * 0.5);
      gl_FragColor = vec4(final, alpha);
    }`,
  transparent: true, depthWrite: false,
  blending: THREE.NormalBlending, side: THREE.DoubleSide,
});
const torusMesh = new THREE.Mesh(
  new THREE.TorusGeometry(torusMidR, torusTube, 32, 80), torusMat
);
torusMesh.rotation.x = Math.PI / 2;
githubQuasarGroup.add(torusMesh);

// ═══════════════════════════════════════════════════════════
// LAYER 6: IONIZATION CONES — [O III] 5007Å teal-green
// ═══════════════════════════════════════════════════════════
function createCone(dir) {
  const h = R.cone;
  const r = h * Math.tan(60 * Math.PI / 180);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uDir: { value: dir }, uH: { value: h } },
    vertexShader: `
      uniform float uDir, uH;
      varying float vP;
      void main() {
        vP = (position.y * uDir / uH) * 0.5 + 0.5;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform float uTime;
      varying float vP;
      void main() {
        float fade = pow(1.0 - smoothstep(0.0, 1.0, vP), 1.3);
        float pulse = sin(vP * 8.0 - uTime * 0.5) * 0.06 + 0.94;
        gl_FragColor = vec4(0.0, 0.95, 0.55, fade * pulse * 0.08);
      }`,
    transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(r, h, 32, 8, true), mat);
  mesh.position.y = dir * h / 2.0;
  if (dir < 0) mesh.rotation.z = Math.PI;
  return { mesh, mat };
}
const topCone = createCone(1);
const botCone = createCone(-1);
githubQuasarGroup.add(topCone.mesh);
githubQuasarGroup.add(botCone.mesh);

// ═══════════════════════════════════════════════════════════
// LAYER 7: RELATIVISTIC JETS — synchrotron cyan, Doppler-beamed
// ═══════════════════════════════════════════════════════════
function createJet(dir) {
  const len = R.jet;
  const beaming = dir > 0 ? 2.5 : 0.15;
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uDir: { value: dir },
      uBeaming: { value: beaming }, uLen: { value: len },
    },
    vertexShader: `
      uniform float uDir, uLen;
      varying float vP;
      void main() {
        vP = clamp((position.y * uDir + uLen * 0.5) / uLen, 0.0, 1.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform float uTime, uDir, uBeaming;
      varying float vP;
      void main() {
        float syncFade = pow(1.0 - vP, 1.8);
        float knot = sin(vP * 25.0 - uTime * 2.0 * uDir) * 0.3 + 0.7;
        float alpha = syncFade * knot * uBeaming * 0.6;
        gl_FragColor = vec4(0.0, 0.83, 1.0, alpha);
      }`,
    transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const cyl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 1.2, len, 12, 32, true), mat
  );
  cyl.position.y = dir * len / 2;
  // Faint sheath glow
  const sheath = new THREE.Mesh(
    new THREE.CylinderGeometry(1.0, 3.5, len * 0.6, 16, 8, true),
    new THREE.MeshBasicMaterial({
      color: 0x003344, transparent: true, opacity: dir > 0 ? 0.06 : 0.02,
      side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false,
    })
  );
  sheath.position.y = dir * len * 0.3;
  const g = new THREE.Group();
  g.add(cyl);
  g.add(sheath);
  return { group: g, mat };
}
const approachJet = createJet(1);
const recedingJet = createJet(-1);
githubQuasarGroup.add(approachJet.group);
githubQuasarGroup.add(recedingJet.group);

// ═══════════════════════════════════════════════════════════
// LAYER 8: RADIO LOBES + HOTSPOTS — FR-II structure
// Fanaroff-Riley 1974, Cygnus A VLA maps (Perley 1984)
// ═══════════════════════════════════════════════════════════
function createRadioLobe(dir) {
  const lobeGroup = new THREE.Group();
  // Diffuse lobe — edge-brightened synchrotron bubble
  const lobeMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime:    { value: 0 },
      uBeaming: { value: dir > 0 ? 1.4 : 0.6 },
    },
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform float uTime, uBeaming;
      varying vec3 vNormal;
      void main() {
        float rim = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
        rim = pow(rim, 2.5);
        float pulse = sin(uTime * 0.3) * 0.05 + 0.95;
        vec3 col = mix(vec3(0.1, 0.3, 0.9), vec3(0.5, 0.2, 1.0), rim);
        float alpha = rim * 0.12 * uBeaming * pulse;
        gl_FragColor = vec4(col, alpha);
      }`,
    transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.FrontSide,
  });
  const lobeMesh = new THREE.Mesh(
    new THREE.SphereGeometry(R.lobeRadius, 24, 16), lobeMat
  );
  lobeGroup.add(lobeMesh);

  // Hotspot — compact bright sphere at lobe tip (reverse shock terminus)
  const hotspotMesh = new THREE.Mesh(
    new THREE.SphereGeometry(R.lobeRadius * 0.12, 12, 12),
    new THREE.MeshBasicMaterial({
      color: 0x88aaff, transparent: true,
      opacity: dir > 0 ? 0.7 : 0.35,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })
  );
  hotspotMesh.position.y = dir > 0 ? R.lobeRadius * 0.7 : -R.lobeRadius * 0.7;
  lobeGroup.add(hotspotMesh);

  // Position at jet termination point
  lobeGroup.position.y = dir * R.lobeCenter;
  return { lobeGroup, lobeMat };
}
const topLobe = createRadioLobe(1);
const botLobe = createRadioLobe(-1);
githubQuasarGroup.add(topLobe.lobeGroup);
githubQuasarGroup.add(botLobe.lobeGroup);

// ═══════════════════════════════════════════════════════════
// LAYER 9: HOST GALAXY — warm elliptical glow sprite
// ═══════════════════════════════════════════════════════════
const hostCanvas = document.createElement('canvas');
hostCanvas.width = hostCanvas.height = 256;
const hostCtx = hostCanvas.getContext('2d');
const hostGrad = hostCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
hostGrad.addColorStop(0,    'rgba(255, 240, 200, 0.18)');
hostGrad.addColorStop(0.15, 'rgba(255, 220, 160, 0.12)');
hostGrad.addColorStop(0.4,  'rgba(200, 180, 120, 0.05)');
hostGrad.addColorStop(0.7,  'rgba(100, 80, 60, 0.02)');
hostGrad.addColorStop(1.0,  'rgba(0, 0, 0, 0)');
hostCtx.fillStyle = hostGrad;
hostCtx.fillRect(0, 0, 256, 256);
const hostSprite = new THREE.Sprite(new THREE.SpriteMaterial({
  map: new THREE.CanvasTexture(hostCanvas),
  transparent: true, opacity: 1.0,
  blending: THREE.NormalBlending, depthWrite: false,
}));
hostSprite.scale.set(R.host * 2.5, R.host * 2.0, 1);
githubQuasarGroup.add(hostSprite);

// ── QUASAR CORE LIGHT (variable — quasars flicker) ──
const quasarLight = new THREE.PointLight(0xaaccff, 6, 200);
githubQuasarGroup.add(quasarLight);

// ── HITBOX for cursor interaction ──
const githubQuasarHitbox = new THREE.Mesh(
  new THREE.SphereGeometry(30),
  new THREE.MeshBasicMaterial({ visible: false })
);
githubQuasarHitbox.userData = { isHoverable: true };
githubQuasarGroup.add(githubQuasarHitbox);

// ═══════════════════════════════════════════════════════════
// ANIMATION LOOP
// ═══════════════════════════════════════════════════════════
startLoop((elapsed) => {
  const qHover = githubQuasarHitbox.userData.isHovered ? 1 : 0;

  // Camera azimuth for Doppler beaming
  const camAngle = Math.atan2(
    camera.position.x - githubQuasarGroup.position.x,
    camera.position.z - githubQuasarGroup.position.z
  );

  // Disk
  diskMat.uniforms.uTime.value = elapsed;
  diskMat.uniforms.uBeamAngle.value = camAngle;
  secDiskMat.uniforms.uTime.value = elapsed;
  secDiskMat.uniforms.uBeamAngle.value = camAngle;
  diskMesh.rotation.y += 0.00025 + qHover * 0.002;
  secDisk.rotation.y += 0.00025 + qHover * 0.002;

  // Photon ring
  photonRingMat.uniforms.uTime.value = elapsed;
  photonRingMat.uniforms.uBeamAngle.value = camAngle;
  photonRingMesh.rotation.z += 0.002 + qHover * 0.005;

  // Corona
  coronaMat.uniforms.uTime.value = elapsed;

  // BLR
  blrMat.uniforms.uTime.value = elapsed;

  // Torus
  torusMat.uniforms.uTime.value = elapsed;

  // Ionization cones
  topCone.mat.uniforms.uTime.value = elapsed;
  botCone.mat.uniforms.uTime.value = elapsed;

  // Jets
  approachJet.mat.uniforms.uTime.value = elapsed;
  recedingJet.mat.uniforms.uTime.value = elapsed;

  // Radio lobes
  topLobe.lobeMat.uniforms.uTime.value = elapsed;
  botLobe.lobeMat.uniforms.uTime.value = elapsed;

  // Light flickering — quasars are optically variable
  quasarLight.intensity = 6.0
    + Math.sin(elapsed * 0.7) * 1.5
    + Math.sin(elapsed * 2.3) * 0.8
    + Math.sin(elapsed * 5.1) * 0.3
    + qHover * 3;
  quasarLight.color.setHSL(0.60 + Math.sin(elapsed * 0.3) * 0.03, 0.6, 0.7);

  // Core pulse on hover
  horizonMesh.scale.setScalar(1 + Math.sin(elapsed * 15) * 0.03 + qHover * 0.1);
});

export { githubQuasarGroup, githubQuasarHitbox };

// ═══════════════════════════════════════════════════════════
// CONTACT-SUPERNOVA.JS — Asteroid Field for Contact Station
// Placement: Contact Station, Z = -1200
// Features: Scattered asteroid cluster with rocky textures,
//   directional lighting, slow tumbling rotation.
// ═══════════════════════════════════════════════════════════

import * as THREE from 'three';
import { scene, startLoop } from './scene.js';

// ── SCALE & CONFIG ─────────────────────────────────────────
const ASTEROID_COUNT = 200;
const FIELD_RADIUS = 35;
const SIZE_MIN = 0.15, SIZE_MAX = 1.2;

const novaGroup = new THREE.Group();
novaGroup.position.set(0, 0, -1200);
scene.add(novaGroup);

// ── LIGHTING ───────────────────────────────────────────────
const sunLight = new THREE.DirectionalLight(0xffeedd, 1.8);
sunLight.position.set(30, 20, 15);
novaGroup.add(sunLight);
const ambLight = new THREE.AmbientLight(0x1a1a3a, 0.6);
novaGroup.add(ambLight);

// ── ASTEROID GEOMETRY (3-octave noise displacement) ────────
function createRockyGeo() {
  const geo = new THREE.IcosahedronGeometry(1.0, 1);
  const pos = geo.attributes.position;
  const noise3 = (x, y, z, s) => {
    const n = Math.sin(x*127.1+s)*43758.5 + Math.sin(y*311.7+s)*12345.6 + Math.sin(z*74.7+s)*98765.4;
    return (n - Math.floor(n)) * 2.0 - 1.0;
  };
  const seed = Math.random() * 1000;
  for (let v = 0; v < pos.count; v++) {
    const x = pos.getX(v), y = pos.getY(v), z = pos.getZ(v);
    const d = noise3(x,y,z,seed)*0.35 + noise3(x*3,y*3,z*3,seed+50)*0.18 + noise3(x*7,y*7,z*7,seed+99)*0.08;
    pos.setXYZ(v, x+x*d, y+y*d, z+z*d);
  }
  geo.computeVertexNormals();
  return geo;
}

// ── SPECTRAL TYPES ─────────────────────────────────────────
const TYPES = [
  { colors: [0x3a3a40, 0x2e2e34, 0x444450], rough: 0.92, metal: 0.05, emissive: 0x0a0a10, w: 0.50 }, // C-type
  { colors: [0x8a7a60, 0x7a6a50, 0x9a8a70], rough: 0.78, metal: 0.15, emissive: 0x1a1208, w: 0.40 }, // S-type
  { colors: [0x8a8278, 0x9a9088, 0x7e7870], rough: 0.70, metal: 0.30, emissive: 0x141210, w: 0.10 }, // M-type
];

function pickType() {
  let r = Math.random();
  for (const t of TYPES) { r -= t.w; if (r <= 0) return t; }
  return TYPES[0];
}

// ── PER-ASTEROID DATA ──────────────────────────────────────
const asteroids = [];
const _dummy = new THREE.Object3D();
const _quat = new THREE.Quaternion();

// Group by type for InstancedMesh batching
const typeGroups = TYPES.map(() => []);

for (let i = 0; i < ASTEROID_COUNT; i++) {
  const typeIdx = (() => { let r = Math.random(); for (let j = 0; j < TYPES.length; j++) { r -= TYPES[j].w; if (r <= 0) return j; } return 0; })();
  const phi = Math.random() * Math.PI * 2;
  const theta = Math.acos(2 * Math.random() - 1);
  const r = FIELD_RADIUS * (0.2 + Math.pow(Math.random(), 0.7) * 0.8);
  const size = SIZE_MIN + Math.pow(Math.random(), 2.5) * (SIZE_MAX - SIZE_MIN);

  typeGroups[typeIdx].push({
    x: Math.sin(theta) * Math.cos(phi) * r,
    y: Math.sin(theta) * Math.sin(phi) * r * 0.5,
    z: Math.cos(theta) * r,
    size,
    rotAxis: new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize(),
    rotSpeed: (0.002 + Math.random() * 0.01) * (Math.random() < 0.5 ? 1 : -1),
    rotAngle: Math.random() * Math.PI * 2,
    colorIdx: Math.floor(Math.random() * 3),
  });
}

// ── CREATE INSTANCED MESHES ────────────────────────────────
const allMeshes = [];
TYPES.forEach((type, ti) => {
  const group = typeGroups[ti];
  if (group.length === 0) return;

  const geo = createRockyGeo();
  const mat = new THREE.MeshStandardMaterial({
    color: type.colors[0], roughness: type.rough, metalness: type.metal,
    emissive: new THREE.Color(type.emissive), emissiveIntensity: 0.4,
  });

  const mesh = new THREE.InstancedMesh(geo, mat, group.length);
  const color = new THREE.Color();

  group.forEach((d, i) => {
    _dummy.position.set(d.x, d.y, d.z);
    _dummy.scale.setScalar(d.size);
    _dummy.rotation.set(Math.random()*6.28, Math.random()*6.28, Math.random()*6.28);
    _dummy.updateMatrix();
    mesh.setMatrixAt(i, _dummy.matrix);
    color.set(type.colors[d.colorIdx]);
    color.offsetHSL(0, 0, (Math.random() - 0.5) * 0.08);
    mesh.setColorAt(i, color);
  });

  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = false;
  novaGroup.add(mesh);
  allMeshes.push({ mesh, asteroids: group });
});

// ── HITBOX ─────────────────────────────────────────────────
const novaHitbox = new THREE.Mesh(
  new THREE.SphereGeometry(FIELD_RADIUS * 1.2),
  new THREE.MeshBasicMaterial({ visible: false })
);
novaHitbox.userData = { isHoverable: true };
novaGroup.add(novaHitbox);

// ── ANIMATION LOOP ─────────────────────────────────────────
startLoop((elapsed) => {
  const hover = novaHitbox.userData.isHovered ? 1 : 0;
  novaGroup.rotation.y = elapsed * 0.015 + hover * 0.03;

  allMeshes.forEach(({ mesh, asteroids: group }) => {
    group.forEach((d, i) => {
      d.rotAngle += d.rotSpeed;
      _quat.setFromAxisAngle(d.rotAxis, d.rotAngle);
      _dummy.position.set(d.x, d.y, d.z);
      _dummy.scale.setScalar(d.size);
      _dummy.quaternion.copy(_quat);
      _dummy.updateMatrix();
      mesh.setMatrixAt(i, _dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
});

export { novaGroup, novaHitbox };

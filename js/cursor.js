// ═══════════════════════════════════════════════════════════
// CURSOR.JS — Custom Point-Light Cursor + Raycasting
// v5 ENHANCED Module 5
// ═══════════════════════════════════════════════════════════

import * as THREE from 'three';
import { scene, camera, renderer } from './scene.js';
import { constHitbox, bhHitbox, pulsar } from './world.js';
import { githubQuasarHitbox } from './github-quasar.js';
import { galHitbox } from './skills-galaxy.js';
import { wormHitbox } from './journey-wormhole.js';
import { novaHitbox } from './contact-supernova.js';

// ── Custom cursor div ──
const cursorEl = document.createElement('div');
cursorEl.id = 'v5-cursor';
cursorEl.style.cssText = `
  position:fixed; top:0; left:0; width:18px; height:18px;
  border-radius:50%; pointer-events:none; z-index:100001;
  background: radial-gradient(circle, rgba(108,99,255,0.9) 0%, rgba(0,212,255,0.4) 60%, transparent 100%);
  transform: translate(-50%,-50%);
  transition: width 0.2s, height 0.2s, background 0.2s;
  mix-blend-mode: screen;
`;
document.body.appendChild(cursorEl);

// ── Three.js cursor light ──
const cursorLight = new THREE.PointLight(0x6c63ff, 0, 80);
cursorLight.position.set(0, 0, 20);
scene.add(cursorLight);

// ── Raycaster ──
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -20);
const worldPos = new THREE.Vector3();

let hoveredObject = null;

window.addEventListener('mousemove', (e) => {
  // Move CSS cursor
  cursorEl.style.left = e.clientX + 'px';
  cursorEl.style.top = e.clientY + 'px';

  // NDC for raycasting
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  // Project cursor light onto Z=20 plane
  raycaster.setFromCamera(mouse, camera);
  raycaster.ray.intersectPlane(plane, worldPos);
  cursorLight.position.lerp(worldPos, 0.12);

  // Raycast against interactive objects
  const interactables = [constHitbox, githubQuasarHitbox, galHitbox, bhHitbox, wormHitbox, novaHitbox, pulsar].filter(Boolean);
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(interactables, false);

  if (hits.length > 0) {
    const hit = hits[0].object;
    if (hoveredObject !== hit) {
      // Enter hover
      hoveredObject = hit;
      if (hit.userData.isHoverable) {
        hit.userData.isHovered = true;
      }
      // Scale up
      gsapScaleTo(hit, 1.25);
      // Grow cursor
      cursorEl.style.width = '32px';
      cursorEl.style.height = '32px';
      cursorEl.style.background = 'radial-gradient(circle, rgba(0,212,255,0.95) 0%, rgba(108,99,255,0.4) 60%, transparent 100%)';
      document.body.style.cursor = 'none';
    }
  } else {
    if (hoveredObject) {
      // Leave hover
      if (hoveredObject.userData.isHoverable) {
        hoveredObject.userData.isHovered = false;
      }
      gsapScaleTo(hoveredObject, 1.0);
      hoveredObject = null;
      cursorEl.style.width = '18px';
      cursorEl.style.height = '18px';
      cursorEl.style.background = 'radial-gradient(circle, rgba(108,99,255,0.9) 0%, rgba(0,212,255,0.4) 60%, transparent 100%)';
    }
  }
});

// Light intensity lerp in animation loop
import { startLoop } from './scene.js';
startLoop(() => {
  cursorLight.intensity += (1.5 - cursorLight.intensity) * 0.08;
});

// Simple scale tween using requestAnimationFrame (no GSAP dependency)
function gsapScaleTo(obj, target) {
  if (typeof gsap !== 'undefined') {
    gsap.to(obj.scale, { x: target, y: target, z: target, duration: 0.3, ease: 'back.out(2)' });
  }
}

// Hide default system cursor
document.body.style.cursor = 'none';

export { cursorLight, mouse };

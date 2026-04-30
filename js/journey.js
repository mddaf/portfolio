// ═══════════════════════════════════════════════════════════
// JOURNEY.JS — Camera Spline + Scroll Binding
// v5 ENHANCED Module 3
// Camera travels Z=0 → Z=-1000 along CatmullRomCurve3
// ═══════════════════════════════════════════════════════════

import * as THREE from 'three';
import { camera, startLoop } from './scene.js';

// ── Spline Waypoints (one per station) ──
const WAYPOINTS = [
  new THREE.Vector3(0,   2,   30),    // Hero — looking at planet
  new THREE.Vector3(5,   1,  -170),   // About — offset right toward comm array
  new THREE.Vector3(0,   3,  -370),   // Skills — centered above crystals
  new THREE.Vector3(0,   2,  -570),   // Projects — centered at tablets
  new THREE.Vector3(5,   2,  -770),   // Journey
  new THREE.Vector3(0,   3,  -970),   // GitHub
  new THREE.Vector3(0,   1, -1170),   // Contact
];

const spline = new THREE.CatmullRomCurve3(WAYPOINTS, false, 'catmullrom', 0.5);

// LookAt targets (slightly ahead on the spline)
const LOOK_OFFSETS = [
  new THREE.Vector3(0, 0, 0),       // Hero — look at planet center
  new THREE.Vector3(10, 0, -200),   // About — look at comm array
  new THREE.Vector3(0, 0, -400),    // Skills — look at crystal field
  new THREE.Vector3(0, 0, -600),    // Projects — look at tablets
  new THREE.Vector3(8, 0, -800),    // Journey
  new THREE.Vector3(0, 0, -1000),   // GitHub
  new THREE.Vector3(0, 0, -1200),   // Contact
];

// ── Scroll Progress Tracking ──
let scrollProgress = 0;     // 0 → 1
let targetProgress = 0;
let currentLookAt = new THREE.Vector3();
let targetLookAt = new THREE.Vector3();

const SECTION_IDS = ['hero', 'about', 'skills', 'projects', 'journey', 'github', 'contact'];

// Scroll drives progress based on actual DOM section heights
function updateProgress() {
  const scrollTop = window.scrollY;
  const sections = SECTION_IDS.map(id => document.getElementById(id));
  
  // Find which section is currently active
  let currentSecIdx = 0;
  for(let i=0; i<sections.length; i++) {
    if(sections[i]) {
       const rect = sections[i].getBoundingClientRect();
       // Trigger section change when it reaches near the top of the viewport
       if(rect.top <= window.innerHeight * 0.3) {
         currentSecIdx = i;
       }
    }
  }

  let frac = 0;
  const currentSec = sections[currentSecIdx];
  const nextSec = sections[currentSecIdx + 1];
  
  if (currentSec) {
    const currentTop = currentSec.getBoundingClientRect().top + window.scrollY;
    
    if (nextSec) {
      const nextTop = nextSec.getBoundingClientRect().top + window.scrollY;
      const sectionHeight = nextTop - currentTop;
      const scrolledPast = Math.max(0, scrollTop - currentTop);
      frac = Math.max(0, Math.min(1, scrolledPast / sectionHeight));
    } else {
      // Last section
      const maxScroll = document.body.scrollHeight - window.innerHeight;
      const sectionHeight = maxScroll - currentTop;
      if (sectionHeight > 0) {
        const scrolledPast = Math.max(0, scrollTop - currentTop);
        frac = Math.max(0, Math.min(1, scrolledPast / sectionHeight));
      } else {
        frac = 1;
      }
    }
  }
  
  const totalWaypoints = WAYPOINTS.length - 1;
  targetProgress = (currentSecIdx + frac) / totalWaypoints;
  targetProgress = Math.max(0, Math.min(1, targetProgress));
}

window.addEventListener('scroll', updateProgress, { passive: true });
window.addEventListener('resize', updateProgress);
updateProgress(); // init

// ── Cinematic Intro ──
let introComplete = false;
let introProgress = 0;
const INTRO_DURATION = 3.0; // seconds

// Camera starts very close to planet, pulls back
const introStart = new THREE.Vector3(0, 0, 8);
const introEnd = WAYPOINTS[0].clone();

// ── Animation Loop ──
startLoop((elapsed) => {
  if (!introComplete) {
    // Cinematic intro: smooth pullback from planet
    introProgress = Math.min(elapsed / INTRO_DURATION, 1);
    const ease = 1 - Math.pow(1 - introProgress, 3); // easeOutCubic
    camera.position.lerpVectors(introStart, introEnd, ease);
    camera.lookAt(0, 0, 0);
    if (introProgress >= 1) introComplete = true;
    return;
  }

  // Smooth lerp toward target scroll progress
  scrollProgress += (targetProgress - scrollProgress) * 0.06;

  // Get position on spline using uniform parameterization to hit exact waypoints
  const splinePos = spline.getPoint(Math.min(scrollProgress, 0.9999));
  camera.position.lerp(splinePos, 0.06);

  // Compute lookAt target (interpolate between station look targets)
  const totalSegments = LOOK_OFFSETS.length - 1;
  const rawIdx = scrollProgress * totalSegments;
  const segIdx = Math.floor(rawIdx);
  const segFrac = rawIdx - segIdx;
  const fromLook = LOOK_OFFSETS[Math.min(segIdx, totalSegments)];
  const toLook = LOOK_OFFSETS[Math.min(segIdx + 1, totalSegments)];
  targetLookAt.lerpVectors(fromLook, toLook, segFrac);
  currentLookAt.lerp(targetLookAt, 0.04);
  camera.lookAt(currentLookAt);
});

// ── Warp Detection (for star stretch + chromatic aberration) ──
let lastScroll = 0;
let velocity = 0;

function detectWarp() {
  const now = window.scrollY;
  velocity = Math.abs(now - lastScroll);
  lastScroll = now;
  requestAnimationFrame(detectWarp);
}
detectWarp();

export { scrollProgress, velocity, spline, introComplete };

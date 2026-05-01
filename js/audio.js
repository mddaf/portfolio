// ═══════════════════════════════════════════════════════════
// AUDIO.JS — Web Audio API: Ambient Drone + Chimes + Easter Eggs
// v5 ENHANCED Module 7
// All audio is user-gesture gated (no autoplay policy violations)
// ═══════════════════════════════════════════════════════════

let ctx = null;
let masterGain = null;
let audioEnabled = false;

// ── YouTube Player setup for Main Soundtrack ──
let ytPlayer = null;
let ytReady = false;

function initYTPlayer() {
  if (document.getElementById('yt-api-script')) return;
  const tag = document.createElement('script');
  tag.id = 'yt-api-script';
  tag.src = "https://www.youtube.com/iframe_api";
  const firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

  window.onYouTubeIframeAPIReady = function() {
    const container = document.createElement('div');
    container.id = 'yt-player-container';
    container.style.cssText = 'position:absolute; width:1px; height:1px; opacity:0; pointer-events:none; overflow:hidden; z-index:-999;';
    document.body.appendChild(container);

    ytPlayer = new YT.Player('yt-player-container', {
      height: '0',
      width: '0',
      videoId: '5gO0xpY_Y3E', // Hans Zimmer - Interstellar
      playerVars: {
        'autoplay': 0,
        'controls': 0,
        'loop': 1,
        'playlist': '5gO0xpY_Y3E'
      },
      events: {
        'onReady': (event) => {
          ytReady = true;
          event.target.setVolume(100);
          if (audioEnabled) {
            event.target.playVideo();
          }
        }
      }
    });
  };
}

// ── Initialize AudioContext on first user gesture ──
function initAudio() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();

  masterGain = ctx.createGain();
  masterGain.gain.value = 0.3;
  masterGain.connect(ctx.destination);

  audioEnabled = true;
  
  // Start soundtrack if ready
  if (ytReady && ytPlayer && typeof ytPlayer.playVideo === 'function') {
    ytPlayer.playVideo();
  }
}

// ── Chime: played on crystal hover ──
function playChime(freq = 880) {
  if (!ctx || !audioEnabled) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.18, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(ctx.currentTime + 0.8);
}

// ── Ting space sound: played on clicks ──
function playTing() {
  if (!ctx || !audioEnabled) return;
  
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  
  // High pitched crystalline frequencies
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(1800, ctx.currentTime);
  osc1.frequency.exponentialRampToValueAtTime(1750, ctx.currentTime + 0.3);
  
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(2400, ctx.currentTime);
  osc2.frequency.exponentialRampToValueAtTime(2350, ctx.currentTime + 0.3);

  // Sharp attack, fast decay
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
  
  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(masterGain);
  
  osc1.start();
  osc2.start();
  osc1.stop(ctx.currentTime + 0.4);
  osc2.stop(ctx.currentTime + 0.4);
}

// Add global click listener for the ting sound
window.addEventListener('click', (e) => {
  // Ignore clicks on the audio toggle itself so it doesn't overlap weirdly on first click
  if (audioEnabled && e.target.id !== 'audio-toggle' && !e.target.closest('#audio-toggle')) {
    playTing();
  }
});

// ── Portal hum: played near contact section ──
function playPortalHum() {
  if (!ctx || !audioEnabled) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = 220;
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(ctx.currentTime + 1.5);
}

// ── Pulsar burst: easter egg sound ──
function playPulsarBurst() {
  if (!ctx || !audioEnabled) return;
  const freqs = [440, 554, 659, 880];
  freqs.forEach((f, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;
    const delay = i * 0.08;
    gain.gain.setValueAtTime(0, ctx.currentTime + delay);
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + delay + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.5);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + 0.5);
  });
}

// ── Gravity wave: Konami code easter egg ──
function playGravityWave() {
  if (!ctx || !audioEnabled) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(4000, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 2.5);
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 2.5);
  gain.gain.setValueAtTime(0.4, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(ctx.currentTime + 2.5);
}

// ── Toggle mute button ──
function toggleMute() {
  if (!ctx) { initAudio(); return; }
  audioEnabled = !audioEnabled;
  if (masterGain) {
    masterGain.gain.setTargetAtTime(audioEnabled ? 0.3 : 0, ctx.currentTime, 0.5);
  }
  
  if (ytReady && ytPlayer && typeof ytPlayer.playVideo === 'function') {
    if (audioEnabled) {
      ytPlayer.playVideo();
    } else {
      ytPlayer.pauseVideo();
    }
  }

  const btn = document.getElementById('audio-toggle');
  if (btn) btn.textContent = audioEnabled ? '♪' : '♪̶';
  btn && btn.classList.toggle('muted', !audioEnabled);
}

// ── Konami Code detection ──
const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
let konamiIdx = 0;
window.addEventListener('keydown', (e) => {
  if (e.key === KONAMI[konamiIdx]) {
    konamiIdx++;
    if (konamiIdx === KONAMI.length) {
      konamiIdx = 0;
      triggerGravityWave();
    }
  } else {
    konamiIdx = 0;
  }
});

function triggerGravityWave() {
  playGravityWave();
  // Visual: massive chromatic aberration spike
  import('./scene.js').then(({ chromaticUniforms }) => {
    if (!chromaticUniforms) return;
    let t = 0;
    const spike = setInterval(() => {
      t += 0.05;
      const v = Math.max(0, Math.sin(t * Math.PI) * 3.0);
      chromaticUniforms.uStrength.value = v;
      if (t >= 1) {
        clearInterval(spike);
        chromaticUniforms.uStrength.value = 0;
      }
    }, 50);
  });
  console.log('%c🌌 GRAVITY WAVE DETECTED — You found the Konami code!', 'color:#ff6b9d;font-size:14px;font-family:monospace;');
}

// ── Scroll-based audio triggers ──
let lastScrollY = 0;
window.addEventListener('scroll', () => {
  lastScrollY = window.scrollY;

  // Portal hum near bottom
  const progress = window.scrollY / (document.body.scrollHeight - window.innerHeight);
  if (progress > 0.88 && !_portalPlayed) {
    _portalPlayed = true;
    playPortalHum();
    setTimeout(() => { _portalPlayed = false; }, 3000);
  }
}, { passive: true });
let _portalPlayed = false;

// ── Audio toggle button (injected into DOM) ──
function injectAudioButton() {
  const btn = document.createElement('button');
  btn.id = 'audio-toggle';
  btn.textContent = '♪';
  btn.setAttribute('aria-label', 'Toggle ambient audio');
  btn.style.cssText = `
    position: fixed; bottom: 24px; left: 24px; z-index: 1000;
    width: 40px; height: 40px; border-radius: 50%;
    background: rgba(108, 99, 255, 0.15);
    border: 1px solid rgba(108, 99, 255, 0.4);
    color: var(--accent-nebula, #6c63ff);
    font-size: 16px; cursor: pointer;
    backdrop-filter: blur(8px);
    transition: background 0.3s, transform 0.2s;
    display: flex; align-items: center; justify-content: center;
  `;
  btn.addEventListener('mouseenter', () => btn.style.background = 'rgba(108,99,255,0.3)');
  btn.addEventListener('mouseleave', () => btn.style.background = 'rgba(108,99,255,0.15)');
  btn.addEventListener('click', toggleMute);
  document.body.appendChild(btn);
}

// Init button and YouTube API on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    injectAudioButton();
    initYTPlayer();
  });
} else {
  injectAudioButton();
  initYTPlayer();
}

// Gate audio init on first interaction
['click', 'keydown', 'touchstart'].forEach(evt => {
  window.addEventListener(evt, initAudio, { once: true });
});

export { playChime, playPulsarBurst, playGravityWave, toggleMute, initAudio };

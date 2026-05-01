// ═══════════════════════════════════════════════════════════
// MAIN.JS — Entry Point + Feature Detection
// v5 ENHANCED — Module 1 (minimal bootstrap)
// Modules 2-8 will expand this file
// ═══════════════════════════════════════════════════════════

// ── Console Easter Egg (Enhancement 10) ──
console.log(
`%c
    ◆ ·  ·  ·  ◆ ·  ·  · ◆
  ·   ·  ·  ·  ·  ·  · · ·
◆  ·  ╔══════════════════╗  ·
   ·  ║  MD. DODI AL FAY ║  ◆
·  ◆  ║    ED PORTFOLIO  ║  ·
   ·  ║  ─────────────── ║
◆  ·  ║  BRAC UNIVERSITY ║  ·
   ·  ║  CSE  |  DHAKA   ║  ◆
·     ╚══════════════════╝
◆ ·  ·  ·  ◆ ·  ·  · ◆  ·

Hey curious developer 👾
The hidden pulsar is at Z = -120, X = 15.
`,
'color: #6c63ff; font-family: monospace; font-size: 11px; line-height: 1.4;'
);
console.log('%cGitHub: https://github.com/mddaf', 'color: #00d4ff; font-family: monospace;');
console.log('%cBuilt with Three.js · GSAP · Raw ambition', 'color: #7b86c0; font-family: monospace;');

// ── Mobile detection (kept for reference, 3D loads on ALL devices) ──
const isMobile = window.innerWidth <= 768 ||
  /Android|iPhone|iPad/i.test(navigator.userAgent);

// Import scene infrastructure + 3D world on ALL devices
import('./scene.js').then(() => {
  return import('./world.js');
}).then(() => {
  return import('./skills-galaxy.js');
}).then(() => {
  return import('./github-quasar.js');
}).then(() => {
  return import('./journey-wormhole.js');
}).then(() => {
  return import('./contact-supernova.js');
}).then(() => {
  return import('./journey.js');
}).then(() => {
  return Promise.all([
    import('./cursor.js'),
    import('./nebula.js'),
  ]);
}).then(([, nebulaModule]) => {
  import('./scene.js').then(({ setNebulaScene }) => {
    setNebulaScene(nebulaModule.nebulaScene, nebulaModule.nebulaCamera);
  });
  return import('./audio.js');
}).then(() => {
  return import('./magnetic.js');
}).then(() => {
  console.log('[v5] All modules initialized');
}).catch(err => {
  console.error('[v5] 3D init failed:', err);
});

// ── Preloader ──
window.addEventListener('load', () => {
  const preloader = document.getElementById('preloader');
  if (preloader) {
    setTimeout(() => preloader.classList.add('hidden'), 800);
  }

  // Hero GSAP entrance animation
  if (typeof gsap !== 'undefined') {
    gsap.timeline()
      .from('.hero-greeting', { y: 20, opacity: 0, duration: 0.6, ease: 'power3.out' })
      .from('.hero-name', { y: 30, opacity: 0, duration: 0.8, ease: 'power3.out' }, '-=0.2')
      .from('.hero-divider', { scaleX: 0, opacity: 0, duration: 0.5, ease: 'power3.out' }, '-=0.3')
      .from('.hero-role', { y: 15, opacity: 0, duration: 0.5 }, '-=0.2')
      .from('.hero-location', { y: 15, opacity: 0, duration: 0.4 }, '-=0.2')
      .from('.hero-actions', { y: 20, opacity: 0, duration: 0.5 }, '-=0.2');
  }

  // Init stat counters + scroll reveals
  import('./stats.js').then(({ initStats }) => initStats());
  import('./scroll.js').then(({ initScroll }) => initScroll());
});

// ── Skills Filter ──
const skillFilterBtns = document.querySelectorAll('#skills .filter-btn');
const skillCards = document.querySelectorAll('.skill-card');

skillFilterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    skillFilterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filter = btn.dataset.filter;
    skillCards.forEach(card => {
      const matches = filter === 'all' || card.dataset.cat === filter;
      if (matches) {
        card.style.display = 'flex';
        requestAnimationFrame(() => card.classList.remove('hidden'));
      } else {
        card.classList.add('hidden');
        setTimeout(() => {
          if (card.classList.contains('hidden')) card.style.display = 'none';
        }, 300);
      }
    });
  });
});

// ── Projects Filter ──
const projFilterBtns = document.querySelectorAll('#projects .filter-btn');
const projCards = document.querySelectorAll('.project-card');

projFilterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    projFilterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filter = btn.dataset.filter;
    projCards.forEach(card => {
      const matches = filter === 'all' || card.dataset.cat === filter;
      if (matches) {
        card.style.display = '';
        requestAnimationFrame(() => card.classList.remove('hidden'));
      } else {
        card.classList.add('hidden');
        setTimeout(() => {
          if (card.classList.contains('hidden')) card.style.display = 'none';
        }, 300);
      }
    });
  });
});

// ── Contact Form ──
const form = document.getElementById('contact-form');
const formStatus = document.getElementById('form-status');
const submitBtn = document.getElementById('submit-btn');

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (submitBtn) submitBtn.textContent = 'TRANSMITTING...';
    try {
      const formData = new FormData(form);
      const res = await fetch('https://usebasin.com/f/353b5bdc9c09', {
        method: 'POST', body: formData,
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        if (formStatus) formStatus.textContent = 'TRANSMISSION SENT ✓';
        if (submitBtn) { submitBtn.textContent = 'TRANSMISSION SENT ✓'; submitBtn.classList.add('sent'); }
        form.reset();
      } else {
        if (formStatus) formStatus.textContent = 'TRANSMISSION FAILED — TRY AGAIN';
        if (submitBtn) submitBtn.textContent = 'TRANSMIT ↗';
      }
    } catch (err) {
      if (formStatus) formStatus.textContent = 'CONNECTION ERROR — TRY AGAIN';
      if (submitBtn) submitBtn.textContent = 'TRANSMIT ↗';
    }
  });
}

// ── Platform Tabs (Coding Profiles) ──
const platformTabs = document.querySelectorAll('.platform-tab');
const platformPanels = document.querySelectorAll('.platform-panel');

platformTabs.forEach(tab => {
  tab.addEventListener('click', (e) => {
    const btn = e.currentTarget;
    platformTabs.forEach(t => t.classList.remove('active'));
    platformPanels.forEach(p => { p.classList.remove('active'); p.style.display = 'none'; });
    btn.classList.add('active');
    const panel = document.getElementById(`panel-${btn.dataset.platform}`);
    if (panel) { panel.classList.add('active'); panel.style.display = 'block'; }
  });
});

// ── Fetch LeetCode Stats ──
(async () => {
  try {
    const [profileRes, solvedRes] = await Promise.all([
      fetch('https://alfa-leetcode-api.onrender.com/mddaf'),
      fetch('https://alfa-leetcode-api.onrender.com/mddaf/solved'),
    ]);
    const profile = await profileRes.json();
    const solved = await solvedRes.json();

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('lc-total', solved.solvedProblem || 0);
    set('lc-easy', solved.easySolved || 0);
    set('lc-medium', solved.mediumSolved || 0);
    set('lc-hard', solved.hardSolved || 0);
    set('lc-ranking', profile.ranking ? `#${profile.ranking.toLocaleString()}` : 'N/A');
    const totalSubs = solved.totalSubmissionNum?.find(s => s.difficulty === 'All');
    set('lc-submissions', totalSubs ? totalSubs.submissions : 0);
  } catch (e) { console.warn('[Profiles] LeetCode fetch failed:', e); }
})();

// ── Fetch Codeforces Stats ──
(async () => {
  try {
    const res = await fetch('https://codeforces.com/api/user.info?handles=Al_Fayed');
    const data = await res.json();
    if (data.status === 'OK' && data.result[0]) {
      const u = data.result[0];
      const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      set('cf-rating', u.rating || 'Unrated');
      set('cf-max-rating', u.maxRating || 'N/A');
      set('cf-rank', u.rank ? u.rank.charAt(0).toUpperCase() + u.rank.slice(1) : 'N/A');
      set('cf-contribution', u.contribution || 0);
      set('cf-friends', u.friendOfCount || 0);
      set('cf-org', u.organization || 'N/A');
    }
  } catch (e) { console.warn('[Profiles] Codeforces fetch failed:', e); }
})();

// ── Journey Tabs (Education / Achievements) ──
const journeyTabs = document.querySelectorAll('.journey-tab');
const journeyPanels = document.querySelectorAll('.journey-panel');

journeyTabs.forEach(tab => {
  tab.addEventListener('click', (e) => {
    const btn = e.currentTarget;
    journeyTabs.forEach(t => t.classList.remove('active'));
    journeyPanels.forEach(p => { p.classList.remove('active'); p.style.display = 'none'; });
    btn.classList.add('active');
    const panel = document.getElementById(`jpanel-${btn.dataset.jtab}`);
    if (panel) { panel.classList.add('active'); panel.style.display = 'block'; }
  });
});

// ── Project Cosmic Modal ──
const modal = document.getElementById('project-modal');
if (modal) {
  const modalClose = document.getElementById('modal-close-btn');
  const modalTitle = document.getElementById('modal-title');
  const modalDesc = document.getElementById('modal-desc');
  const modalTags = document.getElementById('modal-tags');
  const modalLinks = document.getElementById('modal-links');
  const modalBackdrop = document.querySelector('.cosmic-modal-backdrop');

  const closeModal = () => {
    modal.style.display = 'none';
    document.body.style.overflow = ''; // Restore scroll
  };

  document.querySelectorAll('.btn-details').forEach(btn => {
    btn.addEventListener('click', () => {
      // Populate data
      modalTitle.textContent = btn.dataset.title || 'Project Details';
      modalDesc.textContent = btn.dataset.desc || '';
      
      // Tags
      modalTags.innerHTML = '';
      if (btn.dataset.tags) {
        btn.dataset.tags.split(',').forEach(tag => {
          const span = document.createElement('span');
          span.className = 'tag';
          span.textContent = tag.trim();
          modalTags.appendChild(span);
        });
      }

      // Links
      modalLinks.innerHTML = '';
      if (btn.dataset.live) {
        modalLinks.innerHTML += `<a href="${btn.dataset.live}" class="btn-ghost btn-sm" target="_blank" rel="noopener">Live Demo ↗</a>`;
      }
      if (btn.dataset.github) {
        modalLinks.innerHTML += `<a href="${btn.dataset.github}" class="btn-ghost btn-sm" target="_blank" rel="noopener">Source Code ↗</a>`;
      }

      // Show modal
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    });
  });

  // Close bindings
  modalClose.addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display === 'flex') closeModal();
  });
}

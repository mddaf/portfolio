// ═══════════════════════════════════════════════════════════
// MAGNETIC.JS — Gravitational Pull Hover Effect
// v5 ENHANCED Module 8 — Extended to all interactive elements
// Elements gently pull toward cursor within a radius
// ═══════════════════════════════════════════════════════════

// Strength tiers: buttons get stronger pull, cards get subtle pull
const TIERS = [
  {
    selectors: '.btn-primary, .btn-ghost, .btn-hire, .social-btn, #audio-toggle, .btn-submit',
    strength: 0.35,
    radius: 80,
  },
  {
    selectors: '.platform-tab, .journey-tab, .filter-btn, .nav-links a, .tag, .badge',
    strength: 0.25,
    radius: 60,
  },
  {
    selectors: '.project-card, .skill-card, .timeline-card, .stat-card, .cp-stat-card, .cert-card',
    strength: 0.12,
    radius: 100,
  },
];

function initMagnetic() {
  TIERS.forEach(({ selectors, strength, radius }) => {
    const els = document.querySelectorAll(selectors);
    els.forEach(el => {
      if (el.dataset.magneticInit) return; // skip already-initialized
      el.dataset.magneticInit = '1';
      el.style.transition = 'transform 0.3s cubic-bezier(0.16,1,0.3,1)';

      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < radius) {
          const pull = (1 - dist / radius) * strength;
          el.style.transform = `translate(${dx * pull}px, ${dy * pull}px) scale(${1 + strength * 0.1})`;
        }
      });

      el.addEventListener('mouseleave', () => {
        el.style.transform = 'translate(0,0) scale(1)';
      });
    });
  });
}

// Init after DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMagnetic);
} else {
  initMagnetic();
}

// Re-run after dynamic content changes (tab switches, scroll reveals)
const observer = new MutationObserver(() => initMagnetic());
observer.observe(document.body, { childList: true, subtree: true });

export { initMagnetic };

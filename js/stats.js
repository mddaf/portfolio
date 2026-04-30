// ═══════════════════════════════════════════════════════════
// STATS.JS — GSAP countTo for stat numbers (fixes "0" bug)
// ═══════════════════════════════════════════════════════════

// Wait for GSAP to be available (loaded via CDN)
function initStats() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  document.querySelectorAll('.stat-num').forEach(el => {
    const target = parseInt(el.dataset.target, 10);
    if (isNaN(target)) return;

    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        gsap.to({ val: 0 }, {
          val: target,
          duration: 1.5,
          ease: 'power2.out',
          onUpdate() {
            el.textContent = Math.round(this.targets()[0].val);
          }
        });
      }
    });
  });
}

export { initStats };

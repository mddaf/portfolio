// ═══════════════════════════════════════════════════════════
// SCROLL.JS — GSAP ScrollTrigger: panel reveals + effects
// v5 ENHANCED
// ═══════════════════════════════════════════════════════════

function initScroll() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  // Add slide-hidden to panels that are offscreen, then reveal on scroll
  document.querySelectorAll('.overlay-panel').forEach(el => {
    const rect = el.getBoundingClientRect();
    // Only animate panels not already in view on load
    if (rect.top > window.innerHeight) {
      el.classList.add('slide-hidden');
      ScrollTrigger.create({
        trigger: el.closest('section') || el,
        start: 'top 70%',
        onEnter: () => el.classList.add('visible'),
        onLeaveBack: () => el.classList.remove('visible'),
      });
    }
  });

  // Section headings clip-path reveal
  gsap.utils.toArray('section h2').forEach(h => {
    gsap.from(h, {
      clipPath: 'inset(0 100% 0 0)',
      duration: 0.8, ease: 'power3.out',
      scrollTrigger: { trigger: h, start: 'top 85%' }
    });
    h.style.clipPath = 'inset(0 0% 0 0)';
  });

  // Timeline line fill
  const timelineFill = document.querySelector('.timeline-line-fill');
  if (timelineFill) {
    ScrollTrigger.create({
      trigger: '.timeline',
      start: 'top 60%',
      end: 'bottom 80%',
      scrub: true,
      onUpdate: (self) => {
        timelineFill.style.height = (self.progress * 100) + '%';
      }
    });
  }

  // Timeline items stagger
  gsap.utils.toArray('.timeline-item').forEach((item, i) => {
    gsap.from(item, {
      x: -30, opacity: 0, duration: 0.6,
      delay: i * 0.1,
      ease: 'power3.out',
      scrollTrigger: { trigger: item, start: 'top 85%' }
    });
  });
}

export { initScroll };

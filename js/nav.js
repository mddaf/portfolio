// ═══════════════════════════════════════════════════════════
// NAV.JS — Nav highlight, hamburger, scroll progress
// ═══════════════════════════════════════════════════════════

// Scroll progress
const progressBar = document.getElementById('scroll-progress');
const nav = document.getElementById('site-nav');
const sections = document.querySelectorAll('section[id]');
const dots = document.querySelectorAll('.dot');
const navLinks = document.querySelectorAll('.nav-links a');

window.addEventListener('scroll', () => {
  const scrolled = window.scrollY;
  const total = document.body.scrollHeight - window.innerHeight;
  if (progressBar && total > 0) {
    progressBar.style.width = (scrolled / total * 100) + '%';
  }
  if (nav) {
    nav.classList.toggle('scrolled', scrolled > 50);
  }

  // Active section highlighting
  sections.forEach((section, i) => {
    const rect = section.getBoundingClientRect();
    if (rect.top <= 150 && rect.bottom >= 150) {
      dots.forEach(d => d.classList.remove('active'));
      navLinks.forEach(a => a.classList.remove('active'));
      if (dots[i]) dots[i].classList.add('active');
      // Nav links don't include hero, so offset by -1 for non-hero sections
      const sectionId = section.getAttribute('id');
      navLinks.forEach(a => {
        if (a.getAttribute('href') === '#' + sectionId) {
          a.classList.add('active');
        }
      });
    }
  });
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const href = a.getAttribute('href');
    if (href === '#') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
      // Close mobile menu if open
      const mobileMenu = document.getElementById('mobile-menu');
      if (mobileMenu) mobileMenu.classList.remove('open');
    }
  });
});

// Back to top
const backTop = document.getElementById('back-top');
window.addEventListener('scroll', () => {
  if (backTop) {
    backTop.classList.toggle('visible', window.scrollY > 500);
  }
});

// Hamburger menu
const hamburger = document.getElementById('hamburger-btn');
const mobileMenu = document.getElementById('mobile-menu');
const closeBtn = document.getElementById('close-menu');

if (hamburger && mobileMenu) {
  hamburger.addEventListener('click', () => {
    mobileMenu.classList.add('open');
  });
}
if (closeBtn && mobileMenu) {
  closeBtn.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
  });
}

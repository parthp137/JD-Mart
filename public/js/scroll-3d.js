/**
 * JD Mart - Scroll-Driven 3D Spatial Transition Engine
 * Uses IntersectionObserver for 60fps GPU-accelerated 3D reveal and perspective parallax
 */
(() => {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) return;

  function init3DScrollObserver() {
    // Select elements to reveal with 3D perspective
    const revealTargets = document.querySelectorAll(
      ".jd-card, .stat-card, .category-filters, .supplier-card, .rfq-box, .jd-view-container"
    );

    if (!("IntersectionObserver" in window)) {
      revealTargets.forEach((el) => el.classList.add("jd-3d-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("jd-3d-visible");
            // Optional: unobserve once revealed for performance
            obs.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -40px 0px"
      }
    );

    revealTargets.forEach((el, index) => {
      el.classList.add("jd-3d-reveal");
      // Stagger slight animation delays
      const staggerDelay = (index % 4) * 0.08;
      el.style.transitionDelay = `${staggerDelay}s`;
      observer.observe(el);
    });

    // 3D Parallax Scroll Listener for Hero
    const heroCanvas = document.getElementById("hero3DCanvas");
    if (heroCanvas) {
      window.addEventListener("scroll", () => {
        const scrollY = window.scrollY;
        if (scrollY < 500) {
          heroCanvas.style.transform = `translateY(${scrollY * 0.35}px) scale(${1 - scrollY * 0.0004})`;
        }
      }, { passive: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init3DScrollObserver);
  } else {
    init3DScrollObserver();
  }
})();

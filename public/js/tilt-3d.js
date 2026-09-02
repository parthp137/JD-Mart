/**
 * JD Mart - 3D Tilt & Specular Glare Depth Engine
 * High-performance 60fps vanilla 3D perspective transformation with mouse tracking & physics lerp
 */
(() => {
  "use strict";

  // Check user preference for reduced motion
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) return;

  class Tilt3D {
    constructor(element, options = {}) {
      this.element = element;
      this.options = Object.assign(
        {
          maxTilt: 12, // Max tilt rotation in degrees
          perspective: 1000, // Transform perspective in px
          scale: 1.025, // Scale on hover
          speed: 400, // Transition speed in ms
          glare: true, // Add specular glare overlay
          maxGlare: 0.35, // Max glare opacity (0 - 1)
          easing: "cubic-bezier(.03,.98,.52,.99)"
        },
        options
      );

      this.width = null;
      this.height = null;
      this.left = null;
      this.top = null;
      this.transitionTimeout = null;
      this.updateCall = null;
      this.isHovered = false;

      this.targetX = 0;
      this.targetY = 0;
      this.currentX = 0;
      this.currentY = 0;

      this.init();
    }

    init() {
      this.element.style.transformStyle = "preserve-3d";
      this.element.style.perspective = `${this.options.perspective}px`;

      if (this.options.glare) {
        this.prepareGlare();
      }

      this.addEventListeners();
    }

    prepareGlare() {
      // Create glare container
      const glareElement = document.createElement("div");
      glareElement.classList.add("jd-glare-wrapper");
      Object.assign(glareElement.style, {
        position: "absolute",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        pointerEvents: "none",
        borderRadius: window.getComputedStyle(this.element).borderRadius || "16px",
        zIndex: "9"
      });

      const glareInner = document.createElement("div");
      glareInner.classList.add("jd-glare-inner");
      Object.assign(glareInner.style, {
        position: "absolute",
        top: "50%",
        left: "50%",
        pointerEvents: "none",
        backgroundImage: "radial-gradient(circle at center, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 70%)",
        width: `${this.element.offsetWidth * 2 || 400}px`,
        height: `${this.element.offsetWidth * 2 || 400}px`,
        transform: "translate(-50%, -50%)",
        opacity: "0",
        transition: "opacity 300ms ease"
      });

      glareElement.appendChild(glareInner);
      this.element.appendChild(glareElement);
      this.glareInner = glareInner;
    }

    addEventListeners() {
      this.onMouseEnter = this.handleMouseEnter.bind(this);
      this.onMouseMove = this.handleMouseMove.bind(this);
      this.onMouseLeave = this.handleMouseLeave.bind(this);

      this.element.addEventListener("mouseenter", this.onMouseEnter);
      this.element.addEventListener("mousemove", this.onMouseMove);
      this.element.addEventListener("mouseleave", this.onMouseLeave);
    }

    updateDimensions() {
      const rect = this.element.getBoundingClientRect();
      this.width = rect.width;
      this.height = rect.height;
      this.left = rect.left;
      this.top = rect.top;
    }

    handleMouseEnter() {
      this.updateDimensions();
      this.isHovered = true;
      this.element.style.willChange = "transform";
      this.setTransition();
    }

    handleMouseMove(event) {
      if (!this.width || !this.height) this.updateDimensions();

      const x = (event.clientX - this.left) / this.width;
      const y = (event.clientY - this.top) / this.height;

      // Calculate percentage from center (-1 to 1)
      const xPercent = Math.min(Math.max((x - 0.5) * 2, -1), 1);
      const yPercent = Math.min(Math.max((y - 0.5) * 2, -1), 1);

      this.targetX = -yPercent * this.options.maxTilt; // Rotate around X-axis
      this.targetY = xPercent * this.options.maxTilt;  // Rotate around Y-axis

      if (this.glareInner) {
        const glareX = x * 100;
        const glareY = y * 100;
        this.glareInner.style.backgroundImage = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,${this.options.maxGlare}) 0%, rgba(255,255,255,0) 65%)`;
        this.glareInner.style.opacity = "1";
      }

      if (!this.updateCall) {
        this.updateCall = requestAnimationFrame(this.render.bind(this));
      }
    }

    handleMouseLeave() {
      this.isHovered = false;
      this.setTransition();
      this.targetX = 0;
      this.targetY = 0;

      if (this.glareInner) {
        this.glareInner.style.opacity = "0";
      }

      if (!this.updateCall) {
        this.updateCall = requestAnimationFrame(this.render.bind(this));
      }
    }

    setTransition() {
      clearTimeout(this.transitionTimeout);
      this.element.style.transition = `transform ${this.options.speed}ms ${this.options.easing}`;
      this.transitionTimeout = setTimeout(() => {
        if (this.isHovered) {
          this.element.style.transition = "";
        }
      }, this.options.speed);
    }

    render() {
      this.updateCall = null;

      // Lerp physics for buttery smooth motion
      const lerpFactor = this.isHovered ? 0.2 : 0.15;
      this.currentX += (this.targetX - this.currentX) * lerpFactor;
      this.currentY += (this.targetY - this.currentY) * lerpFactor;

      const scaleVal = this.isHovered ? this.options.scale : 1;
      this.element.style.transform = `perspective(${this.options.perspective}px) rotateX(${this.currentX.toFixed(2)}deg) rotateY(${this.currentY.toFixed(2)}deg) scale3d(${scaleVal}, ${scaleVal}, ${scaleVal})`;

      // Continue animating until settled
      if (
        Math.abs(this.targetX - this.currentX) > 0.05 ||
        Math.abs(this.targetY - this.currentY) > 0.05
      ) {
        this.updateCall = requestAnimationFrame(this.render.bind(this));
      } else if (!this.isHovered) {
        this.element.style.transform = "";
        this.element.style.willChange = "auto";
      }
    }
  }

  // Auto initialize on all 3D target elements
  function initAll3DTilt() {
    const targets = document.querySelectorAll(
      ".jd-card, .stat-card, .supplier-card, .premium-section, [data-tilt-3d]"
    );

    targets.forEach((el) => {
      if (el._has3DTilt) return;
      el._has3DTilt = true;
      
      const maxTilt = el.classList.contains("premium-section") ? 4 : 10;
      const scale = el.classList.contains("premium-section") ? 1.005 : 1.025;
      
      new Tilt3D(el, { maxTilt, scale, glare: true, maxGlare: 0.25 });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll3DTilt);
  } else {
    initAll3DTilt();
  }

  window.initAll3DTilt = initAll3DTilt;
})();

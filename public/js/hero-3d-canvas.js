/**
 * JD Mart - 3D Interactive Hero Particle & Isometric Scene Engine
 * Renders floating 3D agricultural geometric shapes, rotating isometric crates & particle depth field
 */
(() => {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  class Hero3DScene {
    constructor(canvasId) {
      this.canvas = document.getElementById(canvasId);
      if (!this.canvas) return;

      this.ctx = this.canvas.getContext("2d");
      if (!this.ctx) return;

      this.width = 0;
      this.height = 0;
      this.fov = 300;
      this.particles = [];
      this.numParticles = 55;
      this.cubes = [];
      this.numCubes = 6;

      this.mouseX = 0;
      this.mouseY = 0;
      this.targetMouseX = 0;
      this.targetMouseY = 0;

      this.init();
    }

    init() {
      this.resize();
      window.addEventListener("resize", () => this.resize());

      // Track mouse position over hero
      const heroContainer = this.canvas.parentElement;
      if (heroContainer) {
        heroContainer.addEventListener("mousemove", (e) => {
          const rect = heroContainer.getBoundingClientRect();
          this.targetMouseX = (e.clientX - rect.left - rect.width / 2) * 0.001;
          this.targetMouseY = (e.clientY - rect.top - rect.height / 2) * 0.001;
        });

        heroContainer.addEventListener("mouseleave", () => {
          this.targetMouseX = 0;
          this.targetMouseY = 0;
        });
      }

      this.createParticles();
      this.create3DCubes();

      if (!prefersReducedMotion) {
        this.animate();
      } else {
        this.renderStatic();
      }
    }

    resize() {
      const parent = this.canvas.parentElement;
      this.width = parent ? parent.offsetWidth : window.innerWidth;
      this.height = parent ? parent.offsetHeight : 280;
      this.canvas.width = this.width * window.devicePixelRatio;
      this.canvas.height = this.height * window.devicePixelRatio;
      this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    createParticles() {
      this.particles = [];
      const colors = ["#16a34a", "#22c55e", "#86efac", "#eab308", "#10b981"];
      for (let i = 0; i < this.numParticles; i++) {
        this.particles.push({
          x: (Math.random() - 0.5) * this.width * 1.5,
          y: (Math.random() - 0.5) * this.height * 1.5,
          z: Math.random() * 600 + 50,
          baseZ: Math.random() * 600 + 50,
          radius: Math.random() * 2.5 + 1.2,
          color: colors[Math.floor(Math.random() * colors.length)],
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          vz: (Math.random() - 0.5) * 0.3
        });
      }
    }

    create3DCubes() {
      this.cubes = [];
      const cubeColors = [
        { stroke: "#16a34a", fill: "rgba(22, 163, 74, 0.12)" },
        { stroke: "#22c55e", fill: "rgba(34, 197, 94, 0.1)" },
        { stroke: "#eab308", fill: "rgba(234, 179, 8, 0.12)" },
        { stroke: "#10b981", fill: "rgba(16, 185, 129, 0.08)" }
      ];

      for (let i = 0; i < this.numCubes; i++) {
        this.cubes.push({
          x: (Math.random() - 0.5) * this.width * 0.8,
          y: (Math.random() - 0.5) * this.height * 0.7,
          z: Math.random() * 400 + 100,
          size: Math.random() * 25 + 20,
          rotX: Math.random() * Math.PI,
          rotY: Math.random() * Math.PI,
          rotZ: Math.random() * Math.PI,
          rotSpeedX: (Math.random() - 0.5) * 0.012,
          rotSpeedY: (Math.random() - 0.5) * 0.015,
          rotSpeedZ: (Math.random() - 0.5) * 0.01,
          color: cubeColors[i % cubeColors.length],
          vy: (Math.random() - 0.5) * 0.25
        });
      }
    }

    project3D(x, y, z) {
      const scale = this.fov / (this.fov + z);
      return {
        x: x * scale + this.width / 2,
        y: y * scale + this.height / 2,
        scale: scale
      };
    }

    rotateX(x, y, z, angle) {
      const rad = angle;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      return { x, y: y * cos - z * sin, z: y * sin + z * cos };
    }

    rotateY(x, y, z, angle) {
      const rad = angle;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      return { x: x * cos + z * sin, y, z: -x * sin + z * cos };
    }

    rotateZ(x, y, z, angle) {
      const rad = angle;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      return { x: x * cos - y * sin, y: x * sin + y * cos, z };
    }

    drawCube(cube) {
      const s = cube.size / 2;
      const vertices = [
        { x: -s, y: -s, z: -s },
        { x: s, y: -s, z: -s },
        { x: s, y: s, z: -s },
        { x: -s, y: s, z: -s },
        { x: -s, y: -s, z: s },
        { x: s, y: -s, z: s },
        { x: s, y: s, z: s },
        { x: -s, y: s, z: s }
      ];

      // Rotate vertices
      const transformed = vertices.map((v) => {
        let p = this.rotateX(v.x, v.y, v.z, cube.rotX);
        p = this.rotateY(p.x, p.y, p.z, cube.rotY);
        p = this.rotateZ(p.x, p.y, p.z, cube.rotZ);
        return {
          x: p.x + cube.x,
          y: p.y + cube.y,
          z: p.z + cube.z
        };
      });

      // Project vertices to 2D screen
      const projected = transformed.map((v) => this.project3D(v.x, v.y, v.z));

      // 6 Faces of the cube (indices of vertices)
      const faces = [
        [0, 1, 2, 3], // Front
        [4, 5, 6, 7], // Back
        [0, 1, 5, 4], // Top
        [2, 3, 7, 6], // Bottom
        [0, 3, 7, 4], // Left
        [1, 2, 6, 5]  // Right
      ];

      this.ctx.strokeStyle = cube.color.stroke;
      this.ctx.fillStyle = cube.color.fill;
      this.ctx.lineWidth = 1.2;

      faces.forEach((face) => {
        this.ctx.beginPath();
        this.ctx.moveTo(projected[face[0]].x, projected[face[0]].y);
        for (let i = 1; i < face.length; i++) {
          this.ctx.lineTo(projected[face[i]].x, projected[face[i]].y);
        }
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
      });
    }

    animate() {
      // Lerp mouse coordinates
      this.mouseX += (this.targetMouseX - this.mouseX) * 0.05;
      this.mouseY += (this.targetMouseY - this.mouseY) * 0.05;

      this.ctx.clearRect(0, 0, this.width, this.height);

      // Render & Connect Particles
      const projectedParticles = [];

      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];

        p.x += p.vx + this.mouseX * 3;
        p.y += p.vy + this.mouseY * 3;
        p.z += p.vz;

        // Wrap around boundaries
        if (p.x < -this.width) p.x = this.width;
        if (p.x > this.width) p.x = -this.width;
        if (p.y < -this.height) p.y = this.height;
        if (p.y > this.height) p.y = -this.height;
        if (p.z < 20) p.z = 650;
        if (p.z > 650) p.z = 20;

        const proj = this.project3D(p.x, p.y, p.z);
        projectedParticles.push(proj);

        // Draw particle
        this.ctx.beginPath();
        this.ctx.arc(proj.x, proj.y, Math.max(0.5, p.radius * proj.scale), 0, Math.PI * 2);
        this.ctx.fillStyle = p.color;
        this.ctx.globalAlpha = Math.min(1, Math.max(0.2, proj.scale * 1.5));
        this.ctx.fill();
      }

      // Draw particle network lines
      this.ctx.strokeStyle = "rgba(22, 163, 74, 0.15)";
      this.ctx.lineWidth = 0.8;
      for (let i = 0; i < projectedParticles.length; i++) {
        for (let j = i + 1; j < projectedParticles.length; j++) {
          const dx = projectedParticles[i].x - projectedParticles[j].x;
          const dy = projectedParticles[i].y - projectedParticles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 85) {
            this.ctx.beginPath();
            this.ctx.globalAlpha = (1 - dist / 85) * 0.25;
            this.ctx.moveTo(projectedParticles[i].x, projectedParticles[i].y);
            this.ctx.lineTo(projectedParticles[j].x, projectedParticles[j].y);
            this.ctx.stroke();
          }
        }
      }

      this.ctx.globalAlpha = 1;

      // Animate & Draw 3D Cubes
      this.cubes.forEach((cube) => {
        cube.rotX += cube.rotSpeedX;
        cube.rotY += cube.rotSpeedY + this.mouseX * 0.02;
        cube.rotZ += cube.rotSpeedZ;
        cube.y += cube.vy;

        if (cube.y < -this.height / 2 - 50) cube.y = this.height / 2 + 50;
        if (cube.y > this.height / 2 + 50) cube.y = -this.height / 2 - 50;

        this.drawCube(cube);
      });

      requestAnimationFrame(() => this.animate());
    }

    renderStatic() {
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.cubes.forEach((cube) => this.drawCube(cube));
    }
  }

  // Auto mount hero 3D canvas
  function initHero3D() {
    const hero = document.querySelector(".premium-section");
    if (!hero || document.getElementById("hero3DCanvas")) return;

    hero.style.position = "relative";
    hero.style.overflow = "hidden";

    const canvas = document.createElement("canvas");
    canvas.id = "hero3DCanvas";
    Object.assign(canvas.style, {
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      zIndex: "1",
      opacity: "0.85"
    });

    // Make content appear cleanly above canvas
    const innerRow = hero.querySelector(".row");
    if (innerRow) {
      innerRow.style.position = "relative";
      innerRow.style.zIndex = "2";
    }

    hero.insertBefore(canvas, hero.firstChild);
    new Hero3DScene("hero3DCanvas");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initHero3D);
  } else {
    initHero3D();
  }
})();

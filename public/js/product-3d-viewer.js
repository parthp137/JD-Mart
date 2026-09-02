/**
 * JD Mart - 3D Interactive Product Turntable & Inspection Stage
 * Provides 360-degree interactive 3D rotation, depth zoom, lighting inspection & APMC quality seal
 */
(() => {
  "use strict";

  class Product3DViewer {
    constructor(containerId, options = {}) {
      this.container = document.getElementById(containerId);
      if (!this.container) return;

      this.options = Object.assign(
        {
          cropName: "Agricultural Lot",
          category: "Grains",
          grade: "A",
          autoRotate: true,
          rotSpeed: 0.008
        },
        options
      );

      this.canvas = document.createElement("canvas");
      this.ctx = this.canvas.getContext("2d");
      this.container.appendChild(this.canvas);

      this.width = 0;
      this.height = 0;
      this.fov = 400;

      this.rotX = 0.2;
      this.rotY = 0.4;
      this.rotZ = 0;
      this.zoom = 1.0;

      this.isDragging = false;
      this.lastMouseX = 0;
      this.lastMouseY = 0;
      this.autoRotate = this.options.autoRotate;
      this.wireframeMode = false;
      this.lightingIntensity = 1.0;

      this.init();
    }

    init() {
      this.resize();
      window.addEventListener("resize", () => this.resize());
      this.setupControls();
      this.setupInteraction();
      this.animate();
    }

    resize() {
      this.width = this.container.clientWidth || 450;
      this.height = this.container.clientHeight || 380;
      this.canvas.width = this.width * window.devicePixelRatio;
      this.canvas.height = this.height * window.devicePixelRatio;
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;
      this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    setupControls() {
      // Build floating 3D control toolbar inside container
      const toolbar = document.createElement("div");
      toolbar.className = "jd-3d-toolbar";
      toolbar.innerHTML = `
        <button type="button" class="jd-3d-btn active" id="btn3DAutoRot" title="Toggle Auto-Rotation">
          <i class="fa-solid fa-arrows-rotate"></i> <span>360° Spin</span>
        </button>
        <button type="button" class="jd-3d-btn" id="btn3DWireframe" title="Toggle Wireframe Mesh">
          <i class="fa-solid fa-draw-polygon"></i> <span>APMC Mesh</span>
        </button>
        <button type="button" class="jd-3d-btn" id="btn3DReset" title="Reset View">
          <i class="fa-solid fa-compress"></i> <span>Reset</span>
        </button>
      `;

      Object.assign(toolbar.style, {
        position: "absolute",
        bottom: "12px",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: "8px",
        background: "rgba(255, 255, 255, 0.85)",
        backdropFilter: "blur(10px)",
        padding: "6px 12px",
        borderRadius: "999px",
        boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
        border: "1px solid rgba(22, 163, 74, 0.2)",
        zIndex: "10"
      });

      this.container.style.position = "relative";
      this.container.appendChild(toolbar);

      // Bind button events
      const btnAutoRot = toolbar.querySelector("#btn3DAutoRot");
      const btnWireframe = toolbar.querySelector("#btn3DWireframe");
      const btnReset = toolbar.querySelector("#btn3DReset");

      btnAutoRot.addEventListener("click", () => {
        this.autoRotate = !this.autoRotate;
        btnAutoRot.classList.toggle("active", this.autoRotate);
      });

      btnWireframe.addEventListener("click", () => {
        this.wireframeMode = !this.wireframeMode;
        btnWireframe.classList.toggle("active", this.wireframeMode);
      });

      btnReset.addEventListener("click", () => {
        this.rotX = 0.2;
        this.rotY = 0.4;
        this.zoom = 1.0;
      });
    }

    setupInteraction() {
      // Mouse drag rotation
      this.canvas.addEventListener("mousedown", (e) => {
        this.isDragging = true;
        this.autoRotate = false;
        const btnAuto = this.container.querySelector("#btn3DAutoRot");
        if (btnAuto) btnAuto.classList.remove("active");
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      });

      window.addEventListener("mousemove", (e) => {
        if (!this.isDragging) return;
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;

        this.rotY += dx * 0.008;
        this.rotX += dy * 0.008;

        // Clamp vertical rotation
        this.rotX = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, this.rotX));

        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      });

      window.addEventListener("mouseup", () => {
        this.isDragging = false;
      });

      // Touch interaction
      this.canvas.addEventListener("touchstart", (e) => {
        if (e.touches.length === 1) {
          this.isDragging = true;
          this.autoRotate = false;
          this.lastMouseX = e.touches[0].clientX;
          this.lastMouseY = e.touches[0].clientY;
        }
      }, { passive: true });

      this.canvas.addEventListener("touchmove", (e) => {
        if (!this.isDragging || e.touches.length !== 1) return;
        const dx = e.touches[0].clientX - this.lastMouseX;
        const dy = e.touches[0].clientY - this.lastMouseY;

        this.rotY += dx * 0.01;
        this.rotX += dy * 0.01;
        this.rotX = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, this.rotX));

        this.lastMouseX = e.touches[0].clientX;
        this.lastMouseY = e.touches[0].clientY;
      }, { passive: true });

      this.canvas.addEventListener("touchend", () => {
        this.isDragging = false;
      });

      // Mouse Wheel Zoom
      this.canvas.addEventListener("wheel", (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        this.zoom = Math.max(0.65, Math.min(1.5, this.zoom + delta));
      }, { passive: false });
    }

    project(x, y, z) {
      // 3D rotation transforms
      // Rotate Y
      const cosY = Math.cos(this.rotY);
      const sinY = Math.sin(this.rotY);
      let x1 = x * cosY + z * sinY;
      let y1 = y;
      let z1 = -x * sinY + z * cosY;

      // Rotate X
      const cosX = Math.cos(this.rotX);
      const sinX = Math.sin(this.rotX);
      let x2 = x1;
      let y2 = y1 * cosX - z1 * sinX;
      let z2 = y1 * sinX + z1 * cosX;

      const scale = (this.fov / (this.fov + z2 + 250)) * this.zoom;
      return {
        x: x2 * scale + this.width / 2,
        y: y2 * scale + this.height / 2 - 15,
        z: z2,
        scale: scale
      };
    }

    draw3DModel() {
      // Draw 3D Ground Pedestal & Soft Ambient Shadow
      const groundScale = this.zoom;
      const groundY = this.height / 2 + 85 * groundScale;

      const shadowGrad = this.ctx.createRadialGradient(
        this.width / 2,
        groundY,
        10,
        this.width / 2,
        groundY,
        140 * groundScale
      );
      shadowGrad.addColorStop(0, "rgba(22, 101, 52, 0.28)");
      shadowGrad.addColorStop(0.6, "rgba(22, 101, 52, 0.08)");
      shadowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

      this.ctx.fillStyle = shadowGrad;
      this.ctx.beginPath();
      this.ctx.ellipse(this.width / 2, groundY, 130 * groundScale, 40 * groundScale, 0, 0, Math.PI * 2);
      this.ctx.fill();

      // Geometry: 3D Wholesale Commodity Crate / Bag Container
      const w = 70;
      const h = 85;
      const d = 70;

      const vertices = [
        { x: -w, y: -h, z: -d }, // 0
        { x: w, y: -h, z: -d },  // 1
        { x: w, y: h, z: -d },   // 2
        { x: -w, y: h, z: -d },  // 3
        { x: -w, y: -h, z: d },  // 4
        { x: w, y: -h, z: d },   // 5
        { x: w, y: h, z: d },    // 6
        { x: -w, y: h, z: d }    // 7
      ];

      const projected = vertices.map((v) => this.project(v.x, v.y, v.z));

      // Faces with normals & color definitions
      const faces = [
        { idx: [0, 1, 2, 3], color: "#15803d", normal: { x: 0, y: 0, z: -1 }, label: "APMC Lot" },
        { idx: [5, 4, 7, 6], color: "#16a34a", normal: { x: 0, y: 0, z: 1 }, label: "JD-VERIFIED" },
        { idx: [4, 0, 3, 7], color: "#166534", normal: { x: -1, y: 0, z: 0 }, label: "Grade A" },
        { idx: [1, 5, 6, 2], color: "#22c55e", normal: { x: 1, y: 0, z: 0 }, label: "100% Organic" },
        { idx: [4, 5, 1, 0], color: "#4ade80", normal: { x: 0, y: -1, z: 0 }, label: "Seal" },
        { idx: [3, 2, 6, 7], color: "#14532d", normal: { x: 0, y: 1, z: 0 }, label: "" }
      ];

      // Sort faces by average Z depth (Painter's Algorithm)
      faces.forEach((face) => {
        let avgZ = 0;
        face.idx.forEach((i) => (avgZ += projected[i].z));
        face.avgZ = avgZ / 4;
      });

      faces.sort((a, b) => b.avgZ - a.avgZ);

      // Render sorted faces
      faces.forEach((face) => {
        // Calculate lighting angle (light from top-right-front)
        const lx = 0.5;
        const ly = -0.7;
        const lz = 0.5;
        const dot = face.normal.x * lx + face.normal.y * ly + face.normal.z * lz;
        const light = Math.max(0.35, Math.min(1.0, 0.7 + dot * 0.4));

        this.ctx.beginPath();
        this.ctx.moveTo(projected[face.idx[0]].x, projected[face.idx[0]].y);
        for (let i = 1; i < face.idx.length; i++) {
          this.ctx.lineTo(projected[face.idx[i]].x, projected[face.idx[i]].y);
        }
        this.ctx.closePath();

        if (this.wireframeMode) {
          this.ctx.strokeStyle = "#16a34a";
          this.ctx.lineWidth = 1.5;
          this.ctx.stroke();
          this.ctx.fillStyle = "rgba(22, 163, 74, 0.12)";
          this.ctx.fill();
        } else {
          this.ctx.fillStyle = face.color;
          this.ctx.globalAlpha = light;
          this.ctx.fill();
          this.ctx.globalAlpha = 1.0;
          this.ctx.strokeStyle = "rgba(255,255,255,0.4)";
          this.ctx.lineWidth = 1.2;
          this.ctx.stroke();
        }
      });

      // Draw floating 3D APMC Verified Emblem Badge in front
      const emblemCenter = this.project(0, -h - 25, 0);
      this.ctx.save();
      this.ctx.translate(emblemCenter.x, emblemCenter.y);
      this.ctx.scale(emblemCenter.scale * 1.2, emblemCenter.scale * 1.2);

      // Gold badge backing
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 18, 0, Math.PI * 2);
      this.ctx.fillStyle = "#eab308";
      this.ctx.shadowColor = "rgba(234, 179, 8, 0.5)";
      this.ctx.shadowBlur = 10;
      this.ctx.fill();

      // Inner star
      this.ctx.fillStyle = "#ffffff";
      this.ctx.font = "bold 13px 'Plus Jakarta Sans', sans-serif";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText("★", 0, 1);
      this.ctx.restore();
    }

    animate() {
      if (this.autoRotate && !this.isDragging) {
        this.rotY += this.options.rotSpeed;
      }

      this.ctx.clearRect(0, 0, this.width, this.height);
      this.draw3DModel();

      requestAnimationFrame(() => this.animate());
    }
  }

  // Hook to tab buttons on show.ejs
  window.initProduct3DViewer = function(containerId, options) {
    return new Product3DViewer(containerId, options);
  };
})();

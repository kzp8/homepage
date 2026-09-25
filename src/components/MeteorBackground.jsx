import { useEffect, useRef } from "react";

// Vector Helper Class
class Vector {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  setAngle(angle) {
    const len = this.getLength();
    this.x = Math.cos(angle) * len;
    this.y = Math.sin(angle) * len;
  }
  setLength(len) {
    const angle = Math.atan2(this.y, this.x);
    this.x = Math.cos(angle) * len;
    this.y = Math.sin(angle) * len;
  }
  getLength() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
}

// 3D Simplex Noise
const F3 = 1.0 / 3.0, G3 = 1.0 / 6.0;
const grad3 = [
  [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
  [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
  [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
];
const p = new Uint8Array(256);
for (let i = 0; i < 256; i++) p[i] = Math.floor(Math.random() * 256);
const perm = new Uint8Array(512), permMod12 = new Uint8Array(512);
for (let i = 0; i < 512; i++) {
  perm[i] = p[i & 255];
  permMod12[i] = perm[i] % 12;
}

function simplex3(xin, yin, zin) {
  let n0, n1, n2, n3;
  const s = (xin + yin + zin) * F3;
  const i = Math.floor(xin + s), j = Math.floor(yin + s), k = Math.floor(zin + s);
  const t = (i + j + k) * G3;
  const X0 = i - t, Y0 = j - t, Z0 = k - t;
  const x0 = xin - X0, y0 = yin - Y0, z0 = zin - Z0;
  let i1, j1, k1, i2, j2, k2;
  if (x0 >= y0) {
    if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
    else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
  } else {
    if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
    else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
    else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
  }
  const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
  const x2 = x0 - i2 + 2.0 * G3, y2 = y0 - j2 + 2.0 * G3, z2 = z0 - k2 + 2.0 * G3;
  const x3 = x0 - 1.0 + 3.0 * G3, y3 = y0 - 1.0 + 3.0 * G3, z3 = z0 - 1.0 + 3.0 * G3;
  const ii = i & 255, jj = j & 255, kk = k & 255;
  let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
  if (t0 < 0) n0 = 0; else { t0 *= t0; const gi0 = permMod12[ii + perm[jj + perm[kk]]]; n0 = t0 * t0 * (grad3[gi0][0] * x0 + grad3[gi0][1] * y0 + grad3[gi0][2] * z0); }
  let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
  if (t1 < 0) n1 = 0; else { t1 *= t1; const gi1 = permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]]; n1 = t1 * t1 * (grad3[gi1][0] * x1 + grad3[gi1][1] * y1 + grad3[gi1][2] * z1); }
  let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
  if (t2 < 0) n2 = 0; else { t2 *= t2; const gi2 = permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]]; n2 = t2 * t2 * (grad3[gi2][0] * x2 + grad3[gi2][1] * y2 + grad3[gi2][2] * z2); }
  let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
  if (t3 < 0) n3 = 0; else { t3 *= t3; const gi3 = permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]]]; n3 = t3 * t3 * (grad3[gi3][0] * x3 + grad3[gi3][1] * y3 + grad3[gi3][2] * z3); }
  return 32.0 * (n0 + n1 + n2 + n3);
}

class FlowField {
  constructor(cols, rows, settings = {}) {
    this.settings = { frequency: 0.03, ...settings };
    this.cols = cols;
    this.rows = rows;
    this.time = 0;
    this.build();
  }

  build() {
    this.field = new Array(this.cols);
    for (let x = 0; x < this.cols; x++) {
      this.field[x] = new Array(this.rows);
      for (let y = 0; y < this.rows; y++) {
        this.field[x][y] = new Vector(0, 0);
      }
    }
  }

  update(delta) {
    this.time += delta;
    const updateTime = (this.time * this.settings.frequency) / 1000;
    for (let x = 0; x < this.cols; x++) {
      for (let y = 0; y < this.rows; y++) {
        const angle = simplex3(x / 35, y / 35, updateTime) * Math.PI * 2;
        const length = simplex3(x / 25 + 100, y / 25 + 100, updateTime);
        this.field[x][y].setAngle(angle);
        this.field[x][y].setLength(length);

        if (typeof this.onDraw === "function") {
          this.onDraw(this.field[x][y], x, y);
        }
      }
    }
  }
}

export default function MeteorBackground() {
  const auroraCanvasRef = useRef(null);
  const meteorCanvasRef = useRef(null);

  // CodeFronts Liquid Glass 3D Tilt Listener
  useEffect(() => {
    const MAX_TILT = 7;
    const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const handlePointerMove = (e) => {
      const card = e.target.closest(".service-card, .quicklaunch-card, .bookmark, .box, .lg-01__card");
      if (!card) return;

      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;

      card.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
      card.style.setProperty("--my", (py * 100).toFixed(1) + "%");
      card.style.setProperty("--gloss", ".85");

      if (!reduce) {
        card.style.setProperty("--rx", ((px - 0.5) * MAX_TILT * 2).toFixed(2) + "deg");
        card.style.setProperty("--ry", (-(py - 0.5) * MAX_TILT * 2).toFixed(2) + "deg");
      }
    };

    const handlePointerLeave = (e) => {
      const card = e.target.closest(".service-card, .quicklaunch-card, .bookmark, .box, .lg-01__card");
      if (!card) return;

      card.style.setProperty("--gloss", ".4");
      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--ry", "0deg");
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerout", handlePointerLeave);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerout", handlePointerLeave);
    };
  }, []);

  // Aurora Boreal Flowfield Canvas (Layer 1)
  useEffect(() => {
    const canvas = auroraCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const cols = 160;
    const rows = 90;

    canvas.width = cols * 8;
    canvas.height = rows * 8;

    const ctxScale = {
      x: canvas.width / cols,
      y: canvas.height / rows,
    };
    const heightColorScaling = 255 / rows;

    const ff = new FlowField(cols, rows, { frequency: 0.025 });

    ff.onDraw = (vector, x, y) => {
      if (x === 0 && y === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      const xmove = vector.getLength() * Math.abs(vector.x);
      const ymove = vector.getLength() * Math.abs(vector.y);

      // Northern Lights Color Mapping
      const rawR = Math.max(0, -20 * xmove + 80 * ymove + (50 - 0.6 * y * heightColorScaling));
      const rawG = Math.max(0, 180 * xmove + 20 * ymove - 60 + 0.4 * y * heightColorScaling);
      const rawB = Math.max(0, 50 * xmove + 30 * ymove + (40 - 0.5 * y * heightColorScaling) + 0.5 * y * heightColorScaling);

      const red = Math.min(255, Math.floor(rawR * 0.15));
      const green = Math.min(255, Math.floor(rawG * 0.25));
      const blue = Math.min(255, Math.floor(rawB * 0.35));

      ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, 0.6)`;
      ctx.fillRect(x * ctxScale.x, y * ctxScale.y, ctxScale.x, ctxScale.y);
    };

    let animId;
    let lastStep = 0;
    function step(time) {
      ff.update(time - lastStep || 0);
      lastStep = time;
      animId = requestAnimationFrame(step);
    }
    animId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  // Sharp Crisp Meteor Rain Canvas (Layer 2) - Correct Direction & Trail
  useEffect(() => {
    const canvas = meteorCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.width = width;
    canvas.height = height;

    const angleRad = (-15 * Math.PI) / 180;
    const sinA = Math.sin(angleRad); // ~ -0.2588 (moves left)
    const cosA = Math.cos(angleRad); // ~ 0.9659 (moves down)

    const meteorCount = 75;
    const meteors = [];
    for (let i = 0; i < meteorCount; i++) {
      meteors.push({
        x: Math.random() * (width + 400) - 100,
        y: Math.random() * (height + 200) - 200,
        length: Math.random() * 140 + 70,
        width: Math.random() * 2 + 0.8,
        speed: Math.random() * 5 + 3.5,
        opacity: Math.random() * 0.55 + 0.35,
      });
    }

    let animId;
    function drawMeteors() {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < meteors.length; i++) {
        const m = meteors[i];

        // Motion: Move DOWN (cosA) and LEFT (sinA)
        m.y += m.speed * cosA;
        m.x += m.speed * sinA;

        // Reset if offscreen (left or bottom)
        if (m.y > height + 200 || m.x < -300) {
          m.y = -200;
          m.x = Math.random() * (width + 400) - 100;
        }

        // Head is at (m.x, m.y), Tail extends backwards (-sinA, -cosA)
        const headX = m.x;
        const headY = m.y;
        const tailX = headX - m.length * sinA;
        const tailY = headY - m.length * cosA;

        const grad = ctx.createLinearGradient(headX, headY, tailX, tailY);
        grad.addColorStop(0, `rgba(255, 255, 255, ${m.opacity})`);
        grad.addColorStop(1, "rgba(255, 255, 255, 0)");

        ctx.beginPath();
        ctx.lineWidth = m.width;
        ctx.strokeStyle = grad;
        ctx.lineCap = "round";
        ctx.moveTo(headX, headY);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();
      }

      animId = requestAnimationFrame(drawMeteors);
    }

    animId = requestAnimationFrame(drawMeteors);

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div id="background" className="aurora-meteor-wrapper" aria-hidden="true">
      <canvas ref={auroraCanvasRef} className="flowfield-canvas" />
      <canvas ref={meteorCanvasRef} className="meteor-canvas" />
    </div>
  );
}

type ConstellationParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  tw: number;
};

type ConstellationInk = {
  fg: { r: number; g: number; b: number };
  muted: { r: number; g: number; b: number };
};

type HomeShellConstellationWindow = Window & {
  __homeShellConstellationBackgroundCleanup?: () => void;
};

const CONSTELLATION_CANVAS_SELECTOR = ".constellation-bg__canvas";
const REDUCED_MOTION_MEDIA_QUERY = "(prefers-reduced-motion: reduce)";

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

const hexToRgb = (value: string) => {
  const v = value.trim();
  if (!v) return null;

  if (v.startsWith("rgb")) {
    const m = v.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;

    const parts = m[1].split(",").map((s) => Number.parseFloat(s.trim()));
    if (parts.length < 3) return null;

    return { r: parts[0], g: parts[1], b: parts[2] };
  }

  if (v[0] !== "#") return null;

  const hex = v.slice(1);
  if (hex.length === 3) {
    const r = Number.parseInt(hex[0] + hex[0], 16);
    const g = Number.parseInt(hex[1] + hex[1], 16);
    const b = Number.parseInt(hex[2] + hex[2], 16);
    return { r, g, b };
  }

  if (hex.length === 6) {
    const r = Number.parseInt(hex.slice(0, 2), 16);
    const g = Number.parseInt(hex.slice(2, 4), 16);
    const b = Number.parseInt(hex.slice(4, 6), 16);
    return { r, g, b };
  }

  return null;
};

const resolveInk = (): ConstellationInk => {
  const root = getComputedStyle(document.documentElement);
  const fg = hexToRgb(root.getPropertyValue("--fg")) ?? {
    r: 17,
    g: 17,
    b: 17,
  };
  const muted = hexToRgb(root.getPropertyValue("--muted")) ?? fg;

  return { fg, muted };
};

export function cleanupHomeShellConstellationBackground() {
  const browserWindow = window as HomeShellConstellationWindow;
  browserWindow.__homeShellConstellationBackgroundCleanup?.();
  browserWindow.__homeShellConstellationBackgroundCleanup = undefined;
}

export function initHomeShellConstellationBackground() {
  cleanupHomeShellConstellationBackground();

  const canvas = document.querySelector(CONSTELLATION_CANVAS_SELECTOR);
  if (!(canvas instanceof HTMLCanvasElement)) return;

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  const browserWindow = window as HomeShellConstellationWindow;
  const density = Number(canvas.dataset.density ?? "1");
  const maxDistance = Number(canvas.dataset.maxDistance ?? "140");
  const speed = Number(canvas.dataset.speed ?? "0.22");
  const prefersReduced = matchMedia(REDUCED_MOTION_MEDIA_QUERY).matches;
  const dpr = () => Math.min(2, window.devicePixelRatio || 1);
  const controller = new AbortController();

  let ink = resolveInk();
  const themeObserver = new MutationObserver(() => {
    ink = resolveInk();
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  const state: {
    w: number;
    h: number;
    particles: ConstellationParticle[];
    raf: number;
    t: number;
    pointer: { x: number; y: number; active: boolean };
  } = {
    w: 0,
    h: 0,
    particles: [],
    raf: 0,
    t: 0,
    pointer: { x: -1, y: -1, active: false },
  };

  const makeParticle = (): ConstellationParticle => {
    const angle = Math.random() * Math.PI * 2;
    const vel = (0.35 + Math.random() * 0.75) * speed;

    return {
      x: Math.random() * state.w,
      y: Math.random() * state.h,
      vx: Math.cos(angle) * vel,
      vy: Math.sin(angle) * vel,
      r: 0.9 + Math.random() * 1.4,
      tw: Math.random() * Math.PI * 2,
    };
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const scale = dpr();
    state.w = Math.max(1, Math.floor(rect.width));
    state.h = Math.max(1, Math.floor(rect.height));
    canvas.width = Math.floor(state.w * scale);
    canvas.height = Math.floor(state.h * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);

    const baseCount = Math.floor((state.w * state.h) / 16000);
    const count = clamp(Math.floor(baseCount * density), 40, 140);
    while (state.particles.length < count) state.particles.push(makeParticle());
    while (state.particles.length > count) state.particles.pop();
  };

  const draw = () => {
    state.t += 1;
    ctx.clearRect(0, 0, state.w, state.h);

    const maxD = maxDistance;
    const maxD2 = maxD * maxD;
    const { fg, muted } = ink;

    for (const p of state.particles) {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) {
        p.x = 0;
        p.vx *= -1;
      } else if (p.x > state.w) {
        p.x = state.w;
        p.vx *= -1;
      }

      if (p.y < 0) {
        p.y = 0;
        p.vy *= -1;
      } else if (p.y > state.h) {
        p.y = state.h;
        p.vy *= -1;
      }
    }

    if (state.pointer.active) {
      for (const p of state.particles) {
        const dx = state.pointer.x - p.x;
        const dy = state.pointer.y - p.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > maxD2) continue;

        const force = (1 - Math.sqrt(d2) / maxD) * 0.018;
        p.vx += dx * force * 0.0009;
        p.vy += dy * force * 0.0009;
      }
    }

    ctx.lineWidth = 1;
    for (let i = 0; i < state.particles.length; i++) {
      const a = state.particles[i];

      for (let j = i + 1; j < state.particles.length; j++) {
        const b = state.particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > maxD2) continue;

        const d = Math.sqrt(d2);
        const alpha = (1 - d / maxD) * 0.35;
        ctx.strokeStyle = `rgba(${muted.r}, ${muted.g}, ${muted.b}, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    for (const p of state.particles) {
      const tw = (Math.sin(state.t * 0.02 + p.tw) + 1) / 2;
      const r = p.r * (0.75 + tw * 0.7);
      const alpha = 0.22 + tw * 0.35;
      ctx.fillStyle = `rgba(${fg.r}, ${fg.g}, ${fg.b}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const tick = () => {
    draw();
    state.raf = requestAnimationFrame(tick);
  };

  const stop = () => {
    cancelAnimationFrame(state.raf);
    state.raf = 0;
  };

  const onMove = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    state.pointer.x = event.clientX - rect.left;
    state.pointer.y = event.clientY - rect.top;
    state.pointer.active = true;
  };

  const onLeave = () => {
    state.pointer.active = false;
  };

  const onVisibility = () => {
    if (document.visibilityState === "hidden") stop();
    else if (!prefersReduced && !state.raf) tick();
  };

  const cleanup = () => {
    stop();
    themeObserver.disconnect();
    controller.abort();
  };

  browserWindow.__homeShellConstellationBackgroundCleanup = cleanup;

  window.addEventListener("resize", resize, {
    passive: true,
    signal: controller.signal,
  });
  document.addEventListener("visibilitychange", onVisibility, {
    signal: controller.signal,
  });
  window.addEventListener("pointermove", onMove, {
    passive: true,
    signal: controller.signal,
  });
  window.addEventListener("pointerleave", onLeave, {
    passive: true,
    signal: controller.signal,
  });

  resize();
  if (prefersReduced) draw();
  else tick();
}

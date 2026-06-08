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
const FRIEND_LINK_GLASS_CARD_SELECTOR =
  ".friend-links-grid .app-panel-item--link";
const REDUCED_MOTION_MEDIA_QUERY = "(prefers-reduced-motion: reduce)";
const FRIEND_LINK_GLASS_LINE_MAX = 24;
const FRIEND_LINK_GLASS_POINT_MAX = 10;
const FRIEND_LINK_GLASS_FIELD_EMPTY =
  "linear-gradient(transparent, transparent)";

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const fixed = (n: number, digits = 2) =>
  Number.isFinite(n) ? n.toFixed(digits) : "0";
const rgb = ({ r, g, b }: { r: number; g: number; b: number }) =>
  `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
const svgBackground = (svg: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

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

  const updateFriendLinkGlassSamples = () => {
    const cards = Array.from(
      document.querySelectorAll<HTMLElement>(FRIEND_LINK_GLASS_CARD_SELECTOR),
    );
    if (cards.length === 0) return;

    const canvasRect = canvas.getBoundingClientRect();
    const maxD = maxDistance;
    const maxD2 = maxD * maxD;
    const lineColor = rgb(ink.muted);
    const pointColor = rgb(ink.fg);

    for (const card of cards) {
      const rect = card.getBoundingClientRect();
      const cardStyle = getComputedStyle(card);
      const borderSize =
        Number.parseFloat(
          cardStyle.getPropertyValue("--friend-link-glass-border-size"),
        ) ||
        Number.parseFloat(cardStyle.borderTopWidth) ||
        0;
      const fieldLeft = rect.left + borderSize - canvasRect.left;
      const fieldTop = rect.top + borderSize - canvasRect.top;
      const fieldRight = rect.right - borderSize - canvasRect.left;
      const fieldBottom = rect.bottom - borderSize - canvasRect.top;

      if (
        fieldRight <= 0 ||
        fieldBottom <= 0 ||
        fieldLeft >= state.w ||
        fieldTop >= state.h
      ) {
        card.style.removeProperty("--friend-link-glass-field");
        continue;
      }

      const width = Math.max(1, fieldRight - fieldLeft);
      const height = Math.max(1, fieldBottom - fieldTop);
      const lineItems: {
        x1: number;
        y1: number;
        x2: number;
        y2: number;
        alpha: number;
        score: number;
      }[] = [];
      const pointItems: {
        x: number;
        y: number;
        r: number;
        alpha: number;
        score: number;
      }[] = [];

      for (const p of state.particles) {
        const x = p.x - fieldLeft;
        const y = p.y - fieldTop;
        const margin = 18;
        if (
          x < -margin ||
          y < -margin ||
          x > width + margin ||
          y > height + margin
        ) {
          continue;
        }

        const tw = (Math.sin(state.t * 0.02 + p.tw) + 1) / 2;
        const drawnRadius = p.r * (0.75 + tw * 0.7);
        const alpha = 0.08 + tw * 0.11;
        pointItems.push({
          x,
          y,
          r: clamp(drawnRadius * 4.8, 4, 11),
          alpha,
          score: drawnRadius * alpha,
        });
      }

      for (let i = 0; i < state.particles.length; i++) {
        const a = state.particles[i];

        for (let j = i + 1; j < state.particles.length; j++) {
          const b = state.particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 > maxD2) continue;

          const x1 = a.x - fieldLeft;
          const y1 = a.y - fieldTop;
          const x2 = b.x - fieldLeft;
          const y2 = b.y - fieldTop;
          const margin = 20;
          if (
            Math.max(x1, x2) < -margin ||
            Math.min(x1, x2) > width + margin ||
            Math.max(y1, y2) < -margin ||
            Math.min(y1, y2) > height + margin
          ) {
            continue;
          }

          const distance = Math.sqrt(d2);
          const alpha = clamp((1 - distance / maxD) * 0.12, 0, 0.11);
          if (alpha < 0.018) continue;

          lineItems.push({
            x1,
            y1,
            x2,
            y2,
            alpha,
            score: alpha * (1 + Math.min(distance, width + height) / maxD),
          });
        }
      }

      const lines = lineItems
        .sort((a, b) => b.score - a.score)
        .slice(0, FRIEND_LINK_GLASS_LINE_MAX)
        .map(
          ({ x1, y1, x2, y2, alpha }) =>
            `<line x1="${fixed(x1)}" y1="${fixed(y1)}" x2="${fixed(x2)}" y2="${fixed(y2)}" stroke="${lineColor}" stroke-opacity="${fixed(alpha, 3)}" stroke-width="3.6" stroke-linecap="round" />`,
        );
      const points = pointItems
        .sort((a, b) => b.score - a.score)
        .slice(0, FRIEND_LINK_GLASS_POINT_MAX)
        .map(
          ({ x, y, r, alpha }) =>
            `<circle cx="${fixed(x)}" cy="${fixed(y)}" r="${fixed(r)}" fill="${pointColor}" fill-opacity="${fixed(alpha, 3)}" />`,
        );

      if (lines.length === 0 && points.length === 0) {
        card.style.setProperty(
          "--friend-link-glass-field",
          FRIEND_LINK_GLASS_FIELD_EMPTY,
        );
        continue;
      }

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${fixed(width)}" height="${fixed(height)}" viewBox="0 0 ${fixed(width)} ${fixed(height)}"><filter id="b" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="3.2"/></filter><g filter="url(#b)">${lines.join("")}${points.join("")}</g></svg>`;
      const fieldBackground = svgBackground(svg);

      card.style.setProperty("--friend-link-glass-field", fieldBackground);
    }
  };

  const tick = () => {
    draw();
    if (state.t % 3 === 0) updateFriendLinkGlassSamples();
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
  window.addEventListener("scroll", updateFriendLinkGlassSamples, {
    passive: true,
    signal: controller.signal,
  });

  resize();
  if (prefersReduced) {
    draw();
    updateFriendLinkGlassSamples();
  } else tick();
}

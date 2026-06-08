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

type GlassPoint = {
  x: number;
  y: number;
  r: number;
  alpha: number;
  score: number;
};

type GlassLine = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  alpha: number;
  score: number;
};

type FriendLinkGlassCard = {
  element: HTMLElement;
  borderSize: number;
  radius: number;
};

type HomeShellConstellationWindow = Window & {
  __homeShellConstellationBackgroundCleanup?: () => void;
};

const CONSTELLATION_CANVAS_SELECTOR = ".constellation-bg__canvas";
const FRIEND_LINK_GLASS_GRID_SELECTOR = "[data-friend-links-grid='true']";
const REDUCED_MOTION_MEDIA_QUERY = "(prefers-reduced-motion: reduce)";
const FRIEND_LINK_GLASS_LINE_MAX = 24;
const FRIEND_LINK_GLASS_POINT_MAX = 10;
const FRIEND_LINK_GLASS_OVERLAY_CLASS = "friend-link-glass-overlay";

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
  let gridResizeObserver: ResizeObserver | undefined;
  let glassGrid: HTMLElement | null = null;
  let glassOverlay: HTMLCanvasElement | null = null;
  let glassCtx: CanvasRenderingContext2D | null = null;
  let friendLinkCards: FriendLinkGlassCard[] = [];
  let glassLines: GlassLine[] = [];
  let glassPoints: GlassPoint[] = [];

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

  const mountFriendLinkGlassOverlay = () => {
    glassOverlay?.remove();
    glassGrid = document.querySelector<HTMLElement>(
      FRIEND_LINK_GLASS_GRID_SELECTOR,
    );
    if (!glassGrid) {
      glassOverlay = null;
      glassCtx = null;
      friendLinkCards = [];
      return;
    }

    glassOverlay = document.createElement("canvas");
    glassOverlay.className = FRIEND_LINK_GLASS_OVERLAY_CLASS;
    glassOverlay.setAttribute("aria-hidden", "true");
    glassGrid.append(glassOverlay);

    glassCtx = glassOverlay.getContext("2d", { alpha: true });
    if (!glassCtx) {
      glassOverlay.remove();
      glassOverlay = null;
      friendLinkCards = [];
      return;
    }

    friendLinkCards = Array.from(
      glassGrid.querySelectorAll<HTMLElement>(".app-panel-item--link"),
    ).map((element) => {
      const cardStyle = getComputedStyle(element);
      const borderSize =
        Number.parseFloat(
          cardStyle.getPropertyValue("--friend-link-glass-border-size"),
        ) ||
        Number.parseFloat(cardStyle.borderTopWidth) ||
        0;
      const radius = Math.max(
        0,
        Number.parseFloat(cardStyle.borderRadius) - borderSize,
      );

      return { element, borderSize, radius };
    });

    gridResizeObserver?.disconnect();
    gridResizeObserver = new ResizeObserver(() => {
      resize();
      refreshFriendLinkCards();
      if (prefersReduced) drawFriendLinkGlassOverlay();
    });
    gridResizeObserver.observe(glassGrid);
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const scale = dpr();
    state.w = Math.max(1, Math.floor(rect.width));
    state.h = Math.max(1, Math.floor(rect.height));
    canvas.width = Math.floor(state.w * scale);
    canvas.height = Math.floor(state.h * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);

    if (glassOverlay && glassCtx && glassGrid) {
      const gridRect = glassGrid.getBoundingClientRect();
      const overlayWidth = Math.max(1, Math.floor(gridRect.width));
      const overlayHeight = Math.max(1, Math.floor(gridRect.height));
      glassOverlay.width = Math.floor(overlayWidth * scale);
      glassOverlay.height = Math.floor(overlayHeight * scale);
      glassCtx.setTransform(scale, 0, 0, scale, 0, 0);
    }

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
    glassLines = [];
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

        const glassAlpha = clamp(alpha * 0.34, 0, 0.11);
        if (glassAlpha >= 0.018) {
          glassLines.push({
            x1: a.x,
            y1: a.y,
            x2: b.x,
            y2: b.y,
            alpha: glassAlpha,
            score: glassAlpha * (1 + d / maxD),
          });
        }
      }
    }

    glassPoints = [];
    for (const p of state.particles) {
      const tw = (Math.sin(state.t * 0.02 + p.tw) + 1) / 2;
      const r = p.r * (0.75 + tw * 0.7);
      const alpha = 0.22 + tw * 0.35;
      ctx.fillStyle = `rgba(${fg.r}, ${fg.g}, ${fg.b}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();

      const glassAlpha = 0.08 + tw * 0.11;
      glassPoints.push({
        x: p.x,
        y: p.y,
        r: clamp(r * 3.2, 2.5, 7.5),
        alpha: glassAlpha,
        score: r * glassAlpha,
      });
    }

    glassLines.sort((a, b) => b.score - a.score);
    glassPoints.sort((a, b) => b.score - a.score);
  };

  const refreshFriendLinkCards = () => {
    if (!glassGrid) {
      friendLinkCards = [];
      return;
    }

    friendLinkCards = Array.from(
      glassGrid.querySelectorAll<HTMLElement>(".app-panel-item--link"),
    ).map((element) => {
      const cardStyle = getComputedStyle(element);
      const borderSize =
        Number.parseFloat(
          cardStyle.getPropertyValue("--friend-link-glass-border-size"),
        ) ||
        Number.parseFloat(cardStyle.borderTopWidth) ||
        0;
      const radius = Math.max(
        0,
        Number.parseFloat(cardStyle.borderRadius) - borderSize,
      );

      return { element, borderSize, radius };
    });
  };

  const drawRoundedRect = (
    targetCtx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
  ) => {
    const r = clamp(radius, 0, Math.min(width, height) / 2);
    targetCtx.beginPath();
    targetCtx.moveTo(x + r, y);
    targetCtx.lineTo(x + width - r, y);
    targetCtx.quadraticCurveTo(x + width, y, x + width, y + r);
    targetCtx.lineTo(x + width, y + height - r);
    targetCtx.quadraticCurveTo(
      x + width,
      y + height,
      x + width - r,
      y + height,
    );
    targetCtx.lineTo(x + r, y + height);
    targetCtx.quadraticCurveTo(x, y + height, x, y + height - r);
    targetCtx.lineTo(x, y + r);
    targetCtx.quadraticCurveTo(x, y, x + r, y);
    targetCtx.closePath();
  };

  const drawFriendLinkGlassOverlay = () => {
    if (!glassCtx || !glassGrid) return;

    const gridRect = glassGrid.getBoundingClientRect();
    const overlayWidth = Math.max(1, gridRect.width);
    const overlayHeight = Math.max(1, gridRect.height);
    glassCtx.clearRect(0, 0, overlayWidth, overlayHeight);
    if (friendLinkCards.length === 0) return;

    const canvasRect = canvas.getBoundingClientRect();
    const canvasToGridX = canvasRect.left - gridRect.left;
    const canvasToGridY = canvasRect.top - gridRect.top;
    const { fg, muted } = ink;
    const viewportMargin = 80;

    glassCtx.save();
    glassCtx.filter = "blur(3.2px)";

    for (const card of friendLinkCards) {
      const rect = card.element.getBoundingClientRect();
      if (
        rect.bottom < -viewportMargin ||
        rect.top > window.innerHeight + viewportMargin ||
        rect.right < -viewportMargin ||
        rect.left > window.innerWidth + viewportMargin
      ) {
        continue;
      }

      const { borderSize, radius } = card;
      const cardLeft = rect.left - canvasRect.left;
      const cardTop = rect.top - canvasRect.top;
      const fieldLeft = rect.left + borderSize - canvasRect.left;
      const fieldTop = rect.top + borderSize - canvasRect.top;
      const fieldRight = rect.right - borderSize - canvasRect.left;
      const fieldBottom = rect.bottom - borderSize - canvasRect.top;
      const drawLeft = rect.left + borderSize - gridRect.left;
      const drawTop = rect.top + borderSize - gridRect.top;

      if (
        fieldRight <= 0 ||
        fieldBottom <= 0 ||
        fieldLeft >= state.w ||
        fieldTop >= state.h
      ) {
        continue;
      }

      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      drawRoundedRect(
        ctx,
        cardLeft,
        cardTop,
        Math.max(1, rect.width),
        Math.max(1, rect.height),
        radius + borderSize,
      );
      ctx.fillStyle = "#000000";
      ctx.fill();
      ctx.restore();

      const width = Math.max(1, fieldRight - fieldLeft);
      const height = Math.max(1, fieldBottom - fieldTop);
      if (
        drawLeft > overlayWidth ||
        drawTop > overlayHeight ||
        drawLeft + width < 0 ||
        drawTop + height < 0
      ) {
        continue;
      }

      const clipMargin = 20;
      const lines: GlassLine[] = [];
      const points: GlassPoint[] = [];

      for (const line of glassLines) {
        if (
          Math.max(line.x1, line.x2) >= fieldLeft - clipMargin &&
          Math.min(line.x1, line.x2) <= fieldRight + clipMargin &&
          Math.max(line.y1, line.y2) >= fieldTop - clipMargin &&
          Math.min(line.y1, line.y2) <= fieldBottom + clipMargin
        ) {
          lines.push(line);
          if (lines.length >= FRIEND_LINK_GLASS_LINE_MAX) break;
        }
      }

      for (const point of glassPoints) {
        if (
          point.x >= fieldLeft - point.r &&
          point.x <= fieldRight + point.r &&
          point.y >= fieldTop - point.r &&
          point.y <= fieldBottom + point.r
        ) {
          points.push(point);
          if (points.length >= FRIEND_LINK_GLASS_POINT_MAX) break;
        }
      }

      if (lines.length === 0 && points.length === 0) {
        continue;
      }

      glassCtx.save();
      drawRoundedRect(glassCtx, drawLeft, drawTop, width, height, radius);
      glassCtx.clip();

      glassCtx.lineCap = "round";
      glassCtx.lineWidth = 3.6;
      glassCtx.strokeStyle = `rgb(${muted.r}, ${muted.g}, ${muted.b})`;
      for (const { x1, y1, x2, y2, alpha } of lines) {
        glassCtx.globalAlpha = alpha;
        glassCtx.beginPath();
        glassCtx.moveTo(x1 + canvasToGridX, y1 + canvasToGridY);
        glassCtx.lineTo(x2 + canvasToGridX, y2 + canvasToGridY);
        glassCtx.stroke();
      }

      glassCtx.fillStyle = `rgb(${fg.r}, ${fg.g}, ${fg.b})`;
      for (const { x, y, r, alpha } of points) {
        glassCtx.globalAlpha = alpha;
        glassCtx.beginPath();
        glassCtx.arc(x + canvasToGridX, y + canvasToGridY, r, 0, Math.PI * 2);
        glassCtx.fill();
      }

      glassCtx.restore();
    }

    glassCtx.restore();
  };

  const tick = () => {
    draw();
    drawFriendLinkGlassOverlay();
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

  const onResize = () => {
    resize();
    refreshFriendLinkCards();
  };

  const onScroll = () => {
    if (prefersReduced) drawFriendLinkGlassOverlay();
  };

  const onVisibility = () => {
    if (document.visibilityState === "hidden") stop();
    else if (!prefersReduced && !state.raf) tick();
  };

  const cleanup = () => {
    stop();
    themeObserver.disconnect();
    gridResizeObserver?.disconnect();
    controller.abort();
    glassOverlay?.remove();
  };

  browserWindow.__homeShellConstellationBackgroundCleanup = cleanup;

  window.addEventListener("resize", onResize, {
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
  window.addEventListener("scroll", onScroll, {
    passive: true,
    signal: controller.signal,
  });

  mountFriendLinkGlassOverlay();
  resize();
  if (prefersReduced) {
    draw();
    drawFriendLinkGlassOverlay();
  } else tick();
}

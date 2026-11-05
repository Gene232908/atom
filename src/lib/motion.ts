/**
 * Card shine that follows how you tilt your phone or tablet.
 *
 * One shared sensor listener for the whole app. It writes two numbers on the page:
 *   --tx  (-1 = tilted left,  +1 = tilted right)
 *   --ty  (-1 = tilted back,  +1 = tilted forward)
 * Every card reads them in CSS, so the light moves smoothly with no extra React work.
 */

let started = false;
let active = false;
let raf = 0;
let base: { b: number; g: number } | null = null;
const target = { x: 0, y: 0 };
const current = { x: 0, y: 0 };
let last: { b: number; g: number } | null = null;
// How much the phone is moving right now (0 = still). The shine fades in and out with it.
let energy = 0;
let glow = 0;

const clamp = (v: number) => Math.max(-1, Math.min(1, v));

function setVars() {
  const s = document.documentElement.style;
  s.setProperty('--tx', current.x.toFixed(3));
  s.setProperty('--ty', current.y.toFixed(3));
  s.setProperty('--shine', glow.toFixed(3));
}

function tick() {
  raf = 0;
  current.x += (target.x - current.x) * 0.16;
  current.y += (target.y - current.y) * 0.16;
  energy *= 0.95;
  glow += (energy - glow) * 0.25;
  if (glow < 0.003) glow = 0;
  setVars();
  if (glow > 0 || Math.abs(target.x - current.x) > 0.002 || Math.abs(target.y - current.y) > 0.002) {
    raf = requestAnimationFrame(tick);
  }
}

function screenAngle(): number {
  const a = window.screen?.orientation?.angle;
  return typeof a === 'number' ? a : 0;
}

function onOrientation(e: DeviceOrientationEvent) {
  if (e.beta == null || e.gamma == null) return;
  active = true;

  // Match the screen when the phone is turned sideways.
  let beta = e.beta;
  let gamma = e.gamma;
  const angle = screenAngle();
  if (angle === 90) [beta, gamma] = [-gamma, beta];
  else if (angle === 270 || angle === -90) [beta, gamma] = [gamma, -beta];
  else if (angle === 180) [beta, gamma] = [-beta, -gamma];

  // However you normally hold the phone counts as "flat". The rest point slowly
  // follows your hand, so the shine reacts to movement like a real card.
  // Small hand shake is ignored. Real tilting wakes the shine up.
  if (last) {
    const moved = Math.abs(beta - last.b) + Math.abs(gamma - last.g);
    energy = Math.min(1, energy + Math.max(0, moved - 0.35) * 0.25);
  }
  last = { b: beta, g: gamma };

  if (!base) base = { b: beta, g: gamma };
  base.b += (beta - base.b) * 0.004;
  base.g += (gamma - base.g) * 0.004;

  target.x = clamp((gamma - base.g) / 22);
  target.y = clamp((beta - base.b) / 22);
  if (!raf) raf = requestAnimationFrame(tick);
}

/** iPhone and iPad need a tap to allow motion. Android and others do not. */
export function needsMotionPermission(): boolean {
  if (typeof window === 'undefined' || typeof DeviceOrientationEvent === 'undefined') return false;
  const DOE = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
  return typeof DOE.requestPermission === 'function';
}

/** Start listening. Safe to call many times. */
export function startMotion(): void {
  if (started || typeof window === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  started = true;
  setVars();
  window.addEventListener('deviceorientation', onOrientation);
}

/** Must be called from a tap. Shows the iPhone "Allow motion" prompt the first time. */
export async function enableMotion(): Promise<boolean> {
  if (needsMotionPermission()) {
    try {
      const DOE = DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> };
      const result = await DOE.requestPermission();
      if (result !== 'granted') return false;
    } catch {
      return false;
    }
  }
  startMotion();
  return true;
}

/**
 * Call once when the app opens. Card shine is on by default.
 * - Android: starts right away.
 * - iPhone/iPad: Apple only allows motion after a tap, so it asks on the first tap anywhere.
 */
export function initMotion(): void {
  if (typeof window === 'undefined') return;
  startMotion();
  if (!needsMotionPermission()) return;
  const once = () => {
    window.removeEventListener('touchend', once, true);
    window.removeEventListener('click', once, true);
    if (!active) void enableMotion();
  };
  window.addEventListener('touchend', once, true);
  window.addEventListener('click', once, true);
}

// Where each shining card sits on screen (-1 = top, +1 = bottom), kept in --py on the card.
const tracked = new Set<HTMLElement>();
let placeQueued = false;

function placeCards() {
  placeQueued = false;
  const h = window.innerHeight || 1;
  for (const el of tracked) {
    const r = el.getBoundingClientRect();
    const py = Math.max(-1.5, Math.min(1.5, ((r.top + r.height / 2) / h) * 2 - 1));
    el.style.setProperty('--py', py.toFixed(3));
  }
}

function queuePlace() {
  if (placeQueued) return;
  placeQueued = true;
  requestAnimationFrame(placeCards);
}

/** Keep a card's screen position up to date while the page or a sheet scrolls. */
export function trackCardPosition(el: HTMLElement): () => void {
  tracked.add(el);
  if (tracked.size === 1) {
    window.addEventListener('scroll', queuePlace, { passive: true, capture: true });
    window.addEventListener('resize', queuePlace);
  }
  queuePlace();
  return () => {
    tracked.delete(el);
    if (tracked.size === 0) {
      window.removeEventListener('scroll', queuePlace, { capture: true });
      window.removeEventListener('resize', queuePlace);
    }
  };
}

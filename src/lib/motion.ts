/**
 * Card shine that follows how you tilt your phone or tablet.
 *
 * One shared sensor listener for the whole app. It writes two numbers on the page:
 *   --tx  (-1 = tilted left,  +1 = tilted right)
 *   --ty  (-1 = tilted back,  +1 = tilted forward)
 * Every card reads them in CSS, so the light moves smoothly with no extra React work.
 */

type Listener = (active: boolean) => void;

const STORE_KEY = 'atom_card_motion';
const listeners = new Set<Listener>();

let started = false;
let active = false;
let raf = 0;
let base: { b: number; g: number } | null = null;
const target = { x: 0, y: 0 };
const current = { x: 0, y: 0 };

const clamp = (v: number) => Math.max(-1, Math.min(1, v));

function setVars() {
  const s = document.documentElement.style;
  s.setProperty('--tx', current.x.toFixed(3));
  s.setProperty('--ty', current.y.toFixed(3));
}

function tick() {
  raf = 0;
  current.x += (target.x - current.x) * 0.16;
  current.y += (target.y - current.y) * 0.16;
  setVars();
  if (Math.abs(target.x - current.x) > 0.002 || Math.abs(target.y - current.y) > 0.002) {
    raf = requestAnimationFrame(tick);
  }
}

function screenAngle(): number {
  const a = window.screen?.orientation?.angle;
  return typeof a === 'number' ? a : 0;
}

function onOrientation(e: DeviceOrientationEvent) {
  if (e.beta == null || e.gamma == null) return;
  if (!active) {
    active = true;
    listeners.forEach((l) => l(true));
  }

  // Match the screen when the phone is turned sideways.
  let beta = e.beta;
  let gamma = e.gamma;
  const angle = screenAngle();
  if (angle === 90) [beta, gamma] = [-gamma, beta];
  else if (angle === 270 || angle === -90) [beta, gamma] = [gamma, -beta];
  else if (angle === 180) [beta, gamma] = [-beta, -gamma];

  // However you normally hold the phone counts as "flat". The rest point slowly
  // follows your hand, so the shine reacts to movement like a real card.
  if (!base) base = { b: beta, g: gamma };
  base.b += (beta - base.b) * 0.008;
  base.g += (gamma - base.g) * 0.008;

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

export function isMotionActive(): boolean {
  return active;
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
  try {
    localStorage.setItem(STORE_KEY, '1');
  } catch {
    // Private browsing. Nothing to save.
  }
  return true;
}

export function onMotionChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Call once when the app opens.
 * - Android: starts right away.
 * - iPhone/iPad: if allowed before, turns on again silently at the first tap.
 */
export function initMotion(): void {
  if (typeof window === 'undefined') return;
  startMotion();
  if (!needsMotionPermission()) return;
  let allowedBefore = false;
  try {
    allowedBefore = localStorage.getItem(STORE_KEY) === '1';
  } catch {
    allowedBefore = false;
  }
  if (!allowedBefore) return;
  const once = () => {
    window.removeEventListener('click', once, true);
    if (!active) void enableMotion();
  };
  window.addEventListener('click', once, true);
}

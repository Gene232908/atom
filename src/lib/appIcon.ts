// App Icon Customizer & Dynamic PWA Icon Engine

export interface AppIconConfig {
  type: 'default' | 'preset' | 'custom';
  iconKey?: string; // 'wallet' | 'card' | 'peso' | 'shield' | 'sparkles' | 'zap' | 'gem' | 'piggy'
  gradientKey?: string;
  customImageDataUrl?: string;
}

export interface PresetColor {
  id: string;
  name: string;
  from: string;
  to: string;
  accent: string;
}

export const PRESET_COLORS: PresetColor[] = [
  { id: 'indigo', name: 'Royal Indigo', from: '#6366f1', to: '#1e1b4b', accent: '#a5b4fc' },
  { id: 'obsidian', name: 'Obsidian Black', from: '#3f3f46', to: '#09090b', accent: '#d4d4d8' },
  { id: 'emerald', name: 'Emerald Green', from: '#10b981', to: '#064e3b', accent: '#6ee7b7' },
  { id: 'cobalt', name: 'Ocean Cobalt', from: '#3b82f6', to: '#0f172a', accent: '#93c5fd' },
  { id: 'sunset', name: 'Sunset Amber', from: '#f97316', to: '#7c2d12', accent: '#fed7aa' },
  { id: 'rose', name: 'Ruby Crimson', from: '#f43f5e', to: '#4c0519', accent: '#fecdd3' },
  { id: 'violet', name: 'Purple Galaxy', from: '#a855f7', to: '#3b0764', accent: '#e9d5ff' },
];

export interface PresetGlyph {
  id: string;
  name: string;
  symbol: string;
}

export const PRESET_GLYPHS: PresetGlyph[] = [
  { id: 'wallet', name: 'Wallet', symbol: '👛' },
  { id: 'peso', name: 'Philippine Peso', symbol: '₱' },
  { id: 'card', name: 'Credit Card', symbol: '💳' },
  { id: 'shield', name: 'Security Shield', symbol: '🛡️' },
  { id: 'sparkles', name: 'Sparkles', symbol: '✨' },
  { id: 'zap', name: 'Lightning', symbol: '⚡' },
  { id: 'gem', name: 'Diamond', symbol: '💎' },
  { id: 'rocket', name: 'Rocket', symbol: '🚀' },
  { id: 'bag', name: 'Money Bag', symbol: '💰' },
];

const STORAGE_KEY = 'utang_custom_app_icon_v1';

export function getStoredAppIcon(): AppIconConfig {
  if (typeof window === 'undefined') return { type: 'default' };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { type: 'default' };
}

/** Applies icon data URL dynamically to iOS and Android touch/favicon links */
export function applyAppIconToDom(dataUrl: string): void {
  if (typeof document === 'undefined') return;

  // 1. apple-touch-icon
  let appleIcons = document.querySelectorAll<HTMLLinkElement>('link[rel="apple-touch-icon"]');
  if (appleIcons.length === 0) {
    const link = document.createElement('link');
    link.rel = 'apple-touch-icon';
    document.head.appendChild(link);
    appleIcons = document.querySelectorAll<HTMLLinkElement>('link[rel="apple-touch-icon"]');
  }
  appleIcons.forEach((el) => {
    el.href = dataUrl;
  });

  // 2. favicon / regular icon
  let favicons = document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]');
  favicons.forEach((el) => {
    el.href = dataUrl;
  });
}

/** Generates a PNG data URL (180x180 or 512x512) for the given icon config */
export async function generateAppIconDataUrl(
  config: AppIconConfig,
  size = 512,
): Promise<string> {
  if (config.type === 'default') {
    return '/apple-touch-icon.png';
  }

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '/apple-touch-icon.png';

  const radius = size * 0.22; // iOS squircle proportion

  // Helper to draw rounded rectangle
  function drawRoundedRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  // Clip to rounded square
  drawRoundedRect(ctx, 0, 0, size, size, radius);
  ctx.clip();

  if (config.type === 'custom' && config.customImageDataUrl) {
    // Draw user's uploaded custom image
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // Center crop / cover
        const aspect = img.width / img.height;
        let sw = img.width;
        let sh = img.height;
        let sx = 0;
        let sy = 0;
        if (aspect > 1) {
          sw = img.height;
          sx = (img.width - sw) / 2;
        } else {
          sh = img.width;
          sy = (img.height - sh) / 2;
        }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);

        // Subtle gloss overlay
        const gloss = ctx.createLinearGradient(0, 0, size, size);
        gloss.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
        gloss.addColorStop(0.5, 'transparent');
        ctx.fillStyle = gloss;
        ctx.fillRect(0, 0, size, size);

        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve('/apple-touch-icon.png');
      img.src = config.customImageDataUrl!;
    });
  }

  // Preset glyph + gradient
  const color =
    PRESET_COLORS.find((c) => c.id === config.gradientKey) || PRESET_COLORS[0];
  const glyph =
    PRESET_GLYPHS.find((g) => g.id === config.iconKey) || PRESET_GLYPHS[0];

  // Draw background gradient
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, color.from);
  grad.addColorStop(1, color.to);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Inner glass glow effect
  const innerGlow = ctx.createRadialGradient(
    size / 2,
    size * 0.35,
    size * 0.05,
    size / 2,
    size / 2,
    size * 0.6,
  );
  innerGlow.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
  innerGlow.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
  ctx.fillStyle = innerGlow;
  ctx.fillRect(0, 0, size, size);

  // Subtle frosted glass center plate
  const plateSize = size * 0.62;
  const plateRadius = plateSize * 0.26;
  const plateX = (size - plateSize) / 2;
  const plateY = (size - plateSize) / 2;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(plateX + plateRadius, plateY);
  ctx.arcTo(plateX + plateSize, plateY, plateX + plateSize, plateY + plateSize, plateRadius);
  ctx.arcTo(plateX + plateSize, plateY + plateSize, plateX, plateY + plateSize, plateRadius);
  ctx.arcTo(plateX, plateY + plateSize, plateX, plateY, plateRadius);
  ctx.arcTo(plateX, plateY, plateX + plateSize, plateY, plateRadius);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fill();
  ctx.lineWidth = size * 0.008;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.stroke();
  ctx.restore();

  // Draw emoji or symbol centered
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (glyph.id === 'peso') {
    ctx.font = `bold ${Math.round(size * 0.36)}px "Poppins", -apple-system, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = size * 0.04;
    ctx.fillText('₱', size / 2, size / 2);
  } else {
    ctx.font = `${Math.round(size * 0.32)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    ctx.fillText(glyph.symbol, size / 2, size / 2);
  }

  return canvas.toDataURL('image/png');
}

/** Saves custom app icon configuration and applies it immediately */
export async function saveAppIconConfig(config: AppIconConfig): Promise<string> {
  const dataUrl = await generateAppIconDataUrl(config, 512);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    if (config.type !== 'default') {
      localStorage.setItem('utang_custom_icon_data_url', dataUrl);
    } else {
      localStorage.removeItem('utang_custom_icon_data_url');
    }
  } catch {
    // ignore
  }

  applyAppIconToDom(dataUrl);
  return dataUrl;
}

/** Initializes the custom app icon on page load */
export function initAppIcon(): void {
  if (typeof window === 'undefined') return;
  try {
    const cachedDataUrl = localStorage.getItem('utang_custom_icon_data_url');
    if (cachedDataUrl) {
      applyAppIconToDom(cachedDataUrl);
      return;
    }
    const config = getStoredAppIcon();
    if (config.type !== 'default') {
      generateAppIconDataUrl(config, 512).then((dataUrl) => {
        applyAppIconToDom(dataUrl);
      });
    }
  } catch {
    // fallback to static icons
  }
}

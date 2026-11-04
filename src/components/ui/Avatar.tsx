import { useEffect, useState } from 'react';

const COLORS = [
  'bg-[#e5e5ea] text-[#3a3a3c]',
  'bg-[#d8f5e0] text-[#1f7a37]',
  'bg-[#ffe8cc] text-[#b35c00]',
  'bg-[#ffdad6] text-[#b3261e]',
  'bg-[#d6ebff] text-[#0058b3]',
  'bg-[#ece0ff] text-[#6a2fc2]',
  'bg-[#d3f4f2] text-[#0f6d68]',
];

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return COLORS[Math.abs(hash) % COLORS.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
  return (first + last).toUpperCase();
}

const SIZES = {
  xs: 'size-6 text-[10px]',
  sm: 'size-8 text-[12px]',
  nav: 'size-9 text-[13px]',
  md: 'size-10 text-[14px]',
  lg: 'size-14 text-[18px]',
};

const RINGS = {
  none: '',
  /** Thin grey outline for light backgrounds */
  subtle: 'ring-1 ring-black/10',
  /** White outline for faces stacked on a colored card */
  card: 'ring-2 ring-white/70',
};

interface Props {
  name: string;
  photo?: string;
  size?: keyof typeof SIZES;
  ring?: keyof typeof RINGS;
}

/** Round profile picture. The photo always fills the circle exactly; falls back to initials. */
export function Avatar({ name, photo, size = 'md', ring = 'none' }: Props) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [photo]);

  const showPhoto = Boolean(photo) && !broken;
  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full align-middle font-semibold select-none ${
        SIZES[size]
      } ${RINGS[ring]} ${showPhoto ? 'bg-fill' : colorFor(name)}`}
      aria-hidden
    >
      {showPhoto ? (
        <img
          src={photo}
          alt=""
          referrerPolicy="no-referrer"
          draggable={false}
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <span className="leading-none">{initials(name)}</span>
      )}
    </span>
  );
}

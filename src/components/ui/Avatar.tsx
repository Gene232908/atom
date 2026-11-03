import { useState } from 'react';

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
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-lg',
};

interface Props {
  name: string;
  photo?: string;
  size?: keyof typeof SIZES;
}

export function Avatar({ name, photo, size = 'md' }: Props) {
  const [broken, setBroken] = useState(false);
  const cls = `${SIZES[size]} shrink-0 rounded-full`;

  if (photo && !broken) {
    return (
      <img
        src={photo}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className={`${cls} bg-fill object-cover`}
      />
    );
  }
  return (
    <span className={`${cls} grid place-items-center font-semibold ${colorFor(name)}`} aria-hidden>
      {initials(name)}
    </span>
  );
}

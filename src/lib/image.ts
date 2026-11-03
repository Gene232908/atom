const MAX_SIDE = 1200;
const MAX_LENGTH = 700_000;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(Object.assign(new Error('bad-image'), { code: 'bad-image' }));
    img.src = src;
  });
}

/**
 * Makes the QR picture smaller so it fits in the database for free
 * (no paid Firebase Storage needed) while staying easy to scan.
 */
export async function compressImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw Object.assign(new Error('not-image'), { code: 'not-image' });
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    let side = MAX_SIDE;
    for (let attempt = 0; attempt < 3; attempt++) {
      const scale = Math.min(1, side / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw Object.assign(new Error('bad-image'), { code: 'bad-image' });
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      for (const quality of [0.9, 0.8, 0.7]) {
        const data = canvas.toDataURL('image/jpeg', quality);
        if (data.length < MAX_LENGTH) return data;
      }
      side = Math.round(side * 0.75);
    }
    throw Object.assign(new Error('too-big'), { code: 'too-big' });
  } finally {
    URL.revokeObjectURL(url);
  }
}

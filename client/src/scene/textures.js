import * as THREE from 'three';

const FONT = '"Segoe UI", system-ui, -apple-system, Helvetica, Arial, sans-serif';
const cache = new Map();

function make(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// lines: [{ t:'Text', size:90, weight:600, color:'#111' }]
export function signTexture(lines, { w = 1024, h = 256, bg = '#fbfaf7', border = '#d9d5cc' } = {}) {
  const key = JSON.stringify([lines, w, h, bg]);
  if (cache.has(key)) return cache.get(key);
  const tex = make(w, h, (ctx) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = border;
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, w - 6, h - 6);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const gap = h / (lines.length + 1);
    lines.forEach((l, i) => {
      let size = l.size;
      do {
        ctx.font = `${l.weight || 600} ${size}px ${FONT}`;
        size -= 4;
      } while (ctx.measureText(l.t).width > w - 90 && size > 16);
      ctx.fillStyle = l.color || '#1d1d1f';
      ctx.fillText(l.t, w / 2, gap * (i + 1));
    });
  });
  cache.set(key, tex);
  return tex;
}

// Vertical title on a book spine
export function spineTexture(title, color) {
  const key = 'spine' + title + color;
  if (cache.has(key)) return cache.get(key);
  const tex = make(96, 256, (ctx, w, h) => { // 600 spines = 600 textures, so keep each one small
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(0, 16, w, 4);
    ctx.fillRect(0, h - 20, w, 4);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let size = 42;
    do {
      ctx.font = `600 ${size}px ${FONT}`;
      size -= 2;
    } while (ctx.measureText(title).width > h - 56 && size > 12);
    ctx.fillText(title, 0, 0);
    ctx.restore();
  });
  cache.set(key, tex);
  return tex;
}

// Repeating floor / ceiling tiles
export function tileTexture(base, line) {
  const t = make(128, 128, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = line;
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, w, h);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

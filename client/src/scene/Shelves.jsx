import { memo, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { UNITS, UNIT, BOARD_TOPS, FACES, DECOR, faceBySection, bookColor, bookDims, placeBooks } from '../config/layout';
import { useStore } from '../store';
import { signTexture, spineTexture } from './textures';
import { refs } from './refs';

const L = UNIT.length, H = UNIT.height, D = UNIT.depth, UZ = UNIT.z;
const woodMat = new THREE.MeshStandardMaterial({ color: '#d9b27c', roughness: 0.65 });
const woodDark = new THREE.MeshStandardMaterial({ color: '#c79b62', roughness: 0.7 });
const whiteMat = new THREE.MeshStandardMaterial({ color: '#fbfaf7', roughness: 0.6 });
const tagOkMat = new THREE.MeshBasicMaterial({ color: '#35a35c' });
const tagOutMat = new THREE.MeshBasicMaterial({ color: '#d1453b' });
const FILL = ['#3b3f45', '#59616b', '#7a6a58', '#2d4a5c', '#8b7d6b', '#4b5b4d', '#6d4c41', '#a89f91', '#2f3a4a', '#5c4a56', '#c9bfa8', '#40585e'];

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- shelf frames (double-sided) ---------- */
function Frame({ ux }) {
  return (
    <group position={[ux, 0, UZ]}>
      <mesh material={woodDark} position={[0, H / 2, 0]}><boxGeometry args={[0.05, H, L]} /></mesh>
      <mesh material={woodMat} position={[0, H / 2, L / 2]}><boxGeometry args={[0.8, H, 0.05]} /></mesh>
      <mesh material={woodMat} position={[0, H / 2, -L / 2]}><boxGeometry args={[0.8, H, 0.05]} /></mesh>
      <mesh material={woodMat} position={[0, H + 0.02, 0]}><boxGeometry args={[0.8, 0.04, L + 0.05]} /></mesh>
      <mesh material={woodDark} position={[0, 0.05, 0]}><boxGeometry args={[0.8, 0.1, L]} /></mesh>
      {[-1, 1].flatMap((dir) =>
        BOARD_TOPS.map((t) => (
          <mesh key={dir + '_' + t} material={woodMat} position={[dir * (0.025 + D / 2), t - 0.0175, 0]}>
            <boxGeometry args={[D, 0.035, L]} />
          </mesh>
        ))
      )}
    </group>
  );
}

/* ---------- signage ---------- */
function Signs() {
  const items = useMemo(() => UNITS.map((u) => {
    const mk = (name) => signTexture([{ t: name, size: 96, weight: 700 }], { w: 1024, h: 170 });
    const e = new THREE.MeshBasicMaterial({ map: mk(u.east) });
    const w = new THREE.MeshBasicMaterial({ map: mk(u.west) });
    const end = signTexture([
      { t: '←  ' + u.west, size: 78, weight: 600 },
      { t: u.east + '  →', size: 78, weight: 600 },
    ], { w: 1024, h: 560 });
    return { u, blade: [e, w, whiteMat, whiteMat, whiteMat, whiteMat], end };
  }), []);
  return (
    <group>
      {items.map(({ u, blade, end }) => (
        <group key={u.x}>
          {/* blade above the unit: readable from both aisles */}
          <mesh material={blade} position={[u.x, H + 0.35, UZ]}><boxGeometry args={[0.04, 0.43, 2.6]} /></mesh>
          {/* hanging sign at the aisle entrance, readable from the front door */}
          <mesh position={[u.x, 2.75, UZ + L / 2 + 0.4]}><planeGeometry args={[1.8, 0.98]} /><meshBasicMaterial map={end} /></mesh>
          {[-0.7, 0.7].map((dx) => (
            <mesh key={dx} material={whiteMat} position={[u.x + dx, 3.18, UZ + L / 2 + 0.4]}><boxGeometry args={[0.02, 0.85, 0.02]} /></mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/* ---------- optional decorative filler (off by default: see DECOR in config/layout.js) ---------- */
function Filler() {
  const books = useStore((s) => s.books);
  const key = books.map((b) => `${b.bookId}${b.section}${b.shelf}${b.slot}`).join();
  const filler = useMemo(() => {
    const placed = placeBooks(books);
    const out = [];
    FACES.forEach((f, fi) => {
      const r = rng(fi * 977 + 13);
      BOARD_TOPS.forEach((top, bi) => {
        const reserved = books
          .filter((b) => b.section === f.section && b.shelf === bi && placed.has(b.bookId))
          .map((b) => { const p = placed.get(b.bookId); return [p.z - p.w / 2 - 0.02, p.z + p.w / 2 + 0.02]; })
          .sort((a, b) => a[0] - b[0]);
        let cursor = f.uz - L / 2 + 0.12;
        const end = cursor + (L - 0.24) * (0.8 + 0.2 * r());
        while (cursor < end) {
          const w = 0.03 + r() * 0.05;
          const hit = reserved.find((x) => cursor < x[1] && cursor + w > x[0]);
          if (hit) { cursor = hit[1]; continue; }
          if (r() < 0.04) { cursor += 0.1 + r() * 0.4; continue; }
          const h = 0.2 + r() * 0.17, d = 0.18 + r() * 0.08;
          out.push({ x: f.ux + f.dir * (0.075 + d / 2), y: top + h / 2, z: cursor + w / 2, w, h, d, color: FILL[Math.floor(r() * FILL.length)] });
          cursor += w + 0.002;
        }
      });
    });
    return out;
    // eslint-disable-next-line
  }, [key]);

  const ref = useRef();
  useLayoutEffect(() => {
    const m = new THREE.Matrix4(), c = new THREE.Color(), q = new THREE.Quaternion();
    filler.forEach((f, i) => {
      m.compose(new THREE.Vector3(f.x, f.y, f.z), q, new THREE.Vector3(f.d, f.h, f.w));
      ref.current.setMatrixAt(i, m);
      ref.current.setColorAt(i, c.set(f.color));
    });
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
  }, [filler]);

  return (
    <instancedMesh key={filler.length} ref={ref} args={[null, null, filler.length]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.75} />
    </instancedMesh>
  );
}

/* ---------- real books from the database ---------- */
function BookImpl({ book, face, place }) {
  const ref = useRef();
  const hovered = useStore((s) => s.hoveredId === book.bookId);
  const selected = useStore((s) => s.selectedId === book.bookId);
  const { h, d } = bookDims(book.bookId);
  const w = place.w; // spine width after the shelf has been packed (see placeBooks)
  const color = bookColor(book.bookId);
  const baseX = face.ux + face.dir * (0.075 + d / 2);
  const y = BOARD_TOPS[book.shelf] + h / 2;
  const z = place.z;
  const spine = useMemo(() => spineTexture(book.title, color), [book.title, color]);

  useLayoutEffect(() => { ref.current.position.set(baseX, y, z); }, [baseX, y, z]);
  useFrame((_, dt) => {
    const pull = selected ? 0.16 : hovered ? 0.06 : 0; // slides forward when selected
    ref.current.position.x = THREE.MathUtils.damp(ref.current.position.x, baseX + face.dir * pull, 14, dt);
  });

  const ok = book.available > 0;
  return (
    <mesh ref={ref} userData={{ bookId: book.bookId }}>
      <boxGeometry args={[d, h, w]} />
      <meshStandardMaterial color={color} roughness={0.55} emissive="#ffe2a8" emissiveIntensity={selected ? 0.55 : hovered ? 0.32 : 0} />
      <mesh position={[face.dir * (d / 2 + 0.002), 0, 0]} rotation={[0, (face.dir * Math.PI) / 2, 0]} raycast={() => null}>
        <planeGeometry args={[w * 0.96, h * 0.96]} />
        <meshBasicMaterial map={spine} color="#d8d8d8" />
      </mesh>
      {/* availability tag: green = available, red = all copies out */}
      <mesh position={[face.dir * (d / 2 + 0.006), h / 2 - 0.035, 0]} material={ok ? tagOkMat : tagOutMat} raycast={() => null}>
        <boxGeometry args={[0.012, 0.02, w * 0.96]} />
      </mesh>
    </mesh>
  );
}
// the store reloads all 600 books after every action: only re-render a book when something visible changed
const Book = memo(BookImpl, (a, b) =>
  a.book.bookId === b.book.bookId && a.book.available === b.book.available && a.book.title === b.book.title &&
  a.book.shelf === b.book.shelf && a.place.z === b.place.z && a.place.w === b.place.w);

function RealBooks() {
  const books = useStore((s) => s.books);
  const placed = useMemo(() => placeBooks(books), [books]);
  return (
    <group ref={(g) => { refs.books = g; }}>
      {books.map((b) => (faceBySection[b.section] && placed.has(b.bookId) ? <Book key={b.bookId} book={b} face={faceBySection[b.section]} place={placed.get(b.bookId)} /> : null))}
    </group>
  );
}

export default function Shelves() {
  return (
    <group>
      <group ref={(g) => { refs.frames = g; }}>{UNITS.map((u) => <Frame key={u.x} ux={u.x} />)}</group>
      <Signs />
      {DECOR.fillerBooks && <Filler />}
      <RealBooks />
    </group>
  );
}

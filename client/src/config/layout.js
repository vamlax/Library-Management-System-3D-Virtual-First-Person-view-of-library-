// ---------------------------------------------------------------------------
// LIBRARY LAYOUT: edit this file to change sections / room size.
// Section names must match the "section" column of the books table.
// ---------------------------------------------------------------------------
export const ROOM = { minX: -14, maxX: 14, minZ: -14, maxZ: 12, height: 3.6 };

// Shelf units run along the Z axis. Each unit is double-sided:
// "west" face looks toward -X, "east" face looks toward +X.
// Every section holds 60 real books = 5 boards x 12 books, packed edge to edge, so a unit only needs to be
// as long as 12 spines (about 1.8 m). Longer units would just leave empty board.
export const UNIT = { length: 2.0, height: 2.3, depth: 0.34, z: -1 };
export const SHELF = { perShelf: 12, pad: 0.1, gap: 0.004, maxStretch: 1.4 };
// Decorative (non-database, non-clickable) filler spines. Off: every spine you see is a real catalog book.
export const DECOR = { fillerBooks: false };
export const BOARD_TOPS = [0.12, 0.58, 1.04, 1.5, 1.96]; // 5 boards, height of each top surface

export const UNITS = [
  { x: -10, west: 'Mathematics', east: 'Science' },
  { x: -5, west: 'Electronics', east: 'Engineering' },
  { x: 0, west: 'Programming', east: 'Data Structures & Algorithms' },
  { x: 5, west: 'GATE', east: 'History' },
  { x: 10, west: 'Literature', east: 'AI & ML' },
];

export const FACES = UNITS.flatMap((u) => [
  { section: u.west, ux: u.x, uz: UNIT.z, dir: -1 },
  { section: u.east, ux: u.x, uz: UNIT.z, dir: 1 },
]);
export const faceBySection = Object.fromEntries(FACES.map((f) => [f.section, f]));

// Book colours / sizes are derived from bookId so they're stable
export const PALETTE = ['#2f4b7c', '#1f6f6b', '#a3452f', '#c08a2e', '#2e6b45', '#6b3f6f', '#3a3d44', '#b5603f', '#4a6fa5', '#7a2e3b'];
export const bookColor = (id) => PALETTE[(id * 7 + 3) % PALETTE.length];
// raw spine width 0.09-0.15 m (placeBooks scales each shelf so its books fill the board), height 0.30-0.375 m
export const bookDims = (id) => ({ w: 0.09 + ((id * 5 + 2) % 7) * 0.01, h: 0.3 + ((id * 13) % 4) * 0.025, d: 0.24 });

// Lays out the real books of every face. Books on one board are sorted by `slot` and placed edge to edge
// (slot 0 is the left-most book as seen from the aisle). Widths are scaled slightly so a full board of 12 fills
// the board length. Returns Map(bookId -> { z, w }) with z = centre of the spine along the unit.
export function placeBooks(books) {
  const boards = new Map();
  for (const b of books) {
    if (!faceBySection[b.section]) continue;
    const key = b.section + '|' + b.shelf;
    if (!boards.has(key)) boards.set(key, []);
    boards.get(key).push(b);
  }
  const placed = new Map();
  const inner = UNIT.length - 2 * SHELF.pad;
  for (const list of boards.values()) {
    list.sort((a, b) => a.slot - b.slot);
    const face = faceBySection[list[0].section];
    const raw = list.map((b) => bookDims(b.bookId).w);
    const natural = raw.reduce((t, w) => t + w, 0) + SHELF.gap * (list.length - 1);
    const k = Math.min(inner / natural, SHELF.maxStretch);
    let offset = 0;
    list.forEach((b, i) => {
      const w = raw[i] * k;
      const mid = offset + w / 2;
      // east faces read left->right along +Z, west faces along -Z, so the order always reads left->right for the viewer
      const z = face.dir === 1 ? face.uz - UNIT.length / 2 + SHELF.pad + mid : face.uz + UNIT.length / 2 - SHELF.pad - mid;
      placed.set(b.bookId, { z, w });
      offset += w + SHELF.gap;
    });
  }
  return placed;
}

// Walls / furniture the player can't walk through
export const COLLIDERS = [
  ...UNITS.map((u) => ({ minX: u.x - 0.45, maxX: u.x + 0.45, minZ: UNIT.z - UNIT.length / 2 - 0.05, maxZ: UNIT.z + UNIT.length / 2 + 0.05 })),
  { minX: 6.9, maxX: 10.1, minZ: 8.9, maxZ: 10.1 }, // reception desk
  { minX: -0.55, maxX: 0.55, minZ: -12.55, maxZ: -11.45 }, // reading table
];

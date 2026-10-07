// ---------------------------------------------------------------------------
// CATALOG: 10 sections x 60 books = 600 real database books.
// Each section file lists its books in shelf order: rows 0-11 = shelf 1 (bottom board),
// 12-23 = shelf 2, ... 48-59 = shelf 5 (top board).  slot = position along the shelf (0-11).
//
// Row formats (see mathematics.js):
//   original rows: [title, author, category, year, isbn, description, copies]
//   new rows:      [title, author, category, year, description]
// ---------------------------------------------------------------------------
const SECTION_FILES = {
  'Mathematics': require('./mathematics'),
  'Science': require('./science'),
  'Electronics': require('./electronics'),
  'Engineering': require('./engineering'),
  'Programming': require('./programming'),
  'Data Structures & Algorithms': require('./dsa'),
  'GATE': require('./gate'),
  'History': require('./history'),
  'Literature': require('./literature'),
  'AI & ML': require('./aiml'),
};

const SHELVES = 5;
const PER_SHELF = 12;
const PER_SECTION = SHELVES * PER_SHELF; // 60
const COPIES_CYCLE = [2, 2, 1, 3, 2, 2, 3, 1, 2, 2]; // deterministic stock levels for new rows

function isbn13(body12) {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(body12[i]) * (i % 2 === 0 ? 1 : 3);
  return body12 + String((10 - (sum % 10)) % 10);
}

// Returns a flat array of 600 book objects ready to INSERT.
function buildCatalog() {
  const out = [];
  let placeholder = 0;
  Object.entries(SECTION_FILES).forEach(([section, rows], si) => {
    if (rows.length !== PER_SECTION) throw new Error(`${section}: expected ${PER_SECTION} books, found ${rows.length}`);
    rows.forEach((r, i) => {
      const original = r.length >= 7;
      const [title, author, category, year] = r;
      const description = original ? r[5] : r[4];
      let isbn = original ? r[4] : '';
      const totalCopies = original ? r[6] : COPIES_CYCLE[(i + si) % COPIES_CYCLE.length];
      // Only the ISBNs from the original seed are real. Everything else gets a generated, check-digit-valid
      // placeholder in the 979-8-0000-xxxx-c range so every book has a unique ISBN (see README).
      if (!isbn) isbn = isbn13('97980000' + String(++placeholder).padStart(4, '0'));
      out.push({
        title, author, category, section,
        shelf: Math.floor(i / PER_SHELF), // 0 = bottom board ... 4 = top board
        slot: i % PER_SHELF,              // 0..11 along the shelf
        description, isbn, publishedYear: year, coverImage: null, totalCopies,
      });
    });
  });
  return out;
}

module.exports = { SECTION_FILES, SHELVES, PER_SHELF, PER_SECTION, buildCatalog, isbn13 };

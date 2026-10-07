// Run with: npm run check-catalog   (no database needed)
const { buildCatalog, SECTION_FILES, PER_SECTION, PER_SHELF, SHELVES } = require('./index');
const books = buildCatalog();
const problems = [];
const seen = (name) => new Map();
const titles = seen(), isbns = seen(), places = seen();
for (const b of books) {
  for (const k of ['title', 'author', 'category', 'section', 'description', 'isbn']) if (!String(b[k] ?? '').trim()) problems.push(`${b.title || '?'}: empty ${k}`);
  if (!Number.isInteger(b.publishedYear)) problems.push(`${b.title}: bad year`);
  if (!(b.totalCopies >= 1)) problems.push(`${b.title}: bad copies`);
  if (!/^\d{13}$/.test(b.isbn)) problems.push(`${b.title}: bad isbn ${b.isbn}`);
  if (b.shelf < 0 || b.shelf >= SHELVES || b.slot < 0 || b.slot >= PER_SHELF) problems.push(`${b.title}: bad position`);
  for (const [map, key, label] of [[titles, b.title, 'title'], [isbns, b.isbn, 'isbn'], [places, `${b.section}|${b.shelf}|${b.slot}`, 'position']]) {
    if (map.has(key)) problems.push(`duplicate ${label}: ${key} (${map.get(key)} / ${b.title})`);
    map.set(key, b.title);
  }
}
const counts = Object.fromEntries(Object.keys(SECTION_FILES).map((s) => [s, books.filter((b) => b.section === s).length]));
for (const [s, n] of Object.entries(counts)) if (n !== PER_SECTION) problems.push(`${s}: ${n} books`);
console.log(counts);
console.log(`Total ${books.length} books; ${problems.length} problem(s).`);
problems.forEach((p) => console.log(' -', p));
process.exit(problems.length ? 1 : 0);

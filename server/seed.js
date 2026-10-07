// Seed data. The 600-book catalog (10 sections x 60 books) lives in ./catalog/ (one file per section).
// Every book gets a real database row with its own section / shelf / slot, so all 600 are selectable in 3D.
const { buildCatalog } = require('./catalog');

module.exports = function seed({ run, one, hash }) {
  const DAY = 86400000;
  const iso = (offsetDays) => new Date(Date.now() + offsetDays * DAY).toISOString();

  run('INSERT INTO users(name,email,passwordHash,role) VALUES (?,?,?,?)', ['Librarian', 'librarian@library.test', hash('admin123'), 'librarian']);
  const demo = run('INSERT INTO users(name,email,passwordHash,role) VALUES (?,?,?,?)', ['Demo Student', 'student@library.test', hash('student123'), 'student']);
  const ravi = run('INSERT INTO users(name,email,passwordHash,role) VALUES (?,?,?,?)', ['Ravi Kumar', 'ravi@library.test', hash('student123'), 'student']);

  const catalog = buildCatalog(); // throws if a section does not have exactly 60 books
  for (const b of catalog) {
    run(
      'INSERT INTO books(title,author,category,section,shelf,slot,description,isbn,publishedYear,coverImage,totalCopies) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [b.title, b.author, b.category, b.section, b.shelf, b.slot, b.description, b.isbn, b.publishedYear, b.coverImage, b.totalCopies]
    );
  }
  const bid = (t) => one('SELECT bookId FROM books WHERE title=?', [t]).bookId;
  const loan = (book, user, issued, due, returned, fine) =>
    run('INSERT INTO loans(bookId,userId,issueDate,dueDate,returnDate,fineAmount) VALUES (?,?,?,?,?,?)', [bid(book), user, iso(issued), iso(due), returned == null ? null : iso(returned), fine]);

  // Demo student: one active loan + history
  loan('Clean Code', demo, -5, 9, null, 0);
  loan('Cosmos', demo, -40, -26, -27, 0);
  loan('Digital Design', demo, -60, -46, -41, 10);
  // Ravi: overdue + makes some books unavailable (1-copy titles)
  loan('Operating System Concepts', ravi, -21, -7, null, 0);
  loan('Deep Learning', ravi, -3, 11, null, 0);
  loan('The Art of Electronics', ravi, -2, 12, null, 0);
  run('INSERT INTO reservations(bookId,userId,createdAt,status) VALUES (?,?,?,?)', [bid('Fluid Mechanics'), demo, iso(-1), 'waiting']);
};

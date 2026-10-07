import { useStore, fmtDate } from '../store';
import { bookColor } from '../config/layout';

export default function BookCard() {
  const id = useStore((s) => s.selectedId);
  const book = useStore((s) => s.books.find((b) => b.bookId === id));
  const user = useStore((s) => s.user);
  const me = useStore((s) => s.me);
  const busy = useStore((s) => s.busy);
  const { select, borrow, returnBook, reserve, cancelReservation, addCopies, openPanel } = useStore.getState();
  if (!book) return null;

  const loan = me?.loans.find((l) => l.bookId === book.bookId);
  const available = book.available > 0;
  const color = bookColor(book.bookId);
  const close = () => {
    select(null);
    try { document.querySelector('#stage canvas')?.requestPointerLock(); } catch { /* user can click the scene */ }
  };

  let status;
  if (loan) status = loan.overdueDays > 0
    ? { tone: 'red', text: `Overdue by ${loan.overdueDays} day${loan.overdueDays > 1 ? 's' : ''} · fine ₹${loan.fineNow}` }
    : { tone: 'blue', text: `Borrowed by you · due ${fmtDate(loan.dueDate)}` };
  else if (available) status = { tone: 'green', text: `Available · ${book.available} of ${book.totalCopies} cop${book.totalCopies > 1 ? 'ies' : 'y'}` };
  else status = { tone: 'red', text: `All ${book.totalCopies} cop${book.totalCopies > 1 ? 'ies are' : 'y is'} out` };

  return (
    <aside className="book-card" key={book.bookId}>
      <button className="close" onClick={close} aria-label="Close">×</button>

      <div className="cover" style={{ background: `linear-gradient(90deg, rgba(0,0,0,.28) 0, rgba(0,0,0,0) 9%), ${color}` }}>
        <div className="cover-title">{book.title}</div>
        <div className="cover-author">{book.author}</div>
      </div>

      <div className="card-body">
        <h2>{book.title}</h2>
        <p className="author">{book.author}</p>

        <div className={`status ${status.tone}`}><i />{status.text}</div>

        <p className="desc">{book.description}</p>

        <dl className="meta">
          <div><dt>Category</dt><dd>{book.category}</dd></div>
          <div><dt>Location</dt><dd>{book.section} · Shelf {book.shelf + 1} · Slot {book.slot + 1}</dd></div>
          <div><dt>Published</dt><dd>{book.publishedYear}</dd></div>
          {book.isbn && <div><dt>ISBN</dt><dd>{book.isbn}</dd></div>}
        </dl>

        <div className="actions">
          {!user ? (
            <button className="primary" onClick={() => openPanel('login')}>Sign in to borrow</button>
          ) : loan ? (
            <button className="primary" disabled={busy} onClick={() => returnBook(loan.loanId)}>Return book</button>
          ) : available ? (
            <button className="primary" disabled={busy} onClick={() => borrow(book.bookId)}>Borrow book</button>
          ) : book.myReservationId ? (
            <button className="secondary" disabled={busy} onClick={() => cancelReservation(book.myReservationId)}>Cancel reservation</button>
          ) : (
            <button className="primary" disabled={busy} onClick={() => reserve(book.bookId)}>Reserve</button>
          )}
          {user && available && !loan && (
            <button className="secondary" disabled={busy || !!book.myReservationId} onClick={() => reserve(book.bookId)}>
              {book.myReservationId ? 'Reserved' : 'Reserve'}
            </button>
          )}
        </div>

        {user?.role === 'librarian' && (
          <div className="librarian">
            <span>Librarian · copies</span>
            <div>
              <button className="step" onClick={() => addCopies(book.bookId, -1)}>−</button>
              <b>{book.totalCopies}</b>
              <button className="step" onClick={() => addCopies(book.bookId, 1)}>+</button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

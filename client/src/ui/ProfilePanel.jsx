import { useEffect, useState } from 'react';
import { useStore, fmtDate } from '../store';
import { api } from '../api';

export default function ProfilePanel() {
  const panel = useStore((s) => s.panel);
  const me = useStore((s) => s.me);
  const user = useStore((s) => s.user);
  const busy = useStore((s) => s.busy);
  const books = useStore((s) => s.books);
  const { closePanel, returnBook, cancelReservation, select } = useStore.getState();
  const [overdue, setOverdue] = useState([]);

  useEffect(() => {
    if (panel === 'profile' && user?.role === 'librarian') api.overdue().then(setOverdue).catch(() => {});
  }, [panel, user, books]);

  if (panel !== 'profile' || !user || !me) return null;
  const isLib = user.role === 'librarian';

  return (
    <aside className="profile">
      <button className="close" onClick={closePanel} aria-label="Close">×</button>
      <header>
        <span className="avatar big">{user.name[0]}</span>
        <div>
          <h2>{user.name}</h2>
          <p>{user.email}{isLib && ' · Librarian'}</p>
        </div>
      </header>

      <div className="stats">
        <div><b>{me.loans.length}<small>/{me.rules.MAX_LOANS}</small></b><span>Borrowed</span></div>
        <div className={me.fineDue ? 'bad' : ''}><b>₹{me.fineDue}</b><span>Fine due</span></div>
        <div><b>{me.reservations.length}</b><span>Reserved</span></div>
      </div>

      <h3>Borrowed now</h3>
      {me.loans.length === 0 && <p className="empty">Nothing borrowed. Walk to a shelf and pick a book.</p>}
      {me.loans.map((l) => (
        <div className="row" key={l.loanId}>
          <div>
            <b>{l.title}</b>
            <span className={l.overdueDays ? 'red' : ''}>
              {l.overdueDays ? `Overdue ${l.overdueDays}d · fine ₹${l.fineNow}` : `Due ${fmtDate(l.dueDate)}`} · {l.section}
            </span>
          </div>
          <button className="secondary sm" disabled={busy} onClick={() => returnBook(l.loanId)}>Return</button>
        </div>
      ))}

      {me.reservations.length > 0 && <h3>Reservations</h3>}
      {me.reservations.map((r) => (
        <div className="row" key={r.resId}>
          <div>
            <b>{r.title}</b>
            <span className={r.status === 'ready' ? 'green' : ''}>{r.status === 'ready' ? 'Ready: copy is back, borrow it!' : 'Waiting for a copy'}</span>
          </div>
          <button className="secondary sm" disabled={busy} onClick={() => cancelReservation(r.resId)}>Cancel</button>
        </div>
      ))}

      {isLib && (
        <>
          <h3>Overdue across the library</h3>
          {overdue.length === 0 && <p className="empty">No overdue books.</p>}
          {overdue.map((o) => (
            <div className="row" key={o.loanId}>
              <div>
                <b>{o.title}</b>
                <span className="red">{o.userName} · {o.overdueDays}d late · ₹{o.fineNow}</span>
              </div>
              <button className="secondary sm" onClick={() => { select(o.bookId); closePanel(); }}>View</button>
            </div>
          ))}
        </>
      )}

      <h3>History</h3>
      {me.history.length === 0 && <p className="empty">No past loans yet.</p>}
      {me.history.map((l) => (
        <div className="row hist" key={l.loanId}>
          <div>
            <b>{l.title}</b>
            <span>Returned {fmtDate(l.returnDate)}{l.fineAmount ? ` · fine ₹${l.fineAmount}` : ''}</span>
          </div>
        </div>
      ))}
      <p className="rules">Loans last {me.rules.LOAN_DAYS} days · fine ₹{me.rules.FINE_PER_DAY}/day late</p>
    </aside>
  );
}

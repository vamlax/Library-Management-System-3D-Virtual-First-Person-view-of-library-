import { useStore } from '../store';

export default function Hud() {
  const locked = useStore((s) => s.locked);
  const hoveredId = useStore((s) => s.hoveredId);
  const selectedId = useStore((s) => s.selectedId);
  const books = useStore((s) => s.books);
  const section = useStore((s) => s.section);
  const user = useStore((s) => s.user);
  const panel = useStore((s) => s.panel);
  const toast = useStore((s) => s.toast);
  const openPanel = useStore((s) => s.openPanel);
  const logout = useStore((s) => s.logout);

  if (panel === 'login') return toast ? <div className={`toast ${toast.kind}`}>{toast.msg}</div> : null;
  const hovered = books.find((b) => b.bookId === hoveredId);
  const showHint = !locked && !selectedId && !panel;

  return (
    <div className="hud">
      <div className="brand">Central Library</div>

      {locked && section && <div className="section-pill">{section}</div>}

      <div className="topright">
        {user ? (
          <>
            <button className="ghost" onClick={() => openPanel('profile')}>
              <span className="avatar">{user.name[0]}</span> My Library
            </button>
            <button className="ghost" onClick={logout}>Sign out</button>
          </>
        ) : (
          <button className="ghost" onClick={() => openPanel('login')}>Sign in</button>
        )}
      </div>

      {locked && (
        <div className={`crosshair ${hovered ? 'on' : ''}`}>
          {hovered && (
            <div className="hover-label">
              <b>{hovered.title}</b>
              <span>{hovered.author} · {hovered.available > 0 ? 'Available' : 'All copies out'}</span>
              <em>Click to open</em>
            </div>
          )}
        </div>
      )}

      {showHint && (
        <div className="start-hint">
          <b>Click to walk around</b>
          <span>W A S D move · mouse look · click a book</span>
        </div>
      )}

      <div className="keys">
        <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> walk</span>
        <span><kbd>Shift</kbd> run</span>
        <span><kbd>Click</kbd> open book</span>
        <span><kbd>P</kbd> my library</span>
        <span><kbd>Esc</kbd> free cursor</span>
      </div>

      {toast && <div className={`toast ${toast.kind}`}>{toast.msg}</div>}
    </div>
  );
}

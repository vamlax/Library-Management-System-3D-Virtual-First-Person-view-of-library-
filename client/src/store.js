import { create } from 'zustand';
import { api, setToken } from './api';

export const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

export const useStore = create((set, get) => ({
  user: null,
  me: null,
  books: [],
  hoveredId: null,
  selectedId: null,
  locked: false,
  section: null,
  panel: 'login', // 'login' | 'profile' | null
  toast: null,
  busy: false,

  setHovered: (id) => set({ hoveredId: id }),
  setLocked: (v) => set({ locked: v }),
  setSection: (s) => set({ section: s }),
  select: (id) => set({ selectedId: id }),
  openPanel: (p) => {
    if (document.pointerLockElement) document.exitPointerLock();
    set({ panel: p });
    if (p === 'profile') get().loadMe();
  },
  closePanel: () => set({ panel: null }),

  notify: (msg, kind = 'ok') => {
    set({ toast: { msg, kind } });
    setTimeout(() => { if (get().toast?.msg === msg) set({ toast: null }); }, 3800);
  },

  loadBooks: async () => { try { set({ books: await api.books() }); } catch (e) { get().notify('Could not reach the library server.', 'err'); } },
  loadMe: async () => {
    if (!get().user) return set({ me: null });
    try { set({ me: await api.me() }); } catch { /* ignore */ }
  },

  restore: async () => {
    const t = localStorage.getItem('lib_token');
    if (t) {
      setToken(t);
      try {
        const me = await api.me();
        set({ user: me.user, me, panel: null });
      } catch { setToken(null); localStorage.removeItem('lib_token'); }
    }
    await get().loadBooks();
  },
  authenticate: async (mode, f) => {
    const r = mode === 'login' ? await api.login(f.email, f.password) : await api.register(f.name, f.email, f.password);
    setToken(r.token);
    localStorage.setItem('lib_token', r.token);
    set({ user: r.user, panel: null });
    await Promise.all([get().loadBooks(), get().loadMe()]);
    get().notify(`Welcome, ${r.user.name.split(' ')[0]}`);
  },
  guest: () => set({ panel: null }),
  logout: async () => {
    setToken(null);
    localStorage.removeItem('lib_token');
    set({ user: null, me: null, panel: 'login', selectedId: null });
    await get().loadBooks();
  },

  // every library action goes through here: call API, toast the result, refresh the 3D shelves
  act: async (fn, okMsg) => {
    set({ busy: true });
    try {
      const r = await fn();
      if (okMsg) get().notify(typeof okMsg === 'function' ? okMsg(r) : okMsg);
      return r;
    } catch (e) {
      get().notify(e.message, 'err');
    } finally {
      await Promise.all([get().loadBooks(), get().loadMe()]);
      set({ busy: false });
    }
  },
  borrow: (id) => get().act(() => api.borrow(id), (r) => `Borrowed. Due ${fmtDate(r.dueDate)}`),
  returnBook: (loanId) => get().act(() => api.returnLoan(loanId), (r) => (r.fine ? `Returned late. Fine ₹${r.fine} (${r.overdueDays} days)` : 'Returned. Thank you!')),
  reserve: (id) => get().act(() => api.reserve(id), 'Reserved. We\'ll hold it when it\'s back.'),
  cancelReservation: (id) => get().act(() => api.cancelReservation(id), 'Reservation cancelled.'),
  addCopies: (id, d) => get().act(() => api.addCopies(id, d)),
}));

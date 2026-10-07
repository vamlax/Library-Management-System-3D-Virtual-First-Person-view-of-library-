let token = null;
export const setToken = (t) => { token = t; };

async function req(path, opts = {}) {
  const res = await fetch('/api' + path, {
    method: opts.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

export const api = {
  login: (email, password) => req('/login', { method: 'POST', body: { email, password } }),
  register: (name, email, password) => req('/register', { method: 'POST', body: { name, email, password } }),
  books: () => req('/books'),
  me: () => req('/me'),
  borrow: (bookId) => req('/loans', { method: 'POST', body: { bookId } }),
  returnLoan: (id) => req(`/loans/${id}/return`, { method: 'POST' }),
  reserve: (bookId) => req('/reservations', { method: 'POST', body: { bookId } }),
  cancelReservation: (id) => req(`/reservations/${id}`, { method: 'DELETE' }),
  overdue: () => req('/admin/overdue'),
  addCopies: (id, delta) => req(`/admin/books/${id}/copies`, { method: 'POST', body: { delta } }),
};

import { useState } from 'react';
import { useStore } from '../store';

const DEMOS = [
  ['Student', 'student@library.test', 'student123'],
  ['Late-return student', 'ravi@library.test', 'student123'],
  ['Librarian', 'librarian@library.test', 'admin123'],
];

export default function LoginPanel() {
  const panel = useStore((s) => s.panel);
  const user = useStore((s) => s.user);
  const { authenticate, guest, closePanel } = useStore.getState();
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  if (panel !== 'login') return null;

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e, creds) => {
    e?.preventDefault();
    setErr(''); setLoading(true);
    try { await authenticate(creds ? 'login' : mode, creds || f); }
    catch (ex) { setErr(ex.message); }
    setLoading(false);
  };

  return (
    <div className="backdrop">
      <div className="login">
        <div className="logo">▤</div>
        <h1>Central Library</h1>
        <p className="sub">Walk in, browse the shelves, borrow a book.</p>

        <form onSubmit={submit}>
          {mode === 'register' && <input placeholder="Full name" value={f.name} onChange={set('name')} autoFocus />}
          <input type="email" placeholder="Email" value={f.email} onChange={set('email')} autoFocus={mode === 'login'} />
          <input type="password" placeholder="Password" value={f.password} onChange={set('password')} />
          {err && <div className="err">{err}</div>}
          <button className="primary wide" disabled={loading}>{mode === 'login' ? 'Sign in' : 'Create account'}</button>
        </form>
        <button className="link" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(''); }}>
          {mode === 'login' ? 'New here? Create an account' : 'Have an account? Sign in'}
        </button>

        <div className="demos">
          <span>Demo accounts</span>
          {DEMOS.map(([label, email, password]) => (
            <button key={email} className="chip" onClick={() => submit(null, { email, password })}>{label}</button>
          ))}
        </div>

        <button className="secondary wide" onClick={user ? closePanel : guest}>
          {user ? 'Back to the library' : 'Just look around (guest)'}
        </button>
      </div>
    </div>
  );
}

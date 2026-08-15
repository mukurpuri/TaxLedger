import { FormEvent, useEffect, useState } from 'react';
import { api, setToken, type User } from './api';
import { FilingDashboard } from './components/FilingDashboard';
import { RefundStatusTicker } from './components/RefundStatusTicker';
import { TaxCalculatorForm } from './components/TaxCalculatorForm';
import './app.css';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedFilingId, setSelectedFilingId] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .me()
      .then((result) => {
        if (!cancelled) {
          setUser(result.user);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setBootstrapping(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError(null);
    const form = new FormData(event.currentTarget);
    try {
      if (mode === 'login') {
        const result = await api.login({
          email: String(form.get('email') ?? ''),
          password: String(form.get('password') ?? ''),
        });
        setToken(result.token);
        setUser(result.user);
        return;
      }
      const result = await api.register({
        email: String(form.get('email') ?? ''),
        password: String(form.get('password') ?? ''),
        name: String(form.get('name') ?? ''),
        pan: String(form.get('pan') ?? '').toUpperCase(),
        defaultTaxRegime: 'new',
      });
      setToken(result.token);
      setUser(result.user);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Unable to sign in');
    }
  }

  function signOut() {
    setToken(null);
    setUser(null);
    setSelectedFilingId(null);
  }

  if (bootstrapping) {
    return (
      <main className="shell">
        <p>Loading session…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="shell auth">
        <div className="brand">
          <p className="eyebrow">Income-tax filing</p>
          <h1>TaxLedger</h1>
          <p>File returns, compute tax under the old or new regime, and track refunds.</p>
        </div>
        <form className="panel stack" onSubmit={handleAuth}>
          <h2>{mode === 'login' ? 'Sign in' : 'Create account'}</h2>
          {mode === 'register' ? (
            <>
              <label>
                Full name
                <input name="name" required minLength={2} />
              </label>
              <label>
                PAN
                <input name="pan" required minLength={10} maxLength={10} />
              </label>
            </>
          ) : null}
          <label>
            Email
            <input name="email" type="email" required />
          </label>
          <label>
            Password
            <input name="password" type="password" required minLength={mode === 'register' ? 10 : 1} />
          </label>
          {authError ? <p className="banner error">{authError}</p> : null}
          <button type="submit">{mode === 'login' ? 'Sign in' : 'Register'}</button>
          <button
            type="button"
            className="link"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? 'Need an account?' : 'Already registered?'}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">TaxLedger</p>
          <h1>Returns workspace</h1>
        </div>
        <div className="who">
          <span>
            {user.name} · {user.pan}
          </span>
          <button type="button" className="link" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>
      <div className="layout">
        <TaxCalculatorForm onCreated={() => setRefreshKey((value) => value + 1)} />
        <RefundStatusTicker filingId={selectedFilingId} />
      </div>
      <FilingDashboard
        refreshKey={refreshKey}
        selectedId={selectedFilingId}
        onSelectFiling={setSelectedFilingId}
      />
    </main>
  );
}

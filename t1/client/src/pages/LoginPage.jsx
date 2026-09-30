import { useState } from 'react';
import { Alert, Button, Form, Spinner } from 'react-bootstrap';
import { api } from '../services/api.js';

export function LoginPage({ onLogin }) {
  const [register, setRegister] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await api(`/auth/${register ? 'register' : 'login'}`, { method: 'POST', body: form });
      sessionStorage.setItem('stockwise_token', result.token);
      onLogin(result.user);
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  return <main className="login-screen">
    <div className="login-brand"><span className="brand-mark"><i className="bi bi-boxes" /></span><strong>stockwise<span className="brand-dot">.</span></strong></div>
    <div className="login-layout">
      <section className="login-story"><div className="story-eyebrow"><span /> INVENTORY, IN GOOD ORDER</div><h1>Make every<br />stock decision<br /><em>count.</em></h1><p>One clear view of your inventory, operations and the next move your team needs to make.</p></section>
      <section className="login-card"><div className="login-card-heading"><div className="login-welcome">{register ? 'START YOUR WORKSPACE' : 'WELCOME BACK'}</div><h2>{register ? 'Create your account' : 'Sign in to Stockwise'}</h2><p>{register ? 'Your organization workspace will be created securely.' : 'Enter your details to access your workspace.'}</p></div>
        {error && <Alert variant="danger" className="login-alert">{error}</Alert>}
        <Form onSubmit={submit}>
          {register && <Form.Group className="mb-3"><Form.Label>Your name</Form.Label><Form.Control required minLength={2} maxLength={100} autoComplete="name" placeholder="e.g. Alex Morgan" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Form.Group>}
          <Form.Group className="mb-3"><Form.Label>Work email</Form.Label><Form.Control type="email" required autoComplete="email" placeholder="you@company.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Form.Group>
          <Form.Group className="mb-4"><Form.Label>Password</Form.Label><Form.Control type="password" required minLength={register ? 12 : 1} autoComplete={register ? 'new-password' : 'current-password'} placeholder={register ? 'At least 12 characters' : 'Enter your password'} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />{register && <Form.Text className="text-muted">Use at least 12 characters.</Form.Text>}</Form.Group>
          <Button type="submit" className="w-100 sign-in-button" disabled={busy}>{busy ? <><Spinner size="sm" className="me-2" />Please wait…</> : <>{register ? 'Create workspace' : 'Sign in'} <i className="bi bi-arrow-right ms-2" /></>}</Button>
        </Form>
        <div className="login-switch">{register ? 'Already have an account?' : 'New to Stockwise?'} <button onClick={() => { setRegister(!register); setError(''); }}> {register ? 'Sign in' : 'Create an account'}</button></div>
        <div className="secure-note"><i className="bi bi-shield-check" /> Secure, private access to your organization</div>
      </section>
    </div>
    <div className="login-footer"><span>© {new Date().getFullYear()} Stockwise</span><span>Thoughtful tools for thoughtful operations</span></div>
  </main>;
}

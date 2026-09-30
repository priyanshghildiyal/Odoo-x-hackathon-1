import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Form, Spinner, Toast, ToastContainer } from 'react-bootstrap';
import { api, getToken } from './services/api.js';
import { LoginPage } from './pages/LoginPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { ProductsPage } from './pages/ProductsPage.jsx';
import { StockPage } from './pages/StockPage.jsx';
import { WarehousesPage } from './pages/WarehousesPage.jsx';
import { SuppliersPage } from './pages/SuppliersPage.jsx';
import { ReportsPage } from './pages/ReportsPage.jsx';
import { ActivityPage, NotificationsPage } from './pages/UtilityPages.jsx';

const navigation = [
  { section: 'WORKSPACE', links: [{ to: '/', label: 'Overview', icon: 'bi-grid-1x2' }, { to: '/products', label: 'Products', icon: 'bi-box-seam' }, { to: '/stock', label: 'Stock ledger', icon: 'bi-arrow-left-right' }, { to: '/warehouses', label: 'Warehouses', icon: 'bi-building' }] },
  { section: 'OPERATIONS', links: [{ to: '/suppliers', label: 'Suppliers', icon: 'bi-truck' }, { to: '/reports', label: 'Reports', icon: 'bi-bar-chart-line' }, { to: '/activity', label: 'Audit activity', icon: 'bi-clock-history' }] }
];

function AuthGate({ children }) {
  return getToken() ? children : <Navigate to="/login" replace />;
}

function Shell({ user, onLogout, children, theme, setTheme, onToast }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [notifications, setNotifications] = useState(0);
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    api('/notifications').then(({ items }) => setNotifications(items.filter((item) => !item.read_at).length)).catch(() => {});
  }, [location.pathname]);

  useEffect(() => {
    const handleKey = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
      if (event.key === 'Escape') setCommandOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.trim().length < 2) return setResults([]);
      api(`/search?q=${encodeURIComponent(search)}`).then(({ items }) => setResults(items)).catch(() => setResults([]));
    }, 220);
    return () => clearTimeout(timer);
  }, [search]);

  const title = navigation.flatMap((group) => group.links).find((item) => item.to === location.pathname)?.label || 'Overview';
  const selectResult = (item) => {
    setSearch('');
    setResults([]);
    navigate(item.type === 'product' ? '/products' : item.type === 'warehouse' ? '/warehouses' : '/suppliers');
  };

  return (
    <div className={`app-shell ${theme}`}>
      {mobileOpen && <button aria-label="Close navigation" className="mobile-scrim" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-lockup"><div className="brand-mark"><i className="bi bi-boxes" /></div><span>stockwise<span className="brand-dot">.</span></span></div>
        <div className="org-switcher"><div className="org-avatar">{user.organization?.slice(0, 1) || 'S'}</div><div className="org-copy"><strong>{user.organization || 'My organization'}</strong><small>{user.role || 'Team member'}</small></div><i className="bi bi-chevron-expand" /></div>
        <nav className="side-nav" aria-label="Primary navigation">
          {navigation.map((group) => <div className="nav-group" key={group.section}><div className="nav-label">{group.section}</div>{group.links.map((item) => <button key={item.to} className={`nav-link ${location.pathname === item.to ? 'active' : ''}`} onClick={() => { navigate(item.to); setMobileOpen(false); }}><i className={`bi ${item.icon}`} /><span>{item.label}</span>{item.to === '/activity' && <span className="nav-indicator" />}</button>)}</div>)}
        </nav>
        <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><i className="bi bi-lightning-charge" /></div><strong>Move stock with confidence</strong><span>Your inventory, in sync.</span><button onClick={() => navigate('/stock')}>Open stock ledger <i className="bi bi-arrow-right" /></button></div><div className="sidebar-user"><div className="user-avatar">{user.name?.slice(0, 1).toUpperCase() || 'A'}</div><div className="user-meta"><strong>{user.name}</strong><small>{user.email}</small></div><button className="icon-button" aria-label="Sign out" title="Sign out" onClick={onLogout}><i className="bi bi-box-arrow-right" /></button></div></div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><i className="bi bi-list" /></button>
          <div className="breadcrumb"><span>Stockwise</span><i className="bi bi-chevron-right" /><strong>{title}</strong></div>
          <div className="topbar-actions">
            <div className="global-search"><i className="bi bi-search" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search anything..." aria-label="Search products, warehouses and suppliers" /><button onClick={() => setCommandOpen(true)} aria-label="Open command palette">⌘ K</button>{results.length > 0 && <div className="search-results">{results.map((item) => <button key={`${item.type}-${item.id}`} onClick={() => selectResult(item)}><span className="search-result-icon"><i className={`bi ${item.type === 'product' ? 'bi-box-seam' : item.type === 'warehouse' ? 'bi-building' : 'bi-truck'}`} /></span><span><strong>{item.title}</strong><small>{item.subtitle} · {item.type}</small></span></button>)}</div>}</div>
            <Button variant="light" className="top-icon" title="Toggle dark mode" aria-label="Toggle dark mode" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}><i className={`bi ${theme === 'dark' ? 'bi-sun' : 'bi-moon'}`} /></Button>
            <button className="top-icon notification-button" aria-label="View notifications" onClick={() => navigate('/notifications')}><i className="bi bi-bell" />{notifications > 0 && <span />}</button>
            <button className="top-avatar" aria-label="Current user">{user.name?.slice(0, 1).toUpperCase()}</button>
          </div>
        </header>
        <div className="page-content">{children}</div>
      </main>

      {commandOpen && <div className="command-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setCommandOpen(false); }}><section className="command-dialog" role="dialog" aria-modal="true" aria-label="Command palette"><div className="command-input"><i className="bi bi-search" /><input autoFocus placeholder="What would you like to do?" onChange={(event) => setSearch(event.target.value)} /><kbd>ESC</kbd><button aria-label="Close" onClick={() => setCommandOpen(false)}><i className="bi bi-x-lg" /></button></div><div className="command-label">QUICK NAVIGATION</div>{[{ path: '/', icon: 'bi-grid', label: 'Open dashboard' }, { path: '/products', icon: 'bi-plus-lg', label: 'Manage products' }, { path: '/stock', icon: 'bi-box-arrow-in-down', label: 'Receive or move stock' }, { path: '/warehouses', icon: 'bi-building', label: 'Manage warehouses' }, { path: '/reports', icon: 'bi-bar-chart', label: 'View inventory reports' }, { path: '/notifications', icon: 'bi-bell', label: 'Open notifications' }].map((item) => <button className="command-option" key={item.path} onClick={() => { navigate(item.path); setCommandOpen(false); }}><i className={`bi ${item.icon}`} />{item.label}<i className="bi bi-arrow-return-left command-enter" /></button>)}<div className="command-footer">Use ↑ ↓ to navigate <span>Stockwise command menu</span></div></section></div>}
    </div>
  );
}

function Workspace() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [theme, setTheme] = useState(localStorage.getItem('stockwise_theme') || 'light');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('stockwise_theme', theme);
  }, [theme]);

  useEffect(() => {
    const logoutOnExpiry = () => { sessionStorage.removeItem('stockwise_token'); setUser(null); navigate('/login'); };
    window.addEventListener('stockwise:unauthorized', logoutOnExpiry);
    return () => window.removeEventListener('stockwise:unauthorized', logoutOnExpiry);
  }, [navigate]);

  useEffect(() => {
    if (!getToken()) { setLoading(false); return; }
    api('/auth/me').then(({ user: profile }) => setUser(profile)).catch(() => { sessionStorage.removeItem('stockwise_token'); setUser(null); }).finally(() => setLoading(false));
  }, []);

  const onLogout = () => { sessionStorage.removeItem('stockwise_token'); setUser(null); navigate('/login'); };
  const showToast = (message) => setToast(message);
  if (loading) return <div className="fullscreen-state"><Spinner animation="border" /><span>Loading your workspace…</span></div>;

  return <>
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage onLogin={setUser} />} />
      <Route path="/*" element={<AuthGate><Shell user={user || {}} onLogout={onLogout} theme={theme} setTheme={setTheme} onToast={showToast}><Routes>
        <Route path="/" element={<DashboardPage onToast={showToast} />} />
        <Route path="/products" element={<ProductsPage onToast={showToast} />} />
        <Route path="/stock" element={<StockPage onToast={showToast} />} />
        <Route path="/warehouses" element={<WarehousesPage onToast={showToast} />} />
        <Route path="/suppliers" element={<SuppliersPage onToast={showToast} />} />
        <Route path="/reports" element={<ReportsPage onToast={showToast} />} />
        <Route path="/activity" element={<ActivityPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="*" element={<div className="empty-state"><h2>Page not found</h2><p>Choose a page from the navigation to continue.</p></div>} />
      </Routes></Shell></AuthGate>} />
    </Routes>
    <ToastContainer position="bottom-end" className="p-3"><Toast bg="dark" show={Boolean(toast)} onClose={() => setToast('')} delay={3000} autohide><Toast.Body className="text-white"><i className="bi bi-check-circle me-2" />{toast}</Toast.Body></Toast></ToastContainer>
  </>;
}

export default function App() {
  return <BrowserRouter><Workspace /></BrowserRouter>;
}

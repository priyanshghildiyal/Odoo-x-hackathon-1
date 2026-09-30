import { useEffect, useState } from 'react';
import { Alert, Button } from 'react-bootstrap';
import { api } from '../services/api.js';
import { dateTime } from '../utils/format.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { DataTable } from '../components/DataTable.jsx';

export function ActivityPage() {
  const [items, setItems] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState('');
  useEffect(() => { api('/audit-logs').then(({ items: rows }) => setItems(rows)).catch((e) => setError(e.message)).finally(() => setLoading(false)); }, []);
  const columns = [{ key: 'action', label: 'Action', render: (row) => <div className="product-cell"><span className="timeline-icon"><i className={`bi ${row.entity === 'stock_movement' ? 'bi-arrow-left-right' : row.entity === 'product' ? 'bi-box-seam' : 'bi-journal-text'}`} /></span><span><strong>{row.action.replaceAll('_', ' ')}</strong><small>{row.entity.replaceAll('_', ' ')}{row.entity_id ? ` #${row.entity_id}` : ''}</small></span></div> }, { key: 'user_name', label: 'By' }, { key: 'created_at', label: 'Time', render: (row) => dateTime(row.created_at) }, { key: 'details', label: 'Details', render: (row) => { try { const details = JSON.parse(row.details); return Object.entries(details).map(([key, value]) => `${key}: ${value}`).join(' · ') || '—'; } catch { return '—'; } } }];
  return <><PageHeader eyebrow="ACCOUNTABILITY & TRACEABILITY" title="Audit activity" description="A read-only timeline of changes recorded across your organization." />{error && <Alert variant="danger">{error}</Alert>}<section className="surface-panel list-panel"><div className="list-toolbar"><div className="list-count"><strong>Recent activity</strong><span>Latest 200 records</span></div></div><DataTable columns={columns} rows={items} loading={loading} empty={<div className="table-empty">No audit activity recorded yet.</div>} /></section></>;
}

export function NotificationsPage() {
  const [items, setItems] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const refresh = () => api('/notifications').then(({ items: rows }) => setItems(rows)).catch((e) => setError(e.message)).finally(() => setLoading(false));
  useEffect(() => { refresh(); }, []);
  const markRead = async (id) => { try { await api(`/notifications/${id}/read`, { method: 'PATCH' }); refresh(); } catch (e) { setError(e.message); } };
  const markAllRead = async () => { for (const item of items.filter((entry) => !entry.read_at)) await markRead(item.id); };
  return <><PageHeader eyebrow="ALERTS & UPDATES" title="Notifications" description="Operational signals generated from your organization's recorded activity." action={items.some((item) => !item.read_at) ? markAllRead : undefined} actionLabel="Mark all read" actionIcon="bi-check2-all" />{error && <Alert variant="danger">{error}</Alert>}{loading ? <div className="loading-surface"><div className="skeleton-block" /></div> : <section className="surface-panel notification-list">{items.length ? items.map((item) => <article className={`notification-item ${item.read_at ? 'is-read' : ''}`} key={item.id}><span className={`notification-symbol ${item.type === 'critical' ? 'critical' : ''}`}><i className={`bi ${item.type === 'critical' ? 'bi-exclamation-triangle' : 'bi-bell'}`} /></span><div className="notification-content"><strong>{item.title}</strong><p>{item.message}</p><small>{dateTime(item.created_at)}</small></div>{!item.read_at && <Button variant="light" size="sm" onClick={() => markRead(item.id)}>Mark read</Button>}</article>) : <div className="empty-state"><span className="empty-icon"><i className="bi bi-bell" /></span><h3>You're all caught up</h3><p>New operational alerts will show up here.</p></div>}</section>}</>;
}

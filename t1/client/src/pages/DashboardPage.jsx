import { useEffect, useState } from 'react';
import { Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { money, dateTime } from '../utils/format.js';
import { MetricCard } from '../components/MetricCard.jsx';
import { DataTable } from '../components/DataTable.jsx';
import { PageHeader, LoadingState } from '../components/PageHeader.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';

export function DashboardPage({ onToast }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  useEffect(() => { api('/dashboard').then(setData).catch((e) => setError(e.message)); }, []);
  if (error) return <div className="error-panel"><i className="bi bi-cloud-slash" /><h2>We couldn't load your overview</h2><p>{error}</p><Button onClick={() => window.location.reload()}>Try again</Button></div>;
  if (!data) return <><PageHeader eyebrow="YOUR OPERATIONS AT A GLANCE" title="Good to see you" description="A clear picture of what is happening across your inventory." /><LoadingState /></>;
  const summary = data.summary;
  const movementColumns = [
    { key: 'product_name', label: 'Product', render: (row) => <div className="product-cell"><span className="table-product-icon"><i className="bi bi-box-seam" /></span><span><strong>{row.product_name}</strong><small>{row.sku}</small></span></div> },
    { key: 'type', label: 'Movement', render: (row) => <StatusBadge status={row.type.replace('_', ' ')} /> },
    { key: 'quantity', label: 'Quantity', render: (row) => <strong className={row.type === 'issue' || row.type === 'transfer_out' ? 'qty-negative' : 'qty-positive'}>{row.type === 'issue' || row.type === 'transfer_out' ? '−' : '+'}{row.quantity}</strong> },
    { key: 'warehouse_name', label: 'Warehouse' },
    { key: 'created_at', label: 'When', render: (row) => dateTime(row.created_at) }
  ];
  return <>
    <PageHeader eyebrow="YOUR INVENTORY DESK" title="Inventory overview" description="Here's the latest across your inventory operations." action={() => navigate('/stock')} actionLabel="Receive stock" actionIcon="bi-box-arrow-in-down" />
    <div className="metric-grid">
      <MetricCard label="Inventory value" value={money(summary.inventory_value)} icon="bi-wallet2" tone="blue" hint="At current cost value" />
      <MetricCard label="Active products" value={summary.product_count} icon="bi-box-seam" tone="violet" hint="In your catalog" />
      <MetricCard label="Low stock" value={summary.low_stock} icon="bi-exclamation-triangle" tone="amber" hint="At or below reorder point" />
      <MetricCard label="Out of stock" value={summary.out_of_stock} icon="bi-x-octagon" tone="red" hint="Needs replenishment" />
    </div>
    <div className="dashboard-grid">
      <section className="surface-panel movement-panel"><div className="panel-heading"><div><h2>Recent stock movements</h2><p>Latest recorded inventory activity</p></div><Button variant="link" onClick={() => navigate('/stock')}>View ledger <i className="bi bi-arrow-right" /></Button></div><DataTable columns={movementColumns} rows={data.movements} empty={<div className="table-empty">No stock movements recorded yet. Receive stock to start your ledger.</div>} /></section>
      <section className="surface-panel attention-panel"><div className="panel-heading"><div><h2>Needs attention</h2><p>Reorder points reached</p></div><span className="attention-count">{data.lowStock.length}</span></div>{data.lowStock.length ? <div className="attention-list">{data.lowStock.map((item) => <div className="attention-item" key={item.id}><span className={`attention-product-icon ${item.quantity === 0 ? 'critical' : ''}`}><i className="bi bi-box-seam" /></span><div className="attention-copy"><strong>{item.name}</strong><small>{item.sku}</small></div><div className="attention-stock"><strong>{item.quantity}</strong><small>of {item.reorder_point} min</small></div></div>)}</div> : <div className="good-state"><i className="bi bi-check2-circle" /><strong>Stock levels look healthy</strong><span>No active reorder alerts.</span></div>}<Button className="outline-action w-100" onClick={() => navigate('/products')}>Review products <i className="bi bi-arrow-right" /></Button></section>
    </div>
    <div className="dashboard-lower-grid"><section className="surface-panel"><div className="panel-heading"><div><h2>Warehouse footprint</h2><p>Inventory distribution by location</p></div><Button variant="link" onClick={() => navigate('/warehouses')}>Manage <i className="bi bi-arrow-right" /></Button></div>{data.warehouses.length ? <div className="warehouse-bars">{data.warehouses.map((warehouse) => { const max = Math.max(...data.warehouses.map((item) => item.value), 1); return <div className="warehouse-bar-row" key={warehouse.id}><div className="warehouse-bar-label"><strong>{warehouse.name}</strong><span>{warehouse.products} products · {money(warehouse.value)}</span></div><div className="bar-track"><span style={{ width: `${Math.max(2, warehouse.value / max * 100)}%` }} /></div></div>; })}</div> : <div className="table-empty">Create a warehouse to view distribution.</div>}</section><section className="surface-panel quick-actions"><div className="panel-heading"><div><h2>Quick actions</h2><p>Common tasks, one step away</p></div></div><button onClick={() => navigate('/products')}><span className="quick-icon blue"><i className="bi bi-plus-lg" /></span><span><strong>Add a product</strong><small>Expand your catalog</small></span><i className="bi bi-chevron-right" /></button><button onClick={() => navigate('/stock')}><span className="quick-icon green"><i className="bi bi-box-arrow-in-down" /></span><span><strong>Receive inventory</strong><small>Update available stock</small></span><i className="bi bi-chevron-right" /></button><button onClick={() => navigate('/reports')}><span className="quick-icon purple"><i className="bi bi-file-earmark-bar-graph" /></span><span><strong>Export a report</strong><small>Download inventory data</small></span><i className="bi bi-chevron-right" /></button></section></div>
  </>;
}

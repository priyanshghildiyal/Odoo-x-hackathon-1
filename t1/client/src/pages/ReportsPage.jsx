import { useEffect, useState } from 'react';
import { Alert, Button } from 'react-bootstrap';
import { api } from '../services/api.js';
import { money } from '../utils/format.js';
import { downloadCsv } from '../utils/csv.js';
import { DataTable } from '../components/DataTable.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';

export function ReportsPage() {
  const [items, setItems] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState('');
  useEffect(() => { api('/reports/inventory').then(({ items: rows }) => setItems(rows)).catch((e) => setError(e.message)).finally(() => setLoading(false)); }, []);
  const value = items.reduce((sum, item) => sum + Number(item.stock_value || 0), 0);
  const columns = [{ key: 'product_name', label: 'Product', render: (row) => <div className="product-cell"><span className="table-product-icon"><i className="bi bi-box-seam" /></span><span><strong>{row.product_name}</strong><small>{row.sku}</small></span></div> }, { key: 'warehouse_name', label: 'Warehouse' }, { key: 'quantity', label: 'On hand', render: (row) => row.quantity.toLocaleString() }, { key: 'reserved', label: 'Reserved', render: (row) => row.reserved.toLocaleString() }, { key: 'stock_value', label: 'Stock value', render: (row) => money(row.stock_value) }, { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> }];
  return <><PageHeader eyebrow="INSIGHT & CONTROL" title="Inventory report" description="A live valuation and availability snapshot, calculated from your stock records." action={() => downloadCsv('stockwise-inventory-report.csv', items)} actionLabel="Export CSV" actionIcon="bi-download" />{error && <Alert variant="danger">{error}</Alert>}<div className="report-summary"><div className="report-summary-icon"><i className="bi bi-clipboard-data" /></div><div><small>VALUATION AT COST</small><strong>{money(value)}</strong><span>Across {items.length} product-location records · Based on current recorded stock</span></div><div className="report-summary-side"><strong>{items.filter((item) => item.status === 'Low' || item.status === 'Out of stock').length}</strong><span>records to review</span></div></div><section className="surface-panel list-panel"><div className="list-toolbar"><div className="list-count"><strong>Stock valuation by location</strong><span>Live inventory snapshot</span></div><Button variant="light" className="secondary-action" onClick={() => downloadCsv('stockwise-inventory-report.csv', items)}><i className="bi bi-download" /> Download CSV</Button></div><DataTable columns={columns} rows={items} loading={loading} empty={<div className="table-empty">No stock data is available yet. Add a warehouse, product and stock receipt first.</div>} /></section><div className="report-note"><i className="bi bi-info-circle" /> This report uses recorded quantity multiplied by product cost price. It does not include sales, purchase, tax, or payment records.</div></>;
}

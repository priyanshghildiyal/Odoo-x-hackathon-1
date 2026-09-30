import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Form, Modal } from 'react-bootstrap';
import { api } from '../services/api.js';
import { money } from '../utils/format.js';
import { downloadCsv } from '../utils/csv.js';
import { DataTable } from '../components/DataTable.jsx';
import { EmptyState, PageHeader } from '../components/PageHeader.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';

const blank = { sku: '', name: '', description: '', unit: 'pcs', cost_price: '', selling_price: '', reorder_point: '', reorder_quantity: '' };

export function ProductsPage({ onToast }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [archiving, setArchiving] = useState(null);
  const refresh = useCallback(() => { setLoading(true); api(`/products?q=${encodeURIComponent(query)}`).then(({ items: rows }) => setItems(rows)).catch((e) => setError(e.message)).finally(() => setLoading(false)); }, [query]);
  useEffect(() => { const timer = setTimeout(refresh, 180); return () => clearTimeout(timer); }, [refresh]);
  const openCreate = () => { setEditing(null); setForm(blank); setError(''); setModal(true); };
  const openEdit = (item) => { setEditing(item); setForm({ ...item, cost_price: item.cost_price, selling_price: item.selling_price, reorder_point: item.reorder_point, reorder_quantity: item.reorder_quantity }); setError(''); setModal(true); };
  const save = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const body = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, ['cost_price','selling_price','reorder_point','reorder_quantity'].includes(key) ? Number(value || 0) : value]));
      if (editing) await api(`/products/${editing.id}`, { method: 'PATCH', body });
      else await api('/products', { method: 'POST', body });
      setModal(false); refresh(); onToast(editing ? 'Product updated' : 'Product created');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const archive = async () => {
    if (!archiving) return;
    try { await api(`/products/${archiving.id}`, { method: 'DELETE' }); setArchiving(null); refresh(); onToast(`${archiving.name} archived`); }
    catch (e) { setError(e.message); }
  };
  const columns = [
    { key: 'name', label: 'Product', render: (row) => <div className="product-cell"><span className="table-product-icon"><i className="bi bi-box-seam" /></span><span><strong>{row.name}</strong><small>{row.sku}{row.category_name ? ` · ${row.category_name}` : ''}</small></span></div> },
    { key: 'quantity', label: 'On hand', render: (row) => <span className="stock-amount"><strong>{row.quantity}</strong><small>{row.unit}</small></span> },
    { key: 'selling_price', label: 'Sell price', render: (row) => money(row.selling_price) },
    { key: 'cost_price', label: 'Cost', render: (row) => money(row.cost_price) },
    { key: 'status', label: 'Stock status', render: (row) => <StatusBadge status={row.quantity === 0 ? 'out of stock' : row.quantity <= row.reorder_point ? 'low' : 'healthy'} /> },
    { key: 'actions', label: '', render: (row) => <div className="row-actions"><button aria-label={`Edit ${row.name}`} title="Edit product" onClick={() => openEdit(row)}><i className="bi bi-pencil" /></button><button aria-label={`Archive ${row.name}`} title="Archive product" onClick={() => setArchiving(row)}><i className="bi bi-archive" /></button></div> }
  ];
  return <>
    <PageHeader eyebrow="CATALOG & REPLENISHMENT" title="Products" description="Your product catalog, stock levels and reorder signals in one place." action={openCreate} actionLabel="Add product" />
    {error && !modal && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
    <section className="surface-panel list-panel"><div className="list-toolbar"><div className="list-count"><strong>Product catalog</strong><span>{items.length} active items</span></div><div className="list-tools"><div className="inline-search"><i className="bi bi-search" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or SKU" aria-label="Search products" /></div><Button variant="light" className="secondary-action" onClick={() => downloadCsv('stockwise-products.csv', items.map(({ sku,name,quantity,unit,cost_price,selling_price,reorder_point,status }) => ({sku,name,quantity,unit,cost_price,selling_price,reorder_point,status})))}><i className="bi bi-download" /> Export</Button></div></div>
      <DataTable columns={columns} rows={items} loading={loading} empty={<EmptyState icon="bi-box-seam" title={query ? 'No matching products' : 'Your catalog starts here'} description={query ? 'Try a different product name or SKU.' : 'Add the products you stock to begin managing inventory.'} action={!query && <Button className="primary-action" onClick={openCreate}><i className="bi bi-plus-lg" /> Add first product</Button>} />} />
    </section>
    <Modal show={modal} onHide={() => setModal(false)} centered className="stockwise-modal"><Form onSubmit={save}><Modal.Header closeButton><div><div className="eyebrow">PRODUCT CATALOG</div><Modal.Title>{editing ? 'Edit product' : 'Add a product'}</Modal.Title></div></Modal.Header><Modal.Body>{error && <Alert variant="danger">{error}</Alert>}<div className="form-grid"><Form.Group className="span-two"><Form.Label>Product name *</Form.Label><Form.Control required maxLength={160} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Arabica coffee beans" /></Form.Group><Form.Group><Form.Label>SKU *</Form.Label><Form.Control required maxLength={80} disabled={Boolean(editing)} value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })} placeholder="e.g. COF-001" /></Form.Group><Form.Group><Form.Label>Unit</Form.Label><Form.Control maxLength={20} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="pcs" /></Form.Group><Form.Group><Form.Label>Cost price</Form.Label><Form.Control type="number" min="0" step="0.01" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} /></Form.Group><Form.Group><Form.Label>Selling price</Form.Label><Form.Control type="number" min="0" step="0.01" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} /></Form.Group><Form.Group><Form.Label>Reorder point</Form.Label><Form.Control type="number" min="0" step="1" value={form.reorder_point} onChange={(e) => setForm({ ...form, reorder_point: e.target.value })} /></Form.Group><Form.Group><Form.Label>Reorder quantity</Form.Label><Form.Control type="number" min="0" step="1" value={form.reorder_quantity} onChange={(e) => setForm({ ...form, reorder_quantity: e.target.value })} /></Form.Group><Form.Group className="span-two"><Form.Label>Description</Form.Label><Form.Control as="textarea" rows={3} maxLength={2000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="A short product description" /></Form.Group></div></Modal.Body><Modal.Footer><Button variant="light" onClick={() => setModal(false)}>Cancel</Button><Button type="submit" className="primary-action" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Create product'}</Button></Modal.Footer></Form></Modal>
    <Modal show={Boolean(archiving)} onHide={() => setArchiving(null)} centered className="stockwise-modal"><Modal.Header closeButton><Modal.Title>Archive product?</Modal.Title></Modal.Header><Modal.Body><p className="mb-0">{archiving ? `${archiving.name} will be hidden from active product lists. Existing stock and movement history remain intact.` : ''}</p></Modal.Body><Modal.Footer><Button variant="light" onClick={() => setArchiving(null)}>Keep product</Button><Button variant="danger" onClick={archive}>Archive product</Button></Modal.Footer></Modal>
  </>;
}

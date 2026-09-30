import {
  db
} from '../database/connection.js';

// Deterministic rule-based assistant boundary; this does not call or imitate an external AI provider.
export function answerInventoryQuestion({
  organizationId,
  question
}) {
  const text = String(question || '').toLowerCase();
  if (text.includes('low') || text.includes('reorder')) {
    const rows = db.prepare(`SELECT p.name,p.sku,COALESCE(SUM(i.quantity),0) quantity,p.reorder_point FROM products p LEFT JOIN inventory i ON i.product_id=p.id WHERE p.organization_id=? AND p.status='active' GROUP BY p.id HAVING quantity<=p.reorder_point ORDER BY quantity`).all(organizationId);
    return {
      mode: 'rules',
      answer: rows.length ? `${rows.length} product(s) are at or below reorder point: ${rows.map((row) => `${row.name} (${row.quantity}/${row.reorder_point})`).join(', ')}.` : 'No active products are currently at or below their reorder point.'
    };
  }
  if (text.includes('movement') || text.includes('today')) {
    const rows = db.prepare(`SELECT COUNT(*) count,COALESCE(SUM(quantity),0) units FROM stock_movements WHERE organization_id=? AND date(created_at)=date('now')`).get(organizationId);
    return {
      mode: 'rules',
      answer: `Today, ${rows.count} stock movement(s) totaling ${rows.units} units have been recorded.`
    };
  }
  return {
    mode: 'rules',
    answer: 'I can answer questions about current low stock and today’s recorded stock movements. Connect a supported AI provider to enable broader natural-language workflows.'
  };
}

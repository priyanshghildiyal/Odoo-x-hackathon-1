export function DataTable({ columns, rows, rowKey = 'id', empty, loading }) {
  if (loading) return <div className="table-loading"><div /><div /><div /><div /></div>;
  if (!rows?.length) return empty || <div className="table-empty">Nothing to show yet.</div>;
  return <div className="table-responsive data-table-wrap"><table className="table data-table"><thead><tr>{columns.map((column) => <th key={column.key} scope="col">{column.label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={row[rowKey] ?? index}>{columns.map((column) => <td key={column.key} data-label={column.label}>{column.render ? column.render(row) : row[column.key] ?? '—'}</td>)}</tr>)}</tbody></table></div>;
}

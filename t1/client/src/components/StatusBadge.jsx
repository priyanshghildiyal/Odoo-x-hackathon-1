export function StatusBadge({ children, status }) {
  const value = String(status || children || '').toLowerCase().replaceAll(' ', '-');
  return <span className={`status-badge status-${value}`}>{children || status}</span>;
}

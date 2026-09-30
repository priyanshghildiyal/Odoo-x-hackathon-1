import { Button } from 'react-bootstrap';

export function PageHeader({ eyebrow, title, description, action, actionLabel, actionIcon = 'bi-plus-lg' }) {
  return <div className="page-header"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action && <Button className="primary-action" onClick={action}><i className={`bi ${actionIcon}`} />{actionLabel}</Button>}</div>;
}

export function LoadingState() {
  return <div className="loading-surface"><div className="skeleton-line wide" /><div className="skeleton-line" /><div className="skeleton-block" /></div>;
}

export function EmptyState({ icon = 'bi-inboxes', title, description, action }) {
  return <div className="empty-state"><span className="empty-icon"><i className={`bi ${icon}`} /></span><h3>{title}</h3><p>{description}</p>{action}</div>;
}

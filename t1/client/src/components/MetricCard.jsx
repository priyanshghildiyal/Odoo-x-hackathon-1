export function MetricCard({ label, value, icon, tone = 'blue', hint, trend }) {
  return <article className="metric-card"><div className="metric-top"><span>{label}</span><span className={`metric-icon ${tone}`}><i className={`bi ${icon}`} /></span></div><div className="metric-value">{value}</div><div className="metric-foot">{trend && <span className={`metric-trend ${trend === 'up' ? 'positive' : 'negative'}`}><i className={`bi ${trend === 'up' ? 'bi-arrow-up-right' : 'bi-arrow-down-right'}`} /></span>}<span>{hint}</span></div></article>;
}

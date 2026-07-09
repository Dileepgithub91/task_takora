import React from 'react';

const colors = {
  todo: '#64748b', inProgress: '#2563eb', review: '#f59e0b', completed: '#16a34a', overdue: '#dc2626', rejected: '#9333ea',
  low: '#14b8a6', medium: '#2563eb', high: '#f59e0b', urgent: '#ef4444'
};

const pretty = value => String(value || '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export function BarChart({ data = [], title }) {
  const max = Math.max(1, ...data.map(d => d.value || d.total || 0));
  return <div className="chartCard"><h3>{title}</h3><div className="barList">{data.map((d, i) => {
    const value = d.value ?? d.total ?? 0;
    const rawLabel = d.label || d.department || d.name || d.date;
    return <div className="barRow" key={rawLabel + i}><span>{pretty(rawLabel)}</span><div><b style={{ width: `${(value / max) * 100}%`, background: colors[rawLabel] || undefined }} /></div><em>{value}</em></div>;
  })}</div></div>;
}

export function EmployeeGraph({ data = [] }) {
  const top = data.slice(0, 12);
  return <div className="chartCard wide"><h3>Employee Task Completion Graph</h3><div className="empGraph">{top.map(emp => <div key={emp._id} className="empCol"><div className="stack"><span className="green" style={{ height: `${Math.min(emp.completed * 15, 100)}px` }} /><span className="blue" style={{ height: `${Math.min(emp.pending * 15, 100)}px` }} /><span className="red" style={{ height: `${Math.min(emp.delayed * 15, 100)}px` }} /></div><small>{pretty(emp.name)}</small><b>{emp.productivityScore}%</b></div>)}</div><div className="legend"><span className="greenDot"/> Completed <span className="blueDot"/> Pending <span className="redDot"/> Delayed</div></div>;
}

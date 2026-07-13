import React from 'react';

const colors = {
  todo: '#64748b', inProgress: '#2563eb', review: '#f59e0b', completed: '#16a34a', overdue: '#dc2626', rejected: '#9333ea',
  low: '#14b8a6', medium: '#2563eb', high: '#f59e0b', urgent: '#ef4444', closed: '#16a34a', resolved: '#16a34a', waiting: '#f59e0b', escalated: '#dc2626', open: '#2563eb'
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

export function EmployeeGraph({ data = [], title = 'Employee Completion Graph' }) {
  const list = [...data].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'en', { sensitivity: 'base' }));
  const maxValue = Math.max(1, ...list.flatMap(emp => [emp.completed || 0, emp.pending || 0, emp.delayed || 0]));
  const heightFor = value => Math.max(8, Math.round(((value || 0) / maxValue) * 120));

  return <div className="chartCard wide">
    <div className="chartTitleRow"><h3>{title}</h3><span>{list.length} employees</span></div>
    <div className="empGraphScroll">
      <div className="empGraph allEmployeesGraph">
        {list.map(emp => <div key={emp._id || emp.name} className="empCol">
          <div className="stack">
            <span className="green" title={`Completed: ${emp.completed || 0}`} style={{ height: `${heightFor(emp.completed)}px` }} />
            <span className="blue" title={`Pending: ${emp.pending || 0}`} style={{ height: `${heightFor(emp.pending)}px` }} />
            <span className="red" title={`Delayed: ${emp.delayed || 0}`} style={{ height: `${heightFor(emp.delayed)}px` }} />
          </div>
          <small title={pretty(emp.name)}>{pretty(emp.name)}</small>
          <b>{emp.productivityScore || 0}%</b>
        </div>)}
      </div>
    </div>
    <div className="legend"><span className="greenDot"/> Completed <span className="blueDot"/> Pending <span className="redDot"/> Delayed</div>
  </div>;
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api, download } from '../api/client.js';
import { BarChart, EmployeeGraph } from '../components/Charts.jsx';
import Pagination, { usePagination } from '../components/Pagination.jsx';
import SearchableSelect from '../components/SearchableSelect.jsx';

const reportTypes = [{ value: 'task', label: 'Task Reports' }, { value: 'ticket', label: 'Ticket Reports' }];
const pretty = value => String(value || '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const option = (value, label = pretty(value)) => ({ value, label });

export default function Reports() {
  const [type, setType] = useState('task');
  const [data, setData] = useState(null);
  const [message, setMessage] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const cacheRef = useRef(new Map());

  async function loadReport(nextType = type) {
    setMessage('');
    if (cacheRef.current.has(nextType)) setData(cacheRef.current.get(nextType));
    const fresh = await api(`/reports/dashboard?type=${nextType}`);
    cacheRef.current.set(nextType, fresh);
    setData(fresh);
  }

  useEffect(() => {
    setData(cacheRef.current.get(type) || null);
    loadReport(type).catch(error => setMessage(error.message));
  }, [type]);

  const employees = useMemo(() => {
    const all = data?.employeePerformance || [];
    const text = employeeSearch.trim().toLowerCase();
    if (!text) return all;
    return all.filter(e => `${e.name || ''} ${e.role || ''} ${e.department || ''}`.toLowerCase().includes(text));
  }, [data, employeeSearch]);

  const departmentData = useMemo(() => data?.departmentPerformance || [], [data]);
  const reportPagination = usePagination(employees, {
    initialPageSize: 10,
    resetKey: `${type}-${employeeSearch}-${employees.length}`,
    pageSizeOptions: [10, 20, 50, 100]
  });

  const itemLabel = type === 'ticket' ? 'Ticket' : 'Task';
  const completedLabel = type === 'ticket' ? 'Resolved/Closed' : 'Completed';

  return (
    <section className="page">
      <div className="pageTitle">
        <div>
          <h2>Reports & Advanced Analytics</h2>
          <p>Default view is Task. Search and switch instantly between Task and Ticket reports.</p>
        </div>
        <div className="actions reportActions">
          <button onClick={() => download(`/reports/export?type=${type}&format=xlsx`, `takora-${type}-report.xlsx`)}>Export Excel</button>
          <button onClick={() => download(`/reports/export?type=${type}&format=pdf`, `takora-${type}-report.pdf`)}>Export PDF</button>
          <button onClick={() => download(`/reports/export?type=${type}&format=csv`, `takora-${type}-report.csv`)}>Export CSV</button>
        </div>
      </div>

      <div className="filters card smartFilters reportFilters">
        <SearchableSelect placeholder="Task Reports" value={type} options={reportTypes} onChange={value => setType(value || 'task')} />
        <input placeholder="Type Employee / Role / Department" value={employeeSearch} onChange={e => setEmployeeSearch(e.target.value)} />
        <button type="button" className="primary filterBtn" onClick={() => loadReport(type)}>{data ? 'Refresh Report' : 'Load Report'}</button>
      </div>

      {message && <p className="info">{message}</p>}
      {!data ? <div className="loader">Loading reports...</div> : <>
        <EmployeeGraph title={`${itemLabel} Employee Completion Graph`} data={employees} />

        <div className="grid2">
          <BarChart title={`Department-wise ${completedLabel} ${itemLabel}s`} data={departmentData.map(d => ({ label: d.department, value: d.completed }))} />
          <BarChart title="Department-wise Overdue" data={departmentData.map(d => ({ label: d.department, value: d.overdue }))} />
        </div>

        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Role</th>
                <th>Department</th>
                <th>Total {itemLabel}s</th>
                <th>{completedLabel}</th>
                <th>Pending</th>
                <th>Delayed</th>
                <th>Workload</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {reportPagination.pageItems.map(e => (
                <tr key={e._id}>
                  <td>{e.name}</td>
                  <td>{e.role}</td>
                  <td>{e.department}</td>
                  <td>{e.total}</td>
                  <td>{e.completed}</td>
                  <td>{e.pending}</td>
                  <td>{e.delayed}</td>
                  <td>{e.workload}</td>
                  <td>{e.productivityScore}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination {...reportPagination} />
        </div>
      </>}
    </section>
  );
}

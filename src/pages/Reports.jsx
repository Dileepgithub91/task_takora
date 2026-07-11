import React, { useEffect, useMemo, useState } from 'react';
import { api, download } from '../api/client.js';
import { BarChart, EmployeeGraph } from '../components/Charts.jsx';
import Pagination, { usePagination } from '../components/Pagination.jsx';

export default function Reports() {
  const [type, setType] = useState('task');
  const [data, setData] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setData(null);
    setMessage('');
    api(`/reports/dashboard?type=${type}`).then(setData).catch(error => setMessage(error.message));
  }, [type]);

  const employees = useMemo(() => data?.employeePerformance || [], [data]);
  const reportPagination = usePagination(employees, {
    initialPageSize: 10,
    resetKey: `${type}-${employees.length}`,
    pageSizeOptions: [10, 20, 50, 100]
  });

  const itemLabel = type === 'ticket' ? 'Ticket' : 'Task';
  const completedLabel = type === 'ticket' ? 'Resolved/Closed' : 'Completed';

  return (
    <section className="page">
      <div className="pageTitle">
        <div>
          <h2>Reports & Advanced Analytics</h2>
          <p>Default view is Task. Switch to Ticket to view ticket analytics.</p>
        </div>
        <div className="actions reportActions">
          <select value={type} onChange={e => setType(e.target.value)}>
            <option value="task">Task Reports</option>
            <option value="ticket">Ticket Reports</option>
          </select>
          <button onClick={() => download(`/reports/export?type=${type}&format=xlsx`, `takora-${type}-report.xlsx`)}>Export Excel</button>
          <button onClick={() => download(`/reports/export?type=${type}&format=pdf`, `takora-${type}-report.pdf`)}>Export PDF</button>
          <button onClick={() => download(`/reports/export?type=${type}&format=csv`, `takora-${type}-report.csv`)}>Export CSV</button>
        </div>
      </div>

      {message && <p className="info">{message}</p>}
      {!data ? <div className="loader">Loading reports...</div> : <>
        <EmployeeGraph data={data.employeePerformance || []} />

        <div className="grid2">
          <BarChart title={`Department-wise ${completedLabel} ${itemLabel}s`} data={(data.departmentPerformance || []).map(d => ({ label: d.department, value: d.completed }))} />
          <BarChart title="Department-wise Overdue" data={(data.departmentPerformance || []).map(d => ({ label: d.department, value: d.overdue }))} />
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

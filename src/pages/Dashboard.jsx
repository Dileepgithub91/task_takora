import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { BarChart, EmployeeGraph } from '../components/Charts.jsx';
import { useAuth } from '../context/AuthContext.jsx';

function cardListForRole(role, w, type) {
  const isTicket = type === 'ticket';

  const employeeCards = isTicket ? [
    ['Open Tickets', w.openTickets ?? w.totalTickets],
    ['Resolved Tickets', w.completedTickets],
    ['Pending Tickets', w.pendingTickets],
    ['Overdue Tickets', w.overdueTickets],
    ['Urgent Tickets', w.urgentTickets],
    ['Today Tickets', w.todayTickets]
  ] : [
    ['Open Tasks', w.openTasks ?? w.totalTasks],
    ['Completed Tasks', w.completedTasks],
    ['Pending Tasks', w.pendingTasks],
    ['Overdue Tasks', w.overdueTasks],
    ['Urgent Tasks', w.urgentTasks],
    ['Today Tasks', w.todayTasks],
    ['Open Tickets', w.openTickets]
  ];

  const adminCards = isTicket ? [
    ['Total Employees', w.totalEmployees],
    ['Active Users', w.activeEmployees],
    ['Inactive Users', w.inactiveEmployees],
    ['Departments', w.totalDepartments],
    ['Total Tickets', w.totalTickets],
    ['Open Tickets', w.openTickets],
    ['Resolved Tickets', w.completedTickets],
    ['Pending Tickets', w.pendingTickets],
    ['Overdue Tickets', w.overdueTickets],
    ['Urgent Tickets', w.urgentTickets],
    ['Today Tickets', w.todayTickets]
  ] : [
    ['Total Employees', w.totalEmployees],
    ['Active Users', w.activeEmployees],
    ['Inactive Users', w.inactiveEmployees],
    ['Departments', w.totalDepartments],
    ['Projects', w.totalProjects],
    ['Total Tasks', w.totalTasks],
    ['Completed Tasks', w.completedTasks],
    ['Pending Tasks', w.pendingTasks],
    ['Overdue Tasks', w.overdueTasks],
    ['Urgent Tasks', w.urgentTasks],
    ['Today Tasks', w.todayTasks],
    ['Open Tickets', w.openTickets]
  ];

  return role === 'employee' || role === 'support' ? employeeCards : adminCards;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [type, setType] = useState('task');
  const [data, setData] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setData(null);
    setMessage('');
    api(`/reports/dashboard?type=${type}`).then(setData).catch(error => setMessage(error.message));
  }, [type]);

  const cards = useMemo(() => data ? cardListForRole(user?.role, data.widgets, type) : [], [data, user?.role, type]);
  const isEmployee = ['employee', 'support'].includes(user?.role);
  const title = isEmployee ? `My ${type === 'ticket' ? 'Ticket' : 'Task'} Dashboard` : `Admin / Management ${type === 'ticket' ? 'Ticket' : 'Task'} Dashboard`;
  const subtitle = isEmployee ? `Your ${type === 'ticket' ? 'ticket' : 'task'} summary.` : `Filter dashboard by ${type === 'ticket' ? 'tickets' : 'tasks'}.`;
  const itemLabel = type === 'ticket' ? 'Ticket' : 'Task';

  return <section className="page">
    <div className="pageTitle">
      <div><h2>{title}</h2><p>{subtitle}</p></div>
      <div className="actions dashboardTypeFilter">
        <select value={type} onChange={e => setType(e.target.value)}>
          <option value="task">Task Dashboard</option>
          <option value="ticket">Ticket Dashboard</option>
        </select>
      </div>
    </div>

    {message && <p className="info">{message}</p>}
    {!data ? <div className="loader">Loading dashboard...</div> : <>
      <div className={`kpiGrid ${isEmployee ? 'employeeKpis' : ''}`}>{cards.map(([k,v]) => <div className="kpi" key={k}><span>{k}</span><strong>{v ?? 0}</strong></div>)}</div>
      <div className="grid2"><BarChart title={`${itemLabel} Status`} data={data.statusChart || []} /><BarChart title={`${itemLabel} Priority Analysis`} data={data.priorityChart || []} /></div>
      {!isEmployee && <EmployeeGraph data={data.employeePerformance || []} />}
      {isEmployee && <BarChart title={`My ${itemLabel} Completion Graph by Status`} data={data.statusChart || []} />}
      {!isEmployee && <div className="grid2"><BarChart title="Department Performance" data={(data.departmentPerformance || []).map(d => ({ label: d.department, value: d.completed }))} /><BarChart title="Overdue Trend" data={(data.overdueTrend || []).map(d => ({ label: d.date.slice(5), value: d.overdue }))} /></div>}
    </>}
  </section>;
}

import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { BarChart, EmployeeGraph } from '../components/Charts.jsx';
import { useAuth } from '../context/AuthContext.jsx';

function cardListForRole(role, w) {
  const employeeCards = [
    ['Open Tasks', w.openTasks ?? w.totalTasks],
    ['Completed Tasks', w.completedTasks],
    ['Pending Tasks', w.pendingTasks],
    ['Overdue Tasks', w.overdueTasks],
    ['Urgent Tasks', w.urgentTasks],
    ['Today Tasks', w.todayTasks],
    ['Open Tickets', w.openTickets]
  ];
  const adminCards = [
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
  const [data, setData] = useState(null);
  useEffect(() => { api('/reports/dashboard').then(setData).catch(console.error); }, []);
  const cards = useMemo(() => data ? cardListForRole(user?.role, data.widgets) : [], [data, user?.role]);
  if (!data) return <div className="loader">Loading dashboard...</div>;
  const isEmployee = ['employee', 'support'].includes(user?.role);
  const title = isEmployee ? 'My Task Dashboard' : 'Admin / Management Dashboard';
  const subtitle = isEmployee ? 'Your open, completed, pending, overdue, urgent and ticket summary.' : '';

  return <section className="page">
    <div className="pageTitle"><div><h2>{title}</h2><p>{subtitle}</p></div></div>
    <div className={`kpiGrid ${isEmployee ? 'employeeKpis' : ''}`}>{cards.map(([k,v]) => <div className="kpi" key={k}><span>{k}</span><strong>{v ?? 0}</strong></div>)}</div>
    <div className="grid2"><BarChart title="Task Status" data={data.statusChart} /><BarChart title="Priority Analysis" data={data.priorityChart} /></div>
    {!isEmployee && <EmployeeGraph data={data.employeePerformance} />}
    {isEmployee && <BarChart title="My Task Completion Graph by Status" data={data.statusChart} />}
    {!isEmployee && <div className="grid2"><BarChart title="Department Performance" data={data.departmentPerformance.map(d => ({ label: d.department, value: d.completed }))} /><BarChart title="Overdue Trend" data={data.overdueTrend.map(d => ({ label: d.date.slice(5), value: d.overdue }))} /></div>}
  </section>;
}

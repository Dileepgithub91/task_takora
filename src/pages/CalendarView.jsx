import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Pagination, { usePagination } from '../components/Pagination.jsx';

const statuses = ['todo', 'inProgress', 'review', 'completed', 'overdue'];
const pretty = value => String(value || '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const sortUsersAlpha = (list = []) =>
  [...list].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'en', { sensitivity: 'base' }));

const canSearchAllEmployees = role => ['admin', 'manager'].includes(role);

export default function CalendarView() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ assignedTo: '', status: '', from: '', to: '', search: '' });
  const [msg, setMsg] = useState('');
  const showEmployeeSearch = canSearchAllEmployees(user?.role);

  async function load() {
    setMsg('');
    const cleanFilters = { ...filters };
    if (!showEmployeeSearch) delete cleanFilters.assignedTo;
    const params = new URLSearchParams(Object.entries(cleanFilters).filter(([, v]) => v));
    const eventRes = await api(`/tasks/calendar?${params}`);
    setEvents(eventRes.events || []);
    if (showEmployeeSearch) {
      const userRes = await api('/users');
      setUsers(sortUsersAlpha(userRes.users || []));
    } else {
      setUsers([]);
    }
  }

  useEffect(() => { load().catch(e => setMsg(e.message)); }, [user?.role]);

  const grouped = useMemo(() => events.reduce((a, e) => {
    const d = String(e.date).slice(0, 10);
    (a[d] ||= []).push(e);
    return a;
  }, {}), [events]);

  const dayGroups = useMemo(
    () => Object.entries(grouped).sort(([a], [b]) => new Date(b) - new Date(a)),
    [grouped]
  );
  const calendarPagination = usePagination(dayGroups, {
    initialPageSize: 6,
    resetKey: `${filters.search}|${filters.assignedTo}|${filters.status}|${filters.from}|${filters.to}`,
    pageSizeOptions: [6, 12, 24, 48]
  });
  const paginatedDayGroups = calendarPagination.pageItems;

  return <section className="page">
    <div className="pageTitle"><div><h2>Calendar View</h2><p>{showEmployeeSearch ? '' : 'Your Own Task Calendar By Status And Date Range.'}</p></div></div>
    {msg && <p className="info">{msg}</p>}
    <div className="filters card calendarFilters">
      <input placeholder="Search Task" value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} />
      {showEmployeeSearch && <select value={filters.assignedTo} onChange={e => setFilters({ ...filters, assignedTo: e.target.value })}>
        <option value="">All Employees</option>{users.map(u => <option key={u._id} value={u._id}>{u.name} - {pretty(u.role)}</option>)}
      </select>}
      <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
        <option value="">All Status</option>{statuses.map(s => <option key={s} value={s}>{pretty(s)}</option>)}
      </select>
      <input type="date" value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value })} />
      <input type="date" value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value })} />
      <button className="primary" onClick={load}>Search</button>
    </div>
    <div className="calendarGrid">{paginatedDayGroups.map(([date, items]) => <div className="dayCard" key={date}><h3>{date}</h3>{items.map(e => <div className={`taskMini ${e.status === 'overdue' ? 'taskOverdue' : ''}`} key={e.id}><b>{e.title}</b><small>{showEmployeeSearch ? `${e.assignedTo} • ${pretty(e.role || '')}` : 'My Task'}</small><span className={`pill ${e.status}`}>{pretty(e.status)}</span><span className={`pill ${e.priority}`}>{pretty(e.priority)}</span></div>)}</div>)}</div>
    <Pagination {...calendarPagination} />
    {events.length === 0 && <div className="card emptyState">No Tasks Found For Selected Calendar Filter.</div>}
  </section>;
}

import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Pagination, { usePagination } from '../components/Pagination.jsx';

const taskStatuses = ['todo', 'inProgress', 'review', 'completed', 'overdue'];
const ticketStatuses = ['open', 'inProgress', 'waiting', 'resolved', 'closed', 'escalated', 'rejected'];
const pretty = value => String(value || '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const sortUsersAlpha = (list = []) =>
  [...list].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'en', { sensitivity: 'base' }));
const canSearchAllEmployees = role => ['admin', 'manager'].includes(role);

export default function CalendarView() {
  const { user } = useAuth();
  const [type, setType] = useState('task'); // default calendar filter is Task
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ assignedTo: '', status: '', from: '', to: '', search: '' });
  const [msg, setMsg] = useState('');
  const showEmployeeSearch = canSearchAllEmployees(user?.role);
  const statusOptions = type === 'ticket' ? ticketStatuses : taskStatuses;

  async function load() {
    setMsg('');
    const cleanFilters = { ...filters };
    if (!showEmployeeSearch) delete cleanFilters.assignedTo;
    const params = new URLSearchParams(Object.entries(cleanFilters).filter(([, v]) => v));
    const eventRes = await api(`/${type === 'ticket' ? 'tickets' : 'tasks'}/calendar?${params}`);
    setEvents(eventRes.events || []);
    if (showEmployeeSearch) {
      const userRes = await api('/users');
      setUsers(sortUsersAlpha(userRes.users || []));
    } else {
      setUsers([]);
    }
  }

  useEffect(() => { load().catch(e => setMsg(e.message)); }, [user?.role, type]);

  const grouped = useMemo(() => events.reduce((a, e) => {
    const d = String(e.date || e.createdAt || new Date()).slice(0, 10);
    (a[d] ||= []).push(e);
    return a;
  }, {}), [events]);

  const dayGroups = useMemo(
    () => Object.entries(grouped).sort(([a], [b]) => new Date(b) - new Date(a)),
    [grouped]
  );
  const calendarPagination = usePagination(dayGroups, {
    initialPageSize: 5,
    resetKey: `${type}|${filters.search}|${filters.assignedTo}|${filters.status}|${filters.from}|${filters.to}`,
    pageSizeOptions: [5, 10, 15, 20]
  });
  const paginatedDayGroups = calendarPagination.pageItems;
  const itemLabel = type === 'ticket' ? 'Ticket' : 'Task';

  return <section className="page">
    <div className="pageTitle"><div><h2>Calendar View</h2><p>Default view is Task Calendar. Use the first filter to switch between Task and Ticket calendar.</p></div></div>
    {msg && <p className="info">{msg}</p>}
    <div className="filters card calendarFilters">
      <select aria-label="Calendar type" value={type} onChange={e => { setType(e.target.value); setFilters({ assignedTo: '', status: '', from: '', to: '', search: '' }); }}>
        <option value="task">Task Calendar</option>
        <option value="ticket">Ticket Calendar</option>
      </select>
      <input placeholder={`Search ${itemLabel}`} value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} />
      {showEmployeeSearch && <select value={filters.assignedTo} onChange={e => setFilters({ ...filters, assignedTo: e.target.value })}>
        <option value="">All Employees</option>{users.map(u => <option key={u._id} value={u._id}>{u.name} - {pretty(u.role)}</option>)}
      </select>}
      <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
        <option value="">All Status</option>{statusOptions.map(s => <option key={s} value={s}>{pretty(s)}</option>)}
      </select>
      <input type="date" value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value })} />
      <input type="date" value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value })} />
      <button className="primary" onClick={load}>Search</button>
    </div>
    <Pagination {...calendarPagination} />
    <div className="calendarGrid">{paginatedDayGroups.map(([date, items]) => <div className="dayCard" key={date}><h3>{date}</h3>{items.map(e => <div className={`taskMini ${e.status === 'overdue' ? 'taskOverdue' : ''}`} key={e.id}><b>{e.title}</b><small>{showEmployeeSearch ? `${e.assignedTo || '—'} • ${pretty(e.role || '')}` : `My ${itemLabel}`}</small><span className={`pill ${e.status}`}>{pretty(e.status)}</span><span className={`pill ${e.priority}`}>{pretty(e.priority)}</span>{e.ticketNo && <small>{e.ticketNo}</small>}</div>)}</div>)}</div>
    <Pagination {...calendarPagination} />
    {events.length === 0 && <div className="card emptyState">No {itemLabel}s Found For Selected Calendar Filter.</div>}
  </section>;
}

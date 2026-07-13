import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Pagination, { usePagination } from '../components/Pagination.jsx';
import SearchableSelect from '../components/SearchableSelect.jsx';

const taskStatuses = ['todo', 'inProgress', 'review', 'completed', 'overdue'];
const ticketStatuses = ['open', 'inProgress', 'waiting', 'resolved', 'closed', 'escalated', 'rejected'];
const calendarTypes = [{ value: 'task', label: 'Task Calendar' }, { value: 'ticket', label: 'Ticket Calendar' }];
const pretty = value => String(value || '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const sortUsersAlpha = (list = []) =>
  [...list].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'en', { sensitivity: 'base' }));
const canSearchAllEmployees = role => ['admin', 'manager'].includes(role);
const option = (value, label = pretty(value), subLabel = '') => ({ value, label, subLabel });
const userOption = u => ({ value: u._id, label: u.name || 'Unnamed User', subLabel: `${pretty(u.role)} • ${u.department || 'No Department'}${u.email ? ` • ${u.email}` : ''}` });

export default function CalendarView() {
  const { user } = useAuth();
  const [type, setType] = useState('task');
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ assignedTo: '', employeeSearch: '', status: '', from: '', to: '', search: '' });
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const showEmployeeSearch = canSearchAllEmployees(user?.role);
  const statusOptions = useMemo(() => [option('', 'All Status'), ...(type === 'ticket' ? ticketStatuses : taskStatuses).map(s => option(s))], [type]);
  const employeeOptions = useMemo(() => [option('', 'All Employees'), ...sortUsersAlpha(users).map(userOption)], [users]);

  async function loadUsers() {
    if (!showEmployeeSearch) return setUsers([]);
    const userRes = await api('/users/assignable');
    setUsers(sortUsersAlpha(userRes.users || []));
  }

  async function loadEvents() {
    setMsg('');
    const cleanFilters = { ...filters };
    delete cleanFilters.employeeSearch;
    if (!showEmployeeSearch) delete cleanFilters.assignedTo;
    const params = new URLSearchParams(Object.entries(cleanFilters).filter(([, v]) => v));
    const eventRes = await api(`/${type === 'ticket' ? 'tickets' : 'tasks'}/calendar?${params}`);
    setEvents(eventRes.events || []);
  }

  useEffect(() => {
    loadUsers().catch(e => setMsg(e.message));
  }, [user?.role]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      loadEvents().catch(e => setMsg(e.message)).finally(() => setLoading(false));
    }, 100);
    return () => clearTimeout(timer);
  }, [user?.role, type, filters.search, filters.assignedTo, filters.employeeSearch, filters.status, filters.from, filters.to]);

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
    resetKey: `${type}|${filters.search}|${filters.assignedTo}|${filters.employeeSearch}|${filters.status}|${filters.from}|${filters.to}`,
    pageSizeOptions: [5, 10, 15, 20]
  });
  const paginatedDayGroups = calendarPagination.pageItems;
  const itemLabel = type === 'ticket' ? 'Ticket' : 'Task';

  return <section className="page">
    <div className="pageTitle"><div><h2>Calendar View</h2><p>Default view is Task Calendar. Use filter to switch Task and Ticket calendar.</p></div></div>
    {msg && <p className="info">{msg}</p>}
    <div className="filters card calendarFilters smartFilters">
      <SearchableSelect placeholder="Task Calendar" value={type} options={calendarTypes} onChange={value => { setType(value || 'task'); setFilters({ assignedTo: '', employeeSearch: '', status: '', from: '', to: '', search: '' }); }} />
      <input placeholder={`Search ${itemLabel}`} value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} />
      {showEmployeeSearch && <SearchableSelect placeholder="Type Employee Name" value={filters.assignedTo} options={employeeOptions} onTextChange={text => setFilters(previous => ({ ...previous, employeeSearch: text, assignedTo: '' }))} onChange={(value, opt) => setFilters({ ...filters, assignedTo: value, employeeSearch: value ? (opt?.label || '') : '' })} />}
      <SearchableSelect placeholder="All Status" value={filters.status} options={statusOptions} onChange={value => setFilters({ ...filters, status: value })} />
      <input type="date" value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value })} title="From Date" />
      <input type="date" value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value })} title="To Date" />
      <button className="primary filterBtn" type="button" onClick={loadEvents}>{loading ? 'Loading...' : 'Apply Filter'}</button>
    </div>
    <Pagination {...calendarPagination} />
    <div className="calendarGrid">{paginatedDayGroups.map(([date, items]) => <div className="dayCard" key={date}><h3>{date}</h3>{items.map(e => <div className={`taskMini ${e.status === 'overdue' ? 'taskOverdue' : ''}`} key={e.id}><b>{e.title}</b><small>{showEmployeeSearch ? `${e.assignedTo || '—'} • ${pretty(e.role || '')}` : `My ${itemLabel}`}</small><span className={`pill ${e.status}`}>{pretty(e.status)}</span><span className={`pill ${e.priority}`}>{pretty(e.priority)}</span>{e.ticketNo && <small>{e.ticketNo}</small>}</div>)}</div>)}</div>
    <Pagination {...calendarPagination} />
    {events.length === 0 && <div className="card emptyState">No {itemLabel}s Found For Selected Calendar Filter.</div>}
  </section>;
}

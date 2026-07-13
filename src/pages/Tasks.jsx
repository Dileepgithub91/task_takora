import React, { useEffect, useMemo, useState } from 'react';
import { api, download } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Pagination, { byCreatedDesc, usePagination } from '../components/Pagination.jsx';
import SearchableSelect from '../components/SearchableSelect.jsx';

const emptyForm = { title: '', description: '', assignedTo: '', priority: '', department: '', category: '', status: '' };
const columns = ['todo', 'inProgress', 'review', 'completed', 'overdue'];
const priorities = ['urgent', 'high', 'medium', 'low'];
const extraHours = [1, 2, 4, 6, 8];
const canSeeManagementActions = role => ['admin', 'manager', 'teamLead'].includes(role);
const isClosed = task => ['adminApproved', 'managerApproved'].includes(task.approvalStatus) || ['cancelled'].includes(task.status);
const canSubmit = task => !isClosed(task) && task.status === 'completed' && task.approvalStatus !== 'submitted';
const slaMap = { urgent: '1 Official Hour', high: '2 Official Hours', medium: '4 Official Hours', low: '6 Official Hours' };
const pretty = value => String(value || '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const formatDateTime = value => value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }) : '—';
const sortUsersAlpha = (list = []) => [...list].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'en', { sensitivity: 'base' }));
const userOption = u => ({ value: u._id, label: u.name || 'Unnamed User', subLabel: `${pretty(u.role)} • ${u.department || 'No Department'}${u.email ? ` • ${u.email}` : ''}` });
const option = (value, label = pretty(value), subLabel = '') => ({ value, label, subLabel });

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ status: '', priority: '', assignedTo: '', employeeSearch: '', search: '', createdFrom: '', createdTo: '' });
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [commentText, setCommentText] = useState({});
  const [extension, setExtension] = useState({});
  const [message, setMessage] = useState('');
  const [view, setView] = useState('table');
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const managementRole = canSeeManagementActions(user?.role);
  const canSearchEmployees = ['admin', 'manager'].includes(user?.role);

  const userOptions = useMemo(() => sortUsersAlpha(users).map(userOption), [users]);
  const filterUserOptions = useMemo(() => [option('', 'All Employees'), ...userOptions], [userOptions]);
  const statusOptions = useMemo(() => [option('', 'All Status'), ...columns.map(c => option(c))], []);
  const formStatusOptions = useMemo(() => columns.map(c => option(c)), []);
  const priorityOptions = useMemo(() => [option('', 'All Priority'), ...priorities.map(p => option(p, pretty(p), slaMap[p]))], []);
  const formPriorityOptions = useMemo(() => priorities.map(p => option(p, pretty(p), slaMap[p])), []);
  const departmentOptions = useMemo(() => {
    const values = [...new Set(users.map(u => u.department).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    return values.map(v => option(v, v));
  }, [users]);

  async function loadUsers() {
    const res = await api('/users/assignable');
    setUsers(sortUsersAlpha(res.users || []));
  }

  async function loadTasks() {
    const params = new URLSearchParams(
      Object.entries({ ...filters, limit: 200 }).filter(([, v]) => v)
    );
    const res = await api(`/tasks?${params}`);
    setTasks(res.tasks || []);
  }

  useEffect(() => {
    loadUsers().catch(err => setMessage(err.message));
  }, [user?.role]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      loadTasks().catch(err => setMessage(err.message)).finally(() => setLoading(false));
    }, 140);
    return () => clearTimeout(timer);
  }, [user?.role, filters.status, filters.priority, filters.assignedTo, filters.employeeSearch, filters.search, filters.createdFrom, filters.createdTo]);

  async function reload() { await loadTasks(); }

  function openEdit(task) {
    setEditing(task._id);
    setForm({
      title: task.title || '',
      description: task.description || '',
      assignedTo: task.assignedTo?._id || '',
      priority: task.priority || '',
      department: task.department || '',
      category: task.category || '',
      status: task.status || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function save(e) {
    e.preventDefault();
    setMessage('');
    try {
      setSaving(true);
      const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== '' && v !== null && v !== undefined));
      let res;
      if (editing) {
        res = await api(`/tasks/${editing}`, { method: 'PUT', body: JSON.stringify(payload) });
        if (res.task) setTasks(previous => previous.map(item => item._id === editing ? res.task : item).sort(byCreatedDesc));
      } else {
        res = await api('/tasks', { method: 'POST', body: JSON.stringify(payload) });
        if (res.task) setTasks(previous => [res.task, ...previous].sort(byCreatedDesc));
      }
      setForm(emptyForm);
      setEditing(null);
      setMessage(editing ? 'Task Updated Successfully' : 'Task Created With Official SLA');
    } catch (err) { setMessage(err.message); }
    finally { setSaving(false); }
  }

  async function remove(id) {
    if (!managementRole) return;
    if (confirm('Delete This Task?')) {
      await api(`/tasks/${id}`, { method: 'DELETE' });
      setTasks(previous => previous.filter(item => item._id !== id));
    }
  }

  async function updateStatus(id, s) {
    try {
      const res = await api(`/tasks/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: s }) });
      if (res.task) setTasks(previous => previous.map(item => item._id === id ? res.task : item).sort(byCreatedDesc));
      else await reload();
      setMessage(s === 'inProgress' ? 'Task Started And Timer Auto Started' : 'Task Status Updated');
    } catch (err) { setMessage(err.message); }
  }

  async function approve(id) { await api(`/tasks/${id}/approve`, { method: 'POST', body: JSON.stringify({ qualityScore: 95 }) }); await reload(); setMessage('Task Approved And Closed'); }
  async function reject(id) { const reason = prompt('Reason For Rejection?') || 'Rejected'; await api(`/tasks/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }); await reload(); setMessage('Task Rejected'); }
  async function submit(id) { await api(`/tasks/${id}/submit`, { method: 'POST' }); await reload(); setMessage('Task Submitted For Admin/Manager Approval'); }

  async function requestExt(id) {
    const item = extension[id] || {};
    if (!item.requestedHours) return setExtension({ ...extension, [id]: { ...item, open: true, error: 'Select Extra Official Hours' } });
    try {
      await api(`/tasks/${id}/extension`, { method: 'POST', body: JSON.stringify({ requestedHours: Number(item.requestedHours), reason: item.reason || 'Need More Time' }) });
      setExtension({ ...extension, [id]: { open: false, requestedHours: '', reason: '' } });
      await reload();
      setMessage('Extension Request Sent To Admin/Manager Bell Notification');
    } catch (err) { setMessage(err.message); }
  }

  async function resolveExtension(taskId, requestId, decision) {
    try {
      await api(`/tasks/${taskId}/extension/${requestId}`, { method: 'PATCH', body: JSON.stringify({ status: decision }) });
      await reload();
      setMessage(`Extension Request ${pretty(decision)}`);
    } catch (err) { setMessage(err.message); }
  }

  async function comment(id) {
    const msg = commentText[id];
    if (!msg?.trim()) return;
    try {
      await api(`/tasks/${id}/comments`, { method: 'POST', body: JSON.stringify({ message: msg.trim() }) });
      setCommentText({ ...commentText, [id]: '' });
      await reload();
    } catch (err) { setMessage(err.message); }
  }

  async function uploadFile(id, file) {
    const fd = new FormData();
    fd.append('files', file);
    await api(`/tasks/${id}/attachments`, { method: 'POST', body: fd });
    await reload();
  }

  async function openAttachment(file) {
    try {
      let url = file.downloadUrl || file.path;
      if (!url && file.fileKey) {
        const data = await api(`/files/signed-url?key=${encodeURIComponent(file.fileKey)}`);
        url = data.url;
      }
      if (!url) return setMessage('File URL not found. Re-upload this old file to S3.');
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) { setMessage(err.message || 'Unable to open file'); }
  }

  async function bulkImport(file) {
    if (!file) return;
    setImporting(true);
    setMessage('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api('/tasks/bulk', { method: 'POST', body: fd });
      await reload();
      setMessage(`Imported ${res.count || 0} Tasks. Skipped ${res.skippedCount || 0}.`);
    } catch (err) { setMessage(err.message); }
    finally { setImporting(false); }
  }

  const sortedTasks = useMemo(() => [...tasks].sort(byCreatedDesc), [tasks]);
  const taskPagination = usePagination(sortedTasks, {
    initialPageSize: 10,
    resetKey: `${filters.search}|${filters.status}|${filters.priority}|${filters.assignedTo}|${filters.employeeSearch}|${filters.createdFrom}|${filters.createdTo}|${view}`
  });
  const paginatedTasks = taskPagination.pageItems;
  const grouped = useMemo(() => columns.map(c => ({ c, items: sortedTasks.filter(t => t.status === c) })), [sortedTasks]);

  function renderComments(t) {
    const comments = t.comments || [];
    return <div className="commentList">{comments.map(c => <p className="commentItem" key={c._id}>{c.message}</p>)}</div>;
  }

  function renderTaskFiles(t) {
    const files = t.attachments || [];
    if (!files.length) return null;
    return <div className="commentList">{files.map(file => (
      <button type="button" className="commentItem" key={file._id || file.fileKey || file.filename} onClick={() => openAttachment(file)}>
        📎 {file.originalName || file.filename || 'Open File'}
      </button>
    ))}</div>;
  }

  function renderExtensions(t) {
    const pending = (t.extensionRequests || []).filter(r => r.status === 'pending');
    if (!managementRole || pending.length === 0) return null;
    return <div className="extensionList"><b>Pending Extension Requests</b>{pending.map(req => <div className="extensionItem" key={req._id}><p>{req.requestedBy?.name || 'Employee'} Requested {req.requestedHours || ''} Extra Official Hour(s)</p><small>{req.reason}</small><div className="actions"><button onClick={() => resolveExtension(t._id, req._id, 'approved')}>Approve</button><button onClick={() => resolveExtension(t._id, req._id, 'rejected')}>Reject</button></div></div>)}</div>;
  }

  function renderTaskActions(t) {
    const closed = isClosed(t);
    return <td className="actions taskActions">
      {!closed && <button onClick={() => openEdit(t)}>Edit Task</button>}
      {managementRole && <><button onClick={() => remove(t._id)}>Delete</button>{canSubmit(t) && <button onClick={() => submit(t._id)}>Submit</button>}{t.approvalStatus === 'submitted' && <><button onClick={() => approve(t._id)}>Approve</button><button onClick={() => reject(t._id)}>Reject</button></>}<input type="file" onChange={e => e.target.files[0] && uploadFile(t._id, e.target.files[0])} /></>}
      {!managementRole && canSubmit(t) && <button onClick={() => submit(t._id)}>Submit For Approval</button>}
      {!closed && <button onClick={() => setExtension({ ...extension, [t._id]: { ...(extension[t._id] || {}), open: !extension[t._id]?.open } })}>Extend Request</button>}
      {extension[t._id]?.open && <div className="extensionBox"><SearchableSelect value={extension[t._id]?.requestedHours || ''} placeholder="Extra Official Hours" options={[option('', 'Extra Official Hours'), ...extraHours.map(h => option(h, `${h} Hour${h === 1 ? '' : 's'}`))]} onChange={value => setExtension({ ...extension, [t._id]: { ...(extension[t._id] || {}), requestedHours: value } })} /><input placeholder="Reason" value={extension[t._id]?.reason || ''} onChange={e => setExtension({ ...extension, [t._id]: { ...(extension[t._id] || {}), reason: e.target.value } })} /><button onClick={() => requestExt(t._id)}>Send Request</button>{extension[t._id]?.error && <small className="errorMini">{extension[t._id].error}</small>}</div>}
      {renderExtensions(t)}
      {renderTaskFiles(t)}
      <div className="commentBox"><input placeholder="Comment" value={commentText[t._id] || ''} onChange={e => setCommentText({ ...commentText, [t._id]: e.target.value })} /><button onClick={() => comment(t._id)}>Comment</button></div>
      {renderComments(t)}
    </td>;
  }

  function employeeCell(t) {
    const assigned = t.assignedTo || {};
    return <td className="employeeCell">
      <div className="employeeName">{assigned.name || '—'}</div>
      {assigned.role && <div className="employeeRole">{pretty(assigned.role)}</div>}
      {assigned.department && <div className="employeeDept">{assigned.department}</div>}
    </td>;
  }

  function statusCell(t) {
    return <td className="statusCell">
      <SearchableSelect
        className={`statusSearch status-${t.status || 'todo'}`}
        value={t.status || ''}
        disabled={isClosed(t)}
        placeholder="Status"
        options={formStatusOptions}
        onChange={value => value && updateStatus(t._id, value)}
      />
      {isClosed(t) && <small className="muted">Closed After Approval</small>}
    </td>;
  }

  function rowClass(t) {
    return `taskRow ${t.status === 'overdue' ? 'taskOverdue' : ''} ${isClosed(t) ? 'taskClosed' : ''} priority-${t.priority}`;
  }

  return <section className="page">
    <div className="pageTitle"><div><h2>Task Assignment</h2></div><button className="secondary" onClick={() => setView(view === 'table' ? 'kanban' : 'table')}>{view === 'table' ? 'Kanban Board' : 'Table View'}</button></div>
    {message && <p className="info">{message}</p>}
    <div className="importPanel card"><div><h3>Import Previous Tasks From Excel</h3></div><div className="actions"><button className="secondary" onClick={() => download('/tasks/import-template', 'takora-task-import-template.xlsx')}>Download Template</button><label className="fileButton">{importing ? 'Importing...' : 'Upload Excel'}<input type="file" accept=".xlsx,.xls,.csv" onChange={e => bulkImport(e.target.files?.[0])} disabled={importing} /></label></div></div>

    <form className="formGrid card taskComposer" onSubmit={save}>
      <input placeholder="Task Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
      <SearchableSelect placeholder="Assign To Employee / Team Lead / Manager / Admin" value={form.assignedTo} options={userOptions} onChange={value => setForm({ ...form, assignedTo: value })} required />
      <SearchableSelect placeholder="Select Priority SLA" value={form.priority} options={formPriorityOptions} onChange={value => setForm({ ...form, priority: value })} required />
      <SearchableSelect placeholder="Status" value={form.status} options={formStatusOptions} onChange={value => setForm({ ...form, status: value })} />
      <SearchableSelect placeholder="Department" value={form.department} options={departmentOptions} onTextChange={text => setForm(previous => ({ ...previous, department: text }))} onChange={value => setForm({ ...form, department: value })} />
      <input placeholder="Category / SLA Type" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
      <textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
      <button className="primary" disabled={saving}>{saving ? 'Saving...' : (editing ? 'Update Task' : 'Create Task')}</button>{editing && <button type="button" className="secondary" onClick={() => { setEditing(null); setForm(emptyForm); }}>Cancel</button>}
    </form>

    <div className="filters card taskFilters smartFilters">
      <input placeholder="Search Task" value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} />
      <SearchableSelect placeholder="All Status" value={filters.status} options={statusOptions} onChange={value => setFilters({ ...filters, status: value })} />
      <SearchableSelect placeholder="All Priority" value={filters.priority} options={priorityOptions} onChange={value => setFilters({ ...filters, priority: value })} />
      {canSearchEmployees && <SearchableSelect placeholder="Type Employee Name" value={filters.assignedTo} options={filterUserOptions} onTextChange={text => setFilters(previous => ({ ...previous, employeeSearch: text, assignedTo: '' }))} onChange={(value, opt) => setFilters({ ...filters, assignedTo: value, employeeSearch: value ? (opt?.label || '') : '' })} />}
      <input type="date" value={filters.createdFrom} onChange={e => setFilters({ ...filters, createdFrom: e.target.value })} title="Created From" />
      <input type="date" value={filters.createdTo} onChange={e => setFilters({ ...filters, createdTo: e.target.value })} title="Created To" />
      <button type="button" className="primary filterBtn" onClick={reload}>{loading ? 'Loading...' : 'Apply Filter'}</button>
    </div>

    {view === 'kanban' ? <div className="kanban">{grouped.map(g => <div className="kanCol" key={g.c}><h3>{pretty(g.c)}</h3>{g.items.map(t => <article className={`taskMini ${t.status === 'overdue' ? 'taskOverdue' : ''}`} key={t._id}><b>{t.title}</b><small>{t.assignedTo?.name || '—'} • Due {formatDateTime(t.dueDate)}</small><span className={`pill ${t.priority}`}>{pretty(t.priority)} / {slaMap[t.priority]}</span><SearchableSelect className={`statusSearch status-${t.status || 'todo'}`} value={t.status} disabled={isClosed(t)} options={formStatusOptions} onChange={value => value && updateStatus(t._id, value)} />{!isClosed(t) && <button onClick={() => openEdit(t)}>Edit Task</button>}{canSubmit(t) && <button onClick={() => submit(t._id)}>Submit</button>}{renderExtensions(t)}{renderTaskFiles(t)}{renderComments(t)}</article>)}</div>)}</div> :
      <div className="tableWrap"><table><thead><tr><th>Task</th><th>Created Date & Time</th><th>Assigned Employee</th><th>Status</th><th>Priority SLA</th><th>Official Due</th><th>Approval</th><th>Actions</th></tr></thead><tbody>{paginatedTasks.map(t => <tr className={rowClass(t)} key={t._id}><td><b>{t.title}</b><p>{t.description}</p><small>{t.department} • {t.category}</small></td><td>{formatDateTime(t.createdAt)}</td>{employeeCell(t)}{statusCell(t)}<td><span className={`pill ${t.priority}`}>{pretty(t.priority)} • {slaMap[t.priority]}</span></td><td>{formatDateTime(t.dueDate)}</td><td>{pretty(t.approvalStatus)}</td>{renderTaskActions(t)}</tr>)}</tbody></table><Pagination {...taskPagination} /></div>}
  </section>;
}

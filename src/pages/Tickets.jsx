import React, { useEffect, useMemo, useState } from 'react';
import { api, download } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Pagination, { byCreatedDesc, usePagination } from '../components/Pagination.jsx';
import SearchableSelect from '../components/SearchableSelect.jsx';

const blank = {
  title: '',
  description: '',
  source: '',
  category: '',
  priority: '',
  status: '',
  requesterName: '',
  requesterEmail: '',
  requesterPhone: '',
  assignedTo: '',
  department: ''
};

const ticketStatuses = ['open', 'inProgress', 'waiting', 'resolved', 'closed', 'escalated', 'rejected'];
const closedTicketStatuses = ['closed', 'rejected'];
const extraHours = [1, 2, 4, 6, 8];
const slaMap = { urgent: '1 Official Hour', high: '2 Official Hours', medium: '4 Official Hours', low: '6 Official Hours' };
const sourceOptions = ['customer', 'vendor', 'support', 'internal'];
const categoryOptions = ['websiteBug', 'customerComplaint', 'vendorIssue', 'employeeRequest', 'orderIssue', 'paymentIssue', 'other'];
const priorityOptions = ['low', 'medium', 'high', 'urgent'];
const canSeeManagementActions = role => ['admin', 'manager', 'teamLead'].includes(role);
const pretty = value => String(value || '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const sortUsersAlpha = (list = []) => [...list].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'en', { sensitivity: 'base' }));
const option = (value, label = pretty(value), subLabel = '') => ({ value, label, subLabel });
const userOption = u => ({ value: u._id, label: u.name || 'Unnamed User', subLabel: `${pretty(u.role)} • ${u.department || 'No Department'}${u.email ? ` • ${u.email}` : ''}` });
const safe = value => value || '—';
const formatDate = value => value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }) : '—';
const ticketApprovalLabel = ticket => pretty(ticket.approvalStatus || 'notSubmitted');
const isTicketClosed = ticket => closedTicketStatuses.includes(ticket.status) || ['approved', 'managerApproved', 'adminApproved'].includes(ticket.approvalStatus);
const canSubmitTicket = ticket => !isTicketClosed(ticket) && ticket.status === 'resolved' && !['submitted', 'pending', 'adminApproved', 'managerApproved', 'approved'].includes(ticket.approvalStatus);
const isTicketOverdue = ticket => ticket?.slaDueDate && !isTicketClosed(ticket) && new Date(ticket.slaDueDate).getTime() < Date.now();
const ticketRowClass = ticket => ['taskRow', `priority-${ticket.priority || 'low'}`, isTicketOverdue(ticket) ? 'taskOverdue' : '', isTicketClosed(ticket) ? 'taskClosed' : ''].filter(Boolean).join(' ');

function DetailRow({ label, value }) {
  return <div className="detailRow"><span>{label}</span><strong>{safe(value)}</strong></div>;
}

export default function Tickets() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [viewTicket, setViewTicket] = useState(null);
  const [msg, setMsg] = useState('');
  const [filters, setFilters] = useState({ search: '', status: '', priority: '', source: '', assignedTo: '', employeeSearch: '', createdFrom: '', createdTo: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [commentText, setCommentText] = useState({});
  const [extension, setExtension] = useState({});
  const managementRole = canSeeManagementActions(user?.role);

  const userOptions = useMemo(() => sortUsersAlpha(users).map(userOption), [users]);
  const filterUserOptions = useMemo(() => [option('', 'All Employees'), ...userOptions], [userOptions]);
  const statusFilterOptions = useMemo(() => [option('', 'All Status'), ...ticketStatuses.map(item => option(item))], []);
  const statusFormOptions = useMemo(() => ticketStatuses.map(item => option(item)), []);
  const priorityFilterOptions = useMemo(() => [option('', 'All Priority'), ...priorityOptions.map(item => option(item, pretty(item), slaMap[item]))], []);
  const priorityFormOptions = useMemo(() => priorityOptions.map(item => option(item, pretty(item), slaMap[item])), []);
  const sourceFilterOptions = useMemo(() => [option('', 'All Source'), ...sourceOptions.map(item => option(item))], []);
  const sourceFormOptions = useMemo(() => sourceOptions.map(item => option(item)), []);
  const categoryFormOptions = useMemo(() => categoryOptions.map(item => option(item)), []);
  const departmentOptions = useMemo(() => {
    const values = [...new Set(users.map(u => u.department).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    return values.map(v => option(v, v));
  }, [users]);

  async function downloadTicketTemplate() {
    try {
      setMsg('');
      await download('/tickets/import-template', 'takora-ticket-import-template.xlsx');
    } catch (error) {
      setMsg(error.message || 'Unable to download ticket template. Please login again and try.');
    }
  }

  async function loadUsers() {
    const res = await api('/users/assignable');
    setUsers(sortUsersAlpha(res.users || []));
  }

  async function loadTickets() {
    const params = new URLSearchParams(Object.entries({ ...filters, limit: 200 }).filter(([, value]) => value));
    const ticketRes = await api(`/tickets?${params}`);
    setTickets(ticketRes.tickets || []);
  }

  useEffect(() => {
    loadUsers().catch(error => setMsg(error.message));
  }, [user?.role]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      loadTickets().catch(error => setMsg(error.message)).finally(() => setLoading(false));
    }, 140);
    return () => clearTimeout(timer);
  }, [filters.search, filters.status, filters.priority, filters.source, filters.assignedTo, filters.employeeSearch, filters.createdFrom, filters.createdTo]);

  async function reload() { await loadTickets(); }

  function edit(ticket) {
    if (isTicketClosed(ticket)) return setMsg('Closed/approved ticket cannot be edited.');
    setEditing(ticket._id);
    setViewTicket(null);
    setForm({ ...blank, ...ticket, assignedTo: ticket.assignedTo?._id || ticket.assignedTo || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function view(ticket) {
    try {
      const res = await api(`/tickets/${ticket._id}`);
      setViewTicket(res.ticket || ticket);
    } catch {
      setViewTicket(ticket);
    }
  }

  async function save(event) {
    event.preventDefault();
    setMsg('');
    try {
      const payload = Object.fromEntries(Object.entries(form).filter(([, value]) => value !== '' && value !== null && value !== undefined));
      setSaving(true);
      let res;
      if (editing) {
        res = await api(`/tickets/${editing}`, { method: 'PUT', body: JSON.stringify(payload) });
        if (res.ticket) setTickets(previous => previous.map(item => item._id === editing ? res.ticket : item).sort(byCreatedDesc));
      } else {
        res = await api('/tickets', { method: 'POST', body: JSON.stringify(payload) });
        if (res.ticket) setTickets(previous => [res.ticket, ...previous].sort(byCreatedDesc));
      }
      setForm(blank);
      setEditing(null);
      setMsg(editing ? 'Ticket Updated Successfully' : 'Ticket Raised Successfully With Official SLA');
    } catch (error) { setMsg(error.message); }
    finally { setSaving(false); }
  }

  async function del(ticket) {
    if (confirm('Delete Ticket?')) {
      await api(`/tickets/${ticket._id}`, { method: 'DELETE' });
      setViewTicket(null);
      setTickets(previous => previous.filter(item => item._id !== ticket._id));
    }
  }

  async function updateStatus(id, status) {
    try {
      const res = await api(`/tickets/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      if (res.ticket) setTickets(previous => previous.map(item => item._id === id ? res.ticket : item).sort(byCreatedDesc));
      else await reload();
      setMsg(status === 'resolved' ? 'Ticket Resolved. Submit For Admin/Manager Approval.' : 'Ticket Status Updated');
    } catch (error) { setMsg(error.message); }
  }

  async function submit(id) { try { await api(`/tickets/${id}/submit`, { method: 'POST' }); await reload(); setMsg('Ticket Submitted For Admin/Manager Approval'); } catch (error) { setMsg(error.message); } }
  async function approve(id) { try { await api(`/tickets/${id}/approve`, { method: 'POST', body: JSON.stringify({ comment: 'Approved' }) }); await reload(); setMsg('Ticket Approved And Closed'); } catch (error) { setMsg(error.message); } }
  async function reject(id) { try { const reason = prompt('Reason For Rejection?') || 'Rejected'; await api(`/tickets/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }); await reload(); setMsg('Ticket Rejected'); } catch (error) { setMsg(error.message); } }

  async function comment(id) {
    const message = commentText[id];
    if (!message?.trim()) return;
    try {
      await api(`/tickets/${id}/comments`, { method: 'POST', body: JSON.stringify({ message: message.trim() }) });
      setCommentText({ ...commentText, [id]: '' });
      await reload();
      setMsg('Ticket Comment Added');
    } catch (error) { setMsg(error.message); }
  }

  async function uploadFile(id, file) {
    try {
      const fd = new FormData();
      fd.append('files', file);
      await api(`/tickets/${id}/attachments`, { method: 'POST', body: fd });
      await reload();
      setMsg('Ticket File Uploaded');
    } catch (error) { setMsg(error.message); }
  }

  async function openAttachment(file) {
    try {
      let url = file.downloadUrl || file.path;
      if (!url && file.fileKey) {
        const data = await api(`/files/signed-url?key=${encodeURIComponent(file.fileKey)}`);
        url = data.url;
      }
      if (!url) return setMsg('File URL not found. Re-upload this old file to S3.');
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) { setMsg(error.message || 'Unable to open file'); }
  }

  async function bulkImport(file) {
    if (!file) return;
    setImporting(true);
    setMsg('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api('/tickets/bulk', { method: 'POST', body: fd });
      await reload();
      setMsg(`Imported ${res.count || 0} Tickets. Skipped ${res.skippedCount || 0}.`);
    } catch (error) { setMsg(error.message); }
    finally { setImporting(false); }
  }

  async function requestExt(id) {
    const item = extension[id] || {};
    if (!item.requestedHours) return setExtension({ ...extension, [id]: { ...item, open: true, error: 'Select Extra Official Hours' } });
    try {
      await api(`/tickets/${id}/extension`, { method: 'POST', body: JSON.stringify({ requestedHours: Number(item.requestedHours), reason: item.reason || 'Need More Time' }) });
      setExtension({ ...extension, [id]: { open: false, requestedHours: '', reason: '' } });
      await reload();
      setMsg('Ticket SLA Extension Request Sent');
    } catch (error) { setMsg(error.message); }
  }

  async function resolveExtension(ticketId, requestId, decision) {
    try {
      await api(`/tickets/${ticketId}/extension/${requestId}`, { method: 'PATCH', body: JSON.stringify({ status: decision }) });
      await reload();
      setMsg(`Ticket Extension Request ${pretty(decision)}`);
    } catch (error) { setMsg(error.message); }
  }

  const canDelete = ticket => user?.role === 'admin' || String(ticket.createdBy?._id || ticket.createdBy) === String(user?._id);
  const sortedTickets = useMemo(() => [...tickets].sort(byCreatedDesc), [tickets]);
  const ticketPagination = usePagination(sortedTickets, { initialPageSize: 10, resetKey: `${tickets.length}|${filters.search}|${filters.status}|${filters.priority}|${filters.source}|${filters.assignedTo}|${filters.employeeSearch}|${filters.createdFrom}|${filters.createdTo}` });
  const paginatedTickets = ticketPagination.pageItems;

  function renderComments(ticket) {
    const comments = ticket.comments || [];
    return <div className="commentList">{comments.map(comment => <p className="commentItem" key={comment._id}>{comment.message}</p>)}</div>;
  }

  function renderTicketFiles(ticket) {
    const files = ticket.attachments || [];
    if (!files.length) return null;
    return <div className="commentList">{files.map(file => (
      <button type="button" className="commentItem" key={file._id || file.fileKey || file.filename} onClick={() => openAttachment(file)}>📎 {file.originalName || file.filename || 'Open File'}</button>
    ))}</div>;
  }

  function renderExtensions(ticket) {
    const pending = (ticket.extensionRequests || []).filter(request => request.status === 'pending');
    if (!managementRole || pending.length === 0) return null;
    return <div className="extensionList"><b>Pending Extension Requests</b>{pending.map(request => <div className="extensionItem" key={request._id}><p>{request.requestedBy?.name || 'Employee'} Requested {request.requestedHours || ''} Extra Official Hour(s)</p><small>{request.reason}</small><div className="actions"><button type="button" onClick={() => resolveExtension(ticket._id, request._id, 'approved')}>Approve</button><button type="button" onClick={() => resolveExtension(ticket._id, request._id, 'rejected')}>Reject</button></div></div>)}</div>;
  }

  function statusCell(ticket) {
    return <td className="statusCell">
      <SearchableSelect className={`statusSearch status-${ticket.status || 'open'}`} value={ticket.status || 'open'} disabled={isTicketClosed(ticket)} placeholder="Status" options={statusFormOptions} onChange={value => value && updateStatus(ticket._id, value)} />
      {isTicketClosed(ticket) && <small className="muted">Closed After Approval</small>}
    </td>;
  }

  function renderTicketActions(ticket) {
    const closed = isTicketClosed(ticket);
    const submitted = ['submitted', 'pending'].includes(ticket.approvalStatus);
    return <td className="actions taskActions">
      <button type="button" onClick={() => view(ticket)}>View Details</button>
      {!closed && <button type="button" onClick={() => edit(ticket)}>Edit Ticket</button>}
      {canDelete(ticket) && <button type="button" onClick={() => del(ticket)}>Delete</button>}
      {canSubmitTicket(ticket) && <button type="button" onClick={() => submit(ticket._id)}>Submit For Approval</button>}
      {managementRole && submitted && <><button type="button" onClick={() => approve(ticket._id)}>Approve</button><button type="button" onClick={() => reject(ticket._id)}>Reject</button></>}
      {!closed && <input type="file" onChange={event => event.target.files[0] && uploadFile(ticket._id, event.target.files[0])} />}
      {!closed && <button type="button" onClick={() => setExtension({ ...extension, [ticket._id]: { ...(extension[ticket._id] || {}), open: !extension[ticket._id]?.open } })}>Extend Request</button>}
      {extension[ticket._id]?.open && <div className="extensionBox"><SearchableSelect value={extension[ticket._id]?.requestedHours || ''} placeholder="Extra Official Hours" options={[option('', 'Extra Official Hours'), ...extraHours.map(hour => option(hour, `${hour} Hour${hour === 1 ? '' : 's'}`))]} onChange={value => setExtension({ ...extension, [ticket._id]: { ...(extension[ticket._id] || {}), requestedHours: value } })} /><input placeholder="Reason" value={extension[ticket._id]?.reason || ''} onChange={event => setExtension({ ...extension, [ticket._id]: { ...(extension[ticket._id] || {}), reason: event.target.value } })} /><button type="button" onClick={() => requestExt(ticket._id)}>Send Request</button>{extension[ticket._id]?.error && <small className="errorMini">{extension[ticket._id].error}</small>}</div>}
      {renderExtensions(ticket)}
      {renderTicketFiles(ticket)}
      <div className="commentBox"><input placeholder="Comment" value={commentText[ticket._id] || ''} onChange={event => setCommentText({ ...commentText, [ticket._id]: event.target.value })} /><button type="button" onClick={() => comment(ticket._id)}>Comment</button></div>
      {renderComments(ticket)}
    </td>;
  }

  return <section className="page">
    <div className="pageTitle"><div><h2>Internal Ticket System</h2><p>Customer Complaint, Vendor Issue, Website Bug And Employee Request Tracking.</p></div></div>
    {msg && <p className="info">{msg}</p>}

    <div className="importPanel card"><div><h3>Import Previous Tickets From Excel</h3></div><div className="actions"><button className="secondary" type="button" onClick={downloadTicketTemplate}>Download Template</button><label className="fileButton">{importing ? 'Importing...' : 'Upload Excel'}<input type="file" accept=".xlsx,.xls,.csv" onChange={e => bulkImport(e.target.files?.[0])} disabled={importing} /></label></div></div>

    <form className="formGrid card" onSubmit={save}>
      <input placeholder="Ticket Title" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} required />
      <SearchableSelect placeholder="Ticket Source" value={form.source} options={sourceFormOptions} onChange={value => setForm({ ...form, source: value })} />
      <SearchableSelect placeholder="Ticket Category" value={form.category} options={categoryFormOptions} onChange={value => setForm({ ...form, category: value })} />
      <SearchableSelect placeholder="Priority SLA" value={form.priority} options={priorityFormOptions} onChange={value => setForm({ ...form, priority: value })} />
      <SearchableSelect placeholder="Status" value={form.status} options={statusFormOptions} onChange={value => setForm({ ...form, status: value })} />
      <SearchableSelect placeholder="Assign Ticket To User" value={form.assignedTo} options={userOptions} onChange={value => setForm({ ...form, assignedTo: value })} />
      <input placeholder="Requester Name" value={form.requesterName || ''} onChange={event => setForm({ ...form, requesterName: event.target.value })} />
      <input placeholder="Requester Email" value={form.requesterEmail || ''} onChange={event => setForm({ ...form, requesterEmail: event.target.value })} />
      <input placeholder="Requester Phone" value={form.requesterPhone || ''} onChange={event => setForm({ ...form, requesterPhone: event.target.value })} />
      <SearchableSelect placeholder="Department" value={form.department} options={departmentOptions} onTextChange={text => setForm(previous => ({ ...previous, department: text }))} onChange={value => setForm({ ...form, department: value })} />
      <textarea placeholder="Description" value={form.description || ''} onChange={event => setForm({ ...form, description: event.target.value })} />
      <button className="primary" disabled={saving}>{saving ? 'Saving...' : (editing ? 'Update Ticket' : 'Raise Ticket')}</button>
      {editing && <button type="button" className="secondary" onClick={() => { setEditing(null); setForm(blank); }}>Cancel</button>}
    </form>

    <div className="filters card taskFilters smartFilters ticketFilters">
      <input placeholder="Search Ticket" value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} />
      <SearchableSelect placeholder="All Status" value={filters.status} options={statusFilterOptions} onChange={value => setFilters({ ...filters, status: value })} />
      <SearchableSelect placeholder="All Priority" value={filters.priority} options={priorityFilterOptions} onChange={value => setFilters({ ...filters, priority: value })} />
      <SearchableSelect placeholder="All Source" value={filters.source} options={sourceFilterOptions} onChange={value => setFilters({ ...filters, source: value })} />
      <SearchableSelect placeholder="Type Employee Name" value={filters.assignedTo} options={filterUserOptions} onTextChange={text => setFilters(previous => ({ ...previous, employeeSearch: text, assignedTo: '' }))} onChange={(value, opt) => setFilters({ ...filters, assignedTo: value, employeeSearch: value ? (opt?.label || '') : '' })} />
      <input type="date" value={filters.createdFrom} onChange={e => setFilters({ ...filters, createdFrom: e.target.value })} title="Created From" />
      <input type="date" value={filters.createdTo} onChange={e => setFilters({ ...filters, createdTo: e.target.value })} title="Created To" />
      <button type="button" className="primary filterBtn" onClick={reload}>{loading ? 'Loading...' : 'Apply Filter'}</button>
    </div>

    {viewTicket && <div className="detailOverlay" onClick={() => setViewTicket(null)}><article className="detailModal" onClick={event => event.stopPropagation()}><div className="detailHeader"><div><h3>Ticket Details</h3><p>{viewTicket.ticketNo} • {pretty(viewTicket.status)}</p></div><button type="button" className="secondary" onClick={() => setViewTicket(null)}>Close</button></div><div className="detailGrid"><DetailRow label="Ticket No" value={viewTicket.ticketNo} /><DetailRow label="Title" value={viewTicket.title} /><DetailRow label="Source" value={pretty(viewTicket.source)} /><DetailRow label="Category" value={pretty(viewTicket.category)} /><DetailRow label="Priority SLA" value={`${pretty(viewTicket.priority)} • ${slaMap[viewTicket.priority] || '—'}`} /><DetailRow label="Status" value={pretty(viewTicket.status)} /><DetailRow label="Approval" value={ticketApprovalLabel(viewTicket)} /><DetailRow label="Department" value={viewTicket.department} /><DetailRow label="Assigned To" value={viewTicket.assignedTo?.name} /><DetailRow label="Assigned Role" value={pretty(viewTicket.assignedTo?.role)} /><DetailRow label="Created By" value={viewTicket.createdBy?.name} /><DetailRow label="Requester Name" value={viewTicket.requesterName} /><DetailRow label="Requester Email" value={viewTicket.requesterEmail} /><DetailRow label="Requester Phone" value={viewTicket.requesterPhone} /><DetailRow label="Official Due" value={formatDate(viewTicket.slaDueDate)} /><DetailRow label="Created At" value={formatDate(viewTicket.createdAt)} /><DetailRow label="Updated At" value={formatDate(viewTicket.updatedAt)} /></div><div className="detailSection"><h4>Description</h4><p>{safe(viewTicket.description)}</p></div><div className="detailSection"><h4>Comments</h4>{(viewTicket.comments || []).length === 0 && <p>No Comments Yet</p>}{(viewTicket.comments || []).map(comment => <p className="commentItem" key={comment._id}>{comment.message}</p>)}</div><div className="detailSection"><h4>Activity Log</h4>{(viewTicket.activityLog || []).length === 0 && <p>No Activity Found</p>}{(viewTicket.activityLog || []).map(item => <div className="activityItem" key={item._id || `${item.action}-${item.createdAt}`}><b>{safe(item.action)}</b><span>{safe(item.detail)}</span><small>{formatDate(item.createdAt)}</small></div>)}</div></article></div>}

    <div className="tableWrap"><table><thead><tr><th>No</th><th>Title</th><th>Created Date & Time</th><th>Assigned</th><th>Source</th><th>Status</th><th>Priority SLA</th><th>Official Due</th><th>Approval</th><th>Actions</th></tr></thead><tbody>{paginatedTickets.map(ticket => <tr className={ticketRowClass(ticket)} key={ticket._id}><td>{ticket.ticketNo || '—'}</td><td><b>{ticket.title}</b><p>{ticket.description}</p><small>{pretty(ticket.category)} • {ticket.department}</small></td><td>{formatDate(ticket.createdAt)}</td><td className="employeeCell"><div className="employeeName">{ticket.assignedTo?.name || '—'}</div>{ticket.assignedTo?.role && <div className="employeeRole">{pretty(ticket.assignedTo.role)}</div>}{ticket.assignedTo?.department && <div className="employeeDept">{ticket.assignedTo.department}</div>}</td><td>{pretty(ticket.source)}</td>{statusCell(ticket)}<td><span className={`pill ${ticket.priority}`}>{pretty(ticket.priority)} • {slaMap[ticket.priority] || '—'}</span></td><td>{formatDate(ticket.slaDueDate)}</td><td>{ticketApprovalLabel(ticket)}</td>{renderTicketActions(ticket)}</tr>)}</tbody></table><Pagination {...ticketPagination} /></div>
  </section>;
}

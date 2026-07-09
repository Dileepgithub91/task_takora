import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

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

const pretty = value => String(value || '')
  .replace(/([a-z])([A-Z])/g, '$1 $2')
  .replace(/[_-]+/g, ' ')
  .replace(/\b\w/g, c => c.toUpperCase());

const safe = value => value || '—';
const formatDate = value => value ? new Date(value).toLocaleString() : '—';

function DetailRow({ label, value }) {
  return (
    <div className="detailRow">
      <span>{label}</span>
      <strong>{safe(value)}</strong>
    </div>
  );
}

export default function Tickets() {
  const { user } = useAuth();

  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [viewTicket, setViewTicket] = useState(null);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const [ticketRes, userRes] = await Promise.all([
      api('/tickets'),
      api('/users/assignable')
    ]);

    setTickets(ticketRes.tickets || []);
    setUsers(userRes.users || []);
  }

  useEffect(() => {
    load().catch(error => setMsg(error.message));
  }, []);

  function edit(ticket) {
    setEditing(ticket._id);
    setViewTicket(null);
    setForm({
      ...blank,
      ...ticket,
      assignedTo: ticket.assignedTo?._id || ticket.assignedTo || ''
    });
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
      const payload = Object.fromEntries(
        Object.entries(form).filter(([, value]) => value !== '' && value !== null && value !== undefined)
      );

      setSaving(true);
      let res;
      if (editing) {
        res = await api(`/tickets/${editing}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        if (res.ticket) {
          setTickets(previous => previous.map(item => item._id === editing ? res.ticket : item));
        }
      } else {
        res = await api('/tickets', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        if (res.ticket) {
          setTickets(previous => [res.ticket, ...previous]);
        }
      }

      setForm(blank);
      setEditing(null);
      setMsg(editing ? 'Ticket Updated Successfully' : 'Ticket Raised Successfully');
    } catch (error) {
      setMsg(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function del(ticket) {
    if (confirm('Delete Ticket?')) {
      await api(`/tickets/${ticket._id}`, { method: 'DELETE' });
      setViewTicket(null);
      await load();
    }
  }

  const canDelete = ticket => (
    user?.role === 'admin' ||
    String(ticket.createdBy?._id || ticket.createdBy) === String(user?._id)
  );

  return (
    <section className="page">
      <div className="pageTitle">
        <div>
          <h2>Internal Ticket System</h2>
          <p>Customer Complaint, Vendor Issue, Website Bug And Employee Request Tracking.</p>
        </div>
      </div>

      {msg && <p className="info">{msg}</p>}

      <form className="formGrid card" onSubmit={save}>
        <input
          placeholder="Ticket Title"
          value={form.title}
          onChange={event => setForm({ ...form, title: event.target.value })}
          required
        />

        <select value={form.source} onChange={event => setForm({ ...form, source: event.target.value })}>
          <option value="">Ticket Source</option>
          {['customer', 'vendor', 'support', 'internal'].map(item => (
            <option key={item} value={item}>{pretty(item)}</option>
          ))}
        </select>

        <select value={form.category} onChange={event => setForm({ ...form, category: event.target.value })}>
          <option value="">Ticket Category</option>
          {['websiteBug', 'customerComplaint', 'vendorIssue', 'employeeRequest', 'orderIssue', 'paymentIssue', 'other'].map(item => (
            <option key={item} value={item}>{pretty(item)}</option>
          ))}
        </select>

        <select value={form.priority} onChange={event => setForm({ ...form, priority: event.target.value })}>
          <option value="">Priority</option>
          {['low', 'medium', 'high', 'urgent'].map(item => (
            <option key={item} value={item}>{pretty(item)}</option>
          ))}
        </select>

        <select value={form.status} onChange={event => setForm({ ...form, status: event.target.value })}>
          <option value="">Status</option>
          {['open', 'inProgress', 'waiting', 'resolved', 'closed', 'escalated'].map(item => (
            <option key={item} value={item}>{pretty(item)}</option>
          ))}
        </select>

        <select value={form.assignedTo} onChange={event => setForm({ ...form, assignedTo: event.target.value })}>
          <option value="">Assign Ticket To User</option>
          {users.map(item => (
            <option key={item._id} value={item._id}>{item.name} - {pretty(item.role)}</option>
          ))}
        </select>

        <input placeholder="Requester Name" value={form.requesterName || ''} onChange={event => setForm({ ...form, requesterName: event.target.value })} />
        <input placeholder="Requester Email" value={form.requesterEmail || ''} onChange={event => setForm({ ...form, requesterEmail: event.target.value })} />
        <input placeholder="Requester Phone" value={form.requesterPhone || ''} onChange={event => setForm({ ...form, requesterPhone: event.target.value })} />
        <input placeholder="Department" value={form.department || ''} onChange={event => setForm({ ...form, department: event.target.value })} />
        <textarea placeholder="Description" value={form.description || ''} onChange={event => setForm({ ...form, description: event.target.value })} />

        <button className="primary" disabled={saving}>{saving ? 'Saving...' : (editing ? 'Update Ticket' : 'Raise Ticket')}</button>
        {editing && (
          <button type="button" className="secondary" onClick={() => { setEditing(null); setForm(blank); }}>
            Cancel
          </button>
        )}
      </form>

      {viewTicket && (
        <div className="detailOverlay" onClick={() => setViewTicket(null)}>
          <article className="detailModal" onClick={event => event.stopPropagation()}>
            <div className="detailHeader">
              <div>
                <h3>Ticket Details</h3>
                <p>{viewTicket.ticketNo} • {pretty(viewTicket.status)}</p>
              </div>
              <button type="button" className="secondary" onClick={() => setViewTicket(null)}>Close</button>
            </div>

            <div className="detailGrid">
              <DetailRow label="Ticket No" value={viewTicket.ticketNo} />
              <DetailRow label="Title" value={viewTicket.title} />
              <DetailRow label="Source" value={pretty(viewTicket.source)} />
              <DetailRow label="Category" value={pretty(viewTicket.category)} />
              <DetailRow label="Priority" value={pretty(viewTicket.priority)} />
              <DetailRow label="Status" value={pretty(viewTicket.status)} />
              <DetailRow label="Department" value={viewTicket.department} />
              <DetailRow label="Assigned To" value={viewTicket.assignedTo?.name} />
              <DetailRow label="Assigned Role" value={pretty(viewTicket.assignedTo?.role)} />
              <DetailRow label="Created By" value={viewTicket.createdBy?.name} />
              <DetailRow label="Requester Name" value={viewTicket.requesterName} />
              <DetailRow label="Requester Email" value={viewTicket.requesterEmail} />
              <DetailRow label="Requester Phone" value={viewTicket.requesterPhone} />
              <DetailRow label="SLA Due Date" value={formatDate(viewTicket.slaDueDate)} />
              <DetailRow label="Created At" value={formatDate(viewTicket.createdAt)} />
              <DetailRow label="Updated At" value={formatDate(viewTicket.updatedAt)} />
            </div>

            <div className="detailSection">
              <h4>Description</h4>
              <p>{safe(viewTicket.description)}</p>
            </div>

            <div className="detailSection">
              <h4>Comments</h4>
              {(viewTicket.comments || []).length === 0 && <p>No Comments Yet</p>}
              {(viewTicket.comments || []).map(comment => (
                <p className="commentItem" key={comment._id}>{comment.message}</p>
              ))}
            </div>

            <div className="detailSection">
              <h4>Activity Log</h4>
              {(viewTicket.activityLog || []).length === 0 && <p>No Activity Found</p>}
              {(viewTicket.activityLog || []).map(item => (
                <div className="activityItem" key={item._id || `${item.action}-${item.createdAt}`}>
                  <b>{safe(item.action)}</b>
                  <span>{safe(item.detail)}</span>
                  <small>{formatDate(item.createdAt)}</small>
                </div>
              ))}
            </div>
          </article>
        </div>
      )}

      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Title</th>
              <th>Source</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Assigned</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map(ticket => (
              <tr key={ticket._id}>
                <td>{ticket.ticketNo}</td>
                <td><b>{ticket.title}</b><p>{ticket.description}</p></td>
                <td>{pretty(ticket.source)}</td>
                <td>{pretty(ticket.status)}</td>
                <td><span className={`pill ${ticket.priority}`}>{pretty(ticket.priority)}</span></td>
                <td>
                  {ticket.assignedTo?.name || '—'}
                  {ticket.assignedTo?.role && <small>{pretty(ticket.assignedTo.role)}</small>}
                </td>
                <td className="actions">
                  <button type="button" onClick={() => view(ticket)}>View Details</button>
                  <button type="button" onClick={() => edit(ticket)}>Edit</button>
                  {canDelete(ticket) && <button type="button" onClick={() => del(ticket)}>Delete</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

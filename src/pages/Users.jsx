import React, { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const blank = {
  name: '',
  email: '',
  password: '',
  employeeId: '',
  role: '',
  department: '',
  branch: '',
  designation: '',
  phone: '',
  whatsapp: '',
  reportingManager: '',
  status: '',
  workStatus: ''
};

const pretty = value =>
  String(value || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());

function avatarText(name = '') {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(v => v[0])
      .join('')
      .toUpperCase() || 'TM'
  );
}

export default function Users() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await api('/users/summary');
    setUsers(r.users || []);
  }

  useEffect(() => {
    load().catch(e => setMsg(e.message));
  }, []);

  const visibleUsers = useMemo(
    () =>
      users.filter(u => {
        const text = `${u.name || ''} ${u.email || ''} ${u.employeeId || ''} ${
          u.department || ''
        } ${u.designation || ''}`.toLowerCase();

        return (
          (!search || text.includes(search.toLowerCase())) &&
          (!roleFilter || u.role === roleFilter)
        );
      }),
    [users, search, roleFilter]
  );

  function edit(u) {
    setEditing(u._id);
    setShowPassword(false);
    setForm({
      ...blank,
      ...u,
      password: '',
      reportingManager: u.reportingManager?._id || u.reportingManager || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function save(e) {
    e.preventDefault();
    setMsg('');

    try {
      const payload = Object.fromEntries(
        Object.entries(form).filter(([, v]) => v !== '' && v !== null && v !== undefined)
      );

      setSaving(true);
      let res;
      if (editing) {
        res = await api(`/users/${editing}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        if (res.user) {
          setUsers(previous => previous.map(item => item._id === editing ? { ...item, ...res.user } : item));
        }
      } else {
        res = await api('/users', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        if (res.user) {
          setUsers(previous => [{ ...res.user, taskSummary: { total: 0, completed: 0, overdue: 0 } }, ...previous]);
        }
      }

      setForm(blank);
      setEditing(null);
      setShowPassword(false);
      setMsg(editing ? 'Team Member Updated Successfully' : 'Team Member Added Successfully');
    } catch (err) {
      setMsg(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function del(id) {
    if (confirm('Deactivate This User?')) {
      await api(`/users/${id}`, { method: 'DELETE' });
      await load();
    }
  }

  if (user?.role !== 'admin') {
    return (
      <section className="page">
        <div className="pageTitle">
          <div>
            <h2>Team Member Management</h2>
            <p>Only Admin Can Open Add, Edit And Delete Team Member Module.</p>
          </div>
        </div>
        <div className="card emptyState">Team Member Module Is Restricted To Admin Login.</div>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="pageTitle">
        <div>
          <h2>Team Member Management</h2>
      
        </div>
      </div>

      {msg && <p className="info">{msg}</p>}

      <form className="formGrid card teamMemberForm" onSubmit={save} autoComplete="off">
        <div style={{ display: 'none' }}>
          <input
            type="text"
            name="fake_username_not_used"
            autoComplete="username"
            tabIndex="-1"
          />
          <input
            type="password"
            name="fake_password_not_used"
            autoComplete="current-password"
            tabIndex="-1"
          />
          <input
            type="email"
            name="fake_email_not_used"
            autoComplete="email"
            tabIndex="-1"
          />
          <input
            type="tel"
            name="fake_phone_not_used"
            autoComplete="tel"
            tabIndex="-1"
          />
        </div>

        <input
          name="takora_employee_name"
          placeholder="Employee Name"
          value={form.name || ''}
          autoComplete="off"
          onChange={e => setForm({ ...form, name: e.target.value })}
          required
        />

        <input
          key={editing || 'new-email-field'}
          name="takora_team_member_email_unique"
          placeholder="Email Address"
          type="email"
          inputMode="email"
          value={form.email || ''}
          autoComplete="new-email"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck="false"
          onChange={e => setForm({ ...form, email: e.target.value })}
          required
        />

        <input
          name="takora_employee_id"
          placeholder="Employee ID"
          value={form.employeeId || ''}
          autoComplete="off"
          onChange={e => setForm({ ...form, employeeId: e.target.value })}
          required
        />

        <input
          name="takora_employee_phone"
          placeholder="Phone Number"
          type="tel"
          inputMode="tel"
          value={form.phone || ''}
          autoComplete="off"
          onChange={e => setForm({ ...form, phone: e.target.value })}
        />

        <input
          name="takora_employee_whatsapp"
          placeholder="WhatsApp Number"
          type="tel"
          inputMode="tel"
          value={form.whatsapp || ''}
          autoComplete="off"
          onChange={e => setForm({ ...form, whatsapp: e.target.value })}
        />

        <input
          name="takora_employee_designation"
          placeholder="Designation"
          value={form.designation || ''}
          autoComplete="off"
          onChange={e => setForm({ ...form, designation: e.target.value })}
        />

        <input
          name="takora_employee_department"
          placeholder="Department"
          value={form.department || ''}
          autoComplete="off"
          onChange={e => setForm({ ...form, department: e.target.value })}
        />

        <input
          name="takora_employee_branch"
          placeholder="Branch"
          value={form.branch || ''}
          autoComplete="off"
          onChange={e => setForm({ ...form, branch: e.target.value })}
        />

        <div className="teamPasswordBox">
          <input
            name="takora_employee_new_password"
            placeholder={editing ? 'New Password Optional' : 'Password'}
            type={showPassword ? 'text' : 'password'}
            value={form.password || ''}
            autoComplete="new-password"
            onChange={e => setForm({ ...form, password: e.target.value })}
          />

          <button
            type="button"
            className="teamPasswordEyeBtn"
            onClick={() => setShowPassword(prev => !prev)}
            aria-label={showPassword ? 'Hide Password' : 'Show Password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <select
          name="takora_employee_role"
          value={form.role || ''}
          autoComplete="off"
          onChange={e => setForm({ ...form, role: e.target.value })}
          required
        >
          <option value="">Select Role</option>
          {['admin', 'manager', 'teamLead', 'employee', 'support', 'auditor'].map(r => (
            <option key={r} value={r}>
              {pretty(r)}
            </option>
          ))}
        </select>

        <select
          name="takora_employee_reporting_manager"
          value={form.reportingManager || ''}
          autoComplete="off"
          onChange={e => setForm({ ...form, reportingManager: e.target.value })}
        >
          <option value="">Reporting Manager</option>
          {users
            .filter(u => u._id !== editing)
            .map(u => (
              <option key={u._id} value={u._id}>
                {u.name} - {pretty(u.role)}
              </option>
            ))}
        </select>

        <select
          name="takora_employee_status"
          value={form.status || ''}
          autoComplete="off"
          onChange={e => setForm({ ...form, status: e.target.value })}
        >
          <option value="">Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <select
          name="takora_employee_work_status"
          value={form.workStatus || ''}
          autoComplete="off"
          onChange={e => setForm({ ...form, workStatus: e.target.value })}
        >
          <option value="">Work Status</option>
          <option value="available">Available</option>
          <option value="busy">Busy</option>
          <option value="onLeave">On Leave</option>
          <option value="offline">Offline</option>
        </select>

        <button className="primary" disabled={saving}>{saving ? 'Saving...' : (editing ? 'Update Employee' : 'Add Team Member')}</button>

        {editing && (
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setEditing(null);
              setShowPassword(false);
              setForm(blank);
            }}
          >
            Cancel
          </button>
        )}
      </form>

      <div className="filters card teamFilters">
        <input
          name="takora_employee_search"
          placeholder="Search Employee, ID, Email, Department"
          value={search}
          autoComplete="off"
          onChange={e => setSearch(e.target.value)}
        />

        <select
          name="takora_employee_role_filter"
          value={roleFilter}
          autoComplete="off"
          onChange={e => setRoleFilter(e.target.value)}
        >
          <option value="">All Roles</option>
          {['admin', 'manager', 'teamLead', 'employee', 'support', 'auditor'].map(r => (
            <option key={r} value={r}>
              {pretty(r)}
            </option>
          ))}
        </select>
      </div>

      <div className="teamGrid">
        {visibleUsers.map(member => (
          <article className="teamCard" key={member._id}>
            <div className="teamTop">
              <div className="avatarCircle">
                {member.profileImage ? (
                  <img src={member.profileImage} alt={member.name} />
                ) : (
                  avatarText(member.name)
                )}
              </div>

              <div className="teamIdentity">
                <h3>{member.name || '-'}</h3>
                <div className="teamBadges">
                  <span className={`roleBadge role-${member.role}`}>{pretty(member.role)}</span>
                  <span className={`statusDot ${member.status || 'active'}`}>
                    {pretty(member.status || 'Active')}
                  </span>
                </div>
              </div>
            </div>

            <div className="teamInfo">
              <p>
                <b>Employee ID:</b> {member.employeeId || '-'}
              </p>
              <p>
                <b>Email:</b> {member.email || '-'}
              </p>
              <p>
                <b>Phone:</b> {member.phone || '-'}
              </p>
              <p>
                <b>Department:</b> {member.department || '-'}
              </p>
              <p>
                <b>Designation:</b> {member.designation || '-'}
              </p>
              <p>
                <b>Work Status:</b> {pretty(member.workStatus || '-')}
              </p>
              <p>
                <b>Reporting Manager:</b> {member.reportingManager?.name || '-'}
              </p>
            </div>

            <div className="miniStats teamStats">
              <span>Total {member.taskSummary?.total || 0}</span>
              <span>Done {member.taskSummary?.completed || 0}</span>
              <span>Overdue {member.taskSummary?.overdue || 0}</span>
            </div>

            <div className="teamActions">
              <button onClick={() => edit(member)}>Edit</button>
              <button className="danger" onClick={() => del(member._id)}>
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>

      {visibleUsers.length === 0 && <div className="card emptyState">No Team Members Found.</div>}
    </section>
  );
}
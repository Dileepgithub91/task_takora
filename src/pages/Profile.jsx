import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

function avatarSrc(user, version = '') {
  const url = user?.avatarUrl || '';

  if (url && !url.startsWith('/uploads')) {
    return version && !url.includes('X-Amz-Signature') ? `${url}?v=${version}` : url;
  }

  if (user?.avatar && user.avatar.startsWith('http')) return user.avatar;
  return '/takora-logo.png';
}

export default function Profile() {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', whatsapp: '', designation: '', workStatus: 'available' });
  const [avatar, setAvatar] = useState(null);
  const [avatarVersion, setAvatarVersion] = useState(Date.now());
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!user?._id) return;
    const data = await api(`/users/${user._id}`);
    setProfile(data);
    setForm({
      name: data.user.name || '',
      phone: data.user.phone || '',
      whatsapp: data.user.whatsapp || '',
      designation: data.user.designation || '',
      workStatus: data.user.workStatus || 'available'
    });
  }

  useEffect(() => {
    load().catch(console.error);
  }, [user?._id]);

  async function save(e) {
    e.preventDefault();
    setMsg('');

    try {
      setSaving(true);
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v || ''));
      if (avatar) fd.append('avatar', avatar);

      const res = await api('/users/me', { method: 'PUT', body: fd });
      setUser(prev => ({ ...prev, ...res.user }));
      setProfile(prev => ({ ...(prev || {}), user: res.user }));
      setAvatar(null);
      setAvatarVersion(Date.now());
      await load();
      setMsg('Profile updated successfully');
    } catch (err) {
      setMsg(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  const current = profile?.user || user;
  const summary = profile?.taskSummary || [];

  return (
    <section className="page">
      <div className="profileHero card">
        <img src={avatarSrc(current, avatarVersion)} alt={current.name} />
        <div>
          <h2>{current.name}</h2>
          <p>{current.email}</p>
          <span className="pill">{current.role}</span>{' '}
          <span className="pill">{current.department}</span>{' '}
          <span className="pill">{current.workStatus}</span>
        </div>
      </div>

      {msg && <p className="info">{msg}</p>}

      <div className="grid2">
        <form className="card formGrid profileForm" onSubmit={save}>
          <h3>Update Profile</h3>
          <input placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Phone no" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          <input placeholder="WhatsApp no" value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} />
          <input placeholder="Designation" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} />
          <select value={form.workStatus} onChange={e => setForm({ ...form, workStatus: e.target.value })}>
            <option value="available">Available</option>
            <option value="busy">Busy</option>
            <option value="onLeave">On Leave</option>
            <option value="offline">Offline</option>
          </select>
          <input type="file" accept="image/*" onChange={e => setAvatar(e.target.files?.[0] || null)} />
          <button className="primary" disabled={saving}>{saving ? 'Updating...' : 'Update Details'}</button>
        </form>

        <div className="card">
          <h3>Employee Details</h3>
          <p><b>Employee ID:</b> {current.employeeId || '-'}</p>
          <p><b>Branch:</b> {current.branch}</p>
          <p><b>Phone:</b> {current.phone || '-'}</p>
          <p><b>WhatsApp:</b> {current.whatsapp || '-'}</p>
          <p><b>Department:</b> {current.department}</p>
        </div>
      </div>

      <div className="card">
        <h3>Task Summary</h3>
        {summary.length === 0 && <p>No tasks yet.</p>}
        {summary.map(s => <p key={s._id}><b>{s._id}</b>: {s.count}</p>)}
      </div>
    </section>
  );
}

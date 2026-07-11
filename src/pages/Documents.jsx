import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import Pagination, { byCreatedDesc, usePagination } from '../components/Pagination.jsx';

const categories = ['SOP', 'Product Rules', 'Vendor Agreement', 'Invoice', 'Screenshot', 'Company Document', 'Other'];

function formatSize(size = 0) {
  const bytes = Number(size || 0);
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function isOldLocalUrl(url = '') {
  return String(url || '').startsWith('/uploads') || String(url || '').includes('/uploads/');
}

export default function Documents() {
  const [docs, setDocs] = useState([]);
  const [file, setFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const [form, setForm] = useState({
    title: '',
    category: 'SOP',
    description: '',
    department: 'All'
  });
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const sortedDocs = useMemo(() => [...docs].sort(byCreatedDesc), [docs]);
  const documentPagination = usePagination(sortedDocs, {
    initialPageSize: 8,
    resetKey: docs.length,
    pageSizeOptions: [8, 16, 32, 64]
  });
  const paginatedDocs = documentPagination.pageItems;

  async function load() {
    const r = await api('/documents');
    setDocs(r.documents || []);
  }

  useEffect(() => {
    load().catch(e => setMsg(e.message));
  }, []);

  async function upload(e) {
    e.preventDefault();
    setMsg('');

    if (!file) {
      setMsg('Choose a file');
      return;
    }

    try {
      setLoading(true);
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v || ''));
      fd.append('file', file);

      const res = await api('/documents', {
        method: 'POST',
        body: fd
      });

      setFile(null);
      setFileInputKey(Date.now());
      setForm({ title: '', category: 'SOP', description: '', department: 'All' });
      if (res.document) setDocs(previous => [res.document, ...previous]);
      else await load();
      setMsg(res.message || 'Document uploaded permanently to AWS S3');
    } catch (err) {
      setMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function openFile(doc) {
    try {
      setMsg('');

      if (doc.needsReupload || isOldLocalUrl(doc.downloadUrl) || isOldLocalUrl(doc.path)) {
        setMsg('This is an old local /uploads file. Please delete and re-upload it once after S3 setup.');
        return;
      }

      let url = doc.downloadUrl;

      if (!url && doc.fileKey) {
        const data = await api(`/files/signed-url?key=${encodeURIComponent(doc.fileKey)}`);
        url = data.url;
      }

      if (!url || isOldLocalUrl(url)) {
        setMsg('S3 file URL not found. Please re-upload this file after S3 setup.');
        return;
      }

      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setMsg(err.message || 'Unable to open file');
    }
  }

  async function remove(id) {
    if (!window.confirm('Delete this document?')) return;

    try {
      await api(`/documents/${id}`, { method: 'DELETE' });
      setDocs(previous => previous.filter(item => item._id !== id));
      setMsg('Document deleted');
    } catch (err) {
      setMsg(err.message);
    }
  }

  return (
    <section className="page">
      <div className="pageTitle">
        <div>
          <h2>Document Center</h2>
          <p>Upload documents and images permanently using AWS S3.</p>
        </div>
      </div>

      {msg && <p className="info">{msg}</p>}

      <form className="formGrid card" onSubmit={upload}>
        <input
          placeholder="Title"
          value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
        />

        <select
          value={form.category}
          onChange={e => setForm({ ...form, category: e.target.value })}
        >
          {categories.map(x => (
            <option key={x}>{x}</option>
          ))}
        </select>

        <input
          placeholder="Department"
          value={form.department}
          onChange={e => setForm({ ...form, department: e.target.value })}
        />

        <input
          key={fileInputKey}
          type="file"
          onChange={e => setFile(e.target.files?.[0] || null)}
        />

        <textarea
          placeholder="Description"
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
        />

        <button className="primary" disabled={loading}>
          {loading ? 'Uploading...' : 'Upload Document'}
        </button>
      </form>

      <div className="cardsGrid">
        {paginatedDocs.map(d => (
          <article className="card" key={d._id}>
            <h3>{d.title}</h3>
            <p>{d.category} • {d.department}</p>
            {d.description && <p>{d.description}</p>}
            <p>
              <small>{d.originalName || d.fileName || d.filename || 'File'} • {formatSize(d.size)}</small>
            </p>

            {d.needsReupload && (
              <p className="errorMini">Old local file. Delete and re-upload to store in AWS S3.</p>
            )}

            <div className="actions">
              <button type="button" className="secondary" onClick={() => openFile(d)}>
                Open File
              </button>
              <button type="button" onClick={() => remove(d._id)}>
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>

      <Pagination {...documentPagination} />

      {docs.length === 0 && <div className="card emptyState">No Documents Found.</div>}
    </section>
  );
}

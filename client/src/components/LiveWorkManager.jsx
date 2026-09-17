import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import api from '../lib/axios';

/**
 * Dashboard widget for Pros / Businesses to post anonymized progress photos.
 *
 * Props:
 *   role         'worker' | 'business'
 *   activeJobs   array of active jobs (workers only) — populates the job picker.
 *                Each job: { _id, title, category, location: { district } }
 *   defaults     { category, district } fallback when no jobId selected (workers
 *                with no active jobs, or businesses)
 */
export default function LiveWorkManager({ role, activeJobs = [], defaults = {} }) {
  const qc = useQueryClient();
  const [files, setFiles] = useState([]);
  const [jobId, setJobId] = useState('');
  const [category, setCategory] = useState(defaults.category || '');
  const [district, setDistrict] = useState(defaults.district || '');
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState(false);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['progressPosts', 'me'],
    queryFn: () => api.get('/progress-posts/me').then((r) => r.data.data),
  });

  function onFilesChange(e) {
    const list = Array.from(e.target.files || []).slice(0, 4);
    setFiles(list);
  }

  function onJobPick(id) {
    setJobId(id);
    if (!id) return;
    const job = activeJobs.find((j) => j._id === id);
    if (job) {
      setCategory(job.category || category);
      setDistrict(job.location?.district || district);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setOk(false);
    if (!files.length) {
      setErr('Add at least one photo.');
      return;
    }
    if (!category.trim() || !district.trim()) {
      setErr('Category and district are required.');
      return;
    }

    setBusy(true);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('photos', f));
      if (jobId)    fd.append('jobId', jobId);
      fd.append('category', category.trim());
      fd.append('district', district.trim());
      if (caption.trim()) fd.append('caption', caption.trim());

      await api.post('/progress-posts', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Reset form
      setFiles([]);
      setJobId('');
      setCaption('');
      setOk(true);
      setTimeout(() => setOk(false), 3000);
      qc.invalidateQueries({ queryKey: ['progressPosts', 'me'] });
      qc.invalidateQueries({ queryKey: ['livePulse'] });
    } catch (e2) {
      setErr(e2.response?.data?.message || 'Could not post. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    if (!confirm('Delete this post? It will disappear from your public profile.')) return;
    try {
      await api.delete(`/progress-posts/${id}`);
      qc.invalidateQueries({ queryKey: ['progressPosts', 'me'] });
      qc.invalidateQueries({ queryKey: ['livePulse'] });
    } catch {
      alert('Could not delete. Try again.');
    }
  }

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-1">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
        </span>
        <h2 className="font-bold text-lg">Live Work</h2>
      </div>
      <p className="text-xs text-stone-500 mb-4">
        Post progress photos that appear on your public profile. <b>No client info is shown</b> —
        only your category, district, and the time. Don't include the client's face,
        their address, or anything that identifies them.
      </p>

      {/* Compose form */}
      <form onSubmit={submit} className="bg-stone-50 border border-stone-200 rounded-xl p-4 mb-5">
        {/* Job picker (workers with active jobs) */}
        {role === 'worker' && activeJobs.length > 0 && (
          <div className="mb-3">
            <label className="text-xs font-semibold text-stone-600 block mb-1">
              Tied to a job (optional, recommended)
            </label>
            <select
              value={jobId}
              onChange={(e) => onJobPick(e.target.value)}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">— Standalone post —</option>
              {activeJobs.map((j) => (
                <option key={j._id} value={j._id}>
                  {j.title} · {j.category} · {j.location?.district || '—'}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Category + district (auto-filled when a job is selected) */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs font-semibold text-stone-600 block mb-1">Category</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Plumbing"
              maxLength={60}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-stone-600 block mb-1">District</label>
            <input
              type="text"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="e.g. Downtown"
              maxLength={60}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white"
            />
          </div>
        </div>

        {/* Photos */}
        <div className="mb-3">
          <label className="text-xs font-semibold text-stone-600 block mb-1">
            Photos (1–4, up to 5 MB each)
          </label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={onFilesChange}
            className="block w-full text-sm text-stone-600
                       file:mr-3 file:py-2 file:px-4 file:rounded-lg
                       file:border-0 file:bg-violet-100 file:text-violet-700
                       file:font-semibold hover:file:bg-violet-200
                       file:cursor-pointer"
          />
          {files.length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {files.map((f, i) => (
                <span key={i} className="text-xs bg-white border border-stone-200 rounded-full px-2.5 py-1 text-stone-600">
                  {f.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Caption */}
        <div className="mb-3">
          <label className="text-xs font-semibold text-stone-600 block mb-1">
            Short caption (optional, max 200 chars)
          </label>
          <textarea
            rows={2}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={200}
            placeholder="e.g. Replaced under-sink pipework — leak fixed in 90 minutes."
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm resize-none bg-white"
          />
        </div>

        {err && <p className="text-sm text-red-600 mb-2">{err}</p>}
        {ok  && <p className="text-sm text-green-600 mb-2 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 shrink-0" />Posted to your profile.</p>}

        <button
          type="submit"
          disabled={busy}
          className="btn-primary text-sm py-2 px-5 disabled:opacity-50"
        >
          {busy ? 'Posting…' : 'Post update'}
        </button>
      </form>

      {/* Existing posts */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
          Your recent posts
        </p>
        {isLoading ? (
          <p className="text-sm text-stone-400">Loading…</p>
        ) : posts.length === 0 ? (
          <p className="text-sm text-stone-400 italic">Nothing yet — post your first update above.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {posts.map((p) => (
              <div key={p._id} className="relative group rounded-lg overflow-hidden bg-stone-100 aspect-square">
                <img src={p.photos[0]} alt="" className="w-full h-full object-cover" />
                {p.removedByAdmin && (
                  <div className="absolute inset-0 bg-red-900/70 text-white text-[11px] font-semibold flex items-center justify-center text-center px-2">
                    Removed by moderator
                  </div>
                )}
                {p.flagged && !p.removedByAdmin && (
                  <span className="absolute top-1.5 left-1.5 bg-amber-400 text-stone-900 text-[10px] font-bold px-1.5 py-0.5 rounded">
                    Flagged
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/85 via-black/40 to-transparent text-white text-[11px] leading-tight">
                  <div className="font-semibold truncate">{p.category}</div>
                  <div className="opacity-80 truncate">{p.district}</div>
                </div>
                <button
                  onClick={() => remove(p._id)}
                  className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-red-600 text-white text-xs font-bold w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete this post"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

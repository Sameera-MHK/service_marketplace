import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import api from '../../lib/axios';
import { DISTRICTS } from '../../config/site.js';

const DAYS = ['mon','tue','wed','thu','fri','sat','sun'];
const DAY_LABEL = { mon:'Mon', tue:'Tue', wed:'Wed', thu:'Thu', fri:'Fri', sat:'Sat', sun:'Sun' };


export default function BusinessOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Step 1 — About
  const [description, setDescription]   = useState('');
  const [tagline, setTagline]           = useState('');

  // Step 2 — Location & contact
  const [district, setDistrict]   = useState('');
  const [address, setAddress]     = useState('');
  const [phone, setPhone]         = useState('');
  const [whatsapp, setWhatsapp]   = useState('');
  const [website, setWebsite]     = useState('');

  // Step 3 — Hours
  const [hours, setHours] = useState({
    mon:'8am – 6pm', tue:'8am – 6pm', wed:'8am – 6pm',
    thu:'8am – 6pm', fri:'8am – 6pm', sat:'9am – 3pm', sun:'Closed',
  });

  // Step 4 — Photos
  const [coverFile, setCoverFile]   = useState(null);
  const [photoFiles, setPhotoFiles] = useState([]);

  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  async function handleFinish() {
    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('description', description);
      fd.append('tagline', tagline);
      fd.append('district', district);
      fd.append('address', address);
      fd.append('phone', phone);
      fd.append('whatsapp', whatsapp);
      fd.append('website', website);
      fd.append('openingHours', JSON.stringify(hours));
      if (coverFile) fd.append('coverPhoto', coverFile);
      photoFiles.forEach((f) => fd.append('photos', f));

      await api.put('/businesses/profile/me', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await api.post('/businesses/onboarding/complete');
      navigate('/dashboard/business', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  const steps = ['About', 'Location', 'Hours', 'Photos'];

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4 py-10">
      <div className="card w-full max-w-xl">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-1 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                  ${i + 1 < step ? 'bg-green-500 text-white' : i + 1 === step ? 'bg-violet-600 text-white' : 'bg-stone-200 text-stone-400'}`}>
                  {i + 1 < step ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : i + 1}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${i + 1 === step ? 'text-violet-700' : 'text-stone-400'}`}>{s}</span>
                {i < steps.length - 1 && <div className={`flex-1 h-0.5 mx-2 ${i + 1 < step ? 'bg-green-400' : 'bg-stone-200'}`} />}
              </div>
            ))}
          </div>
        </div>

        <h2 className="text-xl font-bold mb-1">Set up your Business Profile</h2>
        <p className="text-stone-500 text-sm mb-6">Step {step} of {steps.length} — {steps[step-1]}</p>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>}

        {/* ── Step 1: About ───────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="label">Tagline <span className="text-stone-400 text-xs">(short catchy phrase)</span></label>
              <input value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={120}
                className="input" placeholder="e.g. the neighbourhood's most loved hair salon" />
            </div>
            <div>
              <label className="label">About your business</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000}
                rows={4} className="input resize-none"
                placeholder="Tell clients what you offer, your experience, why they should choose you…" />
            </div>
          </div>
        )}

        {/* ── Step 2: Location ────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="label">District *</label>
              <select value={district} onChange={(e) => setDistrict(e.target.value)} className="input">
                <option value="">Select district…</option>
                {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Full Address</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)}
                className="input" placeholder="123 Main Street, Downtown" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Phone</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="input" placeholder="0112345678" />
              </div>
              <div>
                <label className="label">WhatsApp</label>
                <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)}
                  className="input" placeholder="0771234567" />
              </div>
            </div>
            <div>
              <label className="label">Website <span className="text-stone-400 text-xs">(optional)</span></label>
              <input value={website} onChange={(e) => setWebsite(e.target.value)}
                className="input" placeholder="https://your-site.example" />
            </div>
          </div>
        )}

        {/* ── Step 3: Hours ───────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-2">
            <p className="text-sm text-stone-500 mb-3">Set your opening hours for each day. Type "Closed" for days you're not open.</p>
            {DAYS.map((d) => (
              <div key={d} className="flex items-center gap-3">
                <span className="w-10 text-sm font-medium text-stone-600">{DAY_LABEL[d]}</span>
                <input
                  value={hours[d]}
                  onChange={(e) => setHours((h) => ({ ...h, [d]: e.target.value }))}
                  className="input flex-1 text-sm"
                  placeholder="8am – 6pm or Closed"
                />
              </div>
            ))}
          </div>
        )}

        {/* ── Step 4: Photos ──────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <label className="label">Cover Photo <span className="text-stone-400 text-xs">(banner image)</span></label>
              <input type="file" accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                className="text-sm text-stone-600" />
              {coverFile && (
                <img src={URL.createObjectURL(coverFile)} alt="" className="mt-2 w-full h-32 object-cover rounded-xl" />
              )}
            </div>
            <div>
              <label className="label">Gallery Photos <span className="text-stone-400 text-xs">(up to 12)</span></label>
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple
                onChange={(e) => setPhotoFiles(Array.from(e.target.files).slice(0, 12))}
                className="text-sm text-stone-600" />
              {photoFiles.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {photoFiles.map((f, i) => (
                    <img key={i} src={URL.createObjectURL(f)} alt="" className="w-full h-16 object-cover rounded-lg" />
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-stone-400">You can add/update photos anytime from your dashboard.</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8 gap-3">
          {step > 1 ? (
            <button onClick={() => setStep((s) => s - 1)} className="btn-secondary px-6">Back</button>
          ) : (
            <div />
          )}
          {step < steps.length ? (
            <button onClick={() => setStep((s) => s + 1)} className="btn-primary px-8">
              Next →
            </button>
          ) : (
            <button onClick={handleFinish} disabled={saving} className="btn-primary px-8">
              {saving ? 'Saving…' : 'Go Live'}
            </button>
          )}
        </div>

        <button
          onClick={async () => {
            try { await api.post('/businesses/onboarding/complete'); } catch { /* ignore */ }
            navigate('/dashboard/business', { replace: true });
          }}
          className="w-full text-center text-xs text-stone-400 hover:text-stone-600 mt-4 transition-colors"
        >
          Skip for now — set up later
        </button>
      </div>
    </div>
  );
}

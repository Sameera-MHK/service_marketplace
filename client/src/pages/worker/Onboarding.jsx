import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Check, User, Circle } from 'lucide-react';
import api from '../../lib/axios';
import { useCategories } from '../../hooks/useCategories';
import CategoryIcon from '../../components/CategoryIcon';
import { DISTRICTS, LANGUAGES, CURRENCY_SYMBOL } from '../../config/site.js';


const DAYS     = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const LANGS    = LANGUAGES;
const TOTAL    = 4;

// ── Step indicator ─────────────────────────────────────────────────────────
function StepBar({ current }) {
  const labels = ['Your Trade', 'Rates & Area', 'Contact', 'Go Live'];
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between mb-2">
        {labels.map((label, i) => {
          const step   = i + 1;
          const done   = step < current;
          const active = step === current;
          return (
            <div key={label} className="flex flex-col items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-1 transition-all ${
                done   ? 'bg-green-500 text-white' :
                active ? 'bg-gradient-to-br from-violet-600 to-pink-500 text-white shadow-lg shadow-violet-200' :
                         'bg-stone-200 text-stone-400'
              }`}>
                {done ? <Check className="w-4 h-4" strokeWidth={3} /> : step}
              </div>
              <span className={`text-xs text-center leading-tight ${active ? 'text-violet-600 font-semibold' : 'text-stone-400'}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden mt-1">
        <div
          className="h-full bg-violet-600 rounded-full transition-all duration-500"
          style={{ width: `${((current - 1) / (TOTAL - 1)) * 100}%` }}
        />
      </div>
    </div>
  );
}

// ── Step 1 — Trade & Experience ────────────────────────────────────────────
function Step1({ data, onChange }) {
  const { categories } = useCategories();
  const [langInput, setLangInput] = useState('');

  function toggleLang(lang) {
    const cur = data.languages || [];
    onChange('languages', cur.includes(lang) ? cur.filter((l) => l !== lang) : [...cur, lang]);
  }

  function addCustomLang(e) {
    if (e.key === 'Enter' && langInput.trim()) {
      const cur = data.languages || [];
      if (!cur.includes(langInput.trim())) onChange('languages', [...cur, langInput.trim()]);
      setLangInput('');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">What's your trade?</h2>
        <p className="text-stone-500 text-sm">Clients search by category — pick the one that best describes your work.</p>
      </div>

      {/* Category grid */}
      <div>
        <label className="label">Category <span className="text-red-500">*</span></label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
          {categories.map((cat) => (
            <button
              key={cat._id}
              type="button"
              onClick={() => onChange('category', cat.slug)}
              className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${
                data.category === cat.slug
                  ? 'border-violet-500 bg-violet-50 text-violet-800'
                  : 'border-stone-200 hover:border-stone-300 text-stone-700'
              }`}
            >
              <span className={data.category === cat.slug ? 'text-violet-600' : 'text-stone-400'}>
                <CategoryIcon slug={cat.slug} icon={cat.icon} size={16} />
              </span>
              <span className="text-sm font-medium truncate">{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Experience */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Years of Experience <span className="text-red-500">*</span></label>
          <input
            type="number" min="0" max="50"
            className="input"
            placeholder="e.g. 5"
            value={data.experienceYears || ''}
            onChange={(e) => onChange('experienceYears', e.target.value)}
          />
        </div>
        <div>
          <label className="label">Languages you speak</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {LANGS.map((l) => (
              <button
                key={l} type="button"
                onClick={() => toggleLang(l)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-all ${
                  (data.languages || []).includes(l)
                    ? 'border-violet-500 bg-violet-50 text-violet-700'
                    : 'border-stone-200 text-stone-500 hover:border-stone-300'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <input
            className="input text-sm"
            placeholder="Other language + Enter"
            value={langInput}
            onChange={(e) => setLangInput(e.target.value)}
            onKeyDown={addCustomLang}
          />
          {(data.languages || []).filter((l) => !LANGS.includes(l)).map((l) => (
            <span key={l} className="inline-flex items-center gap-1 bg-stone-100 text-stone-700 text-xs px-2 py-1 rounded-full mr-1 mt-1">
              {l}
              <button type="button" onClick={() => toggleLang(l)} className="text-stone-400 hover:text-red-500">×</button>
            </span>
          ))}
        </div>
      </div>

      {/* Bio */}
      <div>
        <label className="label">Short Bio</label>
        <textarea
          className="input resize-none"
          rows={3}
          maxLength={400}
          placeholder="Tell clients about your skills, specialisations and work style…"
          value={data.bio || ''}
          onChange={(e) => onChange('bio', e.target.value)}
        />
        <p className="text-xs text-stone-400 text-right mt-1">{(data.bio || '').length}/400</p>
      </div>
    </div>
  );
}

// ── Step 2 — Rates & Service Area ──────────────────────────────────────────
function Step2({ data, onChange }) {
  function toggleDistrict(d) {
    const cur = data.serviceDistricts || [];
    onChange('serviceDistricts', cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]);
  }

  function toggleDay(day) {
    const cur = data.availableDays || [];
    onChange('availableDays', cur.includes(day) ? cur.filter((x) => x !== day) : [...cur, day]);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">Rates & working area</h2>
        <p className="text-stone-500 text-sm">Clients need to know your price range and where you operate.</p>
      </div>

      {/* Day rate */}
      <div>
        <label className="label">Day Rate Range ({CURRENCY_SYMBOL}) <span className="text-red-500">*</span></label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <input
              type="number" min="0"
              className="input"
              placeholder="Min — e.g. 3000"
              value={data.dayRateMin || ''}
              onChange={(e) => onChange('dayRateMin', e.target.value)}
            />
            <p className="text-xs text-stone-400 mt-1">Minimum / day</p>
          </div>
          <div>
            <input
              type="number" min="0"
              className="input"
              placeholder="Max — e.g. 6000"
              value={data.dayRateMax || ''}
              onChange={(e) => onChange('dayRateMax', e.target.value)}
            />
            <p className="text-xs text-stone-400 mt-1">Maximum / day</p>
          </div>
        </div>
      </div>

      {/* Home district */}
      <div>
        <label className="label">Your Home District <span className="text-red-500">*</span></label>
        <select className="input" value={data.district || ''} onChange={(e) => onChange('district', e.target.value)}>
          <option value="">Select district…</option>
          {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Service districts */}
      <div>
        <label className="label">Districts You'll Travel To</label>
        <p className="text-xs text-stone-400 mb-2">Leave blank to work in your home district only</p>
        <div className="flex flex-wrap gap-2">
          {DISTRICTS.map((d) => (
            <button
              key={d} type="button"
              onClick={() => toggleDistrict(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-all ${
                (data.serviceDistricts || []).includes(d)
                  ? 'border-violet-500 bg-violet-50 text-violet-700'
                  : 'border-stone-200 text-stone-500 hover:border-stone-300'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Available days */}
      <div>
        <label className="label">Available Days</label>
        <div className="flex gap-2 flex-wrap">
          {DAYS.map((day) => (
            <button
              key={day} type="button"
              onClick={() => toggleDay(day)}
              className={`w-12 h-10 rounded-lg text-sm font-semibold border-2 transition-all ${
                (data.availableDays || []).includes(day)
                  ? 'border-violet-500 bg-gradient-to-br from-violet-600 to-pink-500 text-white'
                  : 'border-stone-200 text-stone-500 hover:border-stone-300'
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Step 3 — Contact & Photos ──────────────────────────────────────────────
function Step3({ data, onChange, onPhotoChange, photoPreview, onCoverChange, coverPreview }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">Contact details & photos</h2>
        <p className="text-stone-500 text-sm">How clients and SkillHub will reach you. Photos build trust.</p>
      </div>

      {/* Cover photo — banner image */}
      <div>
        <label className="label">Cover Photo <span className="text-stone-400 text-xs">(banner image)</span></label>
        <div className="relative w-full h-32 rounded-xl border-2 border-dashed border-stone-300 bg-stone-100 overflow-hidden">
          {coverPreview ? (
            <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-stone-400">
              
              <span className="text-xs mt-1">No cover yet</span>
            </div>
          )}
          <label className="absolute bottom-2 right-2 btn-secondary text-xs py-1 px-2 cursor-pointer">
            {coverPreview ? 'Change' : 'Upload Cover'}
            <input type="file" accept="image/*" className="hidden" onChange={onCoverChange} />
          </label>
        </div>
        <p className="text-xs text-stone-400 mt-1">JPG or PNG · Max 5 MB · Recommended 1200×400</p>
      </div>

      {/* Profile photo — small avatar */}
      <div>
        <label className="label">Profile Photo</label>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-stone-100 border-2 border-dashed border-stone-300 flex items-center justify-center overflow-hidden flex-shrink-0">
            {photoPreview ? (
              <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <User className="w-8 h-8 text-stone-300" strokeWidth={1.5} />
            )}
          </div>
          <div>
            <label className="btn-secondary text-sm py-2 cursor-pointer inline-block">
              {photoPreview ? 'Change Photo' : 'Upload Photo'}
              <input type="file" accept="image/*" className="hidden" onChange={onPhotoChange} />
            </label>
            <p className="text-xs text-stone-400 mt-1">JPG or PNG · Max 5 MB · Square crop recommended</p>
          </div>
        </div>
      </div>

      {/* Phone */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Mobile Number <span className="text-red-500">*</span></label>
          <input
            type="tel"
            className="input"
            placeholder="07X XXX XXXX"
            value={data.phone || ''}
            onChange={(e) => onChange('phone', e.target.value)}
          />
        </div>
        <div>
          <label className="label">WhatsApp Number</label>
          <input
            type="tel"
            className="input"
            placeholder="Same as mobile or different"
            value={data.whatsappNumber || ''}
            onChange={(e) => onChange('whatsappNumber', e.target.value)}
          />
          <p className="text-xs text-stone-400 mt-1">Clients can message you directly</p>
        </div>
      </div>
    </div>
  );
}

// ── Step 4 — Review & Go Live ──────────────────────────────────────────────
function Step4({ data, photoPreview, coverPreview }) {
  const { categories } = useCategories();
  const cat = categories.find((c) => c.slug === data.category);

  const checks = [
    { label: 'Category selected',    done: !!data.category },
    { label: 'Experience added',     done: !!data.experienceYears },
    { label: 'Rates set',            done: !!(data.dayRateMin && data.dayRateMax) },
    { label: 'Home district set',    done: !!data.district },
    { label: 'Phone number added',   done: !!data.phone },
    { label: 'Profile photo',        done: !!photoPreview },
    { label: 'Cover photo',          done: !!coverPreview },
    { label: 'Bio written',          done: !!(data.bio && data.bio.length > 20) },
  ];

  const score = checks.filter((c) => c.done).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">Ready to go live!</h2>
        <p className="text-stone-500 text-sm">Review your setup before we publish your profile to clients.</p>
      </div>

      {/* Profile completeness */}
      <div className="card bg-gradient-to-r from-violet-50 to-pink-50 border-violet-200">
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-stone-800">Profile Strength</p>
          <span className="text-lg font-black text-violet-600">{Math.round((score / checks.length) * 100)}%</span>
        </div>
        <div className="h-2 bg-violet-100 rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-violet-600 rounded-full transition-all"
            style={{ width: `${(score / checks.length) * 100}%` }}
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          {checks.map((c) => (
            <div key={c.label} className="flex items-center gap-2 text-sm">
              {c.done
                ? <Check className="w-4 h-4 text-green-500 shrink-0" strokeWidth={2.5} />
                : <Circle className="w-4 h-4 text-stone-300 shrink-0" strokeWidth={1.5} />
              }
              <span className={c.done ? 'text-stone-700' : 'text-stone-400'}>{c.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Summary card */}
      <div className="card space-y-3 text-sm">
        <h3 className="font-semibold text-stone-700">Your Profile Summary</h3>
        <div className="grid grid-cols-2 gap-y-2 text-stone-600">
          <span className="text-stone-400">Category</span>
          <span className="font-medium flex items-center gap-1.5">
            {cat && <CategoryIcon slug={cat.slug} icon={cat.icon} size={14} className="text-violet-600" />}
            {cat?.name || <span className="text-red-400">Not set</span>}
          </span>
          <span className="text-stone-400">Experience</span>
          <span className="font-medium">{data.experienceYears ? `${data.experienceYears} years` : <span className="text-red-400">Not set</span>}</span>
          <span className="text-stone-400">Day Rate</span>
          <span className="font-medium">
            {data.dayRateMin && data.dayRateMax
              ? `${CURRENCY_SYMBOL}${Number(data.dayRateMin).toLocaleString()} – ${Number(data.dayRateMax).toLocaleString()}`
              : <span className="text-red-400">Not set</span>}
          </span>
          <span className="text-stone-400">District</span>
          <span className="font-medium">{data.district || <span className="text-red-400">Not set</span>}</span>
          <span className="text-stone-400">Phone</span>
          <span className="font-medium">{data.phone || <span className="text-red-400">Not set</span>}</span>
          {(data.serviceDistricts || []).length > 0 && (
            <>
              <span className="text-stone-400">Service Areas</span>
              <span className="font-medium">{data.serviceDistricts.slice(0, 3).join(', ')}{data.serviceDistricts.length > 3 ? ` +${data.serviceDistricts.length - 3}` : ''}</span>
            </>
          )}
        </div>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2 text-sm text-blue-800">
        <p className="font-semibold">Tips to get more leads</p>
        <ul className="space-y-1 text-blue-700 list-disc list-inside">
          <li>Upload your ID in Profile Settings to get the verified badge</li>
          <li>Add portfolio photos to show your past work</li>
          <li>Keep your SkillHub Score high by responding quickly and completing jobs</li>
          <li>Upgrade to Pro for unlimited leads</li>
        </ul>
      </div>
    </div>
  );
}

// ── Main Onboarding Page ───────────────────────────────────────────────────
export default function WorkerOnboarding() {
  const navigate  = useNavigate();
  const qc        = useQueryClient();
  const [step, setStep]           = useState(1);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');

  const [data, setData] = useState({
    category: '', experienceYears: '', bio: '', languages: [],
    dayRateMin: '', dayRateMax: '', district: '', serviceDistricts: [], availableDays: [],
    phone: '', whatsappNumber: '',
  });

  function onChange(key, value) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function onPhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function onCoverChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  // Returns the first missing-field message for the current step, or '' if ready
  function missingHint() {
    if (step === 1 && !data.category)        return 'Select your trade category';
    if (step === 1 && !data.experienceYears) return 'Enter your years of experience';
    if (step === 2 && !data.dayRateMin)      return 'Enter your minimum day rate';
    if (step === 2 && !data.dayRateMax)      return 'Enter your maximum day rate';
    if (step === 2 && !data.district)        return 'Select your home district';
    if (step === 3 && !data.phone)           return 'Enter your mobile number';
    return '';
  }

  const hint       = missingHint();
  const canProceed = !hint;   // step 4 (Go Live) has no required fields so hint is always ''

  async function saveStep(isFinal = false) {
    if (!canProceed) { setError(hint); return; }
    setError('');
    setSaving(true);

    try {
      const fd = new FormData();
      Object.entries(data).forEach(([k, v]) => {
        if (Array.isArray(v)) fd.append(k, JSON.stringify(v));
        else if (v !== '' && v != null) fd.append(k, v);
      });
      fd.append('step', step);
      if (isFinal) fd.append('complete', 'true');
      if (photoFile) fd.append('profilePhoto', photoFile);
      if (coverFile) fd.append('coverPhoto', coverFile);

      await api.post('/workers/onboarding', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (isFinal) {
        // Remove stale cache so the dashboard fetches fresh data on mount
        // (invalidateQueries leaves stale data in place long enough to trigger the onboarding redirect)
        qc.removeQueries({ queryKey: ['workerDashboard'] });
        navigate('/dashboard/worker');
      } else {
        setStep((s) => s + 1);
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to save — please try again');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-pink-50 flex items-start justify-center py-10 px-4">
      <div className="w-full max-w-xl">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center mx-auto mb-2">
            <svg className="w-8 h-8 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-stone-900">Welcome to SkillHub!</h1>
          <p className="text-stone-500 mt-1 text-sm">Let's set up your profile in 4 quick steps so clients can find and book you.</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg shadow-stone-200 p-6 sm:p-8">
          <StepBar current={step} />

          {step === 1 && <Step1 data={data} onChange={onChange} />}
          {step === 2 && <Step2 data={data} onChange={onChange} />}
          {step === 3 && <Step3 data={data} onChange={onChange}
                                onPhotoChange={onPhotoChange} photoPreview={photoPreview}
                                onCoverChange={onCoverChange} coverPreview={coverPreview} />}
          {step === 4 && <Step4 data={data} photoPreview={photoPreview} coverPreview={coverPreview} />}

          {error && (
            <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 pt-6 border-t border-stone-100">
            {/* Missing-field hint — shows above buttons when something is required */}
            {!canProceed && step < TOTAL && (
              <p className="text-xs text-violet-600 text-right mb-3 flex items-center justify-end gap-1">
                {hint} to continue
              </p>
            )}

            <div className="flex items-center justify-between">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => { setError(''); setStep((s) => s - 1); }}
                  className="btn-secondary text-sm py-2"
                  disabled={saving}
                >
                  ← Back
                </button>
              ) : (
                <div />
              )}

              {step < TOTAL ? (
                <button
                  type="button"
                  onClick={() => saveStep(false)}
                  disabled={saving || !canProceed}
                  className="btn-primary px-8"
                  title={hint ? `${hint} to continue` : ''}
                >
                  {saving ? 'Saving…' : 'Continue →'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => saveStep(true)}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-2.5 rounded-xl transition-colors disabled:opacity-60"
                >
                  {saving ? 'Going live…' : 'Go Live!'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Skip link */}
        <p className="text-center mt-4 text-xs text-stone-400">
          Want to do this later?{' '}
          <button
            type="button"
            onClick={() => {
              api.post('/workers/onboarding', { complete: 'true' }).catch(() => {});
              qc.removeQueries({ queryKey: ['workerDashboard'] });
              navigate('/dashboard/worker');
            }}
            className="underline hover:text-stone-600"
          >
            Skip for now
          </button>
        </p>
      </div>
    </div>
  );
}

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Check, X as XIcon, UserCog } from 'lucide-react';
import api from '../../lib/axios';
import { useCategories } from '../../hooks/useCategories';
import { AvatarWithFallback } from '../../components/Avatar';
import SocialLinksForm from '../../components/SocialLinksForm';
import DashSubPageWrapper from '../../components/DashSubPageWrapper';
import { DISTRICTS, LANGUAGES, CURRENCY_SYMBOL } from '../../config/site.js';


const ALL_DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const ALL_LANGUAGES = LANGUAGES;

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
        active ? 'bg-gradient-to-br from-violet-600 to-pink-500 text-white' : 'text-stone-600 hover:bg-stone-100'
      }`}
    >
      {children}
    </button>
  );
}

function SaveBar({ isPending, onReset }) {
  return (
    <div className="flex gap-3 pt-4 border-t border-stone-100 mt-4">
      <button type="submit" className="btn-primary" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save Changes'}
      </button>
      <button type="button" onClick={onReset} className="btn-secondary">Reset</button>
    </div>
  );
}

// ── Identity tab ────────────────────────────────────────────────────────────

function IdentityTab({ user }) {
  const qc = useQueryClient();
  const [idFront, setNicFront] = useState(null);
  const [idBack, setNicBack] = useState(null);
  const [idNumber, setNicNumber] = useState(user?.idNumber || '');
  const [profileFile, setProfileFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState(user?.profilePhoto || null);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(user?.coverPhoto || null);
  const frontRef = useRef();
  const backRef = useRef();
  const photoRef = useRef();
  const coverRef = useRef();

  const photoMutation = useMutation({
    mutationFn: (fd) => api.put('/workers/profile/photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => qc.invalidateQueries(['workerDashboard']),
  });

  const coverMutation = useMutation({
    mutationFn: (fd) => api.put('/workers/profile/cover', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => qc.invalidateQueries(['workerDashboard']),
  });

  const idMutation = useMutation({
    mutationFn: (fd) => api.put('/workers/profile/idDoc', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => qc.invalidateQueries(['workerDashboard']),
  });

  function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setProfileFile(file);
    setProfilePreview(URL.createObjectURL(file));
  }

  function handleUploadPhoto() {
    if (!profileFile) return;
    const fd = new FormData();
    fd.append('profilePhoto', profileFile);
    photoMutation.mutate(fd);
  }

  function handleCoverChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  function handleUploadCover() {
    if (!coverFile) return;
    const fd = new FormData();
    fd.append('coverPhoto', coverFile);
    coverMutation.mutate(fd);
  }

  function handleSubmitNic() {
    const fd = new FormData();
    if (idNumber) fd.append('idNumber', idNumber);
    if (idFront) fd.append('idFront', idFront);
    if (idBack) fd.append('idBack', idBack);
    idMutation.mutate(fd);
  }

  return (
    <div className="space-y-6">

      {/* Profile photo */}
      <div className="card">
        <h3 className="font-semibold mb-4">Profile Photo</h3>
        <div className="flex items-center gap-5">
          <AvatarWithFallback
            name={user?.name}
            photo={profilePreview}
            size={96}
            className="border-2 border-violet-200"
          />
          <div>
            <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            <button type="button" onClick={() => photoRef.current.click()} className="btn-secondary text-sm mb-2">
              Choose Photo
            </button>
            {profileFile && (
              <button type="button" onClick={handleUploadPhoto} className="btn-primary text-sm ml-2" disabled={photoMutation.isPending}>
                {photoMutation.isPending ? 'Uploading…' : 'Upload'}
              </button>
            )}
            <p className="text-xs text-stone-400 mt-1">JPG or PNG · max 5MB · square crop recommended</p>
            {photoMutation.isSuccess && <p className="text-green-600 text-xs mt-1 flex items-center gap-0.5"><Check className="w-3.5 h-3.5" strokeWidth={2.5} />Photo updated</p>}
          </div>
        </div>
      </div>

      {/* Cover Photo */}
      <div className="card">
        <h3 className="font-semibold mb-1">Cover Photo</h3>
        <p className="text-xs text-stone-400 mb-4">Shown as a banner at the top of your public profile. Recommended: 1200 × 400 px, JPG or PNG.</p>

        {/* Preview banner */}
        <div
          className="relative w-full h-36 rounded-xl overflow-hidden bg-gradient-to-br from-violet-100 via-purple-50 to-pink-100 mb-4 border border-stone-200 cursor-pointer group"
          onClick={() => coverRef.current.click()}
        >
          {coverPreview ? (
            <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-stone-400">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M6.75 21h10.5A2.25 2.25 0 0019.5 18.75v-12A2.25 2.25 0 0017.25 4.5H6.75A2.25 2.25 0 004.5 6.75v12A2.25 2.25 0 006.75 21zM16.5 8.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
              <span className="text-xs">Click to choose cover photo</span>
            </div>
          )}
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-white text-xs font-semibold bg-black/40 px-3 py-1.5 rounded-full">Change cover</span>
          </div>
        </div>

        <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => coverRef.current.click()} className="btn-secondary text-sm">
            Choose Photo
          </button>
          {coverFile && (
            <button type="button" onClick={handleUploadCover} className="btn-primary text-sm" disabled={coverMutation.isPending}>
              {coverMutation.isPending ? 'Uploading…' : 'Upload Cover'}
            </button>
          )}
          {coverMutation.isSuccess && (
            <p className="text-green-600 text-xs flex items-center gap-1"><Check className="w-3.5 h-3.5" strokeWidth={2.5} />Cover updated</p>
          )}
        </div>
      </div>

      {/* ID */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="font-semibold">Government-issued photo ID</h3>
          {user?.idVerified ? (
            <span className="badge bg-green-100 text-green-700 flex items-center gap-0.5"><Check className="w-3.5 h-3.5" strokeWidth={2.5} />Verified</span>
          ) : user?.idSubmitted ? (
            <span className="badge bg-violet-100 text-violet-700">Pending Verification</span>
          ) : (
            <span className="badge bg-stone-100 text-stone-500">Not Submitted</span>
          )}
        </div>

        {user?.idVerified ? (
          <p className="text-sm text-stone-500">Your ID has been verified by the SkillHub team. This adds +40 to your Trust Score.</p>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-stone-500">Submit your ID to get verified — adds +40 to your SkillHub Trust Score and removes the 70-point cap.</p>

            <div>
              <label className="label">ID Number</label>
              <input
                className="input max-w-xs"
                placeholder="e.g. 199512345678"
                value={idNumber}
                onChange={(e) => setNicNumber(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">ID Front Photo</label>
                <input ref={frontRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => setNicFront(e.target.files[0])} />
                <button type="button" onClick={() => frontRef.current.click()}
                  className={`w-full border-2 border-dashed rounded-xl p-6 text-center transition-colors ${idFront ? 'border-violet-400 bg-violet-50' : 'border-stone-200 hover:border-stone-300'}`}>
                  {idFront ? (
                    <div>
                      
                      <p className="text-sm font-medium text-violet-700 truncate">{idFront.name}</p>
                    </div>
                  ) : (
                    <div>
                      
                      <p className="text-sm text-stone-400">Upload front</p>
                    </div>
                  )}
                </button>
              </div>
              <div>
                <label className="label">ID Back Photo</label>
                <input ref={backRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => setNicBack(e.target.files[0])} />
                <button type="button" onClick={() => backRef.current.click()}
                  className={`w-full border-2 border-dashed rounded-xl p-6 text-center transition-colors ${idBack ? 'border-violet-400 bg-violet-50' : 'border-stone-200 hover:border-stone-300'}`}>
                  {idBack ? (
                    <div>
                      
                      <p className="text-sm font-medium text-violet-700 truncate">{idBack.name}</p>
                    </div>
                  ) : (
                    <div>
                      
                      <p className="text-sm text-stone-400">Upload back</p>
                    </div>
                  )}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmitNic}
              disabled={idMutation.isPending || (!idFront && !idBack && !idNumber)}
              className="btn-primary"
            >
              {idMutation.isPending ? 'Submitting…' : 'Submit ID for Verification'}
            </button>
            {idMutation.isSuccess && (
              <p className="text-green-600 text-sm flex items-center gap-1"><Check className="w-4 h-4 shrink-0" strokeWidth={2.5} />ID submitted — admin will verify within 24 hours</p>
            )}
            {idMutation.isError && (
              <p className="text-red-500 text-sm">{idMutation.error?.response?.data?.message || 'Submission failed'}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── District picker dropdown ─────────────────────────────────────────────────

function DistrictPicker({ selected, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  const filtered = DISTRICTS.filter((d) =>
    d.toLowerCase().includes(search.toLowerCase())
  );

  function toggle(d) {
    onChange(selected.includes(d) ? selected.filter((x) => x !== d) : [...selected, d]);
  }

  function handleBlur(e) {
    if (!ref.current?.contains(e.relatedTarget)) {
      setOpen(false);
      setSearch('');
    }
  }

  return (
    <div>
      {/* Selected chips */}
      <div className="flex flex-wrap gap-2 mb-3">
        {selected.map((d) => (
          <span key={d} className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-violet-100 text-violet-700 border border-violet-300">
            {d}
            <button
              type="button"
              onClick={() => toggle(d)}
              className="ml-1 text-violet-400 hover:text-violet-700 leading-none"
            >
              ×
            </button>
          </span>
        ))}
        {/* Add button */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border-2 border-dashed border-violet-300 text-violet-500 hover:border-violet-500 hover:text-violet-700 transition-colors"
        >
          + Add
        </button>
      </div>

      {/* Dropdown */}
      {open && (
        <div ref={ref} onBlur={handleBlur} className="border border-stone-200 rounded-xl shadow-lg bg-white p-3 space-y-2" tabIndex={-1}>
          <p className="text-xs text-stone-500 font-medium">Select all districts you are willing to travel to</p>
          <input
            autoFocus
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search districts…"
            className="input text-sm"
          />
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pt-1">
            {filtered.length === 0 && (
              <p className="text-xs text-stone-400">No districts found</p>
            )}
            {filtered.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => toggle(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  selected.includes(d)
                    ? 'border-violet-500 bg-violet-50 text-violet-700'
                    : 'border-stone-200 text-stone-600 hover:border-stone-300'
                }`}
              >
                {selected.includes(d) && <Check className="w-3 h-3 mr-0.5 inline" strokeWidth={2.5} />}{d}
              </button>
            ))}
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-stone-100">
            <span className="text-xs text-stone-400">{selected.length} selected</span>
            <button
              type="button"
              onClick={() => { setOpen(false); setSearch(''); }}
              className="text-xs text-violet-600 hover:underline"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Availability tab ────────────────────────────────────────────────────────

function AvailabilityTab({ user, profile }) {
  const qc = useQueryClient();
  const { register, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues: {
      phone: user?.phone || '',
      whatsappNumber: user?.whatsappNumber || '',
      district: user?.location?.district || '',
      province: user?.location?.province || '',
      acceptingWork: profile?.acceptingWork ?? true,
      availableDays: profile?.availableDays || [],
      serviceDistricts: profile?.serviceDistricts || [],
    },
  });

  const selectedDays = watch('availableDays') || [];
  const selectedDistricts = watch('serviceDistricts') || [];
  const acceptingWork = watch('acceptingWork');

  function toggleDay(day) {
    const current = selectedDays;
    setValue('availableDays', current.includes(day) ? current.filter((d) => d !== day) : [...current, day]);
  }

  const mutation = useMutation({
    mutationFn: (data) => api.put('/workers/profile', data),
    onSuccess: () => qc.invalidateQueries(['workerDashboard']),
  });

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">

      {/* Accepting work toggle */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Accepting New Work</h3>
            <p className="text-sm text-stone-500 mt-0.5">Turn off if you're fully booked or unavailable</p>
          </div>
          <button
            type="button"
            onClick={() => setValue('acceptingWork', !acceptingWork)}
            className={`relative w-12 h-6 rounded-full transition-colors ${acceptingWork ? 'bg-violet-600' : 'bg-stone-300'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${acceptingWork ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      {/* Contact */}
      <div className="card space-y-4">
        <h3 className="font-semibold">Contact Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Mobile Number</label>
            <input {...register('phone')} className="input" placeholder="07X XXXXXXX" />
          </div>
          <div>
            <label className="label">WhatsApp Number</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-stone-400">WA</span>
              <input {...register('whatsappNumber')} className="input pl-8" placeholder="07X XXXXXXX" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Home District</label>
            <select {...register('district')} className="input">
              <option value="">Select district</option>
              {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Province</label>
            <input {...register('province')} className="input" placeholder="Western" />
          </div>
        </div>
      </div>

      {/* Available days */}
      <div className="card">
        <h3 className="font-semibold mb-3">Available Days</h3>
        <div className="flex gap-2 flex-wrap">
          {ALL_DAYS.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                selectedDays.includes(day) ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-stone-200 text-stone-600 hover:border-stone-300'
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      {/* Service districts */}
      <div className="card">
        <h3 className="font-semibold mb-1">Service Districts</h3>
        <DistrictPicker
          selected={selectedDistricts}
          onChange={(val) => setValue('serviceDistricts', val)}
        />
      </div>

      <SaveBar isPending={mutation.isPending} onReset={() => reset()} />
      {mutation.isSuccess && <p className="text-green-600 text-sm flex items-center gap-1"><Check className="w-4 h-4" strokeWidth={2.5} />Availability saved</p>}
    </form>
  );
}

// ── Work Details tab ────────────────────────────────────────────────────────

function WorkDetailsTab({ profile }) {
  const qc = useQueryClient();
  const { categories } = useCategories();
  const { register, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues: {
      category: profile?.category || '',
      bio: profile?.pendingBio || profile?.bio || '',
      experienceYears: profile?.experienceYears || '',
      dayRateMin: profile?.dayRateMin || '',
      dayRateMax: profile?.dayRateMax || '',
      languages: profile?.languages || [],
    },
  });

  const selectedLangs = watch('languages') || [];

  function toggleLang(lang) {
    const current = selectedLangs;
    setValue('languages', current.includes(lang) ? current.filter((l) => l !== lang) : [...current, lang]);
  }

  const mutation = useMutation({
    mutationFn: (data) => api.put('/workers/profile', { ...data, languages: JSON.stringify(data.languages) }),
    onSuccess: () => qc.invalidateQueries(['workerDashboard']),
  });

  const bioStatus = profile?.bioStatus;

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">
      <div className="card space-y-4">
        <h3 className="font-semibold">Trade Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Category / Trade</label>
            <select {...register('category')} className="input">
              <option value="">Select</option>
              {categories.map((c) => <option key={c._id} value={c.slug}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Years of Experience</label>
            <input {...register('experienceYears')} className="input" type="number" min="0" placeholder="5" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Day Rate Min ({CURRENCY_SYMBOL})</label>
            <input {...register('dayRateMin')} className="input" type="number" placeholder="2500" />
          </div>
          <div>
            <label className="label">Day Rate Max ({CURRENCY_SYMBOL})</label>
            <input {...register('dayRateMax')} className="input" type="number" placeholder="5000" />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-1">
          <label className="label mb-0">About Me / Bio</label>
          {bioStatus === 'pending' && (
            <span className="badge bg-violet-100 text-violet-700 text-xs">Pending Review</span>
          )}
          {bioStatus === 'approved' && (
            <span className="badge bg-green-100 text-green-700 text-xs flex items-center gap-0.5"><Check className="w-3.5 h-3.5" strokeWidth={2.5} />Approved</span>
          )}
          {bioStatus === 'rejected' && (
            <span className="badge bg-red-100 text-red-700 text-xs flex items-center gap-0.5"><XIcon className="w-3.5 h-3.5" strokeWidth={2.5} />Rejected</span>
          )}
        </div>

        {bioStatus === 'pending' && (
          <div className="mb-3 p-3 bg-violet-50 border border-violet-200 rounded-lg text-sm text-violet-800">
            <strong>Your bio update is under review.</strong> The SkillHub team will approve it within 24 hours.
            Your current live bio is still shown to clients until this is approved.
          </div>
        )}
        {bioStatus === 'rejected' && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            <strong>Your last bio was rejected.</strong> Please revise it and resubmit. Keep it professional and factual.
          </div>
        )}

        <textarea {...register('bio')} className="input" rows={4}
          placeholder="Describe your experience, skills, and what makes you stand out…" />
        <p className="text-xs text-stone-400 mt-1">
          {bioStatus === 'pending'
            ? 'You can update and resubmit — the latest version will be reviewed.'
            : 'Clients read this before booking you · submitted bios go through a quick review'}
        </p>
      </div>

      <div className="card">
        <h3 className="font-semibold mb-3">Languages Spoken</h3>
        <div className="flex gap-3">
          {ALL_LANGUAGES.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => toggleLang(lang)}
              className={`px-5 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                selectedLangs.includes(lang) ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-stone-200 text-stone-600 hover:border-stone-300'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      <SaveBar isPending={mutation.isPending} onReset={() => reset()} />
      {mutation.isSuccess && <p className="text-green-600 text-sm flex items-center gap-1"><Check className="w-4 h-4" strokeWidth={2.5} />Work details saved</p>}
    </form>
  );
}

// ── Documents tab ────────────────────────────────────────────────────────────

function DocumentsTab({ profile }) {
  const qc = useQueryClient();
  const [tradeCertFile, setTradeCertFile] = useState(null);
  const [certName, setCertName] = useState('');
  const [certIssuedBy, setCertIssuedBy] = useState('');
  const tradeCertRef = useRef();

  const mutation = useMutation({
    mutationFn: (fd) => api.put('/workers/profile/certifications', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => { qc.invalidateQueries(['workerDashboard']); setTradeCertFile(null); },
  });

  function handleSubmit(e) {
    e.preventDefault();
    if (!tradeCertFile) return;
    const fd = new FormData();
    fd.append('tradeCert', tradeCertFile);
    fd.append('certName', certName);
    fd.append('certIssuedBy', certIssuedBy);
    mutation.mutate(fd);
  }

  function FileUploadBox({ label, file, onFile, inputRef, badge, badgeColor, optional }) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="font-semibold">{label}</h3>
          {optional && <span className="badge bg-stone-100 text-stone-500">Optional</span>}
          {badge && <span className={`badge ${badgeColor}`}>{badge}</span>}
        </div>
        <input ref={inputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => onFile(e.target.files[0])} />
        <button
          type="button"
          onClick={() => inputRef.current.click()}
          className={`w-full border-2 border-dashed rounded-xl p-8 text-center transition-colors ${file ? 'border-violet-400 bg-violet-50' : 'border-stone-200 hover:border-stone-300'}`}
        >
          {file ? (
            <>
              
              <p className="text-sm font-medium text-violet-700">{file.name}</p>
              <p className="text-xs text-stone-400 mt-1">Click to change</p>
            </>
          ) : (
            <>
              
              <p className="text-sm text-stone-500">Click to upload (JPG, PNG or PDF)</p>
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 text-sm text-violet-800">
        <strong>Why upload documents?</strong> Trade certifications add +30 to your Trust Score. A higher Trust Score means a higher SkillHub Score — which means more bookings.
      </div>

      <FileUploadBox
        label="Trade Certification"
        file={tradeCertFile}
        onFile={setTradeCertFile}
        inputRef={tradeCertRef}
        badge={profile?.tradeCertification ? 'Uploaded' : null}
        badgeColor="bg-green-100 text-green-700"
      />

      {tradeCertFile && (
        <div className="card space-y-3">
          <h4 className="font-medium text-sm">Certification Details</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Certificate Name</label>
              <input className="input" placeholder="e.g. City & Guilds Level 3" value={certName} onChange={(e) => setCertName(e.target.value)} />
            </div>
            <div>
              <label className="label">Issued By</label>
              <input className="input" placeholder="e.g. National Skills Authority" value={certIssuedBy} onChange={(e) => setCertIssuedBy(e.target.value)} />
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary" disabled={mutation.isPending || !tradeCertFile}>
          {mutation.isPending ? 'Uploading…' : 'Upload Documents'}
        </button>
      </div>
      {mutation.isSuccess && <p className="text-green-600 text-sm flex items-center gap-1"><Check className="w-4 h-4" strokeWidth={2.5} />Documents uploaded — score updated</p>}
      {mutation.isError && <p className="text-red-500 text-sm">{mutation.error?.response?.data?.message || 'Upload failed'}</p>}
    </form>
  );
}

// ── Portfolio tab ────────────────────────────────────────────────────────────

function PortfolioTab({ profile }) {
  const qc = useQueryClient();
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const inputRef = useRef();

  const uploadMutation = useMutation({
    mutationFn: (fd) => api.put('/workers/profile/portfolio', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => { qc.invalidateQueries(['workerDashboard']); setFiles([]); setPreviews([]); },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ url, pending }) => api.delete('/workers/profile/portfolio', { data: { url, pending } }),
    onSuccess: () => qc.invalidateQueries(['workerDashboard']),
  });

  function handleFileChange(e) {
    const selected = Array.from(e.target.files);
    setFiles(selected);
    setPreviews(selected.map((f) => URL.createObjectURL(f)));
  }

  function handleUpload() {
    const fd = new FormData();
    files.forEach((f) => fd.append('photos', f));
    uploadMutation.mutate(fd);
  }

  const approved = profile?.portfolioPhotos || [];
  const pending  = profile?.pendingPortfolioPhotos || [];
  const isEmpty  = approved.length === 0 && pending.length === 0;

  return (
    <div className="space-y-5">
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold">Portfolio Photos</h3>
            <p className="text-sm text-stone-400 mt-0.5">Show clients examples of your completed work</p>
          </div>
          <button type="button" onClick={() => inputRef.current.click()} className="btn-secondary text-sm">
            + Add Photos
          </button>
        </div>

        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />

        {/* Local previews before upload */}
        {previews.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium text-stone-600 mb-2">{previews.length} new photo(s) ready to upload</p>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {previews.map((p, i) => (
                <img key={i} src={p} alt="" className="w-full h-20 object-cover rounded-lg border border-violet-200" />
              ))}
            </div>
            <button onClick={handleUpload} className="btn-primary text-sm" disabled={uploadMutation.isPending}>
              {uploadMutation.isPending ? 'Uploading…' : `Upload ${previews.length} Photo(s)`}
            </button>
            {uploadMutation.isSuccess && (
              <p className="text-green-600 text-xs mt-2 flex items-center gap-0.5"><Check className="w-3.5 h-3.5" strokeWidth={2.5} />Submitted for review — admin will approve within 24 hours</p>
            )}
          </div>
        )}

        {/* Pending photos — awaiting admin approval */}
        {pending.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-sm font-semibold text-stone-700">Pending Review</h4>
              <span className="badge bg-violet-100 text-violet-700 text-xs">{pending.length} photo{pending.length !== 1 ? 's' : ''}</span>
            </div>
            <p className="text-xs text-violet-700 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2 mb-3">
              These photos are awaiting admin approval and won't appear on your public profile yet.
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {pending.map((photo, i) => (
                <div key={i} className="relative group">
                  <img src={photo.url} alt="Pending portfolio" className="w-full h-24 object-cover rounded-lg opacity-70" />
                  {/* Pending overlay badge */}
                  <div className="absolute inset-0 rounded-lg bg-violet-600/10 border-2 border-violet-400 border-dashed pointer-events-none" />
                  <div className="absolute bottom-0 left-0 right-0 bg-violet-600/80 text-white text-[10px] text-center py-0.5 rounded-b-lg">
                    Pending review
                  </div>
                  {/* Delete button */}
                  <button
                    onClick={() => deleteMutation.mutate({ url: photo.url, pending: true })}
                    disabled={deleteMutation.isPending}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Approved live photos */}
        {approved.length > 0 && (
          <div>
            {pending.length > 0 && (
              <h4 className="text-sm font-semibold text-stone-700 mb-3">Live on Profile</h4>
            )}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {approved.map((url, i) => (
                <div key={i} className="relative group">
                  <img src={url} alt="Portfolio" className="w-full h-24 object-cover rounded-lg" />
                  <button
                    onClick={() => deleteMutation.mutate({ url, pending: false })}
                    disabled={deleteMutation.isPending}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {isEmpty && previews.length === 0 && (
          <div className="text-center py-8 text-stone-400 border-2 border-dashed border-stone-200 rounded-xl">
            
            <p className="text-sm">No portfolio photos yet — add some to attract more clients</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Social links tab ─────────────────────────────────────────────────────────
function SocialTab({ user }) {
  return (
    <div className="card">
      <h2 className="font-bold text-lg mb-1">Social Media Links</h2>
      <SocialLinksForm
        initial={user?.socialLinks || {}}
        onSave={(links) =>
          api.put('/users/me', { socialLinks: JSON.stringify(links) })
        }
      />
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'identity',     label: 'Identity' },
  { id: 'availability', label: 'Availability' },
  { id: 'work',         label: 'Work Details' },
  { id: 'documents',    label: 'Documents' },
  { id: 'portfolio',    label: 'Portfolio' },
  { id: 'social',       label: 'Social' },
];

export default function ProfileSettings() {
  const [tab, setTab] = useState('identity');

  const { data, isLoading } = useQuery({
    queryKey: ['workerDashboard'],
    queryFn: () => api.get('/workers/dashboard').then((r) => r.data.data),
  });

  if (isLoading) return <div className="text-center py-20 text-stone-400">Loading…</div>;

  const { profile, user } = data || {};

  return (
    <DashSubPageWrapper
      title={user?.name}
      subtitle={`${profile?.category?.replace(/_/g, ' ')} · Profile Settings`}
      icon={<UserCog className="w-5 h-5 text-white" strokeWidth={2} />}
      backTo="/dashboard/worker"
      maxWidth="max-w-3xl"
    >
      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-6 scrollbar-hide">
        {TABS.map((t) => (
          <TabBtn key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </TabBtn>
        ))}
      </div>

      {tab === 'identity'     && <IdentityTab user={user} profile={profile} />}
      {tab === 'availability' && <AvailabilityTab user={user} profile={profile} />}
      {tab === 'work'         && <WorkDetailsTab profile={profile} />}
      {tab === 'documents'    && <DocumentsTab profile={profile} />}
      {tab === 'portfolio'    && <PortfolioTab profile={profile} />}
      {tab === 'social'       && <SocialTab user={user} />}
    </DashSubPageWrapper>
  );
}

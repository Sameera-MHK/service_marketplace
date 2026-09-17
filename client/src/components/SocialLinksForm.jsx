/**
 * Reusable social links editor.
 * Props:
 *   initial  – { facebook, instagram, youtube, tiktok, linkedin, whatsapp, website }
 *   onSave   – async fn called with the links object; should return/throw
 */
import { useState } from 'react';

const FIELDS = [
  {
    key: 'facebook',
    label: 'Facebook',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.931-1.956 1.887v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
      </svg>
    ),
    placeholder: 'https://facebook.com/yourpage',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    key: 'instagram',
    label: 'Instagram',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
      </svg>
    ),
    placeholder: 'https://instagram.com/yourhandle',
    color: 'text-pink-600',
    bg: 'bg-pink-50',
  },
  {
    key: 'youtube',
    label: 'YouTube',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/>
      </svg>
    ),
    placeholder: 'https://youtube.com/@yourchannel',
    color: 'text-red-600',
    bg: 'bg-red-50',
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.16 8.16 0 004.77 1.52V6.75a4.85 4.85 0 01-1-.06z"/>
      </svg>
    ),
    placeholder: '@yourhandle',
    color: 'text-stone-800',
    bg: 'bg-stone-100',
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    placeholder: 'https://linkedin.com/in/yourprofile',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    ),
    placeholder: '0771234567',
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
  {
    key: 'website',
    label: 'Website',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
      </svg>
    ),
    placeholder: 'https://your-website.example',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
  },
];

export default function SocialLinksForm({ initial = {}, onSave }) {
  const [links, setLinks] = useState({
    facebook:  initial.facebook  || '',
    instagram: initial.instagram || '',
    youtube:   initial.youtube   || '',
    tiktok:    initial.tiktok    || '',
    linkedin:  initial.linkedin  || '',
    whatsapp:  initial.whatsapp  || '',
    website:   initial.website   || '',
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState('');

  function set(key, val) {
    setLinks((l) => ({ ...l, [key]: val }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      await onSave(links);
      setMsg('saved');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setMsg(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-xs text-stone-500 mb-4">
        Add links to your social media pages. These appear on your public profile and help clients verify and connect with you. All fields are optional.
      </p>

      {FIELDS.map((f) => (
        <div key={f.key} className="flex items-center gap-3">
          {/* Icon badge */}
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${f.bg} ${f.color}`}>
            {f.icon}
          </div>
          <div className="flex-1">
            <input
              value={links[f.key]}
              onChange={(e) => set(f.key, e.target.value)}
              placeholder={f.placeholder}
              className="input text-sm w-full"
              type={f.key === 'whatsapp' ? 'tel' : 'text'}
            />
          </div>
        </div>
      ))}

      {msg && (
        <p className={`text-sm px-3 py-2 rounded-lg flex items-center gap-1.5 ${msg === 'saved' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {msg === 'saved' ? <><svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>Saved</> : msg}
        </p>
      )}

      <div className="pt-2">
        <button type="submit" disabled={saving} className="btn-primary text-sm py-2 px-6">
          {saving ? 'Saving…' : 'Save Social Links'}
        </button>
      </div>
    </form>
  );
}

// ── Display-only: render social icons as a row of links ──────────────────────
export function SocialLinksRow({ socialLinks = {}, className = '' }) {
  if (!socialLinks) return null;

  function waLink(num) {
    const clean = (num || '').replace(/^0/, '94').replace(/\s/g, '');
    return `https://wa.me/${clean}`;
  }

  const items = [
    { key: 'facebook',  href: socialLinks.facebook,  icon: FIELDS[0].icon, color: 'text-blue-600  hover:bg-blue-50',  label: 'Facebook'  },
    { key: 'instagram', href: socialLinks.instagram, icon: FIELDS[1].icon, color: 'text-pink-600  hover:bg-pink-50',  label: 'Instagram' },
    { key: 'youtube',   href: socialLinks.youtube,   icon: FIELDS[2].icon, color: 'text-red-600   hover:bg-red-50',   label: 'YouTube'   },
    { key: 'tiktok',    href: socialLinks.tiktok?.startsWith('http') ? socialLinks.tiktok : `https://tiktok.com/@${(socialLinks.tiktok||'').replace(/^@/,'')}`,
      icon: FIELDS[3].icon, color: 'text-stone-800 hover:bg-stone-100', label: 'TikTok', show: !!socialLinks.tiktok },
    { key: 'linkedin',  href: socialLinks.linkedin,  icon: FIELDS[4].icon, color: 'text-blue-700  hover:bg-blue-50',  label: 'LinkedIn'  },
    { key: 'whatsapp',  href: socialLinks.whatsapp ? waLink(socialLinks.whatsapp) : null,
      icon: FIELDS[5].icon, color: 'text-green-600 hover:bg-green-50',  label: 'WhatsApp' },
    { key: 'website',   href: socialLinks.website,   icon: FIELDS[6].icon, color: 'text-violet-600 hover:bg-violet-50', label: 'Website' },
  ].filter((i) => i.show !== false && i.href);

  if (!items.length) return null;

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      {items.map((item) => (
        <a
          key={item.key}
          href={item.href}
          target="_blank"
          rel="noreferrer noopener"
          title={item.label}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${item.color}`}
        >
          {item.icon}
        </a>
      ))}
    </div>
  );
}

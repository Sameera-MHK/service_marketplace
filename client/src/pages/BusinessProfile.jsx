import { useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Check, Star, MapPin, Clock, Phone, Globe, MessageCircle, Tag, Camera } from 'lucide-react';
import api from '../lib/axios';
import { AvatarWithFallback } from '../components/Avatar';
import { SocialLinksRow } from '../components/SocialLinksForm';
import ContactGate from '../components/ContactGate';
import { useAuthStore } from '../store/authStore';
import SEO from '../components/SEO';
import ShareButton from '../components/ShareButton';
import LivePulse from '../components/LivePulse';
import { SERVICE_AREA, CURRENCY_SYMBOL, COUNTRY_CODE } from '../config/site.js';

const TYPE_LABELS = {
  salon: 'Salon / Spa', barbershop: 'Barbershop', repair_shop: 'Repair Shop',
  catering: 'Catering', photography_studio: 'Photography Studio',
  cleaning_company: 'Cleaning Company', tutoring_centre: 'Tutoring Centre',
  restaurant: 'Restaurant', agency: 'Agency', other: 'Business',
};

const DAYS = ['mon','tue','wed','thu','fri','sat','sun'];
const DAY_LABEL = { mon:'Monday', tue:'Tuesday', wed:'Wednesday', thu:'Thursday', fri:'Friday', sat:'Saturday', sun:'Sunday' };

export default function BusinessProfilePage() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const { pathname } = useLocation();
  const [lightbox, setLightbox] = useState(null);

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['business', id],
    queryFn: () => api.get(`/businesses/${id}`).then((r) => r.data.data),
  });

  if (isLoading) return <div className="text-center py-20 text-stone-400">Loading…</div>;
  if (error || !profile) return <div className="text-center py-20 text-red-500">Business not found.</div>;

  const { isAuthenticated } = profile;
  const owner = profile.userId;
  const hours = profile.openingHours || {};
  const services = profile.services || [];
  const photos = profile.photos || [];
  const today = ['sun','mon','tue','wed','thu','fri','sat'][new Date().getDay()];

  const seoTitle = `${profile.businessName} — ${TYPE_LABELS[profile.businessType]?.replace(/.*?\s/, '') || 'Business'} in ${profile.district || SERVICE_AREA}`;
  const seoDesc  = profile.description
    ? profile.description.slice(0, 145) + (profile.description.length > 145 ? '…' : '')
    : `Visit ${profile.businessName} on SkillHub — ${TYPE_LABELS[profile.businessType] || 'business'} in ${profile.district || SERVICE_AREA}.`;

  const businessSchema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    'name': profile.businessName,
    'description': profile.description,
    'image': profile.coverPhoto || owner?.profilePhoto,
    'address': { '@type': 'PostalAddress', 'addressLocality': profile.district, 'addressCountry': COUNTRY_CODE },
    ...(profile.phone    ? { 'telephone': profile.phone } : {}),
    ...(profile.website  ? { 'url': profile.website }     : {}),
    ...(services.length  ? { 'hasOfferCatalog': { '@type': 'OfferCatalog', 'name': 'Services',
        'itemListElement': services.map((s) => ({
          '@type': 'Offer',
          'itemOffered': { '@type': 'Service', 'name': s.name },
          ...(s.priceMin != null ? { 'price': s.priceMin, 'priceCurrency': DEFAULT_CURRENCY } : {}),
        })) } } : {}),
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <SEO
        title={seoTitle}
        description={seoDesc}
        image={profile.coverPhoto || owner?.profilePhoto || undefined}
        url={pathname}
        type="website"
        schema={businessSchema}
      />

      {/* ── Cover + Header ──────────────────────────────────────────────── */}
      {profile.coverPhoto && (
        <div className="w-full h-52 rounded-2xl overflow-hidden mb-6 relative">
          <img src={profile.coverPhoto} alt={profile.businessName} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        </div>
      )}

      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row gap-5 items-start">
          {/* Avatar */}
          <AvatarWithFallback name={profile.businessName} photo={owner?.profilePhoto} size={80} />

          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-2xl font-bold">{profile.businessName}</h1>
              {profile.isVerified && (
                <span className="inline-flex items-center gap-1 text-xs bg-teal-100 text-teal-800 font-semibold px-2.5 py-0.5 rounded-full border border-teal-200">
                  <Check className="w-3 h-3" strokeWidth={2.5} /> Verified
                </span>
              )}
              {profile.featuredUntil && new Date(profile.featuredUntil) > new Date() && (
                <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-800 font-semibold px-2.5 py-0.5 rounded-full border border-amber-200">
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" strokeWidth={1.5} /> Featured
                </span>
              )}
            </div>

            <p className="text-stone-500 text-sm mb-2">{TYPE_LABELS[profile.businessType] || 'Business'}</p>
            {profile.tagline && <p className="text-stone-700 italic text-sm mb-3">"{profile.tagline}"</p>}
            {profile.description && <p className="text-stone-600 text-sm leading-relaxed mb-3">{profile.description}</p>}

            {/* Location — always public */}
            {profile.district && (
              <p className="text-sm text-stone-500 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                {profile.district}{profile.address ? ` · ${profile.address}` : ''}
              </p>
            )}

            {/* Today's hours — always public */}
            {hours[today] && (
              <p className="text-xs text-stone-400 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3 shrink-0" strokeWidth={1.75} />
                Today: <span className={`font-semibold ${hours[today] === 'Closed' ? 'text-red-500' : 'text-green-600'}`}>{hours[today]}</span>
              </p>
            )}

            {/* Contact + social */}
            <div className="mt-3">
              {isAuthenticated ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-3 text-sm">
                    {profile.phone    && <a href={`tel:${profile.phone}`} className="flex items-center gap-1.5 text-stone-600 hover:text-violet-600 transition-colors"><Phone className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} /> {profile.phone}</a>}
                    {profile.whatsapp && <a href={`https://wa.me/94${profile.whatsapp.replace(/^0/, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-stone-600 hover:text-green-600 transition-colors"><MessageCircle className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} /> WhatsApp</a>}
                    {profile.website  && <a href={profile.website} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-stone-600 hover:text-violet-600 transition-colors"><Globe className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} /> Website</a>}
                  </div>
                  <SocialLinksRow socialLinks={owner?.socialLinks} />
                </div>
              ) : (
                <ContactGate label="phone, WhatsApp & social links" />
              )}
            </div>
          </div>
        </div>

        {/* Enquire CTA + Share */}
        <div className="mt-5 pt-5 border-t border-stone-100">
          <div className="flex items-center gap-3 flex-wrap">
            {!profile.isSuspended && (
              isAuthenticated && user?.role === 'client' ? (
                /* Logged-in client — real contact buttons */
                <>
                  {profile.whatsapp && (
                    <a
                      href={`https://wa.me/94${profile.whatsapp.replace(/^0/, '')}?text=Hi, I found your business on SkillHub. I'd like to enquire about your services.`}
                      target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-all text-sm"
                    >
                      <MessageCircle className="w-4 h-4 shrink-0" strokeWidth={1.75} /> WhatsApp Enquiry
                    </a>
                  )}
                  {profile.phone && (
                    <a href={`tel:${profile.phone}`}
                      className="inline-flex items-center gap-2 btn-secondary text-sm py-2.5 px-5">
                      <Phone className="w-4 h-4 shrink-0" strokeWidth={1.75} /> Call Now
                    </a>
                  )}
                </>
              ) : !user ? (
                /* Guest — always show CTA regardless of contact field visibility */
                <>
                  <Link
                    to={`/login?redirect=/businesses/${id}`}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-pink-500
                               hover:from-violet-700 hover:to-pink-600 text-white font-bold px-6 py-2.5
                               rounded-xl shadow-md shadow-violet-200 transition-all text-sm"
                  >
                    Connect Now
                  </Link>
                  <Link
                    to={`/login?redirect=/businesses/${id}`}
                    className="inline-flex items-center gap-2 btn-secondary text-sm py-2.5 px-5"
                  >
                    <Phone className="w-4 h-4 shrink-0" strokeWidth={1.75} /> Call Now
                  </Link>
                </>
              ) : null
            )}
            <ShareButton
              title={`${profile.businessName} on SkillHub`}
              text={`Check out ${profile.businessName} — ${TYPE_LABELS[profile.businessType] || 'Business'} in ${profile.district || SERVICE_AREA}.`}
              url={`https://skillhub.example.com${pathname}`}
            />
          </div>
        </div>
      </div>

      {/* ── Services ─────────────────────────────────────────────────────── */}
      {services.length > 0 && (
        <div className="card mb-6">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><Tag className="w-5 h-5 text-stone-400" strokeWidth={1.75} /> Services & Pricing</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {services.map((s) => (
              <div key={s._id} className="border border-stone-100 rounded-xl px-4 py-3 hover:border-violet-200 transition-colors">
                <p className="font-semibold text-stone-800">{s.name}</p>
                {s.description && <p className="text-xs text-stone-500 mt-0.5">{s.description}</p>}
                {s.priceMin != null && (
                  <p className="text-sm font-bold text-green-700 mt-1.5">
                    {CURRENCY_SYMBOL}{s.priceMin.toLocaleString()}{s.priceMax ? `–${s.priceMax.toLocaleString()}` : '+'}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Live Work — anonymized real-time pulse ────────────────────── */}
      <LivePulse type="business" slug={profile.slug || id} />

      {/* ── Gallery ──────────────────────────────────────────────────────── */}
      {photos.length > 0 && (
        <div className="card mb-6">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><Camera className="w-5 h-5 text-stone-400" strokeWidth={1.75} /> Gallery</h2>
          <div className="grid grid-cols-3 gap-3">
            {photos.map((url, i) => (
              <img key={i} src={url} alt="" onClick={() => setLightbox(url)}
                className="w-full h-32 object-cover rounded-xl cursor-pointer hover:opacity-90 hover:scale-[1.02] transition-all" />
            ))}
          </div>
        </div>
      )}

      {/* ── Opening Hours ─────────────────────────────────────────────────── */}
      {Object.values(hours).some(Boolean) && (
        <div className="card mb-6">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-stone-400" strokeWidth={1.75} /> Opening Hours</h2>
          <div className="space-y-2">
            {DAYS.filter((d) => hours[d]).map((d) => (
              <div key={d} className={`flex items-center justify-between py-2 border-b border-stone-50 last:border-0 ${d === today ? 'font-semibold' : ''}`}>
                <span className={`text-sm ${d === today ? 'text-violet-700' : 'text-stone-600'}`}>
                  {d === today && '→ '}{DAY_LABEL[d]}
                </span>
                <span className={`text-sm ${hours[d] === 'Closed' ? 'text-red-500' : 'text-stone-700'}`}>
                  {hours[d]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-w-3xl max-h-[90vh] rounded-xl shadow-2xl object-contain" />
          <button className="absolute top-4 right-4 text-white text-3xl font-bold hover:opacity-70" onClick={() => setLightbox(null)}>×</button>
        </div>
      )}
    </div>
  );
}

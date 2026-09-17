import { useParams, Link, useLocation } from 'react-router-dom';
import SEO from '../components/SEO';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import api from '../lib/axios';
import ScoreRing from '../components/ScoreRing';
import ScoreBadge from '../components/ScoreBadge';
import { AvatarWithFallback } from '../components/Avatar';
import { SocialLinksRow } from '../components/SocialLinksForm';
import ContactGate from '../components/ContactGate';
import { useAuthStore } from '../store/authStore';
import ShareButton from '../components/ShareButton';
import LivePulse from '../components/LivePulse';
import PrivateConsultations from '../components/PrivateConsultations';
import WorkerLiveClassesSection from '../components/WorkerLiveClassesSection';
import WorkerShopSection from '../components/WorkerShopSection';
import { useState } from 'react';
import { Star, MapPin, Check, Tag, Clock, Camera } from 'lucide-react';
import { SERVICE_AREA, CURRENCY_SYMBOL, COUNTRY_CODE } from '../config/site.js';

function Stars({ rating }) {
  const rounded = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`w-3.5 h-3.5 ${i < rounded ? 'fill-amber-400 text-amber-400' : 'text-stone-200'}`} strokeWidth={1.5} />
      ))}
    </span>
  );
}

export default function WorkerProfilePage() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const [lightbox, setLightbox] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['worker', id],
    queryFn: () => api.get(`/workers/${id}`).then((r) => r.data.data),
  });

  const { data: offers = [] } = useQuery({
    queryKey: ['workerOffers', id],
    queryFn: () => api.get(`/workers/${id}/offers`).then((r) => r.data.data),
  });

  if (isLoading) return <div className="text-center py-20 text-stone-400">{t('common.loading')}</div>;
  if (error || !data) return <div className="text-center py-20 text-red-500">{t('workerProfile.notFound')}</div>;

  const { profile, reviews, isAuthenticated } = data;
  const worker = profile.userId;

  const workerSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    'name': worker?.name,
    'jobTitle': profile.category?.replace(/_/g, ' '),
    'description': profile.bio,
    'image': worker?.profilePhoto,
    'address': { '@type': 'PostalAddress', 'addressLocality': worker?.location?.district, 'addressCountry': COUNTRY_CODE },
    'aggregateRating': reviews?.length > 0 ? {
      '@type': 'AggregateRating',
      'ratingValue': profile.averageRating || 4.5,
      'reviewCount': reviews.length,
    } : undefined,
  };

  const breakdown = profile.scoreBreakdown || {};
  const chartData = [
    { subject: 'Completion', value: breakdown.completionScore || 0 },
    { subject: 'Rating',     value: breakdown.ratingScore || 0 },
    { subject: 'Response',   value: breakdown.responsivenessScore || 0 },
    { subject: 'Dispute',    value: breakdown.disputeScore || 0 },
    { subject: 'Trust',      value: breakdown.trustScore || 0 },
  ];

  const seoTitle = `${worker?.name} — ${profile.category?.replace(/_/g, ' ')} in ${worker?.location?.district || SERVICE_AREA}`;
  const seoDesc  = profile.bio
    ? profile.bio.slice(0, 145) + (profile.bio.length > 145 ? '…' : '')
    : `Hire ${worker?.name}, a verified ${profile.category?.replace(/_/g, ' ')} in ${worker?.location?.district || SERVICE_AREA} on SkillHub.`;

  const BookBtn = ({ className = '' }) =>
    !profile.isSuspended && profile.acceptingWork ? (
      user?.role === 'client' ? (
        <Link
          to={`/dashboard/client?newJob=${worker?._id}&category=${profile.category}`}
          className={`inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-pink-500
                     hover:from-violet-700 hover:to-pink-600 text-white font-bold px-6 py-2.5
                     rounded-xl shadow-md shadow-violet-200 transition-all text-sm ${className}`}
        >{t('workerProfile.bookNow')}</Link>
      ) : !user ? (
        <Link
          to={`/login?redirect=/pro/${id}`}
          className={`inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-pink-500
                     hover:from-violet-700 hover:to-pink-600 text-white font-bold px-6 py-2.5
                     rounded-xl shadow-md shadow-violet-200 transition-all text-sm ${className}`}
        >{t('workerProfile.bookNow')}</Link>
      ) : null
    ) : null;

  return (
    <div className="min-h-screen bg-stone-50 pb-16">
      <SEO
        title={seoTitle}
        description={seoDesc}
        image={worker?.profilePhoto || undefined}
        url={pathname}
        type="profile"
        schema={workerSchema}
      />

      {/* ── Cover photo ─────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <div className="relative h-56 sm:h-72 rounded-2xl overflow-hidden shadow-lg">
          {profile.coverPhoto ? (
            <img src={profile.coverPhoto} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-purple-500 to-pink-500" />
              <div className="absolute inset-0 bg-white/10" />
              {/* Dot pattern */}
              <div className="absolute inset-0 opacity-10"
                style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            </>
          )}
          {/* Edit cover — owner only */}
          {user?._id === worker?._id && (
            <Link
              to="/dashboard/worker/profile"
              className="absolute bottom-3 right-3 inline-flex items-center gap-1.5
                         bg-black/50 hover:bg-black/70 text-white text-xs font-semibold
                         px-3 py-1.5 rounded-full backdrop-blur-sm transition-all"
            >
              <Camera className="w-3.5 h-3.5" strokeWidth={2} /> Edit cover
            </Link>
          )}
        </div>
      </div>

      {/* ── Identity bar (Facebook-style) ───────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-b-2xl border border-stone-100 shadow-sm px-5 sm:px-8 pb-5 relative z-10">

          {/* ── Main row: avatar · name · actions ── */}
          <div className="flex items-end gap-4 sm:gap-5">

            {/* Avatar — half overlaps the cover */}
            <div className="-mt-10 sm:-mt-14 shrink-0 rounded-full ring-4 ring-white shadow-xl">
              <AvatarWithFallback name={worker?.name} photo={worker?.profilePhoto} size={96} />
            </div>

            {/* Name + meta — grows to fill available space */}
            <div className="flex-1 min-w-0 pt-3 pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-black text-stone-900 capitalize leading-tight">
                  {worker?.name}
                </h1>
                <ScoreBadge band={profile.scoreBand} />
                {worker?.idVerified && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-full">
                    <Check className="w-3 h-3" strokeWidth={2.5} /> Verified
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap text-sm mt-0.5">
                <span className="font-semibold text-stone-700 capitalize">{profile.category?.replace(/_/g, ' ')}</span>
                <span className="text-stone-300">·</span>
                <span className="flex items-center gap-1 text-stone-500">
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-stone-400" strokeWidth={1.75} />
                  {worker?.location?.district || SERVICE_AREA}
                </span>
                <span className="hidden sm:inline text-stone-300">·</span>
                {profile.acceptingWork && !profile.isSuspended ? (
                  <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-green-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Available Now
                  </span>
                ) : profile.isSuspended ? (
                  <span className="text-xs font-semibold text-red-500">Suspended</span>
                ) : null}
              </div>
            </div>

            {/* Actions + score ring — right side, desktop only inline; mobile shown below */}
            <div className="hidden sm:flex items-center gap-3 pb-2 shrink-0">
              <BookBtn />
              <ShareButton
                title={`${worker?.name} — ${profile.category?.replace(/_/g, ' ')} on SkillHub`}
                text={`Hire ${worker?.name}, a verified ${profile.category?.replace(/_/g, ' ')} in ${worker?.location?.district || SERVICE_AREA}.`}
                url={`https://skillhub.example.com${pathname}`}
              />
              <div className="flex flex-col items-center gap-0.5">
                <ScoreRing score={profile.skillScore} size={56} />
                <span className="text-[10px] text-stone-400 font-semibold tracking-wide">Trust Score</span>
              </div>
            </div>
          </div>

          {/* Mobile: availability + actions */}
          <div className="sm:hidden mt-4 space-y-3">

            {/* Connect Now — full width */}
            {!profile.isSuspended && profile.acceptingWork && (
              user?.role === 'client' ? (
                <Link
                  to={`/dashboard/client?newJob=${worker?._id}&category=${profile.category}`}
                  className="flex items-center justify-center gap-2 w-full bg-gradient-to-r
                             from-violet-600 to-pink-500 hover:from-violet-700 hover:to-pink-600
                             text-white font-bold py-3 rounded-xl shadow-md shadow-violet-200
                             transition-all text-sm"
                >
                  {t('workerProfile.bookNow')}
                </Link>
              ) : !user ? (
                <Link
                  to={`/login?redirect=/pro/${id}`}
                  className="flex items-center justify-center gap-2 w-full bg-gradient-to-r
                             from-violet-600 to-pink-500 hover:from-violet-700 hover:to-pink-600
                             text-white font-bold py-3 rounded-xl shadow-md shadow-violet-200
                             transition-all text-sm"
                >
                  {t('workerProfile.bookNow')}
                </Link>
              ) : null
            )}

            {/* Available · Share · Score — compact row */}
            <div className="flex items-center justify-between gap-2">
              {profile.acceptingWork && !profile.isSuspended ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
                  Available Now
                </span>
              ) : <span />}

              <div className="flex items-center gap-3">
                <ShareButton
                  title={`${worker?.name} — ${profile.category?.replace(/_/g, ' ')} on SkillHub`}
                  text={`Hire ${worker?.name}, a verified ${profile.category?.replace(/_/g, ' ')} in ${worker?.location?.district || SERVICE_AREA}.`}
                  url={`https://skillhub.example.com${pathname}`}
                />
                <div className="flex flex-col items-center gap-0.5">
                  <ScoreRing score={profile.skillScore} size={44} />
                  <span className="text-[9px] text-stone-400 font-semibold tracking-wide">Trust Score</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-stone-600 text-sm leading-relaxed mt-4 border-t border-stone-100 pt-4">
              {profile.bio}
            </p>
          )}
        </div>
      </div>

      {/* ── Social links — below the identity card ───────────────────────── */}
      {(isAuthenticated && worker?.socialLinks && Object.values(worker.socialLinks).some(Boolean)) || !isAuthenticated ? (
        <div className="max-w-6xl mx-auto px-4 mt-3">
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm px-5 sm:px-8 py-4">
            {isAuthenticated && worker?.socialLinks && Object.values(worker.socialLinks).some(Boolean)
              ? <SocialLinksRow socialLinks={worker.socialLinks} />
              : <ContactGate label="social media links" />
            }
          </div>
        </div>
      ) : null}

      {/* ── Two-column body ─────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* ── LEFT sidebar ─────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Stats */}
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
              <h3 className="font-bold text-stone-800 mb-4 text-sm uppercase tracking-wide">Overview</h3>
              <div className="space-y-3">
                {profile.experienceYears != null && (
                  <div className="flex items-center justify-between py-1 border-b border-stone-50">
                    <span className="text-sm text-stone-500">Experience</span>
                    <span className="font-bold text-violet-700">{profile.experienceYears} yrs</span>
                  </div>
                )}
                {profile.dayRateMin && (
                  <div className="flex items-center justify-between py-1 border-b border-stone-50">
                    <span className="text-sm text-stone-500">Day Rate</span>
                    <span className="font-bold text-green-700">{CURRENCY_SYMBOL}{profile.dayRateMin.toLocaleString()}+</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-1 border-b border-stone-50">
                  <span className="text-sm text-stone-500">Jobs Done</span>
                  <span className="font-bold text-amber-700">{profile.totalJobsCompleted || 0}</span>
                </div>
                {reviews?.length > 0 && (
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm text-stone-500">Rating</span>
                    <span className="font-bold text-amber-600 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" strokeWidth={1.5} />
                      {profile.averageRating?.toFixed(1) || '—'} <span className="text-stone-400 font-normal text-xs">({reviews.length})</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Languages */}
            {profile.languages?.length > 0 && (
              <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
                <h3 className="font-bold text-stone-800 mb-3 text-sm uppercase tracking-wide">Languages</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.languages.map((l) => (
                    <span key={l} className="text-xs bg-stone-100 text-stone-600 px-3 py-1 rounded-full font-medium">{l}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Service areas */}
            {profile.serviceDistricts?.length > 0 && (
              <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
                <h3 className="font-bold text-stone-800 mb-3 text-sm uppercase tracking-wide flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-stone-400" strokeWidth={1.75} /> Service Areas
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {profile.serviceDistricts.map((d) => (
                    <span key={d} className="text-xs bg-violet-50 text-violet-700 border border-violet-100 px-2.5 py-1 rounded-full">{d}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Trust score breakdown */}
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
              <h3 className="font-bold text-stone-800 mb-4 text-sm uppercase tracking-wide">SkillHub Score</h3>
              <div className="w-full h-44 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={chartData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                    <Radar name="Score" dataKey="value" stroke="#7C3AED" fill="#7C3AED" fillOpacity={0.35} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2.5">
                {chartData.map((item) => (
                  <div key={item.subject}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-stone-500">{item.subject}</span>
                      <span className="font-semibold text-stone-700">{item.value}</span>
                    </div>
                    <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-violet-500 to-pink-500 rounded-full transition-all duration-500"
                        style={{ width: `${item.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Certifications */}
            {profile.certifications?.length > 0 && (
              <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
                <h3 className="font-bold text-stone-800 mb-3 text-sm uppercase tracking-wide">{t('workerProfile.certifications')}</h3>
                <ul className="space-y-2">
                  {profile.certifications.map((cert, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-stone-700">
                      <Check className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" strokeWidth={2.5} />
                      <div>
                        <span className="font-medium">{cert.name}</span>
                        {cert.issuedBy && <p className="text-xs text-stone-400">{cert.issuedBy}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* ── RIGHT main content ────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Shop section — only renders for lifestyle_leisure workers */}
            <WorkerShopSection workerUserId={worker?._id} workerCategory={profile.category} />

            {/* Private Consultations */}
            <PrivateConsultations workerUserId={worker?._id} />

            {/* Live Classes */}
            <WorkerLiveClassesSection workerUserId={worker?._id} />

            {/* Service Offers */}
            {offers.length > 0 && (
              <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
                <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-stone-400" strokeWidth={1.75} /> Service Offers
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {offers.map((o) => (
                    <div key={o._id}
                      className="border border-stone-200 rounded-xl overflow-hidden hover:shadow-md hover:border-violet-200 transition-all group">
                      {o.photos?.length > 0 && (
                        <div className="flex gap-0.5 h-28 overflow-hidden">
                          {o.photos.slice(0, 3).map((p, i) => (
                            <img key={i} src={p} alt="" onClick={() => setLightbox(p)}
                              className="flex-1 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                              style={{ minWidth: 0 }} />
                          ))}
                        </div>
                      )}
                      <div className="p-4">
                        <p className="font-semibold text-stone-800 mb-1 group-hover:text-violet-700 transition-colors">{o.title}</p>
                        {o.description && <p className="text-xs text-stone-500 mb-2 line-clamp-2">{o.description}</p>}
                        <div className="flex items-center gap-3 text-xs">
                          <span className="font-bold text-green-700 text-sm">
                            {CURRENCY_SYMBOL}{o.priceMin.toLocaleString()}{o.priceMax ? `–${o.priceMax.toLocaleString()}` : '+'}
                          </span>
                          {o.deliveryDays && (
                            <span className="text-stone-400 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} /> {o.deliveryDays} day{o.deliveryDays > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {user?.role === 'client' && !profile.isSuspended && profile.acceptingWork && (
                  <div className="mt-4 pt-4 border-t border-stone-100">
                    <BookBtn />
                  </div>
                )}
              </div>
            )}

            {/* Live Work pulse */}
            <LivePulse type="worker" slug={profile.slug || id} />

            {/* Portfolio */}
            {profile.portfolioPhotos?.length > 0 && (
              <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
                <h2 className="font-bold text-lg mb-4">{t('workerProfile.portfolio')}</h2>
                <div className="grid grid-cols-3 gap-3">
                  {profile.portfolioPhotos.map((url, i) => (
                    <img key={i} src={url} alt=""
                      onClick={() => setLightbox(url)}
                      className="w-full h-36 object-cover rounded-xl cursor-pointer hover:opacity-90 hover:scale-[1.02] transition-all" />
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
              <h2 className="font-bold text-lg mb-4">
                {t('workerProfile.reviews')} <span className="text-stone-400 font-normal text-base">({reviews?.length || 0})</span>
              </h2>
              {!reviews?.length ? (
                <p className="text-stone-400 text-sm">{t('workerProfile.noReviews')}</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((r) => (
                    <div key={r._id} className="border-b border-stone-100 pb-4 last:border-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{r.clientId?.name || 'Client'}</span>
                        <Stars rating={r.clientRating} />
                      </div>
                      {r.clientReview && <p className="text-sm text-stone-600">{r.clientReview}</p>}
                      <p className="text-xs text-stone-400 mt-1">{new Date(r.createdAt).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

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

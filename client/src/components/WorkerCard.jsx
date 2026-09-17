import { Link } from 'react-router-dom';
import { Crown, Zap, BadgeCheck, MapPin } from 'lucide-react';
import ScoreRing from './ScoreRing';
import { SERVICE_AREA, CURRENCY_SYMBOL } from '../config/site.js';

const PLAN_STYLE = {
  elite: { accent: 'border-t-2 border-t-amber-400', badge: 'bg-amber-100 text-amber-700 border border-amber-200', Icon: Crown, text: 'Elite' },
  pro:   { accent: 'border-t-2 border-t-violet-500', badge: 'bg-violet-100 text-violet-700 border border-violet-200', Icon: Zap,   text: 'Pro'   },
  free:  { accent: '', badge: null, Icon: null, text: null },
};

export default function WorkerCard({ profile }) {
  const user = profile.userId;
  if (!user) return null;

  const plan     = PLAN_STYLE[profile.subscriptionPlan] || PLAN_STYLE.free;
  const initials = user.name?.[0]?.toUpperCase() || '?';

  return (
    <Link
      to={`/pro/${profile.slug || user._id}`}
      className={`group flex flex-col rounded-2xl border border-stone-200 overflow-hidden
                  bg-white shadow-sm hover:shadow-md hover:border-violet-200 transition-colors duration-200
                  ${plan.accent}`}
    >
      {/* ── Cover image ─────────────────────────────────────────────── */}
      <div className="relative h-28 bg-gradient-to-br from-violet-100 via-purple-50 to-pink-100 overflow-hidden">
        {profile.coverPhoto
          ? <img src={profile.coverPhoto} alt={`${user.name} cover`}
              className="w-full h-full object-cover" />
          : (
            <div className="absolute inset-0 bg-gradient-to-br from-violet-200 via-purple-100 to-pink-200" />
          )
        }

        {/* Plan badge — top left */}
        {plan.badge && (
          <span className={`absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-0.5 ${plan.badge}`}>
            <plan.Icon className="w-3 h-3 inline mr-0.5" />{plan.text}
          </span>
        )}

        {/* Available — top right */}
        {profile.acceptingWork && (
          <span className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-semibold
                           bg-white/90 text-green-700 px-1.5 py-0.5 rounded-full shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Available
          </span>
        )}
      </div>

      {/* ── Info ────────────────────────────────────────────────────── */}
      <div className="px-3 pb-3 pt-0 flex flex-col gap-1.5 flex-1 relative">

        {/* Small profile picture — overlapping cover */}
        <div className="flex items-end gap-2 -mt-7 mb-1">
          <div className="w-14 h-14 rounded-full border-2 border-white bg-white shadow-md overflow-hidden shrink-0">
            {user.profilePhoto
              ? <img src={user.profilePhoto} alt={user.name}
                  className="w-full h-full object-cover" />
              : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-500 to-pink-400">
                  <span className="text-xl font-black text-white">{initials}</span>
                </div>
              )
            }
          </div>
          {/* Score ring on right */}
          <div className="ml-auto bg-white rounded-xl p-1 shadow-sm">
            <ScoreRing score={profile.skillScore} size={40} />
          </div>
        </div>

        {/* Name + verified */}
        <div className="flex items-center gap-1.5">
          <h3 className="font-bold text-stone-900 text-sm group-hover:text-violet-700 transition-colors truncate">
            {user.name}
          </h3>
          {user.idVerified && (
            <BadgeCheck className="w-3.5 h-3.5 text-teal-500 shrink-0" />
          )}
        </div>

        {/* Category · District */}
        <p className="text-xs text-stone-500 capitalize">
          {profile.category?.replace(/_/g, ' ')}
          <span className="mx-1 text-stone-300">·</span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3 h-3 text-stone-400 inline mr-0.5" />{user.location?.district || SERVICE_AREA}
          </span>
        </p>

        {/* Bio */}
        <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed flex-1">
          {profile.bio || 'No bio available.'}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-100 mt-auto">
          <span className="text-xs text-stone-400">
            {profile.experienceYears} yrs · {CURRENCY_SYMBOL}{profile.dayRateMin?.toLocaleString()}+
          </span>
          <span className="text-xs font-semibold text-violet-600 group-hover:text-violet-800 transition-colors
                           inline-flex items-center gap-1">
            View
            <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </span>
        </div>
      </div>

      <div className="h-0.5 w-0 group-hover:w-full bg-gradient-to-r from-violet-500 to-pink-500 transition-all duration-300" />
    </Link>
  );
}

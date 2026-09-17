import { Link } from 'react-router-dom';
import {
  Scissors, Wrench, UtensilsCrossed, Camera, Sparkles,
  BookOpen, Building2, Store, BadgeCheck, Star, MapPin,
} from 'lucide-react';
import { SERVICE_AREA } from '../config/site.js';

const TYPE_META = {
  salon:               { label: 'Salon / Spa',        Icon: Scissors,        bg: 'from-rose-100 to-pink-100'      },
  barbershop:          { label: 'Barbershop',          Icon: Scissors,        bg: 'from-slate-100 to-zinc-100'     },
  repair_shop:         { label: 'Repair Shop',         Icon: Wrench,          bg: 'from-stone-100 to-slate-100'    },
  catering:            { label: 'Catering',            Icon: UtensilsCrossed, bg: 'from-orange-100 to-amber-100'   },
  photography_studio:  { label: 'Photography Studio',  Icon: Camera,          bg: 'from-indigo-100 to-blue-100'    },
  cleaning_company:    { label: 'Cleaning Company',    Icon: Sparkles,        bg: 'from-sky-100 to-cyan-100'       },
  tutoring_centre:     { label: 'Tutoring Centre',     Icon: BookOpen,        bg: 'from-emerald-100 to-teal-100'   },
  restaurant:          { label: 'Restaurant',          Icon: UtensilsCrossed, bg: 'from-red-100 to-rose-100'       },
  agency:              { label: 'Agency',              Icon: Building2,       bg: 'from-violet-100 to-purple-100'  },
  other:               { label: 'Business',            Icon: Store,           bg: 'from-violet-100 to-pink-100'    },
};

export default function BusinessCard({ business }) {
  const meta       = TYPE_META[business.businessType] || TYPE_META.other;
  const isFeatured = business.featuredUntil && new Date(business.featuredUntil) > new Date();
  const slug       = business.slug || business.userId?._id || business._id;
  const Icon       = meta.Icon;

  return (
    <Link
      to={`/businesses/${slug}`}
      className={`group flex flex-col rounded-2xl border overflow-hidden bg-white
                  hover:shadow-lg hover:shadow-violet-100 hover:-translate-y-0.5
                  transition-all duration-200
                  ${isFeatured ? 'border-amber-300 border-t-2' : 'border-stone-200 hover:border-violet-300'}`}
    >
      {/* ── Cover ─────────────────────────────────────────────────────── */}
      <div className={`relative aspect-[4/3] bg-gradient-to-br ${meta.bg} overflow-hidden`}>
        {business.coverPhoto ? (
          <img
            src={business.coverPhoto}
            alt={business.businessName}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon className="w-14 h-14 text-stone-300" strokeWidth={1} />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1">
          {business.isVerified && (
            <span className="text-[10px] font-semibold bg-white/95 backdrop-blur text-teal-700 px-2 py-0.5 rounded-full shadow-sm inline-flex items-center gap-0.5">
              <BadgeCheck className="w-2.5 h-2.5" /> Verified
            </span>
          )}
          {isFeatured && (
            <span className="text-[10px] font-semibold bg-amber-400/95 text-white px-2 py-0.5 rounded-full shadow-sm inline-flex items-center gap-0.5">
              <Star className="w-2.5 h-2.5 fill-current" /> Featured
            </span>
          )}
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────── */}
      <div className="p-3.5 flex flex-col gap-1.5 flex-1">
        <h3 className="font-bold text-stone-900 text-sm group-hover:text-violet-700 transition-colors line-clamp-1">
          {business.businessName}
        </h3>

        <p className="text-xs text-stone-500 flex items-center gap-1 flex-wrap">
          <Icon className="w-3 h-3 shrink-0" />
          <span>{meta.label}</span>
          <span className="text-stone-300">·</span>
          <MapPin className="w-3 h-3 shrink-0" />
          <span>{business.district || SERVICE_AREA}</span>
        </p>

        {(business.tagline || business.description) && (
          <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed flex-1">
            {business.tagline || business.description}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-100 mt-auto">
          <div className="flex items-center gap-2">
            {business.averageRating > 0 && (
              <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-100 inline-flex items-center gap-0.5">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {business.averageRating.toFixed(1)}
              </span>
            )}
            {(business.services?.length || 0) > 0 && (
              <span className="text-xs text-stone-400">
                {business.services.length} service{business.services.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <span className="text-xs font-semibold text-violet-600 group-hover:text-violet-800 inline-flex items-center gap-1 transition-colors">
            View
            <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </span>
        </div>
      </div>

      {/* Bottom slide-in accent bar */}
      <div className="h-0.5 w-0 group-hover:w-full bg-gradient-to-r from-teal-500 to-violet-600 transition-all duration-300" />
    </Link>
  );
}

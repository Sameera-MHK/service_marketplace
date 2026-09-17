import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShoppingBag, Paintbrush, Package, Search, ChevronRight } from 'lucide-react';
import api from '../lib/axios';
import { AvatarWithFallback } from '../components/Avatar';
import SEO from '../components/SEO';
import { CURRENCY_SYMBOL } from '../config/site.js';

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtPrice(n) { return `${CURRENCY_SYMBOL}${Number(n).toLocaleString()}`; }

// ── Skeleton ──────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden animate-pulse">
      <div className="h-52 bg-stone-100" />
      <div className="p-4 space-y-2">
        <div className="h-3 bg-stone-100 rounded-full w-3/4" />
        <div className="h-3 bg-stone-100 rounded-full w-1/2" />
        <div className="h-5 bg-stone-100 rounded-full w-1/3 mt-3" />
      </div>
    </div>
  );
}

// ── Item card ─────────────────────────────────────────────────────────────────

function ItemCard({ item }) {
  const navigate  = useNavigate();
  const soldOut   = item.status === 'sold_out' || (item.stock !== null && item.stock <= 0);
  const img       = item.images?.[0];
  const seller    = item.workerId;

  return (
    <div className="group bg-white rounded-2xl border border-stone-200 overflow-hidden hover:border-fuchsia-300 hover:shadow-xl hover:shadow-fuchsia-100 hover:-translate-y-0.5 transition-all duration-200 flex flex-col">
      {/* Image */}
      <div className="relative h-52 bg-stone-100 overflow-hidden shrink-0">
        {img ? (
          <img src={img} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Paintbrush className="w-12 h-12 text-stone-200" strokeWidth={1.5} />
          </div>
        )}
        {soldOut && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white font-bold text-sm bg-black/60 px-3 py-1 rounded-full">Sold Out</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col flex-1">
        {/* Seller row */}
        <div className="flex items-center gap-2 mb-2">
          <AvatarWithFallback name={seller?.name} photo={seller?.profilePhoto} size={24} />
          <span className="text-xs text-stone-500 font-medium capitalize truncate">{seller?.name?.toLowerCase()}</span>
        </div>

        <h3 className="font-bold text-stone-900 leading-snug line-clamp-2 mb-1 flex-1">{item.title}</h3>

        {item.deliveryInfo && (
          <p className="text-xs text-stone-400 flex items-center gap-1 mb-2">
            <Package className="w-3 h-3 shrink-0" /> {item.deliveryInfo}
          </p>
        )}

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-stone-50">
          <p className="text-xl font-black text-fuchsia-700">{fmtPrice(item.price)}</p>
          {!soldOut ? (
            <Link
              to={`/shop/${item._id}`}
              className="text-sm font-semibold bg-fuchsia-600 hover:bg-fuchsia-700 text-white px-3 py-1.5 rounded-xl transition-colors"
            >
              View →
            </Link>
          ) : (
            <span className="text-xs text-stone-400 font-semibold">Sold Out</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ShopBrowse() {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['shopItems'],
    queryFn: () => api.get('/shop/items', { params: { limit: 48 } }).then(r => r.data),
  });

  const items = data?.data || [];

  const filtered = search.trim()
    ? items.filter(i =>
        i.title.toLowerCase().includes(search.toLowerCase()) ||
        i.description?.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  return (
    <div className="min-h-screen bg-stone-50">
      <SEO
        title="Art & Crafts Shop"
        description="Browse handmade art, paintings, custom portraits and bespoke gifts from verified artists and craftspeople."
        url="/shop"
      />

      {/* ── Hero ── */}
      <div className="relative bg-gradient-to-br from-fuchsia-600 via-pink-500 to-rose-500 overflow-hidden">
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="absolute top-0 left-1/3 w-80 h-80 bg-white/5 rounded-full -translate-y-1/2 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto px-4 pt-14 pb-10 text-center text-white">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
            <ShoppingBag className="w-4 h-4" /> Art, Crafts & Lifestyle
          </div>
          <h1 className="text-4xl sm:text-5xl text-white font-black mb-3 tracking-tight">
            The Artisan Marketplace
          </h1>
          <p className="text-pink-100 text-base">
            Original artwork, custom portraits & bespoke gifts — made by
            verified local artists
          </p>
        </div>
      </div>

      {/* ── Search bar ── */}
      <div className="bg-white border-b border-stone-100 shadow-sm sticky top-16 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="relative max-w-md">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400"
              strokeWidth={2}
            />
            <input
              type="text"
              placeholder="Search paintings, portraits, gifts…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-400 bg-stone-50"
            />
          </div>
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="max-w-6xl mx-auto px-4 py-10">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-stone-400">
            <Paintbrush className="w-14 h-14 text-stone-200" strokeWidth={1} />
            <p className="text-lg font-semibold text-stone-500">
              {search ? "No items match your search" : "No items listed yet"}
            </p>
            <p className="text-sm">
              Check back soon — artists are adding new work regularly.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-stone-400 mb-5">
              {filtered.length} item{filtered.length !== 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map((item) => (
                <ItemCard key={item._id} item={item} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── CTA for artists ── */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        <div className="bg-gradient-to-r from-fuchsia-50 to-pink-50 border border-fuchsia-100 rounded-2xl p-8 text-center">
          <h2 className="text-xl font-black text-stone-900 mb-2">
            Are you an artist or craftsperson?
          </h2>
          <p className="text-stone-500 text-sm mb-4">
            List your work and reach buyers everywhere — free to join.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-sm"
          >
            Start Selling <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

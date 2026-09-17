import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ShoppingBag, Paintbrush, Package, Tag, Send, X, ChevronRight } from 'lucide-react';
import api from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import { useCategories } from '../hooks/useCategories';
import { CURRENCY_SYMBOL } from '../config/site.js';

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtPrice(n) {
  return `${CURRENCY_SYMBOL}${Number(n).toLocaleString()}`;
}

// ── Item card ─────────────────────────────────────────────────────────────────

function ItemCard({ item, onBuy }) {
  const soldOut = item.status === 'sold_out' || (item.stock !== null && item.stock <= 0);
  const img     = item.images?.[0];

  return (
    <div className="group bg-white rounded-2xl border border-stone-200 overflow-hidden hover:border-fuchsia-300 hover:shadow-lg hover:shadow-fuchsia-50 transition-all">
      {/* Image */}
      <div className="relative h-48 bg-stone-100 overflow-hidden">
        {img ? (
          <img src={img} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Paintbrush className="w-10 h-10 text-stone-300" strokeWidth={1.5} />
          </div>
        )}
        {soldOut && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white font-bold text-sm bg-black/60 px-3 py-1 rounded-full">Sold Out</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-bold text-stone-900 leading-snug line-clamp-2 mb-1">{item.title}</h3>
        {item.deliveryInfo && (
          <p className="text-xs text-stone-400 mb-2 flex items-center gap-1">
            <Package className="w-3 h-3" strokeWidth={2} /> {item.deliveryInfo}
          </p>
        )}
        <div className="flex items-center justify-between mt-3">
          <p className="text-lg font-black text-fuchsia-700">{fmtPrice(item.price)}</p>
          {!soldOut && (
            <button
              onClick={() => onBuy(item)}
              className="text-sm font-semibold bg-fuchsia-600 hover:bg-fuchsia-700 text-white px-3 py-1.5 rounded-xl transition-colors"
            >
              Buy Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Custom request form ───────────────────────────────────────────────────────

function RequestForm({ workerId, onClose, onSuccess }) {
  const [form, setForm] = useState({ title: '', description: '', budgetMin: '', budgetMax: '', deadline: '' });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (data) => api.post('/shop/requests', data).then((r) => r.data),
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (err) => setError(err.response?.data?.message || 'Failed to send request'),
  });

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.title.trim())       return setError('Title is required');
    if (!form.description.trim()) return setError('Description is required');
    mutation.mutate({
      workerId,
      title:       form.title.trim(),
      description: form.description.trim(),
      budgetMin:   form.budgetMin ? Number(form.budgetMin) : null,
      budgetMax:   form.budgetMax ? Number(form.budgetMax) : null,
      deadline:    form.deadline  || null,
    });
  }

  const inputCls = 'w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <Paintbrush className="w-5 h-5 text-fuchsia-600" strokeWidth={1.75} />
            <h2 className="font-bold text-stone-900">Request Custom Work</h2>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1">What do you need?</label>
            <input className={inputCls} placeholder="e.g. Custom portrait of my family" value={form.title}
              onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} />
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1">Details</label>
            <textarea className={inputCls} rows={4} placeholder="Describe what you want — size, style, colours, any references..."
              value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1">Budget min ({CURRENCY_SYMBOL})</label>
              <input className={inputCls} type="number" placeholder="e.g. 2000" value={form.budgetMin}
                onChange={(e) => setForm(p => ({ ...p, budgetMin: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1">Budget max ({CURRENCY_SYMBOL})</label>
              <input className={inputCls} type="number" placeholder="e.g. 8000" value={form.budgetMax}
                onChange={(e) => setForm(p => ({ ...p, budgetMax: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1">Deadline <span className="text-stone-400 font-normal">(optional)</span></label>
            <input className={inputCls} type="date" value={form.deadline}
              onChange={(e) => setForm(p => ({ ...p, deadline: e.target.value }))} />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-stone-200 text-sm font-semibold text-stone-600 hover:bg-stone-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="flex-1 py-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              <Send className="w-4 h-4" />
              {mutation.isPending ? 'Sending…' : 'Send Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main section ──────────────────────────────────────────────────────────────

export default function WorkerShopSection({ workerUserId, workerCategory }) {
  const { user } = useAuthStore();
  const { categories } = useCategories();
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  // Gate: only show for lifestyle_leisure workers (art, crafts, tailoring, pet, interior design etc.)
  const cat = categories.find((c) => c.slug === workerCategory);
  if (cat?.group !== 'lifestyle_leisure') return null;

  const { data: items = [] } = useQuery({
    queryKey: ['shopItems', workerUserId],
    queryFn: () => api.get('/shop/items', { params: { workerId: workerUserId, limit: 6 } }).then((r) => r.data.data),
    enabled: !!workerUserId,
  });

  const hasItems    = items.length > 0;
  const acceptsReqs = items.some((i) => i.acceptsRequests) || items.length === 0;

  if (!hasItems && !acceptsReqs) return null;

  return (
    <>
      <section className="rounded-2xl overflow-hidden bg-gradient-to-br from-fuchsia-50 via-white to-pink-50/30 border border-fuchsia-100 shadow-sm">

        {/* Header */}
        <div className="px-6 pt-6 pb-3 border-b border-fuchsia-100/60">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingBag className="w-5 h-5 text-fuchsia-600" strokeWidth={1.75} />
            <span className="text-xs uppercase tracking-wider font-semibold text-fuchsia-700">Shop</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-stone-900">Art & Crafts Shop</h2>
              <p className="text-sm text-stone-500 mt-1">Browse ready-made pieces or request something custom.</p>
            </div>
            {acceptsReqs && (
              <button
                onClick={() => {
                  if (!user) { window.location.href = '/login'; return; }
                  setShowRequestForm(true);
                }}
                className="shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold bg-fuchsia-600 hover:bg-fuchsia-700 text-white px-4 py-2 rounded-xl transition-colors shadow-sm"
              >
                <Paintbrush className="w-4 h-4" strokeWidth={2} />
                Request Custom
              </button>
            )}
          </div>
        </div>

        {/* Request sent confirmation */}
        {requestSent && (
          <div className="mx-6 mt-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 font-semibold">
            ✓ Your request was sent! The artist will review it and send you a quote.
          </div>
        )}

        {/* Items grid */}
        {hasItems ? (
          <div className="p-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <ItemCard key={item._id} item={item} onBuy={() => window.location.href = `/shop/${item._id}`} />
            ))}
          </div>
        ) : (
          <div className="px-6 py-10 text-center text-stone-400">
            <Paintbrush className="w-10 h-10 mx-auto mb-3 text-stone-200" strokeWidth={1.5} />
            <p className="text-sm font-semibold text-stone-500">No items listed yet</p>
            <p className="text-xs mt-1">You can still request custom work from this artist.</p>
          </div>
        )}

        {/* Footer */}
        {hasItems && (
          <div className="px-6 pb-5 text-center">
            <Link to="/shop" className="text-xs text-stone-400 hover:text-fuchsia-600 transition-colors inline-flex items-center gap-1">
              Browse all art & craft listings <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        )}
      </section>

      {showRequestForm && (
        <RequestForm
          workerId={workerUserId}
          onClose={() => setShowRequestForm(false)}
          onSuccess={() => setRequestSent(true)}
        />
      )}
    </>
  );
}

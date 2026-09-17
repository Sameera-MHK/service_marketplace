import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShoppingBag, Paintbrush, Plus, X, Package,
  Pencil, Trash2, Tag, Clock, CheckCircle2, ImagePlus, Loader2,
  DollarSign, TrendingUp, Wallet, Sparkles,
} from 'lucide-react';
import api from '../../lib/axios';
import DashSubPageWrapper from '../../components/DashSubPageWrapper';
import { BalanceCard, PayoutDetailsCard } from '../../components/WorkerPayoutSection';
import { TIMEZONE, CURRENCY_SYMBOL, DATE_LOCALE } from '../../config/site.js';

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtPrice(n) { return `${CURRENCY_SYMBOL}${Number(n).toLocaleString()}`; }
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString(DATE_LOCALE, {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: TIMEZONE,
  });
}

const STATUS_BADGE = {
  pending:     { label: 'Pending',     cls: 'bg-amber-100 text-amber-700'   },
  quoted:      { label: 'Quoted',      cls: 'bg-blue-100 text-blue-700'     },
  accepted:    { label: 'Accepted',    cls: 'bg-violet-100 text-violet-700' },
  in_progress: { label: 'In Progress', cls: 'bg-indigo-100 text-indigo-700' },
  completed:   { label: 'Completed',   cls: 'bg-green-100 text-green-700'   },
  declined:    { label: 'Declined',    cls: 'bg-red-100 text-red-600'       },
  cancelled:   { label: 'Cancelled',   cls: 'bg-stone-100 text-stone-500'   },
  paid:        { label: 'Paid',        cls: 'bg-green-100 text-green-700'   },
};

const inputCls = 'w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-400';
const labelCls = 'text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1';

// ── Image uploader sub-component ──────────────────────────────────────────────

const MAX_IMAGES = 5;

function ImageUploader({ images, onChange }) {
  const fileRef   = useRef();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver]   = useState(false);

  async function handleFiles(files) {
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) return;

    const toUpload = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      const fd = new FormData();
      toUpload.forEach((f) => fd.append('images', f));
      const res = await api.post('/shop/me/images', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onChange([...images, ...res.data.urls]);
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setUploading(false);
    }
  }

  function removeImage(idx) {
    onChange(images.filter((_, i) => i !== idx));
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }

  return (
    <div className="space-y-3">
      <label className={labelCls}>
        Product photos <span className="text-stone-400 font-normal">({images.length}/{MAX_IMAGES})</span>
      </label>

      {/* Thumbnails */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((url, idx) => (
            <div key={url + idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-stone-200 group">
              <img src={url} alt="" className="w-full h-full object-cover" />
              {idx === 0 && (
                <span className="absolute bottom-0 left-0 right-0 text-center text-white text-[9px] font-bold bg-black/50 py-0.5">
                  Cover
                </span>
              )}
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone — only show if can still add */}
      {images.length < MAX_IMAGES && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current.click()}
          className={`relative flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl py-7 cursor-pointer transition-all
            ${dragOver ? 'border-fuchsia-400 bg-fuchsia-50' : 'border-stone-200 hover:border-fuchsia-300 hover:bg-fuchsia-50/40'}`}
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 text-fuchsia-500 animate-spin" />
          ) : (
            <ImagePlus className="w-6 h-6 text-stone-300" strokeWidth={1.5} />
          )}
          <p className="text-sm font-semibold text-stone-400">
            {uploading ? 'Uploading…' : 'Click or drag photos here'}
          </p>
          <p className="text-xs text-stone-300">JPG, PNG, WebP · max 5 MB each · up to {MAX_IMAGES} photos</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      )}
    </div>
  );
}

// ── Item form modal ───────────────────────────────────────────────────────────

function ItemForm({ initialItem, onClose }) {
  const qc     = useQueryClient();
  const isEdit = !!initialItem;
  const [form, setForm] = useState(() => initialItem ? {
    title:           initialItem.title,
    description:     initialItem.description || '',
    price:           initialItem.price,
    images:          initialItem.images || [],
    stock:           initialItem.stock ?? '',
    deliveryInfo:    initialItem.deliveryInfo || '',
    acceptsRequests: initialItem.acceptsRequests !== false,
    status:          initialItem.status,
  } : {
    title: '', description: '', price: '', images: [], stock: '',
    deliveryInfo: '', acceptsRequests: true, status: 'active',
  });
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/shop/me/items', data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['myShopItems'] }); onClose(); },
    onError: (err) => setError(err.response?.data?.message || 'Failed to save'),
  });
  const updateMutation = useMutation({
    mutationFn: (data) => api.put(`/shop/me/items/${initialItem._id}`, data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['myShopItems'] }); onClose(); },
    onError: (err) => setError(err.response?.data?.message || 'Failed to save'),
  });
  const mutation = isEdit ? updateMutation : createMutation;

  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) return setError('Title is required');
    if (!form.price)        return setError('Price is required');
    mutation.mutate({
      title:           form.title.trim(),
      description:     form.description.trim(),
      price:           Number(form.price),
      images:          form.images,
      stock:           form.stock !== '' ? Number(form.stock) : null,
      deliveryInfo:    form.deliveryInfo.trim(),
      acceptsRequests: form.acceptsRequests,
      ...(isEdit ? { status: form.status } : {}),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-stone-100 sticky top-0 bg-white z-10">
          <h2 className="font-bold text-stone-900">{isEdit ? 'Edit Listing' : 'New Listing'}</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={labelCls}>Title</label>
            <input className={inputCls} placeholder="e.g. Acrylic painting — Mountain Sunrise"
              value={form.title} onChange={e => set('title', e.target.value)} />
          </div>

          <div>
            <label className={labelCls}>Description <span className="text-stone-400 font-normal">(optional)</span></label>
            <textarea className={inputCls} rows={3} placeholder="Materials used, size, what makes it special..."
              value={form.description} onChange={e => set('description', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Price ({CURRENCY_SYMBOL})</label>
              <input className={inputCls} type="number" min="0" placeholder="e.g. 4500"
                value={form.price} onChange={e => set('price', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Stock qty <span className="text-stone-400 font-normal">(blank = unlimited)</span></label>
              <input className={inputCls} type="number" min="0" placeholder="e.g. 1"
                value={form.stock} onChange={e => set('stock', e.target.value)} />
            </div>
          </div>

          {/* ── Image uploader ── */}
          <ImageUploader images={form.images} onChange={(imgs) => set('images', imgs)} />

          <div>
            <label className={labelCls}>Delivery info <span className="text-stone-400 font-normal">(optional)</span></label>
            <input className={inputCls} placeholder="e.g. Ships in 5–7 days island-wide"
              value={form.deliveryInfo} onChange={e => set('deliveryInfo', e.target.value)} />
          </div>

          {isEdit && (
            <div>
              <label className={labelCls}>Status</label>
              <select className={`${inputCls} bg-white`} value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="active">Active</option>
                <option value="hidden">Hidden</option>
                <option value="sold_out">Sold Out</option>
              </select>
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" className="w-4 h-4 accent-fuchsia-600" checked={form.acceptsRequests}
              onChange={e => set('acceptsRequests', e.target.checked)} />
            <span className="text-sm text-stone-700">Accept custom commission requests</span>
          </label>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-stone-200 text-sm font-semibold text-stone-600 hover:bg-stone-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="flex-1 py-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-sm font-semibold transition-colors disabled:opacity-50">
              {mutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Quote modal ───────────────────────────────────────────────────────────────

function QuoteModal({ request, onClose }) {
  const qc = useQueryClient();
  const [price, setPrice] = useState('');
  const [note, setNote]   = useState('');
  const [error, setError] = useState('');

  const quoteMutation = useMutation({
    mutationFn: () => api.put(`/shop/me/requests/${request._id}/quote`, { quotedPrice: Number(price), quotedNote: note }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['myShopRequests'] }); onClose(); },
    onError: (err) => setError(err.response?.data?.message || 'Failed to send quote'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-stone-100">
          <h2 className="font-bold text-stone-900">Send Quote</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-stone-50 rounded-xl p-4">
            <p className="font-semibold text-stone-900 text-sm">{request.title}</p>
            <p className="text-xs text-stone-500 mt-1 line-clamp-2">{request.description}</p>
            {(request.budgetMin || request.budgetMax) && (
              <p className="text-xs text-stone-400 mt-1">
                Budget: {CURRENCY_SYMBOL}{request.budgetMin?.toLocaleString() ?? '—'} – {CURRENCY_SYMBOL}{request.budgetMax?.toLocaleString() ?? '—'}
              </p>
            )}
          </div>
          <div>
            <label className={labelCls}>Your price ({CURRENCY_SYMBOL})</label>
            <input className={inputCls} type="number" min="1" placeholder="e.g. 5000"
              value={price} onChange={e => setPrice(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Note to client <span className="text-stone-400 font-normal">(optional)</span></label>
            <textarea className={inputCls} rows={3} placeholder="Timeline, what's included, any questions..."
              value={note} onChange={e => setNote(e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-stone-200 text-sm font-semibold text-stone-600 hover:bg-stone-50 transition-colors">Cancel</button>
            <button onClick={() => { if (!price) return setError('Enter a price'); quoteMutation.mutate(); }}
              disabled={quoteMutation.isPending}
              className="flex-1 py-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-sm font-semibold transition-colors disabled:opacity-50">
              {quoteMutation.isPending ? 'Sending…' : 'Send Quote'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Earnings summary card ──────────────────────────────────────────────────────

function SummaryCard({ label, value, sub, colorCls }) {
  return (
    <div className={`rounded-2xl border p-4 ${colorCls}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-60 mb-1">{label}</p>
      <p className="text-xl font-black">{value}</p>
      {sub && <p className="text-xs opacity-50 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Earnings tab ──────────────────────────────────────────────────────────────

function EarningsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['myShopEarnings'],
    queryFn: () => api.get('/shop/me/earnings').then(r => r.data.data),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[1,2,3,4].map(i => <div key={i} className="h-20 bg-stone-100 rounded-2xl animate-pulse" />)}
        </div>
        {[1,2,3].map(i => <div key={i} className="h-20 bg-stone-100 rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  const { sales = [], summary = {} } = data || {};
  const {
    totalEarned = 0, totalPlatform = 0,
    totalRevenue = 0, totalSales = 0, freeSales = 0,
  } = summary;

  return (
    <div className="space-y-6">
      {/* ── Withdrawal + payout details ── */}
      <BalanceCard
        balanceUrl="shop/me/balance"
        requestUrl="shop/me/payouts/request"
        historyUrl="shop/me/payouts"
        queryNs="shop"
        description="Earnings from your art & craft sales. Request a withdrawal anytime — typically processed within 2 business days."
      />
      <PayoutDetailsCard />

      {/* ── Lifetime earnings summary ── */}
      <div>
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <SummaryCard
          label="Total Earned"
          value={fmtPrice(totalEarned)}
          sub={`of ${CURRENCY_SYMBOL}${totalRevenue.toLocaleString()} revenue`}
          colorCls="bg-fuchsia-50 border-fuchsia-100 text-fuchsia-900"
        />
        <SummaryCard
          label="Total Sales"
          value={totalSales}
          sub={freeSales > 0 ? `${freeSales} commission-free` : undefined}
          colorCls="bg-violet-50 border-violet-100 text-violet-900"
        />
        <SummaryCard
          label="Platform Fee"
          value={fmtPrice(totalPlatform)}
          sub="taken by SkillHub"
          colorCls="bg-stone-50 border-stone-200 text-stone-700"
        />
        <SummaryCard
          label="Your Cut"
          value={totalRevenue > 0 ? `${Math.round((totalEarned / totalRevenue) * 100)}%` : '—'}
          sub="average keep rate"
          colorCls="bg-green-50 border-green-100 text-green-900"
        />
      </div>

      {/* Sale history */}
      {sales.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <Wallet className="w-12 h-12 mx-auto mb-3 text-stone-200" strokeWidth={1.5} />
          <p className="font-semibold text-stone-500">No sales yet</p>
          <p className="text-sm mt-1">Your earnings will appear here once you make a sale.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">
            Recent Transactions
          </h3>
          {sales.map(sale => (
            <div key={sale._id} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 flex items-center gap-4">
              {/* Icon */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                sale.type === 'direct' ? 'bg-violet-100' : 'bg-fuchsia-100'
              }`}>
                {sale.type === 'direct'
                  ? <ShoppingBag className="w-5 h-5 text-violet-600" strokeWidth={1.75} />
                  : <Sparkles className="w-5 h-5 text-fuchsia-600" strokeWidth={1.75} />
                }
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    sale.type === 'direct' ? 'bg-violet-100 text-violet-700' : 'bg-fuchsia-100 text-fuchsia-700'
                  }`}>
                    {sale.type === 'direct' ? 'Direct Sale' : 'Commission Work'}
                  </span>
                  {sale.isFreeCommission && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      Commission-free
                    </span>
                  )}
                </div>
                <p className="font-semibold text-stone-900 text-sm truncate">{sale.itemTitle || 'Unnamed item'}</p>
                <p className="text-xs text-stone-400 mt-0.5">
                  {fmtDate(sale.soldAt)}
                  {sale.commissionPercent > 0 && ` · ${sale.commissionPercent}% platform fee`}
                </p>
              </div>

              {/* Amount */}
              <div className="text-right shrink-0">
                <p className="font-black text-fuchsia-700 text-base">{fmtPrice(sale.workerEarning)}</p>
                <p className="text-xs text-stone-400">of {fmtPrice(sale.amount)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>{/* end lifetime summary */}
    </div>
  );
}

// ── Commission status banner ──────────────────────────────────────────────────

function CommissionBanner() {
  const { data } = useQuery({
    queryKey: ['myShopCommission'],
    queryFn: () => api.get('/shop/me/commission').then(r => r.data.data),
  });
  if (!data) return null;

  const { percent, isFree, salesSoFar, freeUntil } = data;
  const remaining = freeUntil - salesSoFar;

  if (isFree) {
    return (
      <div className="bg-gradient-to-r from-fuchsia-50 to-pink-50 border border-fuchsia-200 rounded-2xl px-5 py-4 flex items-center justify-between gap-4 mb-6">
        <div>
          <p className="font-bold text-fuchsia-800 text-sm">
            Commission-free period — {remaining} sale{remaining !== 1 ? 's' : ''} remaining
          </p>
          <p className="text-xs text-fuchsia-600 mt-0.5">
            You keep 100% of your first {freeUntil} sales. After that, the platform takes {percent === 0 ? '—' : `${percent}%`} commission.
          </p>
        </div>
        <div className="shrink-0 text-center">
          <p className="text-2xl font-black text-fuchsia-700">{salesSoFar}/{freeUntil}</p>
          <p className="text-xs text-fuchsia-500">sales so far</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-stone-50 border border-stone-200 rounded-2xl px-5 py-3 flex items-center justify-between gap-4 mb-6">
      <div>
        <p className="font-semibold text-stone-700 text-sm">{percent}% platform commission applies</p>
        <p className="text-xs text-stone-400 mt-0.5">You keep {100 - percent}% of each sale. {salesSoFar} total sales.</p>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function WorkerShopPage() {
  const qc = useQueryClient();
  const [tab, setTab]       = useState('listings'); // 'listings' | 'requests'
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [quoteReq, setQuoteReq] = useState(null);

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['myShopItems'],
    queryFn: () => api.get('/shop/me/items').then(r => r.data.data),
  });

  const { data: requests = [], isLoading: reqLoading } = useQuery({
    queryKey: ['myShopRequests'],
    queryFn: () => api.get('/shop/me/requests').then(r => r.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/shop/me/items/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['myShopItems'] }),
  });

  const declineMutation = useMutation({
    mutationFn: (id) => api.put(`/shop/me/requests/${id}/decline`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['myShopRequests'] }),
  });

  const completeMutation = useMutation({
    mutationFn: (id) => api.put(`/shop/me/requests/${id}/complete`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['myShopRequests'] }),
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <DashSubPageWrapper
      title="My Shop"
      subtitle="Manage your art & craft listings and custom commission requests"
      icon={<ShoppingBag className="w-5 h-5 text-white" strokeWidth={2} />}
    >
      {/* Commission status */}
      <CommissionBanner />

      {/* Tabs */}
      <div className="flex gap-1 bg-stone-100 rounded-xl p-1 mb-6 w-fit">
        {[
          { key: 'listings', label: 'Listings' },
          { key: 'requests', label: `Requests${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
          { key: 'earnings', label: 'Earnings' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              tab === t.key ? 'bg-white text-fuchsia-700 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Listings tab ── */}
      {tab === 'listings' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider">
              {items.length} listing{items.length !== 1 ? 's' : ''}
            </h2>
            <button onClick={() => { setEditItem(null); setShowForm(true); }}
              className="inline-flex items-center gap-1.5 bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
              <Plus className="w-4 h-4" /> Add Listing
            </button>
          </div>

          {itemsLoading ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {[1,2,3].map(i => <div key={i} className="h-40 bg-stone-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 text-stone-400">
              <Paintbrush className="w-12 h-12 mx-auto mb-3 text-stone-200" strokeWidth={1.5} />
              <p className="font-semibold text-stone-500">No listings yet</p>
              <p className="text-sm mt-1">Add your first artwork or handcraft to start selling.</p>
              <button onClick={() => { setEditItem(null); setShowForm(true); }}
                className="mt-4 inline-flex items-center gap-2 bg-fuchsia-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-fuchsia-700 transition-colors">
                <Plus className="w-4 h-4" /> Add First Listing
              </button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {items.map(item => {
                const img = item.images?.[0];
                const statusMeta = { active: { label: 'Active', cls: 'bg-green-100 text-green-700' }, hidden: { label: 'Hidden', cls: 'bg-stone-100 text-stone-500' }, sold_out: { label: 'Sold Out', cls: 'bg-red-100 text-red-600' } }[item.status] || {};
                return (
                  <div key={item._id} className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden flex">
                    {/* Thumbnail */}
                    <div className="w-24 h-24 shrink-0 bg-stone-100 overflow-hidden self-center ml-4 rounded-xl">
                      {img ? <img src={img} alt={item.title} className="w-full h-full object-cover" />
                           : <div className="w-full h-full flex items-center justify-center"><Paintbrush className="w-6 h-6 text-stone-300" /></div>}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-stone-900 text-sm leading-snug line-clamp-1">{item.title}</h3>
                        <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${statusMeta.cls}`}>{statusMeta.label}</span>
                      </div>
                      <p className="text-fuchsia-700 font-black text-base mt-1">{fmtPrice(item.price)}</p>
                      {item.deliveryInfo && (
                        <p className="text-xs text-stone-400 mt-0.5 flex items-center gap-1">
                          <Package className="w-3 h-3" /> {item.deliveryInfo}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <button onClick={() => { setEditItem(item); setShowForm(true); }}
                          className="text-xs font-semibold text-stone-500 hover:text-fuchsia-600 flex items-center gap-1 transition-colors">
                          <Pencil className="w-3 h-3" /> Edit
                        </button>
                        <span className="text-stone-200">|</span>
                        <button onClick={() => { if (window.confirm('Delete this listing?')) deleteMutation.mutate(item._id); }}
                          className="text-xs font-semibold text-stone-400 hover:text-red-500 flex items-center gap-1 transition-colors">
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Requests tab ── */}
      {tab === 'requests' && (
        <div className="space-y-4">
          {reqLoading ? (
            [1,2].map(i => <div key={i} className="h-32 bg-stone-100 rounded-2xl animate-pulse" />)
          ) : requests.length === 0 ? (
            <div className="text-center py-16 text-stone-400">
              <Tag className="w-12 h-12 mx-auto mb-3 text-stone-200" strokeWidth={1.5} />
              <p className="font-semibold text-stone-500">No commission requests yet</p>
              <p className="text-sm mt-1">Custom requests from clients will appear here.</p>
            </div>
          ) : requests.map(req => {
            const badge = STATUS_BADGE[req.status] || { label: req.status, cls: 'bg-stone-100 text-stone-500' };
            const client = req.clientId;
            return (
              <div key={req._id} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <h3 className="font-bold text-stone-900">{req.title}</h3>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                    </div>
                    <p className="text-xs text-stone-400">
                      From <span className="font-semibold text-stone-600">{client?.name || 'Client'}</span>
                      {' · '}{fmtDate(req.createdAt)}
                    </p>
                  </div>
                </div>

                <p className="text-sm text-stone-600 line-clamp-3 mb-3">{req.description}</p>

                <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500 mb-4">
                  {(req.budgetMin || req.budgetMax) && (
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {CURRENCY_SYMBOL}{req.budgetMin?.toLocaleString() ?? '—'} – {CURRENCY_SYMBOL}{req.budgetMax?.toLocaleString() ?? '—'}
                    </span>
                  )}
                  {req.deadline && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> By {fmtDate(req.deadline)}
                    </span>
                  )}
                  {req.quotedPrice && (
                    <span className="flex items-center gap-1 text-fuchsia-700 font-semibold">
                      Quoted: {fmtPrice(req.quotedPrice)}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  {req.status === 'pending' && (
                    <>
                      <button onClick={() => setQuoteReq(req)}
                        className="text-sm font-semibold bg-fuchsia-600 hover:bg-fuchsia-700 text-white px-4 py-1.5 rounded-xl transition-colors">
                        Send Quote
                      </button>
                      <button onClick={() => declineMutation.mutate(req._id)}
                        className="text-sm font-semibold text-stone-500 hover:text-red-500 px-4 py-1.5 rounded-xl border border-stone-200 hover:border-red-200 transition-colors">
                        Decline
                      </button>
                    </>
                  )}
                  {req.status === 'in_progress' && (
                    <button onClick={() => completeMutation.mutate(req._id)}
                      className="text-sm font-semibold bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-xl transition-colors flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Mark Delivered
                    </button>
                  )}
                  {req.status === 'quoted' && (
                    <p className="text-xs text-stone-400 italic flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Waiting for client to accept and pay
                    </p>
                  )}
                  {req.status === 'completed' && (
                    <p className="text-xs text-green-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Delivered
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Earnings tab ── */}
      {tab === 'earnings' && <EarningsTab />}

      {/* Modals */}
      {showForm && (
        <ItemForm initialItem={editItem} onClose={() => { setShowForm(false); setEditItem(null); }} />
      )}
      {quoteReq && (
        <QuoteModal request={quoteReq} onClose={() => setQuoteReq(null)} />
      )}
    </DashSubPageWrapper>
  );
}

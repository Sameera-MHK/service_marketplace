import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import {
  ShoppingBag, Paintbrush, Package, ChevronLeft,
  ChevronRight, Tag, CheckCircle2,
  Loader2, ExternalLink, Send, X, Lock,
} from 'lucide-react';
import api from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import { AvatarWithFallback } from '../components/Avatar';
import SEO from '../components/SEO';
import { SITE_NAME, CURRENCY_SYMBOL } from '../config/site.js';

const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null;

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtPrice(n) { return `${CURRENCY_SYMBOL}${Number(n).toLocaleString()}`; }

// ── Image gallery ─────────────────────────────────────────────────────────────

function Gallery({ images, title }) {
  const [idx, setIdx] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="aspect-square bg-stone-100 rounded-2xl flex items-center justify-center">
        <Paintbrush className="w-16 h-16 text-stone-300" strokeWidth={1.5} />
      </div>
    );
  }

  const prev = () => setIdx((i) => (i - 1 + images.length) % images.length);
  const next = () => setIdx((i) => (i + 1) % images.length);

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="relative aspect-square bg-stone-100 rounded-2xl overflow-hidden shadow-sm">
        <img src={images[idx]} alt={title} className="w-full h-full object-cover" />
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 hover:bg-white backdrop-blur-sm rounded-full flex items-center justify-center shadow-md transition-all"
            >
              <ChevronLeft className="w-4 h-4 text-stone-700" />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 hover:bg-white backdrop-blur-sm rounded-full flex items-center justify-center shadow-md transition-all"
            >
              <ChevronRight className="w-4 h-4 text-stone-700" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  className={`w-2 h-2 rounded-full transition-all ${i === idx ? 'bg-white scale-125' : 'bg-white/50'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`w-16 h-16 shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                i === idx ? 'border-fuchsia-500 shadow-md' : 'border-stone-200 hover:border-fuchsia-300'
              }`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-stone-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <Paintbrush className="w-5 h-5 text-fuchsia-600" strokeWidth={1.75} />
            <h2 className="font-bold text-stone-900">Request Custom Work</h2>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1">What do you need?</label>
            <input className={inputCls} placeholder="e.g. Custom portrait of my family"
              value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1">Details</label>
            <textarea className={inputCls} rows={4} placeholder="Describe what you want — size, style, colours, any references..."
              value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1">Budget min ({CURRENCY_SYMBOL})</label>
              <input className={inputCls} type="number" placeholder="e.g. 2000"
                value={form.budgetMin} onChange={(e) => setForm(p => ({ ...p, budgetMin: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1">Budget max ({CURRENCY_SYMBOL})</label>
              <input className={inputCls} type="number" placeholder="e.g. 8000"
                value={form.budgetMax} onChange={(e) => setForm(p => ({ ...p, budgetMax: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1">
              Deadline <span className="text-stone-400 font-normal">(optional)</span>
            </label>
            <input className={inputCls} type="date"
              value={form.deadline} onChange={(e) => setForm(p => ({ ...p, deadline: e.target.value }))} />
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

// ── Stripe payment form ───────────────────────────────────────────────────────

function PaymentForm({ itemId, itemTitle, price, paymentIntentId, onSuccess, onCancel }) {
  const stripe   = useStripe();
  const elements = useElements();
  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState('');

  async function handlePay(e) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setError('');

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/shop/${itemId}?paid=1` },
      redirect: 'if_required',
    });

    if (result.error) {
      setError(result.error.message);
      setBusy(false);
      return;
    }

    // Payment confirmed — tell the server to decrement stock
    try {
      await api.post(`/shop/items/${itemId}/confirm`, { paymentIntentId });
    } catch (_) { /* webhook will catch it */ }
    onSuccess();
  }

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-bold text-stone-900">Pay securely</h3>
        <span className="text-fuchsia-700 font-black text-lg">{fmtPrice(price)}</span>
      </div>
      <PaymentElement />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={busy || !stripe}
        className="w-full flex items-center justify-center gap-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold py-3.5 rounded-2xl transition-colors disabled:opacity-50 shadow-md shadow-fuchsia-100"
      >
        {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</> : <><Lock className="w-4 h-4" /> Pay {fmtPrice(price)}</>}
      </button>
      <button type="button" onClick={onCancel} className="w-full text-sm text-stone-400 hover:text-stone-600 py-1 transition-colors">
        Cancel
      </button>
      <p className="text-xs text-stone-400 text-center flex items-center justify-center gap-1">
        <Lock className="w-3 h-3" /> Secured by Stripe. Your card details are never stored on our servers.
      </p>
    </form>
  );
}

function PaymentModal({ itemId, itemTitle, price, clientSecret, paymentIntentId, onSuccess, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        {stripePromise && clientSecret ? (
          <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: '#a21caf' } } }}>
            <PaymentForm
              itemId={itemId}
              itemTitle={itemTitle}
              price={price}
              paymentIntentId={paymentIntentId}
              onSuccess={onSuccess}
              onCancel={onCancel}
            />
          </Elements>
        ) : (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-4">
            Stripe is not configured. Please contact support.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ShopItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // payment state
  const [paymentData,  setPaymentData]  = useState(null);  // { clientSecret, paymentIntentId }
  const [initiating,   setInitiating]   = useState(false);
  const [bought,       setBought]       = useState(false);
  const [buyError,     setBuyError]     = useState('');

  // custom request state
  const [showRequest, setShowRequest] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['shopItem', id],
    queryFn: () => api.get(`/shop/items/${id}`).then((r) => r.data.data),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-fuchsia-500 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center gap-4 text-stone-400">
        <Paintbrush className="w-12 h-12 text-stone-200" strokeWidth={1.5} />
        <p className="font-semibold text-stone-500">Item not found</p>
        <Link to="/shop" className="text-sm text-fuchsia-600 hover:underline">Back to shop</Link>
      </div>
    );
  }

  const item    = data;
  const seller  = item.workerId;
  const soldOut = item.status === 'sold_out' || (item.stock !== null && item.stock <= 0);

  async function handleBuyClick() {
    if (!user)                 { navigate(`/login?redirect=/shop/${id}`); return; }
    if (user.role !== 'client') { setBuyError('Only clients can purchase items.'); return; }
    setInitiating(true);
    setBuyError('');
    try {
      const res = await api.post(`/shop/items/${id}/buy`);
      setPaymentData({ clientSecret: res.data.clientSecret, paymentIntentId: res.data.paymentIntentId });
    } catch (err) {
      setBuyError(err.response?.data?.message || 'Could not start payment. Please try again.');
    } finally {
      setInitiating(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-16">
      <SEO
        title={item.title}
        description={item.description || `Buy ${item.title} from a verified artist on ${SITE_NAME}.`}
        image={item.images?.[0]}
        url={`/shop/${id}`}
        schema={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: item.title,
          description: item.description || '',
          image: item.images || [],
          offers: {
            '@type': 'Offer',
            price: item.price,
            priceCurrency: DEFAULT_CURRENCY,
            availability: soldOut
              ? 'https://schema.org/OutOfStock'
              : 'https://schema.org/InStock',
            url: `https://skillhub.example.com/shop/${id}`,
            seller: seller?.name
              ? { '@type': 'Person', name: seller.name }
              : undefined,
          },
        }}
      />

      {/* ── Breadcrumb ── */}
      <div className="max-w-5xl mx-auto px-4 pt-6 pb-2">
        <Link
          to="/shop"
          className="inline-flex items-center gap-1 text-sm text-stone-400 hover:text-fuchsia-600 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Shop
        </Link>
      </div>

      {/* ── Main content ── */}
      <div className="max-w-5xl mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">

          {/* Left — Gallery */}
          <Gallery images={item.images} title={item.title} />

          {/* Right — Details */}
          <div className="flex flex-col gap-5">

            {/* Title + price */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="inline-flex items-center gap-1.5 bg-fuchsia-100 text-fuchsia-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                  <ShoppingBag className="w-3.5 h-3.5" /> Art & Crafts Shop
                </div>
                {soldOut && (
                  <span className="inline-flex items-center bg-red-100 text-red-600 text-xs font-semibold px-2.5 py-1 rounded-full">
                    Sold Out
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-stone-900 leading-snug mb-3">{item.title}</h1>
              <p className="text-3xl font-black text-fuchsia-700">{fmtPrice(item.price)}</p>
            </div>

            {/* Delivery info */}
            {item.deliveryInfo && (
              <div className="flex items-center gap-2 text-sm text-stone-500 bg-stone-50 border border-stone-100 rounded-xl px-4 py-3">
                <Package className="w-4 h-4 shrink-0 text-stone-400" />
                {item.deliveryInfo}
              </div>
            )}

            {/* Description */}
            {item.description && (
              <div>
                <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">About this item</h2>
                <p className="text-stone-700 text-sm leading-relaxed whitespace-pre-line">{item.description}</p>
              </div>
            )}

            {/* Tags */}
            {item.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 text-xs bg-stone-100 text-stone-500 px-2.5 py-1 rounded-full">
                    <Tag className="w-3 h-3" /> {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Status messages */}
            {requestSent && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-green-700 font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Your request was sent! The artist will review it and send you a quote.
              </div>
            )}

            {bought && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-green-700 font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Payment successful! The seller will be in touch to arrange delivery.
              </div>
            )}

            {buyError && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{buyError}</p>
            )}

            {/* CTA buttons — hidden after successful purchase */}
            {!bought && (
              <div className="flex flex-col sm:flex-row gap-3">
                {!soldOut && (
                  <button
                    onClick={handleBuyClick}
                    disabled={initiating}
                    className="flex-1 flex items-center justify-center gap-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold py-3.5 px-6 rounded-2xl transition-colors shadow-md shadow-fuchsia-100 disabled:opacity-60"
                  >
                    {initiating
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Please wait…</>
                      : <><ShoppingBag className="w-4 h-4" /> Buy Now</>
                    }
                  </button>
                )}
                {item.acceptsRequests && !requestSent && (
                  <button
                    onClick={() => {
                      if (!user) { navigate(`/login?redirect=/shop/${id}`); return; }
                      setShowRequest(true);
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 border-2 border-fuchsia-200 hover:border-fuchsia-400 text-fuchsia-700 hover:bg-fuchsia-50 font-semibold py-3.5 px-6 rounded-2xl transition-colors`}
                  >
                    <Paintbrush className="w-4 h-4" /> Request Custom
                  </button>
                )}
              </div>
            )}

            {/* Seller card */}
            {seller && (
              <div className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm">
                <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">About the Artist</h2>
                <div className="flex items-center gap-3">
                  <AvatarWithFallback name={seller.name} photo={seller.profilePhoto} size={48} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-stone-900 capitalize">{seller.name?.toLowerCase()}</p>
                    {seller.location?.district && (
                      <p className="text-xs text-stone-400 mt-0.5">{seller.location.district}</p>
                    )}
                  </div>
                  <Link
                    to={`/pro/${seller._id}`}
                    className="shrink-0 text-xs font-semibold text-fuchsia-600 hover:text-fuchsia-700 flex items-center gap-1 transition-colors"
                  >
                    View Profile <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            )}

            {/* Safe purchase note */}
            <p className="text-xs text-stone-400 text-center flex items-center justify-center gap-1">
              <Lock className="w-3 h-3" /> All artists are verified. Payments secured by Stripe.
            </p>
          </div>
        </div>
      </div>

      {/* ── Stripe payment modal ── */}
      {paymentData && (
        <PaymentModal
          itemId={id}
          itemTitle={item.title}
          price={item.price}
          clientSecret={paymentData.clientSecret}
          paymentIntentId={paymentData.paymentIntentId}
          onSuccess={() => { setPaymentData(null); setBought(true); }}
          onCancel={() => setPaymentData(null)}
        />
      )}

      {/* ── More from this artist ── */}
      {seller && <MoreFromSeller sellerId={seller._id} excludeId={id} sellerName={seller.name} />}

      {/* Modals */}
      {showRequest && (
        <RequestForm
          workerId={seller?._id}
          onClose={() => setShowRequest(false)}
          onSuccess={() => setRequestSent(true)}
        />
      )}
    </div>
  );
}

// ── More from seller section ──────────────────────────────────────────────────

function MoreFromSeller({ sellerId, excludeId, sellerName }) {
  const { data } = useQuery({
    queryKey: ['shopItems', sellerId],
    queryFn: () => api.get('/shop/items', { params: { workerId: sellerId, limit: 4 } }).then((r) => r.data.data),
    enabled: !!sellerId,
  });

  const others = (data || []).filter((i) => i._id !== excludeId);
  if (others.length === 0) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 mt-10">
      <h2 className="text-lg font-black text-stone-900 mb-4">
        More from <span className="capitalize">{sellerName?.toLowerCase()}</span>
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {others.map((item) => {
          const soldOut = item.status === 'sold_out' || (item.stock !== null && item.stock <= 0);
          return (
            <Link
              key={item._id}
              to={`/shop/${item._id}`}
              className="group bg-white rounded-2xl border border-stone-200 overflow-hidden hover:border-fuchsia-300 hover:shadow-lg hover:shadow-fuchsia-50 transition-all"
            >
              <div className="relative h-36 bg-stone-100 overflow-hidden">
                {item.images?.[0] ? (
                  <img src={item.images[0]} alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Paintbrush className="w-8 h-8 text-stone-200" strokeWidth={1.5} />
                  </div>
                )}
                {soldOut && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-white text-xs font-bold bg-black/60 px-2 py-0.5 rounded-full">Sold Out</span>
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="font-bold text-stone-900 text-sm line-clamp-2 leading-snug mb-1">{item.title}</p>
                <p className="text-fuchsia-700 font-black text-sm">{fmtPrice(item.price)}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

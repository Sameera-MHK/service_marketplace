import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import api from '../lib/axios';

export default function PrivateConsultations({ workerUserId }) {
  const { data } = useQuery({
    queryKey: ['publicConsultations', workerUserId],
    queryFn: () => api.get(`/consultations/workers/${workerUserId}/offerings`).then((r) => r.data.data),
    enabled: !!workerUserId,
  });

  if (!data?.enabled || !data?.offerings?.length) return null;

  return (
    <section className="my-8 rounded-2xl overflow-hidden bg-gradient-to-br from-violet-50 via-white to-pink-50/30 border border-violet-100 shadow-sm">
      <div className="px-6 pt-6 pb-3 border-b border-violet-100/60">
        <div className="flex items-center gap-2 mb-1">
          <Star className="w-5 h-5 fill-amber-400 text-amber-400" strokeWidth={1.5} />
          <span className="text-xs uppercase tracking-wider font-semibold text-violet-700">Private Consultations</span>
        </div>
        <h2 className="text-2xl font-black text-stone-900">Book a 1-on-1 video session</h2>
        <p className="text-sm text-stone-500 mt-1">Confidential, secure video call — pay online, join from your browser. Recording available afterwards if shared.</p>
      </div>

      <div className="p-6 grid gap-3 md:grid-cols-2">
        {data.offerings.map((o) => (
          <Link
            key={o._id}
            to={`/consultations/book/${workerUserId}/${o._id}`}
            className="group block rounded-xl bg-white border border-stone-200 p-5 hover:border-violet-300 hover:shadow-md hover:shadow-violet-100 transition-all"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="font-bold text-stone-900 group-hover:text-violet-700">{o.title}</h3>
              <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">
                {o.durationMinutes} min
              </span>
            </div>
            {o.description && <p className="text-sm text-stone-500 mb-3 line-clamp-2">{o.description}</p>}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-stone-400">From</p>
                <p className="text-2xl font-black text-stone-900">
                  {o.currency} <span className="text-amber-600">{Number(o.price).toLocaleString()}</span>
                </p>
              </div>
              <span className="text-xs font-semibold text-violet-700 group-hover:translate-x-0.5 transition-transform">Book →</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

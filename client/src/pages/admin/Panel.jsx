import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import api from '../../lib/axios';
import ScoreBadge from '../../components/ScoreBadge';
import CategoryIcon from '../../components/CategoryIcon';
import { PICKER_ICONS } from '../../lib/categoryIcons';
import { CATEGORY_GROUPS } from '../../lib/categoryGroups';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  CheckCircle2, Check, X, AlertTriangle, Star, DollarSign,
  TrendingUp, TrendingDown, Calendar, Target, Users, User,
  Hammer, ClipboardList, Zap, Scale, CreditCard, Flag,
  Handshake, ShieldCheck, Circle, Bookmark,
} from 'lucide-react';
import { CURRENCY_SYMBOL } from '../../config/site.js';

// ── helpers ────────────────────────────────────────────────────────────────

function SectionHeader({ title, count, color = 'stone' }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <h2 className="font-bold text-lg">{title}</h2>
      {count > 0 && (
        <span className={`badge bg-${color}-100 text-${color}-700`}>{count}</span>
      )}
    </div>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div className="card text-center py-10 text-stone-400">
      <div className="flex items-center justify-center mb-2">
        <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <p className="text-sm">{text}</p>
    </div>
  );
}

// ── Action Required tab ────────────────────────────────────────────────────

function ActionRequired() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['adminActionRequired'],
    queryFn: () => api.get('/admin/action-required').then((r) => r.data.data),
  });

  async function resolveDispute(jobId, outcome) {
    await api.put(`/admin/disputes/${jobId}/resolve`, { outcome });
    qc.invalidateQueries(['adminActionRequired']);
    qc.invalidateQueries(['adminStats']);
    qc.invalidateQueries(['adminActionCount']);
  }

  async function verifyNic(userId) {
    await api.put(`/admin/workers/${userId}/verify-idDoc`);
    qc.invalidateQueries(['adminActionRequired']);
    qc.invalidateQueries(['adminStats']);
    qc.invalidateQueries(['adminActionCount']);
  }

  if (isLoading) return <div className="text-center py-10 text-stone-400">Loading…</div>;

  const { disputes = [], idPending = [] } = data || {};

  return (
    <div className="space-y-8">

      {/* Disputes */}
      <section>
        <SectionHeader title="Open Disputes" count={disputes.length} color="red" />
        {!disputes.length ? (
          <EmptyState icon={<CheckCircle2 className="w-6 h-6 text-green-500" strokeWidth={1.75} />} text="No open disputes — all clear!" />
        ) : (
          <div className="space-y-3">
            {disputes.map((job) => (
              <div key={job._id} className="card border-l-4 border-red-400">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{job.title}</h3>
                    <div className="flex gap-4 text-sm text-stone-500 mt-1 flex-wrap">
                      <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" strokeWidth={1.75} /> Client: <span className="font-medium text-stone-700">{job.clientId?.name}</span></span>
                      <span className="flex items-center gap-1"><Hammer className="w-3.5 h-3.5" strokeWidth={1.75} /> Worker: <span className="font-medium text-stone-700">{job.workerId?.name}</span></span>
                    </div>
                    <p className="text-sm text-stone-600 mt-2 bg-stone-50 rounded-lg px-3 py-2">
                      <span className="font-medium">Reason: </span>{job.disputeReason || 'No reason provided'}
                    </p>
                    <p className="text-xs text-stone-400 mt-1">{new Date(job.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => resolveDispute(job._id, 'client_favour')}
                      className="text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-100 whitespace-nowrap flex items-center gap-1.5"
                    >
                      <User className="w-3.5 h-3.5" strokeWidth={1.75} /> Client Favour
                    </button>
                    <button
                      onClick={() => resolveDispute(job._id, 'worker_favour')}
                      className="text-sm bg-purple-50 text-purple-700 border border-purple-200 rounded-lg px-3 py-1.5 hover:bg-purple-100 whitespace-nowrap flex items-center gap-1.5"
                    >
                      <Hammer className="w-3.5 h-3.5" strokeWidth={1.75} /> Worker Favour
                    </button>
                    <button
                      onClick={() => resolveDispute(job._id, 'mutual')}
                      className="text-sm bg-stone-50 text-stone-600 border border-stone-200 rounded-lg px-3 py-1.5 hover:bg-stone-100 flex items-center gap-1.5"
                    >
                      <Handshake className="w-3.5 h-3.5" strokeWidth={1.75} /> Mutual
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ID verifications */}
      <section>
        <SectionHeader title="Pending ID Verifications" count={idPending.length} color="amber" />
        {!idPending.length ? (
          <EmptyState icon={<ShieldCheck className="w-6 h-6 text-violet-500" strokeWidth={1.75} />} text="No ID verifications pending" />
        ) : (
          <div className="space-y-3">
            {idPending.map((profile) => (
              <div key={profile._id} className="card border-l-4 border-violet-400">
                <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
                  <div>
                    <p className="font-semibold">{profile.userId?.name}</p>
                    <p className="text-sm text-stone-500">
                      {profile.category?.replace('_', ' ')} · {profile.userId?.email} · {profile.userId?.phone}
                    </p>
                    {profile.userId?.idNumber && (
                      <p className="text-sm text-stone-600 mt-0.5">ID: <span className="font-mono font-medium">{profile.userId.idNumber}</span></p>
                    )}
                    <p className="text-xs text-stone-400 mt-0.5">
                      Joined {new Date(profile.userId?.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button onClick={() => verifyNic(profile.userId?._id)} className="btn-primary text-sm py-2 flex items-center gap-1.5">
                    <Check className="w-4 h-4" strokeWidth={2.5} /> Verify ID
                  </button>
                </div>
                {(profile.userId?.idPhotoFront || profile.userId?.idPhotoBack) && (
                  <div className="flex gap-3">
                    {profile.userId?.idPhotoFront && (
                      <a href={profile.userId.idPhotoFront} target="_blank" rel="noreferrer" className="block">
                        <img src={profile.userId.idPhotoFront} alt="ID Front" className="h-24 w-40 object-cover rounded-lg border border-stone-200 hover:opacity-90" />
                        <p className="text-xs text-stone-400 mt-1 text-center">Front</p>
                      </a>
                    )}
                    {profile.userId?.idPhotoBack && (
                      <a href={profile.userId.idPhotoBack} target="_blank" rel="noreferrer" className="block">
                        <img src={profile.userId.idPhotoBack} alt="ID Back" className="h-24 w-40 object-cover rounded-lg border border-stone-200 hover:opacity-90" />
                        <p className="text-xs text-stone-400 mt-1 text-center">Back</p>
                      </a>
                    )}
                  </div>
                )}
                {!profile.userId?.idSubmitted && (
                  <p className="text-xs text-violet-600 mt-2 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                    Pro registered but has not submitted ID photos yet
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ── Flagged tab ────────────────────────────────────────────────────────────

function FlaggedWorkers() {
  const qc = useQueryClient();

  const { data: flagged = [], isLoading } = useQuery({
    queryKey: ['adminFlagged'],
    queryFn: () => api.get('/admin/flagged').then((r) => r.data.data),
  });

  async function suspend(userId) {
    await api.put(`/admin/workers/${userId}/suspend`, { reason: 'Admin review' });
    qc.invalidateQueries(['adminFlagged']);
    qc.invalidateQueries(['adminStats']);
  }

  async function clearFlag(userId) {
    await api.put(`/admin/workers/${userId}/clear-flag`);
    qc.invalidateQueries(['adminFlagged']);
    qc.invalidateQueries(['adminStats']);
    qc.invalidateQueries(['adminActionCount']);
  }

  async function reinstate(userId) {
    await api.put(`/admin/workers/${userId}/reinstate`);
    qc.invalidateQueries(['adminFlagged']);
  }

  const flagTypeLabel = {
    auto_suspended: { label: 'Auto-suspended', color: 'red' },
    nic_pending: { label: 'ID Pending', color: 'amber' },
    high_cancellation: { label: 'High Cancellations', color: 'orange' },
    fraud: { label: 'Fraud Flag', color: 'red' },
    abuse_report: { label: 'Abuse Report', color: 'red' },
  };

  if (isLoading) return <div className="text-center py-10 text-stone-400">Loading…</div>;

  return (
    <div>
      <SectionHeader title="Flagged Workers" count={flagged.length} color="orange" />
      {!flagged.length ? (
        <EmptyState icon={<CheckCircle2 className="w-6 h-6 text-green-500" strokeWidth={1.75} />} text="No flagged workers right now" />
      ) : (
        <div className="space-y-3">
          {flagged.map((profile) => (
            <div key={profile._id} className="card border-l-4 border-orange-400">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-semibold">{profile.userId?.name}</p>
                    <ScoreBadge band={profile.scoreBand} />
                    {profile.isSuspended && (
                      <span className="badge bg-red-100 text-red-700">Suspended</span>
                    )}
                  </div>
                  <p className="text-sm text-stone-500 mb-2">
                    {profile.category?.replace('_', ' ')} · Score: <span className="font-bold">{profile.skillScore}</span> · {profile.userId?.email}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {profile.flagReasons?.map((f, i) => {
                      const meta = flagTypeLabel[f.type] || { label: f.type, color: 'stone' };
                      return (
                        <span key={i} className={`badge bg-${meta.color}-100 text-${meta.color}-700`}>
                          {meta.label}: {f.reason}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {!profile.isSuspended && (
                    <button onClick={() => suspend(profile.userId?._id)} className="btn-danger text-sm py-1.5">
                      Suspend
                    </button>
                  )}
                  {profile.isSuspended && (
                    <button
                      onClick={() => reinstate(profile.userId?._id)}
                      className="text-sm bg-green-50 text-green-700 border border-green-200 rounded-lg px-3 py-1.5 hover:bg-green-100"
                    >
                      Reinstate
                    </button>
                  )}
                  <button
                    onClick={() => clearFlag(profile.userId?._id)}
                    className="btn-secondary text-sm py-1.5"
                  >
                    Clear Flag
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Analytics tab ─────────────────────────────────────────────────────────

const PIE_COLORS = { free: '#d6d3d1', pro: '#7C3AED', elite: '#a855f7' };
const CHART_COLORS = ['#7C3AED','#10b981','#3b82f6','#8b5cf6','#ef4444','#f97316','#06b6d4','#84cc16','#ec4899','#6366f1'];

function MetricCard({ label, value, sub, color = 'stone', icon }) {
  const colors = {
    green:  'bg-green-50 border-green-200 text-green-700',
    amber:  'bg-violet-50 border-violet-200 text-violet-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    blue:   'bg-blue-50 border-blue-200 text-blue-700',
    red:    'bg-red-50 border-red-200 text-red-700',
    stone:  'bg-stone-50 border-stone-200 text-stone-700',
  };
  return (
    <div className={`rounded-2xl border p-5 ${colors[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-1">{label}</p>
          <p className="text-2xl font-black">{value}</p>
          {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
        </div>
        {icon && <div className="opacity-60">{icon}</div>}
      </div>
    </div>
  );
}

function Analytics() {
  const { data: raw, isLoading } = useQuery({
    queryKey: ['adminAnalytics'],
    queryFn: () => api.get('/admin/analytics').then((r) => r.data.data),
    refetchInterval: 5 * 60 * 1000,
  });

  // Plan prices come from the server config so they stay in one place.
  const { data: planConfig } = useQuery({
    queryKey: ['subscriptionPlans'],
    queryFn: () => api.get('/subscriptions/plans').then((r) => r.data.data),
    staleTime: 60 * 60 * 1000,
  });
  const planPrices = {
    pro:   planConfig?.plans?.pro?.price   ?? 0,
    elite: planConfig?.plans?.elite?.price ?? 0,
  };

  if (isLoading) return <div className="text-center py-20 text-stone-400">Loading analytics…</div>;
  if (!raw) return null;

  const { revenue, mrr, plans, churn, trend, categoryStats, registrations, activeSubscribers } = raw;

  const totalWorkers = (plans.free || 0) + (plans.pro || 0) + (plans.elite || 0);
  const conversionRate = totalWorkers > 0
    ? Math.round((activeSubscribers / totalWorkers) * 100)
    : 0;

  const revenueGrowth = revenue.lastMonth > 0
    ? Math.round(((revenue.thisMonth - revenue.lastMonth) / revenue.lastMonth) * 100)
    : null;

  const planPie = [
    { name: 'Free',  value: plans.free  || 0 },
    { name: 'Pro',   value: plans.pro   || 0 },
    { name: 'Elite', value: plans.elite || 0 },
  ].filter((p) => p.value > 0);

  return (
    <div className="space-y-8">

      {/* ── Top KPI row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="All-Time Revenue"
          value={`${CURRENCY_SYMBOL}${(revenue.allTime || 0).toLocaleString()}`}
          sub="Confirmed payments"
          color="green" icon={<DollarSign className="w-6 h-6" strokeWidth={1.75} />}
        />
        <MetricCard
          label="MRR"
          value={`${CURRENCY_SYMBOL}${(mrr || 0).toLocaleString()}`}
          sub={`${activeSubscribers} active subscribers`}
          color="amber" icon={<TrendingUp className="w-6 h-6" strokeWidth={1.75} />}
        />
        <MetricCard
          label="This Month"
          value={`${CURRENCY_SYMBOL}${(revenue.thisMonth || 0).toLocaleString()}`}
          sub={revenueGrowth !== null
            ? `${revenueGrowth >= 0 ? '▲' : '▼'} ${Math.abs(revenueGrowth)}% vs last month`
            : `${CURRENCY_SYMBOL}${(revenue.lastMonth || 0).toLocaleString()} last month`}
          color={revenueGrowth > 0 ? 'green' : revenueGrowth < 0 ? 'red' : 'stone'}
          icon={<Calendar className="w-6 h-6" strokeWidth={1.75} />}
        />
        <MetricCard
          label="Churn This Month"
          value={churn.thisMonth}
          sub={`${churn.rate}% churn rate · ${churn.lastMonth} last month`}
          color={churn.rate > 20 ? 'red' : churn.rate > 10 ? 'amber' : 'stone'}
          icon={<TrendingDown className="w-6 h-6" strokeWidth={1.75} />}
        />
      </div>

      {/* ── Second row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          label="Paid Workers"
          value={activeSubscribers}
          sub={`${plans.pro || 0} Pro · ${plans.elite || 0} Elite`}
          color="purple" icon={<Star className="w-6 h-6" strokeWidth={1.75} />}
        />
        <MetricCard
          label="Free Workers"
          value={plans.free || 0}
          sub={`${conversionRate}% conversion to paid`}
          color="stone" icon={<Users className="w-6 h-6" strokeWidth={1.75} />}
        />
        <MetricCard
          label="Conversion Rate"
          value={`${conversionRate}%`}
          sub={`${totalWorkers} total workers`}
          color={conversionRate >= 20 ? 'green' : conversionRate >= 10 ? 'amber' : 'stone'}
          icon={<Target className="w-6 h-6" strokeWidth={1.75} />}
        />
      </div>

      {/* ── Revenue trend chart ─────────────────────────────────────────── */}
      <div className="card">
        <h3 className="font-bold text-stone-800 mb-5">Revenue Trend — Last 6 Months</h3>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#78716c' }} />
              <YAxis tick={{ fontSize: 11, fill: '#78716c' }} tickFormatter={(v) => `${CURRENCY_SYMBOL}${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => [`${CURRENCY_SYMBOL}${v.toLocaleString()}`, 'Revenue']} />
              <Bar dataKey="revenue" fill="#7C3AED" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Plan mix + Worker registrations ─────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Plan distribution pie */}
        <div className="card">
          <h3 className="font-bold text-stone-800 mb-4">Plan Distribution</h3>
          {planPie.length > 0 ? (
            <div className="flex items-center gap-4">
              <div className="h-44 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={planPie}
                      cx="50%" cy="50%"
                      innerRadius={48} outerRadius={72}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {planPie.map((entry) => (
                        <Cell key={entry.name} fill={PIE_COLORS[entry.name.toLowerCase()]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, name) => [v, name]} />
                    <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 min-w-32">
                {[
                  { name: 'Elite', count: plans.elite || 0, color: PIE_COLORS.elite, revenue: ((plans.elite || 0) * (planPrices.elite ?? 0)) },
                  { name: 'Pro',   count: plans.pro   || 0, color: PIE_COLORS.pro,   revenue: ((plans.pro   || 0) * (planPrices.pro   ?? 0)) },
                  { name: 'Free',  count: plans.free  || 0, color: PIE_COLORS.free,  revenue: 0 },
                ].map((p) => (
                  <div key={p.name} className="text-sm">
                    <div className="flex items-center gap-1.5 font-medium">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
                      {p.name}
                    </div>
                    <p className="text-stone-500 text-xs ml-4">
                      {p.count} workers
                      {p.revenue > 0 && ` · ${CURRENCY_SYMBOL}${p.revenue.toLocaleString()}/mo`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-stone-400 text-sm text-center py-8">No subscription data yet</p>
          )}
        </div>

        {/* New worker registrations trend */}
        <div className="card">
          <h3 className="font-bold text-stone-800 mb-4">New Pro Registrations</h3>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={registrations} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#78716c' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#78716c' }} />
                <Tooltip formatter={(v) => [v, 'New Workers']} />
                <Line
                  type="monotone" dataKey="count"
                  stroke="#10b981" strokeWidth={2.5}
                  dot={{ r: 4, fill: '#10b981' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── New subscriptions per month ──────────────────────────────────── */}
      <div className="card">
        <h3 className="font-bold text-stone-800 mb-5">New Subscriptions per Month</h3>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#78716c' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#78716c' }} />
              <Tooltip formatter={(v) => [v, 'New subscriptions']} />
              <Bar dataKey="subs" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Top categories table ─────────────────────────────────────────── */}
      <div className="card">
        <h3 className="font-bold text-stone-800 mb-5">Top Categories by Activity</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-stone-100 text-stone-500">
                <th className="pb-3 font-semibold">#</th>
                <th className="pb-3 font-semibold">Category</th>
                <th className="pb-3 font-semibold text-right">Workers</th>
                <th className="pb-3 font-semibold text-right">Jobs</th>
                <th className="pb-3 font-semibold">Demand</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {categoryStats.map((cat, idx) => {
                const maxJobs = Math.max(...categoryStats.map((c) => c.jobs), 1);
                const pct = Math.round((cat.jobs / maxJobs) * 100);
                return (
                  <tr key={cat.slug}>
                    <td className="py-3 text-stone-400 font-mono text-xs">{idx + 1}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-stone-400">
                          <CategoryIcon slug={cat.slug} icon={cat.icon} size={14} />
                        </span>
                        <span className="font-medium text-stone-800">{cat.name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-right font-semibold text-stone-700">{cat.workers}</td>
                    <td className="py-3 text-right font-semibold text-stone-700">{cat.jobs}</td>
                    <td className="py-3 w-32">
                      <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-violet-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!categoryStats.length && (
            <p className="text-center text-stone-400 py-8 text-sm">No job or worker data yet</p>
          )}
        </div>
      </div>

    </div>
  );
}

// ── Stats tab ──────────────────────────────────────────────────────────────

function StatsOverview() {
  const { data: stats } = useQuery({
    queryKey: ['adminStats'],
    queryFn: () => api.get('/admin/stats').then((r) => r.data.data),
  });

  const cards = [
    { label: 'Total Workers', value: stats?.totalWorkers, Icon: Hammer,        color: 'stone',  iconCls: 'text-stone-500'  },
    { label: 'Total Clients', value: stats?.totalClients, Icon: User,           color: 'stone',  iconCls: 'text-stone-500'  },
    { label: 'Total Jobs',    value: stats?.totalJobs,    Icon: ClipboardList,  color: 'stone',  iconCls: 'text-stone-500'  },
    { label: 'Active Jobs',   value: stats?.activeJobs,   Icon: Zap,            color: 'blue',   iconCls: 'text-blue-500'   },
    { label: 'Open Disputes', value: stats?.openDisputes, Icon: Scale,          color: 'red',    iconCls: 'text-red-500'    },
    { label: 'ID Pending',   value: stats?.pendingNic,   Icon: ShieldCheck,    color: 'amber',  iconCls: 'text-violet-500' },
    { label: 'Flagged',       value: stats?.flaggedWorkers, Icon: Flag,         color: 'orange', iconCls: 'text-orange-500' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="card text-center">
          <div className="flex items-center justify-center mb-1">
            <c.Icon className={`w-6 h-6 ${c.iconCls}`} strokeWidth={1.75} />
          </div>
          <div className={`text-3xl font-black ${c.color === 'red' && c.value > 0 ? 'text-red-600' : c.color === 'amber' && c.value > 0 ? 'text-violet-600' : 'text-stone-800'}`}>
            {c.value ?? '—'}
          </div>
          <div className="text-xs text-stone-500 mt-1">{c.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Lookup tab ─────────────────────────────────────────────────────────────

function WorkerLookup() {
  const [search, setSearch]         = useState('');
  const [submitted, setSubmitted]   = useState('');
  const [featureTarget, setFeatureTarget] = useState(null); // { userId, name, featuredUntil }
  const [featureDate, setFeatureDate]     = useState('');
  const [commTarget, setCommTarget]       = useState(null); // { userId, name, current, effective }
  const [commPercent, setCommPercent]     = useState('');
  const [commExpires, setCommExpires]     = useState('');
  const [commNote, setCommNote]           = useState('');
  const [lcCommTarget, setLcCommTarget]   = useState(null); // { userId, name, current, effective }
  const [lcCommPercent, setLcCommPercent] = useState('');
  const [lcCommExpires, setLcCommExpires] = useState('');
  const [lcCommNote, setLcCommNote]       = useState('');
  const [shopCommTarget, setShopCommTarget]   = useState(null); // { userId, name, current, effective }
  const [shopCommPercent, setShopCommPercent] = useState('');
  const [shopCommExpires, setShopCommExpires] = useState('');
  const [shopCommNote, setShopCommNote]       = useState('');
  const [managingWorker, setManagingWorker]   = useState(null); // worker manage modal
  const qc = useQueryClient();

  const { data: workers = [], isLoading } = useQuery({
    queryKey: ['adminWorkers', submitted],
    queryFn: () => api.get(`/admin/workers?search=${submitted}`).then((r) => r.data.data),
    enabled: true,
  });

  async function suspend(userId) {
    await api.put(`/admin/workers/${userId}/suspend`, { reason: 'Admin action' });
    qc.invalidateQueries(['adminWorkers', submitted]);
    qc.invalidateQueries(['adminStats']);
  }

  async function reinstate(userId) {
    await api.put(`/admin/workers/${userId}/reinstate`);
    qc.invalidateQueries(['adminWorkers', submitted]);
  }

  async function verifyNic(userId) {
    await api.put(`/admin/workers/${userId}/verify-idDoc`);
    qc.invalidateQueries(['adminWorkers', submitted]);
    qc.invalidateQueries(['adminActionCount']);
  }

  async function toggleWorkerFeature(userId, feature, current) {
    await api.put(`/admin/workers/${userId}/features`, { [feature]: !current });
    qc.invalidateQueries(['adminWorkers', submitted]);
  }

  function openFeatureModal(worker) {
    const until = worker.featuredUntil ? new Date(worker.featuredUntil).toISOString().slice(0, 10) : '';
    setFeatureTarget({ userId: worker.userId?._id, name: worker.userId?.name, featuredUntil: worker.featuredUntil });
    setFeatureDate(until);
  }

  async function saveFeature() {
    await api.put(`/admin/workers/${featureTarget.userId}/feature`, {
      until: featureDate || null,
    });
    qc.invalidateQueries(['adminWorkers', submitted]);
    setFeatureTarget(null);
  }

  async function removeFeature(userId) {
    await api.put(`/admin/workers/${userId}/feature`, { until: null });
    qc.invalidateQueries(['adminWorkers', submitted]);
  }

  async function openCommissionModal(worker) {
    const userId = worker.userId?._id;
    const current = worker.commissionOverride || null;
    setCommPercent(current?.percent != null ? String(current.percent) : '');
    setCommExpires(current?.expiresAt ? new Date(current.expiresAt).toISOString().slice(0, 10) : '');
    setCommNote(current?.note || '');
    let effective = null;
    try {
      const res = await api.get(`/admin/workers/${userId}/effective-commission`);
      effective = res.data.data;
    } catch (_) { /* non-fatal */ }
    setCommTarget({ userId, name: worker.userId?.name, current, effective });
  }

  async function saveCommission() {
    if (commPercent === '' || commPercent == null) return;
    await api.put(`/admin/workers/${commTarget.userId}/commission-override`, {
      percent:   Number(commPercent),
      expiresAt: commExpires || null,
      note:      commNote || '',
    });
    qc.invalidateQueries(['adminWorkers', submitted]);
    setCommTarget(null);
  }

  async function removeCommission() {
    await api.delete(`/admin/workers/${commTarget.userId}/commission-override`);
    qc.invalidateQueries(['adminWorkers', submitted]);
    setCommTarget(null);
  }

  async function openLcCommissionModal(worker) {
    const userId = worker.userId?._id;
    const current = worker.liveClassCommissionOverride || null;
    setLcCommPercent(current?.percent != null ? String(current.percent) : '');
    setLcCommExpires(current?.expiresAt ? new Date(current.expiresAt).toISOString().slice(0, 10) : '');
    setLcCommNote(current?.note || '');
    let effective = null;
    try {
      const res = await api.get(`/admin/workers/${userId}/effective-live-class-commission`);
      effective = res.data.data;
    } catch (_) { /* non-fatal */ }
    setLcCommTarget({ userId, name: worker.userId?.name, current, effective });
  }

  async function saveLcCommission() {
    if (lcCommPercent === '' || lcCommPercent == null) return;
    await api.put(`/admin/workers/${lcCommTarget.userId}/live-class-commission-override`, {
      percent:   Number(lcCommPercent),
      expiresAt: lcCommExpires || null,
      note:      lcCommNote || '',
    });
    qc.invalidateQueries(['adminWorkers', submitted]);
    setLcCommTarget(null);
  }

  async function removeLcCommission() {
    await api.delete(`/admin/workers/${lcCommTarget.userId}/live-class-commission-override`);
    qc.invalidateQueries(['adminWorkers', submitted]);
    setLcCommTarget(null);
  }

  async function openShopCommModal(worker) {
    const userId  = worker.userId?._id;
    const current = worker.shopCommissionOverride || null;
    setShopCommPercent(current?.percent != null ? String(current.percent) : '');
    setShopCommExpires(current?.expiresAt ? new Date(current.expiresAt).toISOString().slice(0, 10) : '');
    setShopCommNote(current?.note || '');
    let effective = null;
    try {
      const res = await api.get(`/admin/workers/${userId}/effective-shop-commission`);
      effective = res.data.data;
    } catch (_) { /* non-fatal */ }
    setShopCommTarget({ userId, name: worker.userId?.name, current, effective });
  }

  async function saveShopCommission() {
    if (shopCommPercent === '' || shopCommPercent == null) return;
    await api.put(`/admin/workers/${shopCommTarget.userId}/shop-commission-override`, {
      percent:   Number(shopCommPercent),
      expiresAt: shopCommExpires || null,
      note:      shopCommNote   || '',
    });
    qc.invalidateQueries(['adminWorkers', submitted]);
    setShopCommTarget(null);
  }

  async function removeShopCommission() {
    await api.delete(`/admin/workers/${shopCommTarget.userId}/shop-commission-override`);
    qc.invalidateQueries(['adminWorkers', submitted]);
    setShopCommTarget(null);
  }

  const isFeaturedActive = (until) => until && new Date(until) > new Date();
  const isOverrideActive = (ov) => ov?.percent != null && (!ov.expiresAt || new Date(ov.expiresAt) > new Date());

  return (
    <div>
      <div className="flex gap-3 mb-5">
        <input
          className="input flex-1"
          placeholder="Search by name, email or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && setSubmitted(search)}
        />
        <button onClick={() => setSubmitted(search)} className="btn-primary">Search</button>
        {submitted && <button onClick={() => { setSearch(''); setSubmitted(''); }} className="btn-secondary">Clear</button>}
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-stone-400">Loading…</div>
      ) : (
        <>
        <div className="space-y-3">
          {workers.map((p) => (
            <div key={p._id} className="card flex items-center gap-4">

              {/* Avatar */}
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                {p.userId?.profilePhoto
                  ? <img src={p.userId.profilePhoto} alt={p.userId.name} className="w-full h-full object-cover" />
                  : <span className="text-white font-bold text-lg">{p.userId?.name?.[0]?.toUpperCase()}</span>}
              </div>

              {/* Name + category */}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-stone-800 truncate">{p.userId?.name}</div>
                <div className="text-xs text-stone-400 truncate">{p.userId?.email}</div>
                <div className="text-xs text-stone-500 mt-0.5 capitalize">{p.category?.replace(/_/g, ' ')}</div>
              </div>

              {/* Score */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="font-bold text-stone-700">{p.skillScore}</span>
                <ScoreBadge band={p.scoreBand} />
              </div>

              {/* Status chips */}
              <div className="flex flex-col gap-1 shrink-0">
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${p.isSuspended ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                  {p.isSuspended ? 'Suspended' : 'Active'}
                </span>
                {p.userId?.idVerified
                  ? <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">ID ✓</span>
                  : <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-400">No ID</span>}
              </div>

              {/* Feature chips (read-only glance) */}
              <div className="flex gap-1 shrink-0">
                {[
                  { key: 'consultations', icon: '📋', on: 'bg-amber-100 text-amber-700',   off: 'bg-stone-100 text-stone-300' },
                  { key: 'liveClasses',   icon: '🎓', on: 'bg-violet-100 text-violet-700', off: 'bg-stone-100 text-stone-300' },
                  { key: 'shop',          icon: '🛍️', on: 'bg-fuchsia-100 text-fuchsia-700', off: 'bg-stone-100 text-stone-300' },
                ].map(({ key, icon, on, off }) => (
                  <span key={key} title={key} className={`text-base w-7 h-7 rounded-lg flex items-center justify-center ${p.features?.[key] ? on : off}`}>
                    {icon}
                  </span>
                ))}
              </div>

              {/* Manage button */}
              <button
                onClick={() => setManagingWorker(p)}
                className="shrink-0 text-sm font-semibold px-4 py-2 rounded-xl bg-gradient-to-br from-violet-600 to-pink-500 text-white hover:opacity-90 transition-opacity"
              >
                Manage →
              </button>
            </div>
          ))}
          {!workers.length && (
            <p className="text-center text-stone-400 py-10 text-sm card">
              {submitted ? `No workers found for "${submitted}"` : 'Search to find workers'}
            </p>
          )}
        </div>

        {/* ── Worker Manage Modal ───────────────────────────────────── */}
        {managingWorker && (() => {
          const p = managingWorker;
          const uid = p.userId?._id;
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setManagingWorker(null)}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div className="relative bg-gradient-to-br from-violet-600 to-pink-500 rounded-t-2xl px-6 pt-6 pb-14">
                  <button onClick={() => setManagingWorker(null)} className="absolute top-4 right-4 text-white/70 hover:text-white text-xl leading-none">✕</button>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 overflow-hidden shrink-0 border-2 border-white/40">
                      {p.userId?.profilePhoto
                        ? <img src={p.userId.profilePhoto} alt={p.userId.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-white font-black text-2xl">{p.userId?.name?.[0]?.toUpperCase()}</div>}
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white">{p.userId?.name}</h3>
                      <p className="text-white/70 text-sm capitalize">{p.category?.replace(/_/g, ' ')} · Score {p.skillScore}</p>
                      <p className="text-white/60 text-xs mt-0.5">{p.userId?.email}</p>
                    </div>
                  </div>
                  <a
                    href={`/pro/${p.slug}`} target="_blank" rel="noreferrer"
                    className="absolute bottom-4 right-5 text-white/80 hover:text-white text-xs underline"
                  >
                    View public profile ↗
                  </a>
                </div>

                <div className="px-6 py-5 space-y-5 -mt-8">

                  {/* ── Account Status ── */}
                  <div className="bg-white rounded-xl border border-stone-100 shadow-sm p-4">
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Account</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold px-3 py-1 rounded-full ${p.isSuspended ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {p.isSuspended ? '🚫 Suspended' : '✅ Active'}
                        </span>
                        {p.userId?.idVerified
                          ? <span className="text-sm font-semibold px-3 py-1 rounded-full bg-teal-50 text-teal-700">ID Verified</span>
                          : <span className="text-sm px-3 py-1 rounded-full bg-stone-100 text-stone-400">ID Pending</span>}
                      </div>
                      <div className="flex gap-2">
                        {!p.userId?.idVerified && (
                          <button onClick={() => { verifyNic(uid); setManagingWorker((w) => ({ ...w, userId: { ...w.userId, idVerified: true } })); }}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-teal-600 text-white hover:bg-teal-700">
                            Verify ID
                          </button>
                        )}
                        {p.isSuspended ? (
                          <button onClick={() => { reinstate(uid); setManagingWorker((w) => ({ ...w, isSuspended: false })); }}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700">
                            Reinstate
                          </button>
                        ) : (
                          <button onClick={() => { suspend(uid); setManagingWorker((w) => ({ ...w, isSuspended: true })); }}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600">
                            Suspend
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── Features ── */}
                  <div className="bg-white rounded-xl border border-stone-100 shadow-sm p-4">
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Feature Access</p>
                    <div className="space-y-2">
                      {[
                        { key: 'consultations', label: 'Consultations', icon: '📋', on: 'bg-amber-500',   ring: 'ring-amber-200' },
                        { key: 'liveClasses',   label: 'Live Classes',  icon: '🎓', on: 'bg-violet-600', ring: 'ring-violet-200' },
                        { key: 'shop',          label: 'Shop',          icon: '🛍️', on: 'bg-fuchsia-600', ring: 'ring-fuchsia-200' },
                      ].map(({ key, label, icon, on, ring }) => {
                        const active = !!p.features?.[key];
                        return (
                          <div key={key} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{icon}</span>
                              <span className="text-sm font-medium text-stone-700">{label}</span>
                            </div>
                            <button
                              onClick={() => {
                                toggleWorkerFeature(uid, key, active);
                                setManagingWorker((w) => ({ ...w, features: { ...w.features, [key]: !active } }));
                              }}
                              className={`relative w-11 h-6 rounded-full transition-colors ring-2 ${active ? `${on} ${ring}` : 'bg-stone-200 ring-stone-100'}`}
                            >
                              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${active ? 'left-5' : 'left-0.5'}`} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── Featured ── */}
                  <div className="bg-white rounded-xl border border-stone-100 shadow-sm p-4">
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Featured Spotlight</p>
                    <div className="flex items-center justify-between">
                      {isFeaturedActive(p.featuredUntil) ? (
                        <span className="text-sm font-semibold text-amber-700 bg-amber-50 px-3 py-1 rounded-full">
                          ⭐ Featured until {new Date(p.featuredUntil).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-sm text-stone-400">Not featured</span>
                      )}
                      {isFeaturedActive(p.featuredUntil) ? (
                        <button onClick={() => { removeFeature(uid); setManagingWorker(null); }}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50">
                          Remove
                        </button>
                      ) : (
                        <button onClick={() => { setManagingWorker(null); openFeatureModal(p); }}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600">
                          ⭐ Set Featured
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ── Subscription Plan ── */}
                  <div className="bg-white rounded-xl border border-stone-100 shadow-sm p-4">
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Subscription Plan</p>
                    <div className="flex gap-2 mb-3">
                      {[
                        { plan: 'free',  label: 'Free',  color: 'bg-stone-100 text-stone-600 border-stone-200',         active: 'bg-stone-700 text-white border-stone-700'         },
                        { plan: 'pro',   label: '⚡ Pro',  color: 'bg-violet-50 text-violet-700 border-violet-200',       active: 'bg-violet-600 text-white border-violet-600'       },
                        { plan: 'elite', label: '👑 Elite', color: 'bg-amber-50 text-amber-700 border-amber-200',          active: 'bg-amber-500 text-white border-amber-500'          },
                      ].map(({ plan, label, color, active }) => (
                        <button
                          key={plan}
                          onClick={async () => {
                            const expiry = plan !== 'free'
                              ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
                              : null;
                            await api.put(`/admin/workers/${p.userId?._id}/subscription`, { plan, expiresAt: expiry });
                            setManagingWorker((w) => ({ ...w, subscriptionPlan: plan, subscriptionExpiry: expiry }));
                            qc.invalidateQueries(['adminWorkers', submitted]);
                          }}
                          className={`flex-1 text-sm font-semibold py-2 rounded-xl border transition-all
                            ${p.subscriptionPlan === plan ? active : color}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {p.subscriptionPlan !== 'free' && (
                      <p className="text-xs text-stone-400 text-center">
                        {p.subscriptionExpiry
                          ? `Expires ${new Date(p.subscriptionExpiry).toLocaleDateString()}`
                          : 'No expiry set'}
                        {' · '}
                        <button
                          className="text-violet-600 underline hover:no-underline"
                          onClick={async () => {
                            const d = prompt('New expiry date (YYYY-MM-DD):');
                            if (!d) return;
                            await api.put(`/admin/workers/${p.userId?._id}/subscription`, { plan: p.subscriptionPlan, expiresAt: d });
                            setManagingWorker((w) => ({ ...w, subscriptionExpiry: new Date(d).toISOString() }));
                            qc.invalidateQueries(['adminWorkers', submitted]);
                          }}
                        >
                          Change expiry
                        </button>
                      </p>
                    )}
                  </div>

                  {/* ── Commission Overrides ── */}
                  <div className="bg-white rounded-xl border border-stone-100 shadow-sm p-4">
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Commission Overrides</p>
                    <div className="space-y-2">
                      {[
                        { label: 'Consultations', icon: '📋', override: p.commissionOverride,          color: 'text-amber-700',   open: () => { setManagingWorker(null); openCommissionModal(p); } },
                        { label: 'Live Classes',  icon: '🎓', override: p.liveClassCommissionOverride, color: 'text-violet-700',  open: () => { setManagingWorker(null); openLcCommissionModal(p); } },
                        { label: 'Shop',          icon: '🛍️', override: p.shopCommissionOverride,      color: 'text-fuchsia-700', open: () => { setManagingWorker(null); openShopCommModal(p); } },
                      ].map(({ label, icon, override, color, open }) => (
                        <div key={label} className="flex items-center justify-between">
                          <span className="text-sm text-stone-600">{icon} {label}</span>
                          <div className="flex items-center gap-2">
                            {isOverrideActive(override) ? (
                              <span className={`text-xs font-bold ${color}`}>{override.percent}% override</span>
                            ) : (
                              <span className="text-xs text-stone-400">Platform default</span>
                            )}
                            <button onClick={open} className={`text-xs underline hover:no-underline ${color}`}>
                              {isOverrideActive(override) ? 'Edit' : 'Set'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          );
        })()}
        </>
      )}

      {/* ── Feature modal ────────────────────────────────────────────── */}
      {featureTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-plum mb-1 flex items-center gap-2"><Star className="w-5 h-5 fill-amber-400 text-amber-400" strokeWidth={1.5} />Set Featured Listing</h3>
            <p className="text-sm text-stone-500 mb-5">
              <span className="font-medium text-stone-700">{featureTarget.name}</span> will appear in the
              Featured Professionals section on the landing page.
            </p>
            <label className="block text-sm font-medium text-stone-700 mb-1">Featured until</label>
            <input
              type="date"
              value={featureDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setFeatureDate(e.target.value)}
              className="input w-full mb-5"
            />
            <div className="flex gap-3">
              <button onClick={saveFeature} disabled={!featureDate} className="btn-primary flex-1 py-2">
                Confirm
              </button>
              <button onClick={() => setFeatureTarget(null)} className="btn-secondary flex-1 py-2">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Commission override modal ────────────────────────────────── */}
      {commTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-stone-900 mb-1 flex items-center gap-2"><DollarSign className="w-5 h-5 text-amber-600" strokeWidth={1.75} />Commission Override</h3>
            <p className="text-sm text-stone-500 mb-4">
              Set a custom consultation commission for <span className="font-medium text-stone-700">{commTarget.name}</span>.
              Only applies to <span className="font-semibold">future bookings</span>.
            </p>

            {commTarget.effective && (
              <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 mb-4 text-xs">
                <div className="text-stone-500 mb-1">Currently resolves to:</div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-stone-800">{commTarget.effective.percent}%</span>
                  <span className="text-stone-400">via</span>
                  <span className="px-1.5 py-0.5 rounded bg-white border border-stone-200 text-stone-600 font-medium">
                    {commTarget.effective.source.replace('_', ' ')}
                  </span>
                </div>
              </div>
            )}

            <label className="block text-sm font-medium text-stone-700 mb-1">Commission %</label>
            <div className="relative mb-4">
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={commPercent}
                onChange={(e) => setCommPercent(e.target.value)}
                className="input w-full pr-8"
                placeholder="e.g. 10"
                autoFocus
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">%</span>
            </div>

            <label className="block text-sm font-medium text-stone-700 mb-1">Expires on (optional)</label>
            <input
              type="date"
              value={commExpires}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setCommExpires(e.target.value)}
              className="input w-full mb-4"
            />

            <label className="block text-sm font-medium text-stone-700 mb-1">Note (audit log)</label>
            <input
              type="text"
              value={commNote}
              onChange={(e) => setCommNote(e.target.value)}
              placeholder="e.g. Founding member — first 3 months"
              className="input w-full mb-5"
            />

            <div className="flex gap-3">
              <button onClick={saveCommission} disabled={commPercent === ''} className="btn-primary flex-1 py-2">
                Save
              </button>
              {isOverrideActive(commTarget.current) && (
                <button onClick={removeCommission} className="text-sm text-red-600 underline hover:no-underline px-3">
                  Remove
                </button>
              )}
              <button onClick={() => setCommTarget(null)} className="btn-secondary flex-1 py-2">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Live class commission override modal ─────────────────────── */}
      {lcCommTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-stone-900 mb-1 flex items-center gap-2">
              🎓 Live Class Commission Override
            </h3>
            <p className="text-sm text-stone-500 mb-4">
              Set a custom live class commission for <span className="font-medium text-stone-700">{lcCommTarget.name}</span>.
              Only applies to live classes started after this is saved.
            </p>

            {lcCommTarget.effective && (
              <div className="bg-violet-50 border border-violet-100 rounded-lg p-3 mb-4 text-xs">
                <div className="text-violet-500 mb-1">Currently resolves to:</div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-violet-800">{lcCommTarget.effective.percent}%</span>
                  <span className="text-violet-400">via</span>
                  <span className="px-1.5 py-0.5 rounded bg-white border border-violet-200 text-violet-700 font-medium">
                    {lcCommTarget.effective.source.replace(/_/g, ' ')}
                  </span>
                </div>
                {lcCommTarget.effective.detail?.note && (
                  <div className="text-violet-400 mt-1">Note: {lcCommTarget.effective.detail.note}</div>
                )}
              </div>
            )}

            <label className="block text-sm font-medium text-stone-700 mb-1">Commission %</label>
            <div className="relative mb-4">
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={lcCommPercent}
                onChange={(e) => setLcCommPercent(e.target.value)}
                className="input w-full pr-8"
                placeholder="e.g. 8"
                autoFocus
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">%</span>
            </div>

            {lcCommPercent !== '' && (
              <div className="text-xs text-stone-500 bg-stone-50 rounded-lg px-3 py-2 mb-4">
                Worker keeps <span className="font-bold text-stone-800">{100 - Number(lcCommPercent)}%</span>
                &nbsp;of class revenue.
              </div>
            )}

            <label className="block text-sm font-medium text-stone-700 mb-1">Expires on (optional)</label>
            <input
              type="date"
              value={lcCommExpires}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setLcCommExpires(e.target.value)}
              className="input w-full mb-4"
            />

            <label className="block text-sm font-medium text-stone-700 mb-1">Note (audit log)</label>
            <input
              type="text"
              value={lcCommNote}
              onChange={(e) => setLcCommNote(e.target.value)}
              placeholder="e.g. Top teacher — reduced rate for Q1"
              className="input w-full mb-5"
            />

            <div className="flex gap-3">
              <button onClick={saveLcCommission} disabled={lcCommPercent === ''} className="btn-primary flex-1 py-2">
                Save
              </button>
              {isOverrideActive(lcCommTarget.current) && (
                <button onClick={removeLcCommission} className="text-sm text-red-600 underline hover:no-underline px-3">
                  Remove
                </button>
              )}
              <button onClick={() => setLcCommTarget(null)} className="btn-secondary flex-1 py-2">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Shop commission override modal ───────────────────────────── */}
      {shopCommTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-stone-900 mb-1 flex items-center gap-2">
              🎨 Shop Commission Override
            </h3>
            <p className="text-sm text-stone-500 mb-4">
              Set a custom shop commission for <span className="font-medium text-stone-700">{shopCommTarget.name}</span>.
              Note: only applies <span className="font-semibold">after</span> the free introductory sales period ends.
            </p>

            {shopCommTarget.effective && (
              <div className="bg-fuchsia-50 border border-fuchsia-100 rounded-lg p-3 mb-4 text-xs">
                <div className="text-fuchsia-500 mb-1">Currently resolves to:</div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-fuchsia-800">{shopCommTarget.effective.percent}%</span>
                  <span className="text-fuchsia-400">via</span>
                  <span className="px-1.5 py-0.5 rounded bg-white border border-fuchsia-200 text-fuchsia-700 font-medium">
                    {shopCommTarget.effective.source?.replace(/_/g, ' ')}
                  </span>
                </div>
                {shopCommTarget.effective.isFree && (
                  <div className="text-fuchsia-400 mt-1">
                    Artist is in free period ({shopCommTarget.effective.salesSoFar}/{shopCommTarget.effective.freeUntil} sales completed)
                  </div>
                )}
              </div>
            )}

            <label className="block text-sm font-medium text-stone-700 mb-1">Commission %</label>
            <div className="relative mb-4">
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={shopCommPercent}
                onChange={(e) => setShopCommPercent(e.target.value)}
                className="input w-full pr-8"
                placeholder="e.g. 10"
                autoFocus
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">%</span>
            </div>

            {shopCommPercent !== '' && (
              <div className="text-xs text-stone-500 bg-stone-50 rounded-lg px-3 py-2 mb-4">
                Artist keeps <span className="font-bold text-stone-800">{100 - Number(shopCommPercent)}%</span> of each sale.
              </div>
            )}

            <label className="block text-sm font-medium text-stone-700 mb-1">Expires on (optional)</label>
            <input
              type="date"
              value={shopCommExpires}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setShopCommExpires(e.target.value)}
              className="input w-full mb-4"
            />

            <label className="block text-sm font-medium text-stone-700 mb-1">Note (audit log)</label>
            <input
              type="text"
              value={shopCommNote}
              onChange={(e) => setShopCommNote(e.target.value)}
              placeholder="e.g. Top seller — preferred rate for 2026"
              className="input w-full mb-5"
            />

            <div className="flex gap-3">
              <button onClick={saveShopCommission} disabled={shopCommPercent === ''} className="btn-primary flex-1 py-2">
                Save
              </button>
              {isOverrideActive(shopCommTarget.current) && (
                <button onClick={removeShopCommission} className="text-sm text-red-600 underline hover:no-underline px-3">
                  Remove
                </button>
              )}
              <button onClick={() => setShopCommTarget(null)} className="btn-secondary flex-1 py-2">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Business Lookup tab ────────────────────────────────────────────────────

function BusinessLookup() {
  const [search, setSearch]       = useState('');
  const [submitted, setSubmitted] = useState('');
  const [featureTarget, setFeatureTarget] = useState(null);
  const [featureDate, setFeatureDate]     = useState('');
  const qc = useQueryClient();

  const { data: businesses = [], isLoading } = useQuery({
    queryKey: ['adminBusinesses', submitted],
    queryFn: () => api.get(`/admin/businesses?search=${submitted}`).then((r) => r.data.data),
    enabled: true,
  });

  async function suspend(userId) {
    await api.put(`/admin/businesses/${userId}/suspend`);
    qc.invalidateQueries(['adminBusinesses', submitted]);
  }
  async function reinstate(userId) {
    await api.put(`/admin/businesses/${userId}/reinstate`);
    qc.invalidateQueries(['adminBusinesses', submitted]);
  }
  async function toggleVerify(userId) {
    await api.put(`/admin/businesses/${userId}/verify`);
    qc.invalidateQueries(['adminBusinesses', submitted]);
  }
  function openFeatureModal(b) {
    const until = b.featuredUntil ? new Date(b.featuredUntil).toISOString().slice(0, 10) : '';
    setFeatureTarget({ userId: b.userId?._id, name: b.businessName });
    setFeatureDate(until);
  }
  async function saveFeature() {
    await api.put(`/admin/businesses/${featureTarget.userId}/feature`, { until: featureDate || null });
    qc.invalidateQueries(['adminBusinesses', submitted]);
    setFeatureTarget(null);
  }
  async function removeFeature(userId) {
    await api.put(`/admin/businesses/${userId}/feature`, { until: null });
    qc.invalidateQueries(['adminBusinesses', submitted]);
  }

  const isFeaturedActive = (until) => until && new Date(until) > new Date();

  return (
    <div>
      <div className="flex gap-3 mb-5">
        <input className="input flex-1" placeholder="Search by name, email, district…"
          value={search} onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && setSubmitted(search)} />
        <button onClick={() => setSubmitted(search)} className="btn-primary">Search</button>
        {submitted && <button onClick={() => { setSearch(''); setSubmitted(''); }} className="btn-secondary">Clear</button>}
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-stone-400">Loading…</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-stone-100 text-stone-500">
                <th className="pb-3 font-semibold">Business</th>
                <th className="pb-3 font-semibold">Type</th>
                <th className="pb-3 font-semibold">District</th>
                <th className="pb-3 font-semibold">Verified</th>
                <th className="pb-3 font-semibold">Featured</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {businesses.map((b) => (
                <tr key={b._id}>
                  <td className="py-3">
                    <div className="font-medium">{b.businessName}</div>
                    <div className="text-stone-400 text-xs">{b.userId?.email}</div>
                  </td>
                  <td className="py-3 text-stone-600 capitalize text-xs">{b.businessType?.replace('_', ' ')}</td>
                  <td className="py-3 text-stone-600 text-xs">{b.district || '—'}</td>
                  <td className="py-3">
                    {b.isVerified ? (
                      <span className="text-green-600 text-xs font-semibold flex items-center gap-0.5"><Check className="w-3.5 h-3.5" strokeWidth={2.5} />Verified</span>
                    ) : (
                      <button onClick={() => toggleVerify(b.userId?._id)} className="text-xs text-violet-700 underline hover:no-underline">
                        Verify
                      </button>
                    )}
                  </td>
                  <td className="py-3">
                    {isFeaturedActive(b.featuredUntil) ? (
                      <div>
                        <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1"><Star className="w-3 h-3 fill-amber-400 text-amber-400" strokeWidth={1.5} />Active</span>
                        <div className="text-xs text-stone-400 mt-0.5">until {new Date(b.featuredUntil).toLocaleDateString()}</div>
                      </div>
                    ) : (
                      <span className="text-xs text-stone-400">—</span>
                    )}
                  </td>
                  <td className="py-3">
                    {b.isSuspended
                      ? <span className="badge bg-red-100 text-red-700">Suspended</span>
                      : <span className="badge bg-green-100 text-green-700">Active</span>
                    }
                  </td>
                  <td className="py-3">
                    <div className="flex flex-col gap-1">
                      {b.isSuspended ? (
                        <button onClick={() => reinstate(b.userId?._id)} className="text-xs text-green-700 underline hover:no-underline">Reinstate</button>
                      ) : (
                        <button onClick={() => suspend(b.userId?._id)} className="text-xs text-red-600 underline hover:no-underline">Suspend</button>
                      )}
                      {b.isVerified && (
                        <button onClick={() => toggleVerify(b.userId?._id)} className="text-xs text-stone-500 underline hover:no-underline">Unverify</button>
                      )}
                      {isFeaturedActive(b.featuredUntil) ? (
                        <button onClick={() => removeFeature(b.userId?._id)} className="text-xs text-stone-500 underline hover:no-underline">Remove feature</button>
                      ) : (
                        <button onClick={() => openFeatureModal(b)} className="text-xs text-violet-700 underline hover:no-underline flex items-center gap-0.5"><Star className="w-3 h-3" strokeWidth={1.75} />Set featured</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!businesses.length && (
            <p className="text-center text-stone-400 py-6 text-sm">
              {submitted ? `No businesses found for "${submitted}"` : 'All businesses shown above'}
            </p>
          )}
        </div>
      )}

      {/* Feature modal */}
      {featureTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold mb-1 flex items-center gap-2"><Star className="w-5 h-5 fill-amber-400 text-amber-400" strokeWidth={1.5} />Set Featured Listing</h3>
            <p className="text-sm text-stone-500 mb-4">
              <span className="font-medium text-stone-700">{featureTarget.name}</span> will appear as featured on the businesses page.
            </p>
            <label className="label">Featured until</label>
            <input type="date" className="input mb-4" value={featureDate} onChange={(e) => setFeatureDate(e.target.value)} />
            <div className="flex gap-3">
              <button onClick={saveFeature} className="btn-primary flex-1">Save</button>
              <button onClick={() => setFeatureTarget(null)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Moderation tab ─────────────────────────────────────────────────────────

function ContentModeration() {
  const qc = useQueryClient();
  const [rejectBioId, setRejectBioId]     = useState(null);
  const [rejectPhotoKey, setRejectPhotoKey] = useState(null); // `${workerId}:${url}`
  const [rejectReason, setRejectReason]   = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['adminModeration'],
    queryFn: () => api.get('/admin/moderation').then((r) => r.data.data),
  });

  async function approveBio(workerId) {
    await api.put(`/admin/moderation/bio/${workerId}/approve`);
    qc.invalidateQueries(['adminModeration']);
    qc.invalidateQueries(['adminActionCount']);
  }

  async function rejectBio(workerId) {
    await api.put(`/admin/moderation/bio/${workerId}/reject`, { reason: rejectReason });
    setRejectBioId(null); setRejectReason('');
    qc.invalidateQueries(['adminModeration']);
    qc.invalidateQueries(['adminActionCount']);
  }

  async function approvePhoto(workerId, url) {
    await api.put(`/admin/moderation/photo/${workerId}/approve`, { url });
    qc.invalidateQueries(['adminModeration']);
    qc.invalidateQueries(['adminActionCount']);
  }

  async function rejectPhoto(workerId, url) {
    await api.put(`/admin/moderation/photo/${workerId}/reject`, { url, reason: rejectReason });
    setRejectPhotoKey(null); setRejectReason('');
    qc.invalidateQueries(['adminModeration']);
    qc.invalidateQueries(['adminActionCount']);
  }

  if (isLoading) return <div className="text-center py-10 text-stone-400">Loading…</div>;

  const { pendingBios = [], pendingPhotos = [] } = data || {};
  const totalPending = pendingBios.length + pendingPhotos.reduce((s, p) => s + (p.pendingPortfolioPhotos?.length || 0), 0);

  return (
    <div className="space-y-8">

      {!totalPending && (
        <EmptyState icon={<CheckCircle2 className="w-6 h-6 text-green-500" strokeWidth={1.75} />} text="No content waiting for moderation — all clear!" />
      )}

      {/* ── Pending Bios ────────────────────────────────────────────── */}
      {pendingBios.length > 0 && (
        <section>
          <SectionHeader title="Pending Bios" count={pendingBios.length} color="blue" />
          <div className="space-y-3">
            {pendingBios.map((profile) => {
              const wid = profile.userId?._id;
              return (
                <div key={profile._id} className="card border-l-4 border-blue-400">
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Worker info */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-stone-100 overflow-hidden flex-shrink-0 flex items-center justify-center text-sm font-bold text-stone-500">
                          {profile.userId?.profilePhoto
                            ? <img src={profile.userId.profilePhoto} alt="" className="w-full h-full object-cover" />
                            : profile.userId?.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{profile.userId?.name}</p>
                          <p className="text-xs text-stone-400">{profile.category?.replace('_',' ')} · {profile.userId?.email}</p>
                        </div>
                      </div>

                      {/* Bios side by side */}
                      <div className="grid sm:grid-cols-2 gap-3">
                        {profile.bio && (
                          <div className="bg-stone-50 rounded-xl p-3">
                            <p className="text-xs font-semibold text-stone-400 mb-1">CURRENT LIVE BIO</p>
                            <p className="text-sm text-stone-600">{profile.bio}</p>
                          </div>
                        )}
                        <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                          <p className="text-xs font-semibold text-blue-500 mb-1">NEW BIO (PENDING)</p>
                          <p className="text-sm text-stone-700">{profile.pendingBio}</p>
                        </div>
                      </div>

                      {rejectBioId === String(wid) && (
                        <div className="flex gap-2 mt-3">
                          <input
                            className="input flex-1 text-sm py-1.5"
                            placeholder="Rejection reason…"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            autoFocus
                          />
                          <button onClick={() => rejectBio(wid)} className="btn-danger text-sm py-1.5">Confirm</button>
                          <button onClick={() => setRejectBioId(null)} className="btn-secondary text-sm py-1.5">Cancel</button>
                        </div>
                      )}
                    </div>

                    {rejectBioId !== String(wid) && (
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button
                          onClick={() => approveBio(wid)}
                          className="text-sm bg-green-50 text-green-700 border border-green-200 rounded-lg px-3 py-1.5 hover:bg-green-100 font-medium whitespace-nowrap flex items-center gap-1.5"
                        >
                          <Check className="w-4 h-4" strokeWidth={2.5} /> Approve
                        </button>
                        <button
                          onClick={() => { setRejectBioId(String(wid)); setRejectReason(''); }}
                          className="text-sm bg-red-50 text-red-600 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-100 whitespace-nowrap flex items-center gap-1.5"
                        >
                          <X className="w-4 h-4" strokeWidth={2.5} /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Pending Portfolio Photos ─────────────────────────────────── */}
      {pendingPhotos.length > 0 && (
        <section>
          <SectionHeader
            title="Pending Portfolio Photos"
            count={pendingPhotos.reduce((s, p) => s + (p.pendingPortfolioPhotos?.length || 0), 0)}
            color="amber"
          />
          <div className="space-y-4">
            {pendingPhotos.map((profile) => {
              const wid = profile.userId?._id;
              return (
                <div key={profile._id} className="card">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-full bg-stone-100 overflow-hidden flex-shrink-0 flex items-center justify-center text-xs font-bold text-stone-500">
                      {profile.userId?.profilePhoto
                        ? <img src={profile.userId.profilePhoto} alt="" className="w-full h-full object-cover" />
                        : profile.userId?.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <span className="font-semibold text-sm">{profile.userId?.name}</span>
                      <span className="text-xs text-stone-400 ml-2">{profile.category?.replace('_',' ')}</span>
                    </div>
                    <span className="badge bg-violet-100 text-violet-700 ml-auto">
                      {profile.pendingPortfolioPhotos?.length} photo{profile.pendingPortfolioPhotos?.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {profile.pendingPortfolioPhotos?.map((photo) => {
                      const key = `${wid}:${photo.url}`;
                      return (
                        <div key={photo.url} className="relative group">
                          <a href={photo.url} target="_blank" rel="noreferrer">
                            <img
                              src={photo.url}
                              alt="Portfolio"
                              className="w-36 h-28 object-cover rounded-xl border border-stone-200 hover:opacity-90 transition-opacity"
                            />
                          </a>
                          <p className="text-xs text-stone-400 mt-1 text-center">
                            {new Date(photo.uploadedAt).toLocaleDateString()}
                          </p>

                          {rejectPhotoKey === key ? (
                            <div className="mt-2 flex flex-col gap-1.5 w-36">
                              <input
                                className="input text-xs py-1 px-2"
                                placeholder="Rejection reason…"
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                autoFocus
                              />
                              <div className="flex gap-1">
                                <button onClick={() => rejectPhoto(wid, photo.url)} className="flex-1 text-xs bg-red-500 text-white rounded-lg py-1 hover:bg-red-600">Reject</button>
                                <button onClick={() => setRejectPhotoKey(null)} className="flex-1 text-xs bg-stone-100 text-stone-600 rounded-lg py-1 hover:bg-stone-200">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-1.5 mt-1">
                              <button
                                onClick={() => approvePhoto(wid, photo.url)}
                                className="flex-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded-lg py-1 hover:bg-green-100 font-medium flex items-center justify-center gap-0.5"
                              >
                                <Check className="w-3 h-3" strokeWidth={2.5} />Approve
                              </button>
                              <button
                                onClick={() => { setRejectPhotoKey(key); setRejectReason(''); }}
                                className="flex-1 text-xs bg-red-50 text-red-600 border border-red-200 rounded-lg py-1 hover:bg-red-100 flex items-center justify-center gap-0.5"
                              >
                                <X className="w-3 h-3" strokeWidth={2.5} />Reject
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Subscriptions tab ──────────────────────────────────────────────────────

function SubscriptionsManager() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('pending');
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: pending = [], isLoading: loadingPending } = useQuery({
    queryKey: ['adminSubsPending'],
    queryFn: () => api.get('/subscriptions/pending').then((r) => r.data.data),
    refetchInterval: 30_000,
  });

  const { data: all = [], isLoading: loadingAll } = useQuery({
    queryKey: ['adminSubsAll'],
    queryFn: () => api.get('/subscriptions/all').then((r) => r.data.data),
    enabled: tab === 'all',
  });

  async function activate(id) {
    await api.put(`/subscriptions/${id}/activate`);
    qc.invalidateQueries(['adminSubsPending']);
    qc.invalidateQueries(['adminSubsAll']);
    qc.invalidateQueries(['adminStats']);
    qc.invalidateQueries(['adminActionCount']);
  }

  async function reject(id) {
    await api.put(`/subscriptions/${id}/reject`, { reason: rejectReason || 'Payment not confirmed' });
    setRejectId(null);
    setRejectReason('');
    qc.invalidateQueries(['adminSubsPending']);
    qc.invalidateQueries(['adminSubsAll']);
    qc.invalidateQueries(['adminActionCount']);
  }

  const PLAN_BADGE = {
    pro:   'bg-violet-100 text-violet-700',
    elite: 'bg-purple-100 text-purple-700',
  };

  const STATUS_BADGE = {
    pending:  'bg-violet-100 text-violet-700',
    active:   'bg-green-100 text-green-700',
    expired:  'bg-stone-100 text-stone-500',
    rejected: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        <button
          onClick={() => setTab('pending')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors relative ${tab === 'pending' ? 'bg-violet-100 text-violet-800' : 'text-stone-500 hover:text-stone-700'}`}
        >
          Pending Requests
          {pending.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-gradient-to-br from-violet-600 to-pink-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {pending.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('all')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === 'all' ? 'bg-stone-200 text-stone-800' : 'text-stone-500 hover:text-stone-700'}`}
        >
          All History
        </button>
      </div>

      {tab === 'pending' && (
        loadingPending ? (
          <div className="text-center py-10 text-stone-400">Loading…</div>
        ) : !pending.length ? (
          <EmptyState icon={<CheckCircle2 className="w-6 h-6 text-green-500" strokeWidth={1.75} />} text="No pending subscription requests" />
        ) : (
          <div className="space-y-3">
            {pending.map((sub) => (
              <div key={sub._id} className="card border-l-4 border-violet-400">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold">{sub.workerId?.name}</p>
                      <span className={`badge text-xs font-bold ${PLAN_BADGE[sub.plan]}`}>
                        {sub.plan?.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-stone-500">
                      {sub.workerId?.email} · {sub.workerId?.phone}
                    </p>
                    <div className="mt-2 text-sm text-stone-600 space-y-1">
                      <p className="flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-stone-400 shrink-0" strokeWidth={1.75} />
                        <span className="font-medium capitalize">{sub.paymentMethod?.replace(/_/g, ' ')}</span>
                        {' · '}Amount: <span className="font-medium">{CURRENCY_SYMBOL}{sub.amountPaid?.toLocaleString()}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Bookmark className="w-3.5 h-3.5 text-stone-400 shrink-0" strokeWidth={1.75} />
                        Reference: <span className="font-mono font-medium bg-stone-100 px-1.5 py-0.5 rounded">{sub.paymentReference}</span>
                      </p>
                    </div>
                    <p className="text-xs text-stone-400 mt-1">
                      Submitted {new Date(sub.createdAt).toLocaleDateString()}
                    </p>
                    {rejectId === sub._id && (
                      <div className="mt-3 flex gap-2">
                        <input
                          className="input flex-1 text-sm py-1.5"
                          placeholder="Rejection reason…"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          autoFocus
                        />
                        <button onClick={() => reject(sub._id)} className="btn-danger text-sm py-1.5">Confirm</button>
                        <button onClick={() => setRejectId(null)} className="btn-secondary text-sm py-1.5">Cancel</button>
                      </div>
                    )}
                  </div>
                  {rejectId !== sub._id && (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => activate(sub._id)}
                        className="text-sm bg-green-50 text-green-700 border border-green-200 rounded-lg px-3 py-1.5 hover:bg-green-100 font-medium flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" strokeWidth={2.5} /> Activate
                      </button>
                      <button
                        onClick={() => { setRejectId(sub._id); setRejectReason(''); }}
                        className="text-sm bg-red-50 text-red-600 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-100 flex items-center gap-1.5"
                      >
                        <X className="w-4 h-4" strokeWidth={2.5} /> Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'all' && (
        loadingAll ? (
          <div className="text-center py-10 text-stone-400">Loading…</div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-stone-100 text-stone-500">
                  <th className="pb-3 font-semibold">Pro</th>
                  <th className="pb-3 font-semibold">Plan</th>
                  <th className="pb-3 font-semibold">Amount</th>
                  <th className="pb-3 font-semibold">Method</th>
                  <th className="pb-3 font-semibold">Reference</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {all.map((sub) => (
                  <tr key={sub._id}>
                    <td className="py-3">
                      <div className="font-medium">{sub.workerId?.name}</div>
                      <div className="text-stone-400 text-xs">{sub.workerId?.email}</div>
                    </td>
                    <td className="py-3">
                      <span className={`badge text-xs font-bold ${PLAN_BADGE[sub.plan]}`}>
                        {sub.plan?.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 font-medium">{CURRENCY_SYMBOL}{sub.amountPaid?.toLocaleString()}</td>
                    <td className="py-3 text-stone-600 capitalize text-xs">{sub.paymentMethod?.replace(/_/g, ' ')}</td>
                    <td className="py-3 font-mono text-xs text-stone-600">{sub.paymentReference}</td>
                    <td className="py-3">
                      <span className={`badge text-xs ${STATUS_BADGE[sub.status]}`}>{sub.status}</span>
                    </td>
                    <td className="py-3 text-stone-400 text-xs">{new Date(sub.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!all.length && (
              <p className="text-center text-stone-400 py-6 text-sm">No subscription records yet</p>
            )}
          </div>
        )
      )}
    </div>
  );
}

// ── Categories tab ─────────────────────────────────────────────────────────

function CategoriesManager() {
  const qc = useQueryClient();
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('Wrench');
  const [newGroup, setNewGroup] = useState('home_property');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editGroup, setEditGroup] = useState('home_property');
  const [error, setError] = useState('');
  const [uploadingId, setUploadingId] = useState(null);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['adminCategories'],
    queryFn: () => api.get('/admin/categories').then((r) => r.data.data),
  });

  async function addCategory() {
    if (!newName.trim()) return;
    setError('');
    try {
      await api.post('/admin/categories', { name: newName.trim(), icon: newIcon, group: newGroup });
      setNewName('');
      setNewIcon('Wrench');
      setNewGroup('home_property');
      qc.invalidateQueries(['adminCategories']);
      qc.invalidateQueries(['categories']);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add category');
    }
  }

  async function saveEdit(id) {
    try {
      await api.put(`/admin/categories/${id}`, { name: editName, icon: editIcon, group: editGroup });
      setEditId(null);
      qc.invalidateQueries(['adminCategories']);
      qc.invalidateQueries(['categories']);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update');
    }
  }

  async function toggleActive(cat) {
    await api.put(`/admin/categories/${cat._id}`, { isActive: !cat.isActive });
    qc.invalidateQueries(['adminCategories']);
    qc.invalidateQueries(['categories']);
  }

  async function deleteCategory(id) {
    setError('');
    try {
      await api.delete(`/admin/categories/${id}`);
      qc.invalidateQueries(['adminCategories']);
      qc.invalidateQueries(['categories']);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete');
    }
  }

  async function uploadCover(id, file) {
    if (!file) return;
    setError('');
    setUploadingId(id);
    try {
      const fd = new FormData();
      fd.append('coverImage', file);
      await api.post(`/admin/categories/${id}/cover`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      qc.invalidateQueries(['adminCategories']);
      qc.invalidateQueries(['categories']);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload cover');
    } finally {
      setUploadingId(null);
    }
  }

  async function removeCover(id) {
    setError('');
    try {
      await api.delete(`/admin/categories/${id}/cover`);
      qc.invalidateQueries(['adminCategories']);
      qc.invalidateQueries(['categories']);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove cover');
    }
  }

  async function toggleConsultations(cat) {
    try {
      await api.put(`/admin/categories/${cat._id}`, { consultationsEligible: !cat.consultationsEligible });
      qc.invalidateQueries(['adminCategories']);
      qc.invalidateQueries(['categories']);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to toggle');
    }
  }

  async function toggleLiveClasses(cat) {
    try {
      await api.put(`/admin/categories/${cat._id}`, { liveClassesEligible: !cat.liveClassesEligible });
      qc.invalidateQueries(['adminCategories']);
      qc.invalidateQueries(['categories']);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to toggle');
    }
  }

  async function toggleShop(cat) {
    try {
      await api.put(`/admin/categories/${cat._id}`, { shopEligible: !cat.shopEligible });
      qc.invalidateQueries(['adminCategories']);
      qc.invalidateQueries(['categories']);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to toggle');
    }
  }

  async function saveCategoryCommission(id, percent) {
    try {
      const value = percent === '' || percent == null ? null : Number(percent);
      await api.put(`/admin/categories/${id}`, { defaultCommissionPercent: value });
      qc.invalidateQueries(['adminCategories']);
      qc.invalidateQueries(['categories']);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save commission');
    }
  }

  function startEdit(cat) {
    setEditId(cat._id);
    setEditName(cat.name);
    setEditIcon(cat.icon);
    setEditGroup(cat.group || 'home_property');
  }

  if (isLoading) return <div className="text-center py-10 text-stone-400">Loading…</div>;

  return (
    <div className="space-y-6">

      {/* Add new */}
      <div className="card">
        <h3 className="font-semibold mb-4">Add New Category</h3>
        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{error}</p>
        )}
        <div className="space-y-4">
          <div>
            <label className="label">Icon</label>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
              {PICKER_ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  title={ic}
                  onClick={() => setNewIcon(ic)}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg border-2 transition-all ${newIcon === ic ? 'border-violet-500 bg-violet-50 text-violet-600' : 'border-stone-200 hover:border-stone-300 text-stone-500'}`}
                >
                  <CategoryIcon icon={ic} size={16} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Group</label>
            <select className="input" value={newGroup} onChange={(e) => setNewGroup(e.target.value)}>
              {CATEGORY_GROUPS.map((g) => (
                <option key={g.slug} value={g.slug}>{g.icon} {g.label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 flex-wrap items-end">
            <div className="flex-1 min-w-48">
              <label className="label">Category Name</label>
              <input
                className="input"
                placeholder="e.g. Welder, Carpenter…"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCategory()}
              />
            </div>
            <button onClick={addCategory} className="btn-primary">
              + Add Category
            </button>
          </div>
          {newName && (
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <span>Preview:</span>
              <span className="flex items-center gap-1.5 bg-stone-100 px-2 py-1 rounded-lg font-medium">
                <CategoryIcon icon={newIcon} size={14} className="text-violet-600" />
                {newName}
              </span>
              <span>slug: <code className="bg-stone-100 px-1 rounded">{newName.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}</code></span>
            </div>
          )}
        </div>
      </div>

      {/* Existing categories */}
      <div className="card">
        <h3 className="font-semibold mb-4">All Categories ({categories.length})</h3>
        <div className="space-y-2">
          {categories.map((cat) => (
            <div
              key={cat._id}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${cat.isActive ? 'border-stone-200 bg-white' : 'border-stone-100 bg-stone-50 opacity-60'}`}
            >
              {editId === cat._id ? (
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto p-1 bg-stone-50 rounded-lg">
                    {PICKER_ICONS.map((ic) => (
                      <button
                        key={ic}
                        type="button"
                        title={ic}
                        onClick={() => setEditIcon(ic)}
                        className={`w-8 h-8 flex items-center justify-center rounded border-2 transition-all ${editIcon === ic ? 'border-violet-500 bg-violet-50 text-violet-600' : 'border-transparent hover:border-stone-200 text-stone-500'}`}
                      >
                        <CategoryIcon icon={ic} size={14} />
                      </button>
                    ))}
                  </div>
                  <div>
                    <label className="label text-xs">Group</label>
                    <select className="input text-sm" value={editGroup} onChange={(e) => setEditGroup(e.target.value)}>
                      {CATEGORY_GROUPS.map((g) => (
                        <option key={g.slug} value={g.slug}>{g.icon} {g.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <input
                      className="input flex-1"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit(cat._id)}
                      autoFocus
                    />
                    <button onClick={() => saveEdit(cat._id)} className="btn-primary text-sm py-1.5">Save</button>
                    <button onClick={() => setEditId(null)} className="btn-secondary text-sm py-1.5">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <label
                    className="relative w-16 h-12 rounded-lg overflow-hidden border border-stone-200 bg-stone-100 flex items-center justify-center cursor-pointer hover:border-violet-400 transition-colors shrink-0 group/cover"
                    title={cat.coverImage ? 'Replace cover image' : 'Upload cover image'}
                  >
                    {cat.coverImage ? (
                      <img src={cat.coverImage} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <CategoryIcon slug={cat.slug} icon={cat.icon} size={18} className="text-stone-400" />
                    )}
                    <span className="absolute inset-0 bg-black/50 opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-semibold">
                      {uploadingId === cat._id ? '…' : (cat.coverImage ? 'Replace' : 'Upload')}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      className="hidden"
                      disabled={uploadingId === cat._id}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (file) uploadCover(cat._id, file);
                      }}
                    />
                  </label>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CategoryIcon slug={cat.slug} icon={cat.icon} size={14} className="text-stone-400 shrink-0" />
                      <span className="font-medium">{cat.name}</span>
                      <span className="text-xs text-stone-400">/{cat.slug}</span>
                      {cat.group && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-violet-50 text-violet-600 border border-violet-100">
                          {CATEGORY_GROUPS.find((g) => g.slug === cat.group)?.label ?? cat.group}
                        </span>
                      )}
                      <button
                        onClick={() => toggleConsultations(cat)}
                        title={cat.consultationsEligible ? 'Consultations enabled — click to disable' : 'Enable consultations for this category'}
                        className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${cat.consultationsEligible ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' : 'bg-stone-50 text-stone-400 border-stone-200 hover:text-stone-600'}`}
                      >
                        {cat.consultationsEligible ? 'Consults on' : 'No consults'}
                      </button>
                      <button
                        onClick={() => toggleLiveClasses(cat)}
                        title={cat.liveClassesEligible ? 'Live classes enabled — click to disable' : 'Enable live classes for this category'}
                        className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${cat.liveClassesEligible ? 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100' : 'bg-stone-50 text-stone-400 border-stone-200 hover:text-stone-600'}`}
                      >
                        {cat.liveClassesEligible ? '🎓 Live on' : 'No live'}
                      </button>
                      <button
                        onClick={() => toggleShop(cat)}
                        title={cat.shopEligible ? 'Shop enabled — click to disable' : 'Enable shop for this category'}
                        className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${cat.shopEligible ? 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 hover:bg-fuchsia-100' : 'bg-stone-50 text-stone-400 border-stone-200 hover:text-stone-600'}`}
                      >
                        {cat.shopEligible ? '🛍️ Shop on' : 'No shop'}
                      </button>
                    </div>
                    {cat.consultationsEligible && (
                      <div className="flex items-center gap-2 mt-1.5 text-xs">
                        <span className="text-stone-500">Category commission:</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          placeholder="default"
                          defaultValue={cat.defaultCommissionPercent ?? ''}
                          onBlur={(e) => {
                            const next = e.target.value;
                            const current = cat.defaultCommissionPercent ?? '';
                            if (String(next) !== String(current)) saveCategoryCommission(cat._id, next);
                          }}
                          className="w-16 px-2 py-0.5 border border-stone-200 rounded text-xs focus:outline-none focus:border-violet-400"
                        />
                        <span className="text-stone-400">%</span>
                        <span className="text-stone-400 italic">
                          {cat.defaultCommissionPercent != null
                            ? `Pros in this category pay ${cat.defaultCommissionPercent}%`
                            : 'Falls back to platform default'}
                        </span>
                      </div>
                    )}
                  </div>
                  {!cat.isActive && <span className="badge bg-stone-100 text-stone-500">Inactive</span>}
                  <div className="flex gap-2">
                    {cat.coverImage && (
                      <button onClick={() => removeCover(cat._id)} className="text-xs text-stone-500 underline hover:no-underline">Remove cover</button>
                    )}
                    <button onClick={() => startEdit(cat)} className="text-xs text-blue-600 underline hover:no-underline">Edit</button>
                    <button
                      onClick={() => toggleActive(cat)}
                      className={`text-xs underline hover:no-underline ${cat.isActive ? 'text-violet-600' : 'text-green-600'}`}
                    >
                      {cat.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => deleteCategory(cat._id)} className="text-xs text-red-500 underline hover:no-underline">Delete</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Consultations Settings tab ─────────────────────────────────────────────

function ConsultationsSettings() {
  const qc = useQueryClient();
  const [defaultPercent, setDefaultPercent] = useState('');
  const [volumeEnabled, setVolumeEnabled]   = useState(true);
  const [tiers, setTiers]                   = useState([]);
  const [error, setError]                   = useState('');
  const [savedAt, setSavedAt]               = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['consultationSettings'],
    queryFn: () => api.get('/admin/settings/consultations').then((r) => r.data.data),
  });

  // Hydrate local state once data arrives
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!data || hydratedRef.current) return;
    setDefaultPercent(String(data.defaultCommissionPercent ?? 15));
    setVolumeEnabled(data.volumeTiers?.enabled !== false);
    setTiers((data.volumeTiers?.tiers || []).map((t) => ({ ...t })));
    hydratedRef.current = true;
  }, [data]);

  async function save() {
    setError('');
    try {
      const payload = {
        defaultCommissionPercent: Number(defaultPercent),
        volumeTiers: {
          enabled: volumeEnabled,
          tiers: tiers
            .map((t) => ({ minSessions: Number(t.minSessions), percent: Number(t.percent) }))
            .filter((t) => !Number.isNaN(t.minSessions) && !Number.isNaN(t.percent))
            .sort((a, b) => a.minSessions - b.minSessions),
        },
      };
      await api.put('/admin/settings/consultations', payload);
      qc.invalidateQueries(['consultationSettings']);
      setSavedAt(Date.now());
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    }
  }

  function addTier() {
    const lastMin = tiers.length ? Math.max(...tiers.map((t) => Number(t.minSessions) || 0)) : 0;
    setTiers([...tiers, { minSessions: lastMin + 10, percent: 10 }]);
  }
  function updateTier(idx, field, value) {
    setTiers(tiers.map((t, i) => (i === idx ? { ...t, [field]: value } : t)));
  }
  function removeTier(idx) {
    setTiers(tiers.filter((_, i) => i !== idx));
  }

  if (isLoading) return <div className="text-center py-10 text-stone-400">Loading…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-stone-900">Private Consultations</h2>
        <p className="text-sm text-stone-500 mt-1">
          Platform-wide settings for the 1-on-1 paid video consultation feature. Changes apply to new bookings only —
          existing bookings keep the rate they were created with.
        </p>
      </div>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Platform default */}
      <div className="card">
        <h3 className="font-semibold mb-1">Platform default commission</h3>
        <p className="text-xs text-stone-500 mb-4">
          Applied when no category-level or per-Pro rate is set. Most Pros will fall here unless customized.
        </p>
        <div className="flex items-end gap-3">
          <div className="w-32">
            <label className="label">Percent</label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                className="input pr-8"
                value={defaultPercent}
                onChange={(e) => setDefaultPercent(e.target.value)}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">%</span>
            </div>
          </div>
          <div className="text-xs text-stone-500 pb-2.5">
            Of each session price. Pro receives <span className="font-semibold">{Math.max(0, 100 - Number(defaultPercent || 0)).toFixed(1)}%</span>.
          </div>
        </div>
      </div>

      {/* Volume tiers */}
      <div className="card">
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-semibold">Automatic volume tiers</h3>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={volumeEnabled}
              onChange={(e) => setVolumeEnabled(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className={volumeEnabled ? 'text-stone-700' : 'text-stone-400'}>
              {volumeEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        </div>
        <p className="text-xs text-stone-500 mb-4">
          Reward high-volume Pros automatically based on this calendar month's completed sessions.
          Tiers only ever <span className="font-semibold">reduce</span> a Pro's rate — never raise it above their category/platform baseline.
        </p>

        <div className={`space-y-2 ${!volumeEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
          {tiers.length === 0 && (
            <p className="text-sm text-stone-400 italic">No tiers configured. Add one to start.</p>
          )}
          {tiers.map((tier, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg border border-stone-200">
              <div className="flex-1 grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">Sessions / month ≥</label>
                  <input
                    type="number"
                    min="0"
                    className="input text-sm"
                    value={tier.minSessions}
                    onChange={(e) => updateTier(idx, 'minSessions', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label text-xs">Commission %</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      className="input text-sm pr-7"
                      value={tier.percent}
                      onChange={(e) => updateTier(idx, 'percent', e.target.value)}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 text-xs">%</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => removeTier(idx)}
                className="text-xs text-red-500 underline hover:no-underline self-end pb-2.5"
              >
                Remove
              </button>
            </div>
          ))}
          <button onClick={addTier} className="text-sm text-violet-600 font-medium hover:text-violet-700 mt-2">
            + Add tier
          </button>
        </div>
      </div>

      {/* Save bar */}
      <div className="flex items-center gap-3">
        <button onClick={save} className="btn-primary">Save settings</button>
        {savedAt && Date.now() - savedAt < 4000 && (
          <span className="text-sm text-green-600 font-medium flex items-center gap-1">
            <Check className="w-4 h-4" strokeWidth={2.5} />Saved
          </span>
        )}
        <span className="text-xs text-stone-400 ml-auto">
          Per-category rates → Categories tab. Per-Pro overrides → Pros tab.
        </span>
      </div>
    </div>
  );
}

// ── Shop Settings tab ──────────────────────────────────────────────────────
function ShopSettings() {
  const qc = useQueryClient();
  const [percent,   setPercent]   = useState('15');
  const [freeCount, setFreeCount] = useState('2');
  const [savedAt,   setSavedAt]   = useState(null);
  const [error,     setError]     = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['shopSettings'],
    queryFn: () => api.get('/admin/settings/shop').then((r) => r.data.data),
  });

  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!data || hydratedRef.current) return;
    setPercent(String(data.defaultCommissionPercent ?? 15));
    setFreeCount(String(data.freeSellingCount ?? 2));
    hydratedRef.current = true;
  }, [data]);

  async function save() {
    setError('');
    const p = Number(percent);
    const f = Number(freeCount);
    if (Number.isNaN(p) || p < 0 || p > 100) { setError('Commission must be 0–100'); return; }
    if (Number.isNaN(f) || f < 0 || f > 100) { setError('Free count must be 0–100'); return; }
    try {
      await api.put('/admin/settings/shop', { defaultCommissionPercent: p, freeSellingCount: f });
      qc.invalidateQueries(['shopSettings']);
      setSavedAt(Date.now());
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    }
  }

  if (isLoading) return <div className="text-center py-10 text-stone-400">Loading…</div>;

  const pct = Number(percent || 0);
  const free = Number(freeCount || 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-stone-900">Art & Crafts Shop</h2>
        <p className="text-sm text-stone-500 mt-1">
          Commission settings for the art &amp; crafts shop — direct item sales and custom commission requests.
          The free introductory period lets artists try the platform with zero risk.
        </p>
      </div>

      {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      <div className="card space-y-6">

        {/* Free intro period */}
        <div>
          <h3 className="font-semibold mb-1">Free introductory sales</h3>
          <p className="text-xs text-stone-500 mb-4">
            Each artist gets this many <strong>commission-free</strong> sales when they first join the shop.
            Counted across all their items + custom commissions combined.
            This is your marketing hook — use it in campaign copy.
          </p>
          <div className="flex items-end gap-4">
            <div className="w-36">
              <label className="label">Free sales count</label>
              <input
                type="number" min="0" max="100" step="1"
                className="input"
                value={freeCount}
                onChange={(e) => setFreeCount(e.target.value)}
              />
            </div>
            <div className="pb-2.5 text-sm text-stone-500">
              <p>Currently: <span className="font-semibold text-fuchsia-700">first {free} sale{free !== 1 ? 's' : ''}</span> at 0% commission</p>
              <p className="text-xs text-stone-400 mt-0.5">Marketing line: "List today — first {free} sales commission-free"</p>
            </div>
          </div>
        </div>

        {/* Commission rate */}
        <div className="border-t border-stone-100 pt-5">
          <h3 className="font-semibold mb-1">Platform commission rate</h3>
          <p className="text-xs text-stone-500 mb-4">
            Applied from sale #{free + 1} onwards, unless a per-artist override is set below.
          </p>
          <div className="flex items-end gap-4">
            <div className="w-36">
              <label className="label">Commission %</label>
              <div className="relative">
                <input
                  type="number" min="0" max="100" step="0.5"
                  className="input pr-8"
                  value={percent}
                  onChange={(e) => setPercent(e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">%</span>
              </div>
            </div>
            <div className="pb-2.5 text-sm text-stone-500 space-y-0.5">
              <p>Artist receives <span className="font-semibold text-stone-800">{Math.max(0, 100 - pct).toFixed(1)}%</span></p>
              <p className="text-xs text-stone-400">e.g. {CURRENCY_SYMBOL}5,000 item → artist gets <span className="font-medium">{CURRENCY_SYMBOL}{((1 - pct / 100) * 5000).toLocaleString()}</span>, platform earns <span className="font-medium">{CURRENCY_SYMBOL}{((pct / 100) * 5000).toLocaleString()}</span></p>
            </div>
          </div>
        </div>

        {/* How it works summary */}
        <div className="border-t border-stone-100 pt-5">
          <h3 className="font-semibold mb-3">How it works for each artist</h3>
          <div className="space-y-2">
            {Array.from({ length: Math.min(free + 2, 6) }, (_, i) => {
              const isFree = i < free;
              return (
                <div key={i} className={`flex items-center gap-3 text-sm ${isFree ? 'text-fuchsia-700' : 'text-stone-600'}`}>
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isFree ? 'bg-fuchsia-100' : 'bg-stone-100'}`}>
                    {i + 1}
                  </span>
                  <span>Sale #{i + 1} — {isFree ? <strong>0% commission (free)</strong> : `${pct}% commission → artist earns ${(100 - pct).toFixed(0)}%`}</span>
                </div>
              );
            })}
            <div className="flex items-center gap-3 text-sm text-stone-400">
              <span className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center text-xs font-bold shrink-0">…</span>
              <span>All subsequent sales at {pct}%</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-stone-100">
          <button onClick={save} className="btn-primary">Save settings</button>
          {savedAt && <span className="text-green-600 text-sm">✓ Saved</span>}
        </div>
      </div>
    </div>
  );
}

// ── Live Classes Settings tab ──────────────────────────────────────────────
function LiveClassesSettings() {
  const qc = useQueryClient();
  const [percent, setPercent] = useState('12');
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError]     = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['liveClassSettings'],
    queryFn: () => api.get('/admin/settings/live-classes').then((r) => r.data.data),
  });

  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!data || hydratedRef.current) return;
    setPercent(String(data.defaultCommissionPercent ?? 12));
    hydratedRef.current = true;
  }, [data]);

  async function save() {
    setError('');
    const v = Number(percent);
    if (Number.isNaN(v) || v < 0 || v > 100) { setError('Must be 0–100'); return; }
    try {
      await api.put('/admin/settings/live-classes', { defaultCommissionPercent: v });
      qc.invalidateQueries(['liveClassSettings']);
      setSavedAt(Date.now());
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    }
  }

  if (isLoading) return <div className="text-center py-10 text-stone-400">Loading…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-stone-900">Live Classes</h2>
        <p className="text-sm text-stone-500 mt-1">
          Platform commission on live class revenue. Applied when the teacher ends a class — calculated on total seat revenue (seats sold × price per seat).
        </p>
      </div>

      {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      <div className="card space-y-5">
        {/* Rate input */}
        <div>
          <h3 className="font-semibold mb-1">Platform commission rate</h3>
          <p className="text-xs text-stone-500 mb-4">
            Applies to all live classes unless a per-Pro or per-category override is set. Changing this only affects <strong>future</strong> classes — already-started classes keep the rate locked at class start.
          </p>
          <div className="flex items-end gap-4">
            <div className="w-36">
              <label className="label">Commission %</label>
              <div className="relative">
                <input
                  type="number" min="0" max="100" step="0.5"
                  className="input pr-8"
                  value={percent}
                  onChange={(e) => setPercent(e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">%</span>
              </div>
            </div>
            <div className="pb-2.5 text-sm text-stone-500 space-y-0.5">
              <p>Teacher receives <span className="font-semibold text-stone-800">{Math.max(0, 100 - Number(percent || 0)).toFixed(1)}%</span></p>
              <p className="text-xs text-stone-400">e.g. 5 seats × {CURRENCY_SYMBOL}1,000 = {CURRENCY_SYMBOL}5,000 → platform earns <span className="font-medium">{CURRENCY_SYMBOL}{((Number(percent||0)/100)*5000).toLocaleString()}</span></p>
            </div>
          </div>
        </div>

        {/* Who can host */}
        <div className="border-t border-stone-100 pt-4">
          <h3 className="font-semibold mb-1">Who can host</h3>
          <p className="text-sm text-stone-500">
            Only workers on a <span className="font-semibold text-violet-700">Pro</span> or <span className="font-semibold text-amber-700">Elite</span> subscription can create live classes. Free plan workers are blocked at the API level.
          </p>
          <div className="mt-3 flex gap-3">
            <span className="text-xs bg-stone-100 text-stone-500 px-3 py-1 rounded-full line-through">Free — no access</span>
            <span className="text-xs bg-violet-100 text-violet-700 px-3 py-1 rounded-full font-semibold">Pro ✓</span>
            <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-semibold">Elite ✓</span>
          </div>
        </div>

        {/* Category eligibility note */}
        <div className="border-t border-stone-100 pt-4">
          <h3 className="font-semibold mb-1">Category eligibility</h3>
          <p className="text-sm text-stone-500">
            Even with a paid plan, a worker can only host live classes if their category has the <span className="font-semibold">🎓 Live on</span> toggle enabled. Go to the <strong>Categories</strong> tab to enable per-category.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-stone-100">
          <button onClick={save} className="btn-primary">Save settings</button>
          {savedAt && <span className="text-green-600 text-sm">✓ Saved</span>}
        </div>
      </div>
    </div>
  );
}

// ── Payouts tab ────────────────────────────────────────────────────────────

function PayoutsManager() {
  const qc = useQueryClient();
  const [filter, setFilter]   = useState('pending');
  const [target, setTarget]   = useState(null); // payout object being processed
  const [mode, setMode]       = useState('process'); // 'process' | 'reject'
  const [txnRef, setTxnRef]   = useState('');
  const [reason, setReason]   = useState('');
  const [note, setNote]       = useState('');

  const { data: payouts = [], isLoading } = useQuery({
    queryKey: ['adminPayouts', filter],
    queryFn: () => api.get(`/admin/payouts?status=${filter}`).then((r) => r.data.data),
  });

  function openProcess(p) { setTarget(p); setMode('process'); setTxnRef(''); setNote(''); }
  function openReject(p)  { setTarget(p); setMode('reject');  setReason(''); }

  async function process() {
    await api.put(`/admin/payouts/${target._id}/process`, { transactionRef: txnRef, adminNote: note });
    qc.invalidateQueries(['adminPayouts', filter]);
    setTarget(null);
  }
  async function reject() {
    await api.put(`/admin/payouts/${target._id}/reject`, { reason });
    qc.invalidateQueries(['adminPayouts', filter]);
    setTarget(null);
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-stone-900">Pro payouts</h2>
        <p className="text-sm text-stone-500 mt-1">
          Pros request withdrawals from their consultation earnings. Send the money via the requested method, then mark as processed with a reference.
        </p>
      </div>

      <div className="flex gap-2">
        {['pending', 'completed', 'rejected', 'all'].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${filter === f ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-500 hover:text-stone-700'}`}>
            {f}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-stone-400">Loading…</p>
      ) : payouts.length === 0 ? (
        <p className="text-stone-400 text-sm italic">No payouts in this view.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-stone-100 text-stone-500">
                <th className="pb-3 font-semibold">Pro</th>
                <th className="pb-3 font-semibold">Amount</th>
                <th className="pb-3 font-semibold">Source</th>
                <th className="pb-3 font-semibold">Method</th>
                <th className="pb-3 font-semibold">Requested</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {payouts.map((p) => (
                <tr key={p._id}>
                  <td className="py-3">
                    <div className="font-medium">{p.workerId?.name || '—'}</div>
                    <div className="text-stone-400 text-xs">{p.workerId?.email}</div>
                  </td>
                  <td className="py-3">
                    <span className="font-bold">{Number(p.amount).toLocaleString()}</span> <span className="text-stone-500">{p.currency}</span>
                  </td>
                  <td className="py-3">
                    {{
                      consultation: <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">📋 Consultation</span>,
                      live_class:   <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700">🎓 Live Class</span>,
                      shop:         <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-fuchsia-50 text-fuchsia-700">🎨 Shop</span>,
                    }[p.source] || <span className="text-xs text-stone-400 capitalize">{p.source || '—'}</span>}
                  </td>
                  <td className="py-3 capitalize text-stone-600">
                    {p.method.replace('_', ' ')}
                    <div className="text-xs text-stone-400">
                      {p.method === 'bank'
                        ? `${p.recipient?.bankName || ''} · ${p.recipient?.accountNumber || ''}`
                        : `${p.recipient?.walletNumber || ''} · ${p.recipient?.walletHolder || ''}`}
                    </div>
                  </td>
                  <td className="py-3 text-stone-600">
                    {new Date(p.requestedAt).toLocaleDateString()}
                    <div className="text-xs text-stone-400">{new Date(p.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td className="py-3">
                    <PayoutStatusBadge status={p.status} />
                    {p.transactionRef && <div className="text-xs text-stone-400 mt-0.5">Ref: {p.transactionRef}</div>}
                  </td>
                  <td className="py-3">
                    {p.status === 'pending' && (
                      <div className="flex flex-col gap-1">
                        <button onClick={() => openProcess(p)} className="text-xs text-green-700 underline hover:no-underline">Mark paid</button>
                        <button onClick={() => openReject(p)} className="text-xs text-red-600 underline hover:no-underline">Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Process / Reject modal */}
      {target && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-stone-900 mb-1">
              {mode === 'process' ? 'Mark payout as paid' : 'Reject payout'}
            </h3>
            <p className="text-sm text-stone-500 mb-4">
              <span className="font-medium text-stone-700">{Number(target.amount).toLocaleString()} {target.currency}</span> via {target.method.replace('_', ' ')} to {target.workerId?.name}.
            </p>

            {mode === 'process' ? (
              <>
                <label className="text-xs font-semibold text-stone-600 block mb-1">Transaction reference</label>
                <input value={txnRef} onChange={(e) => setTxnRef(e.target.value)} placeholder="e.g. bank transaction ID, wallet receipt"
                  autoFocus className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm mb-3" />
                <label className="text-xs font-semibold text-stone-600 block mb-1">Note (optional)</label>
                <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm mb-4" />
                <div className="flex gap-3">
                  <button onClick={process} className="bg-green-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-green-700 flex-1">
                    Confirm paid
                  </button>
                  <button onClick={() => setTarget(null)} className="text-sm text-stone-600 px-4 py-2 rounded-lg hover:bg-stone-100">Cancel</button>
                </div>
              </>
            ) : (
              <>
                <label className="text-xs font-semibold text-stone-600 block mb-1">Reason</label>
                <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
                  placeholder="What should the Pro be told?" autoFocus
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm mb-4" />
                <p className="text-xs text-stone-500 mb-4">
                  The pending amount will be returned to the Pro's available balance.
                </p>
                <div className="flex gap-3">
                  <button onClick={reject} className="bg-red-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-red-700 flex-1">
                    Reject & refund
                  </button>
                  <button onClick={() => setTarget(null)} className="text-sm text-stone-600 px-4 py-2 rounded-lg hover:bg-stone-100">Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PayoutStatusBadge({ status }) {
  const meta = {
    pending:    { label: 'Pending',    color: 'bg-amber-100 text-amber-700' },
    processing: { label: 'Processing', color: 'bg-blue-100 text-blue-700' },
    completed:  { label: 'Paid',       color: 'bg-green-100 text-green-700' },
    rejected:   { label: 'Rejected',   color: 'bg-red-100 text-red-700' },
    cancelled:  { label: 'Cancelled',  color: 'bg-stone-100 text-stone-600' },
  };
  const m = meta[status] || { label: status, color: 'bg-stone-100 text-stone-600' };
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${m.color}`}>{m.label}</span>;
}

// ── Audit Log tab ──────────────────────────────────────────────────────────

const ACTION_META = {
  worker_suspended:       { label: 'Suspended worker',       color: 'bg-red-100 text-red-700' },
  worker_reinstated:      { label: 'Reinstated worker',      color: 'bg-green-100 text-green-700' },
  worker_flag_cleared:    { label: 'Cleared flag',           color: 'bg-stone-100 text-stone-600' },
  nic_verified:           { label: 'ID verified',           color: 'bg-blue-100 text-blue-700' },
  dispute_resolved:       { label: 'Dispute resolved',       color: 'bg-purple-100 text-purple-700' },
  subscription_activated: { label: 'Subscription activated', color: 'bg-violet-100 text-violet-700' },
  subscription_rejected:  { label: 'Subscription rejected',  color: 'bg-orange-100 text-orange-700' },
  bio_approved:           { label: 'Bio approved',           color: 'bg-teal-100 text-teal-700' },
  bio_rejected:           { label: 'Bio rejected',           color: 'bg-red-100 text-red-600' },
  photo_approved:         { label: 'Photo approved',         color: 'bg-teal-100 text-teal-700' },
  photo_rejected:         { label: 'Photo rejected',         color: 'bg-red-100 text-red-600' },
  category_created:       { label: 'Category created',       color: 'bg-indigo-100 text-indigo-700' },
  category_updated:       { label: 'Category updated',       color: 'bg-indigo-100 text-indigo-600' },
  category_cover_updated: { label: 'Category cover updated', color: 'bg-indigo-100 text-indigo-600' },
  category_deleted:       { label: 'Category deleted',       color: 'bg-red-100 text-red-700' },
  consultation_settings_updated: { label: 'Consultation settings updated', color: 'bg-amber-100 text-amber-700' },
  commission_override_set:                  { label: 'Commission override set',            color: 'bg-amber-100 text-amber-700' },
  commission_override_removed:              { label: 'Commission override removed',         color: 'bg-stone-100 text-stone-600' },
  live_class_commission_override_set:       { label: 'Live class commission override set',  color: 'bg-violet-100 text-violet-700' },
  live_class_commission_override_removed:   { label: 'Live class commission override removed', color: 'bg-stone-100 text-stone-600' },
  payout_processed:              { label: 'Payout processed',              color: 'bg-green-100 text-green-700' },
  payout_rejected:               { label: 'Payout rejected',               color: 'bg-red-100 text-red-700' },
};

function AuditLogViewer() {
  const [page, setPage]           = useState(1);
  const [filterAction, setFilter] = useState('');
  const [expanded, setExpanded]   = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['adminAudit', page, filterAction],
    queryFn:  () => api.get('/admin/audit', { params: { page, limit: 50, action: filterAction || undefined } })
                       .then((r) => r.data),
    keepPreviousData: true,
  });

  const logs       = data?.data || [];
  const pagination = data?.pagination || {};

  function fmt(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filterAction}
          onChange={(e) => { setFilter(e.target.value); setPage(1); }}
          className="input max-w-xs text-sm py-2"
        >
          <option value="">All actions</option>
          {Object.entries(ACTION_META).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <span className="text-sm text-stone-400">
          {pagination.total != null ? `${pagination.total} records` : ''}
        </span>
      </div>

      {isLoading && <div className="text-center py-10 text-stone-400">Loading…</div>}

      {!isLoading && logs.length === 0 && (
        <EmptyState icon={<ClipboardList className="w-6 h-6 text-stone-400" strokeWidth={1.75} />} text="No audit log entries yet — admin actions will appear here." />
      )}

      {/* Log table */}
      {logs.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-stone-500 uppercase">Timestamp</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-stone-500 uppercase">Action</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-stone-500 uppercase">Target</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-stone-500 uppercase">Admin</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-stone-500 uppercase">Detail</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const meta = ACTION_META[log.action] || { label: log.action, color: 'bg-stone-100 text-stone-600' };
                const isOpen = expanded === log._id;
                return (
                  <>
                    <tr
                      key={log._id}
                      className={`border-b border-stone-100 hover:bg-stone-50 transition-colors cursor-pointer ${isOpen ? 'bg-stone-50' : ''}`}
                      onClick={() => setExpanded(isOpen ? null : log._id)}
                    >
                      <td className="py-3 px-4 text-stone-500 whitespace-nowrap font-mono text-xs">
                        {fmt(log.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`badge text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-stone-700">{log.targetName || '—'}</span>
                        <span className="text-xs text-stone-400 ml-1 capitalize">({log.targetType})</span>
                      </td>
                      <td className="py-3 px-4 text-stone-500 text-xs">{log.adminEmail}</td>
                      <td className="py-3 px-4 text-stone-400 text-xs">
                        {isOpen ? '▲ hide' : '▼ show'}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={`${log._id}-detail`} className="bg-stone-50 border-b border-stone-200">
                        <td colSpan={5} className="px-6 py-3">
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs font-semibold text-stone-400 mb-1 uppercase">Detail</p>
                              <pre className="text-xs text-stone-600 bg-white rounded-lg p-3 border border-stone-200 overflow-auto max-h-40 whitespace-pre-wrap">
                                {JSON.stringify(log.detail, null, 2)}
                              </pre>
                            </div>
                            <div className="space-y-2 text-xs text-stone-500">
                              <div><span className="font-medium text-stone-600">Target ID:</span> <code className="bg-stone-100 px-1 rounded">{log.targetId || '—'}</code></div>
                              <div><span className="font-medium text-stone-600">Admin ID:</span> <code className="bg-stone-100 px-1 rounded">{log.adminId}</code></div>
                              <div><span className="font-medium text-stone-600">IP:</span> {log.ip || '—'}</div>
                              <div><span className="font-medium text-stone-600">User-Agent:</span> <span className="break-all">{log.userAgent?.substring(0, 80) || '—'}</span></div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center gap-2 justify-center pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-sm text-stone-500">Page {page} of {pagination.pages}</span>
          <button
            onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
            disabled={page === pagination.pages}
            className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────

// ── Featured Requests tab ─────────────────────────────────────────────────

function FeaturedRequests() {
  const qc = useQueryClient();
  const [view, setView]           = useState('pending');
  const [rejectId, setRejectId]   = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['adminFeaturedRequests', view],
    queryFn: () => api.get(`/admin/featured-requests?status=${view}`).then((r) => r.data.data),
  });

  async function approve(id) {
    await api.put(`/admin/featured-requests/${id}/approve`);
    qc.invalidateQueries(['adminFeaturedRequests']);
    qc.invalidateQueries(['adminActionCount']);
  }

  async function reject() {
    await api.put(`/admin/featured-requests/${rejectId}/reject`, { reason: rejectReason || 'Payment could not be verified' });
    qc.invalidateQueries(['adminFeaturedRequests']);
    qc.invalidateQueries(['adminActionCount']);
    setRejectId(null);
    setRejectReason('');
  }

  const PERIOD_LABEL = { '1_week': '1 Week', '2_weeks': '2 Weeks', '1_month': '1 Month' };
  const METHOD_LABEL = { bank_transfer: 'Bank Transfer', cash: 'Cash' };

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex gap-2 mb-5">
        {['pending', 'approved', 'rejected', 'all'].map((s) => (
          <button
            key={s}
            onClick={() => setView(s)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
              view === s ? 'bg-violet-100 text-violet-800' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-stone-400">Loading…</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-14 text-stone-400">
          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center">
              <Star className="w-6 h-6 text-amber-400" strokeWidth={1.75} />
            </div>
          </div>
          <p className="font-medium">No {view} featured requests</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => (
            <div key={r._id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-4">
                {/* Worker info */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-pink-400 flex items-center justify-center text-white font-bold text-sm">
                    {r.workerId?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-stone-800">{r.workerId?.name}</p>
                    <p className="text-xs text-stone-400">{r.workerId?.email}</p>
                  </div>
                </div>

                {/* Status badge */}
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                  r.status === 'approved' ? 'bg-green-100 text-green-700' :
                  r.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                </span>
              </div>

              {/* Payment details grid */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="bg-stone-50 rounded-lg p-3">
                  <p className="text-xs text-stone-400 mb-0.5">Period</p>
                  <p className="font-semibold">{PERIOD_LABEL[r.period]}</p>
                </div>
                <div className="bg-stone-50 rounded-lg p-3">
                  <p className="text-xs text-stone-400 mb-0.5">Amount</p>
                  <p className="font-semibold text-violet-700">{CURRENCY_SYMBOL}{r.amount?.toLocaleString()}</p>
                </div>
                <div className="bg-stone-50 rounded-lg p-3">
                  <p className="text-xs text-stone-400 mb-0.5">Method</p>
                  <p className="font-semibold">{METHOD_LABEL[r.paymentMethod]}</p>
                </div>
                <div className="bg-stone-50 rounded-lg p-3">
                  <p className="text-xs text-stone-400 mb-0.5">Reference</p>
                  <p className="font-semibold font-mono text-xs">{r.paymentRef || '—'}</p>
                </div>
              </div>

              {r.notes && (
                <p className="mt-3 text-sm text-stone-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                  {r.notes}
                </p>
              )}

              {r.status === 'rejected' && r.rejectedReason && (
                <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-start gap-1.5">
                  <X className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={2.5} />
                  Reason: {r.rejectedReason}
                </p>
              )}

              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-stone-400">
                  Requested {new Date(r.requestedAt).toLocaleDateString()}
                  {r.reviewedAt && ` · Reviewed ${new Date(r.reviewedAt).toLocaleDateString()}`}
                </p>
                {r.status === 'pending' && (
                  <div className="flex gap-2">
                    <button onClick={() => approve(r._id)} className="btn-primary text-sm py-1.5 px-4 flex items-center gap-1.5">
                      <Check className="w-4 h-4" strokeWidth={2.5} />Approve
                    </button>
                    <button onClick={() => setRejectId(r._id)} className="btn-danger text-sm py-1.5 px-4 flex items-center gap-1.5">
                      <X className="w-4 h-4" strokeWidth={2.5} />Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject modal */}
      {rejectId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold mb-1">Reject Request</h3>
            <p className="text-sm text-stone-500 mb-4">Provide a reason — the worker will be notified.</p>
            <input
              className="input w-full mb-4"
              placeholder="e.g. Payment reference not found"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={reject} className="btn-danger flex-1 py-2">Reject</button>
              <button onClick={() => { setRejectId(null); setRejectReason(''); }} className="btn-secondary flex-1 py-2">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Contact Messages tab ───────────────────────────────────────────────────

const TOPIC_LABELS = {
  general:      { label: 'General',       color: 'bg-stone-100 text-stone-600' },
  subscription: { label: 'Subscription',  color: 'bg-violet-100 text-violet-700' },
  dispute:      { label: 'Dispute',       color: 'bg-red-100 text-red-700' },
  partnership:  { label: 'Partnership',   color: 'bg-blue-100 text-blue-700' },
  other:        { label: 'Other',         color: 'bg-stone-100 text-stone-600' },
};

function ContactMessages() {
  const qc = useQueryClient();
  const [filter, setFilter]       = useState('all');   // all | unread
  const [expanded, setExpanded]   = useState(null);    // message _id
  const [noteText, setNoteText]   = useState({});      // { [id]: string }
  const [savingNote, setSavingNote] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['contactMessages', filter],
    queryFn: () =>
      api.get(`/contact?limit=100${filter === 'unread' ? '&unread=true' : ''}`)
        .then((r) => r.data.data.messages),
    refetchInterval: 60_000,
  });

  const messages = data || [];

  async function markRead(id, isRead) {
    await api.patch(`/contact/${id}`, { isRead });
    qc.invalidateQueries(['contactMessages']);
    qc.invalidateQueries(['adminActionCount']);
  }

  async function saveNote(id) {
    setSavingNote(id);
    await api.patch(`/contact/${id}`, { adminNote: noteText[id] ?? '' });
    qc.invalidateQueries(['contactMessages']);
    setSavingNote(null);
  }

  const toggle = (id) => {
    setExpanded((prev) => {
      const next = prev === id ? null : id;
      return next;
    });
    // Auto-mark as read when opened
    const msg = messages.find((m) => m._id === id);
    if (msg && !msg.isRead) markRead(id, true);
  };

  if (isLoading) return <div className="text-center py-20 text-stone-400">Loading…</div>;

  const unreadCount = messages.filter((m) => !m.isRead).length;

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-bold text-lg">Contact Messages</h2>
          {unreadCount > 0 && (
            <span className="bg-blue-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
              {unreadCount} unread
            </span>
          )}
        </div>
        {/* Filter pills */}
        <div className="flex gap-2">
          {['all', 'unread'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs font-semibold px-4 py-1.5 rounded-full transition-colors capitalize ${
                filter === f
                  ? 'bg-stone-800 text-white'
                  : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
              }`}
            >
              {f === 'all' ? `All (${messages.length})` : `Unread (${unreadCount})`}
            </button>
          ))}
        </div>
      </div>

      {messages.length === 0 ? (
        <EmptyState icon={<svg className="w-6 h-6 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>} text="No contact messages yet." />
      ) : (
        <div className="space-y-2">
          {messages.map((msg) => {
            const isOpen   = expanded === msg._id;
            const topicCfg = TOPIC_LABELS[msg.topic] || TOPIC_LABELS.other;

            return (
              <div
                key={msg._id}
                className={`border rounded-2xl transition-all duration-200 bg-white ${
                  isOpen
                    ? 'border-violet-200 shadow-sm'
                    : msg.isRead
                    ? 'border-stone-200 hover:border-stone-300'
                    : 'border-blue-200 bg-blue-50/40 hover:border-blue-300'
                }`}
              >
                {/* Row header — always visible */}
                <div
                  className="flex items-center gap-3 px-5 py-3.5 cursor-pointer"
                  onClick={() => toggle(msg._id)}
                >
                  {/* Unread dot */}
                  <div className={`w-2 h-2 rounded-full shrink-0 ${msg.isRead ? 'bg-stone-200' : 'bg-blue-500'}`} />

                  {/* Name + email */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-stone-800">{msg.name}</span>
                      <span className="text-xs text-stone-400">{msg.email}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${topicCfg.color}`}>
                        {topicCfg.label}
                      </span>
                      {msg.adminNote && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Note</span>
                      )}
                    </div>
                    {/* Message preview */}
                    {!isOpen && (
                      <p className="text-xs text-stone-400 truncate mt-0.5 max-w-lg">{msg.message}</p>
                    )}
                  </div>

                  {/* Date + chevron */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-stone-400">
                      {new Date(msg.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </span>
                    <svg
                      className={`w-4 h-4 text-stone-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </div>
                </div>

                {/* Expanded body */}
                {isOpen && (
                  <div className="px-5 pb-5 border-t border-stone-100 pt-4">
                    {/* Full message */}
                    <div className="bg-stone-50 rounded-xl p-4 mb-4">
                      <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                    </div>

                    {/* Actions row */}
                    <div className="flex items-center gap-3 flex-wrap mb-4">
                      <a
                        href={`mailto:${msg.email}?subject=Re: Your SkillHub enquiry`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold bg-gradient-to-br from-violet-600 to-pink-500 text-white px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Reply via Email
                      </a>
                      <button
                        onClick={() => markRead(msg._id, !msg.isRead)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 px-4 py-2 rounded-xl transition-colors"
                      >
                        {msg.isRead ? (
                          <><Circle className="w-3.5 h-3.5" strokeWidth={2} />Mark unread</>
                        ) : (
                          <><Check className="w-3.5 h-3.5" strokeWidth={2.5} />Mark as read</>
                        )}
                      </button>
                    </div>

                    {/* Admin note */}
                    <div>
                      <label className="text-xs font-semibold text-stone-500 block mb-1.5">Admin note (internal)</label>
                      <textarea
                        rows={2}
                        placeholder="Add a note for your records…"
                        value={noteText[msg._id] ?? msg.adminNote ?? ''}
                        onChange={(e) => setNoteText((prev) => ({ ...prev, [msg._id]: e.target.value }))}
                        className="w-full border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-700 resize-none focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 transition"
                      />
                      <div className="flex justify-end mt-1.5">
                        <button
                          onClick={() => saveNote(msg._id)}
                          disabled={savingNote === msg._id}
                          className="text-xs font-semibold text-violet-600 hover:text-violet-800 disabled:opacity-50 transition-colors"
                        >
                          {savingNote === msg._id ? 'Saving…' : 'Save note'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LiveWorkModeration() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['adminProgressPosts', filter],
    queryFn: () =>
      api.get(`/progress-posts/admin/all${filter === 'flagged' ? '?flagged=true' : ''}`)
        .then((r) => r.data.data),
    refetchInterval: 60_000,
  });

  const posts = data || [];

  async function setRemoved(id, removed, reason) {
    await api.patch(`/progress-posts/admin/${id}`, {
      removedByAdmin: removed,
      removedReason:  reason || '',
    });
    qc.invalidateQueries({ queryKey: ['adminProgressPosts'] });
  }

  async function setFlagged(id, flagged) {
    await api.patch(`/progress-posts/admin/${id}`, { flagged });
    qc.invalidateQueries({ queryKey: ['adminProgressPosts'] });
  }

  if (isLoading) return <div className="text-center py-20 text-stone-400">Loading…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h2 className="font-bold text-lg">Live Work — Progress Posts</h2>
        <div className="flex gap-2">
          {['all', 'flagged'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs font-semibold px-4 py-1.5 rounded-full transition-colors capitalize ${
                filter === f ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {posts.length === 0 ? (
        <EmptyState icon={<CheckCircle2 className="w-6 h-6 text-green-500" strokeWidth={1.75} />} text="No progress posts to moderate." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {posts.map((p) => (
            <div key={p._id}
                 className={`border rounded-2xl bg-white overflow-hidden ${
                   p.removedByAdmin ? 'border-red-200 bg-red-50/30' :
                   p.flagged        ? 'border-amber-200 bg-amber-50/30' :
                                      'border-stone-200'
                 }`}>
              <div className="grid grid-cols-2 gap-1">
                {p.photos.slice(0, 4).map((url, i) => (
                  <img key={i} src={url} alt="" className="w-full aspect-square object-cover" />
                ))}
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="text-sm font-semibold text-stone-800">
                    {p.posterId?.name || 'Unknown'}
                  </span>
                  <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">
                    {p.posterRole}
                  </span>
                  <span className="text-xs text-stone-400">
                    {p.category} · {p.district}
                  </span>
                  {p.flagged        && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Flagged</span>}
                  {p.removedByAdmin && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Removed</span>}
                </div>
                {p.caption && (
                  <p className="text-sm text-stone-700 mb-3 leading-snug">{p.caption}</p>
                )}
                <p className="text-xs text-stone-400 mb-3">
                  {new Date(p.createdAt).toLocaleString('en-GB')}
                </p>
                <div className="flex gap-2 flex-wrap">
                  {!p.removedByAdmin ? (
                    <button
                      onClick={() => {
                        const reason = prompt('Reason for removal? (shown to poster)');
                        if (reason !== null) setRemoved(p._id, true, reason);
                      }}
                      className="text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1.5 rounded-lg"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      onClick={() => setRemoved(p._id, false, '')}
                      className="text-xs font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-3 py-1.5 rounded-lg"
                    >
                      Restore
                    </button>
                  )}
                  <button
                    onClick={() => setFlagged(p._id, !p.flagged)}
                    className="text-xs font-semibold bg-amber-100 text-amber-700 hover:bg-amber-200 px-3 py-1.5 rounded-lg"
                  >
                    {p.flagged ? 'Clear flag' : 'Flag for review'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const TABS = [
  { id: 'action',        label: 'Action Required' },
  { id: 'flagged',       label: 'Flagged' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'featured',      label: 'Featured' },
  { id: 'moderation',    label: 'Moderation' },
  { id: 'livework',      label: 'Live Work' },
  { id: 'messages',      label: 'Messages' },
  { id: 'analytics',     label: 'Analytics' },
  { id: 'stats',         label: 'Stats' },
  { id: 'lookup',        label: 'Pros' },
  { id: 'businesses',    label: 'Businesses' },
  { id: 'categories',    label: 'Categories' },
  { id: 'consultations', label: 'Consultations' },
  { id: 'liveclasses',   label: 'Live Classes' },
  { id: 'shop',          label: 'Shop' },
  { id: 'payouts',       label: 'Payouts' },
  { id: 'audit',         label: 'Audit Log' },
];

export default function AdminPanel() {
  const [tab, setTab] = useState('action');

  const { data: actionCount } = useQuery({
    queryKey: ['adminActionCount'],
    queryFn: () => api.get('/admin/action-count').then((r) => r.data.data),
    refetchInterval: 30_000,
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-stone-100 rounded-xl p-1 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            {t.label}
            {t.id === 'action' && actionCount?.total > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {actionCount.total}
              </span>
            )}
            {t.id === 'subscriptions' && actionCount?.pendingSubs > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-gradient-to-br from-violet-600 to-pink-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {actionCount.pendingSubs}
              </span>
            )}
            {t.id === 'moderation' && actionCount?.pendingContent > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-purple-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {actionCount.pendingContent}
              </span>
            )}
            {t.id === 'featured' && actionCount?.pendingFeatured > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-gradient-to-br from-violet-600 to-pink-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {actionCount.pendingFeatured}
              </span>
            )}
            {t.id === 'messages' && actionCount?.unreadMessages > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {actionCount.unreadMessages}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'action'        && <ActionRequired />}
      {tab === 'flagged'       && <FlaggedWorkers />}
      {tab === 'subscriptions' && <SubscriptionsManager />}
      {tab === 'featured'      && <FeaturedRequests />}
      {tab === 'moderation'    && <ContentModeration />}
      {tab === 'livework'      && <LiveWorkModeration />}
      {tab === 'messages'      && <ContactMessages />}
      {tab === 'analytics'     && <Analytics />}
      {tab === 'stats'         && <StatsOverview />}
      {tab === 'businesses'    && <BusinessLookup />}
      {tab === 'lookup'        && <WorkerLookup />}
      {tab === 'categories'    && <CategoriesManager />}
      {tab === 'consultations' && <ConsultationsSettings />}
      {tab === 'liveclasses'   && <LiveClassesSettings />}
      {tab === 'shop'          && <ShopSettings />}
      {tab === 'payouts'       && <PayoutsManager />}
      {tab === 'audit'         && <AuditLogViewer />}
    </div>
  );
}

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { User, HardHat, Store, Smartphone } from 'lucide-react';
import api from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import { useCategories } from '../hooks/useCategories';
import SEO from '../components/SEO';

const ROLES = [
  { key: 'client',   Icon: User,    label: 'Client',        desc: 'I need to hire services' },
  { key: 'worker',   Icon: HardHat, label: 'Pro',           desc: 'I offer skilled services' },
  { key: 'business', Icon: Store,   label: 'Business',      desc: 'I run a shop or company' },
];

const BUSINESS_TYPES = [
  { value: 'salon',              label: 'Salon / Spa' },
  { value: 'barbershop',         label: 'Barbershop' },
  { value: 'repair_shop',        label: 'Repair Shop' },
  { value: 'catering',           label: 'Catering' },
  { value: 'photography_studio', label: 'Photography Studio' },
  { value: 'cleaning_company',   label: 'Cleaning Company' },
  { value: 'tutoring_centre',    label: 'Tutoring Centre' },
  { value: 'restaurant',         label: 'Restaurant' },
  { value: 'agency',             label: 'Agency' },
  { value: 'other',              label: 'Other' },
];

// Clients & businesses always need email
const baseSchema = z.object({
  name: z.string().min(2, 'Name required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Min 6 characters'),
  role: z.enum(['client', 'worker', 'business']),
  agreeTerms: z.literal(true, { errorMap: () => ({ message: 'You must accept the Terms & Conditions' }) }),
});

// Workers: email optional, but phone required when email is blank
const workerBaseSchema = z.object({
  name: z.string().min(2, 'Name required'),
  email: z.union([z.string().email('Invalid email'), z.literal('')]).optional(),
  phone: z.string().optional(),
  password: z.string().min(6, 'Min 6 characters'),
  role: z.enum(['client', 'worker', 'business']),
  agreeTerms: z.literal(true, { errorMap: () => ({ message: 'You must accept the Terms & Conditions' }) }),
  category: z.string().min(1, 'Select a category'),
  experienceYears: z.coerce.number().min(0),
  dayRateMin: z.coerce.number().min(0),
  dayRateMax: z.coerce.number().min(0),
}).refine((d) => (d.email && d.email.length > 0) || (d.phone && d.phone.length >= 9), {
  message: 'Provide at least an email or phone number',
  path: ['phone'],
});

const workerSchema = workerBaseSchema;

const businessSchema = baseSchema.extend({
  businessName: z.string().min(2, 'Business name required'),
  businessType: z.string().min(1, 'Select a business type'),
});

export default function Register() {
  const { categories } = useCategories();
  const [role, setRole] = useState('client');
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const schema = role === 'worker' ? workerSchema : role === 'business' ? businessSchema : baseSchema;
  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { role: 'client' },
  });

  const mutation = useMutation({
    mutationFn: (data) => api.post('/auth/register', data),
    onSuccess: ({ data }) => {
      const { user, accessToken, refreshToken } = data.data;
      setAuth(user, accessToken, refreshToken);
      if (user.role === 'worker')   navigate('/dashboard/worker');
      else if (user.role === 'business') navigate('/dashboard/business/onboarding');
      else navigate('/dashboard/client');
    },
  });

  function selectRole(r) {
    setRole(r);
    setValue('role', r);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-stone-50">
      <SEO title="Create Account" noindex />
      <div className="card w-full max-w-lg">
        <h1 className="text-2xl font-bold mb-2">{t('auth.register.title')}</h1>
        <p className="text-stone-500 text-sm mb-6">{t('auth.register.subtitle')}</p>

        {/* Role selector — 3 options */}
        <p className="text-xs font-semibold text-stone-400 uppercase mb-2">{t('auth.register.iAmA')}</p>
        <div className="grid grid-cols-3 gap-3 mb-6">
          {ROLES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => selectRole(r.key)}
              className={`border-2 rounded-xl p-3 text-left transition-all ${
                role === r.key ? 'border-violet-500 bg-violet-50' : 'border-stone-200 bg-white hover:border-stone-300'
              }`}
            >
              <r.Icon className={`w-6 h-6 mb-2 ${role === r.key ? 'text-violet-600' : 'text-stone-500'}`} strokeWidth={1.75} />
              <div className="font-semibold text-sm">{r.label}</div>
              <div className="text-xs text-stone-500 mt-0.5 leading-snug">{r.desc}</div>
            </button>
          ))}
        </div>

        {mutation.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
            {mutation.error.response?.data?.message || t('common.error')}
          </div>
        )}

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <input type="hidden" {...register('role')} />

          {/* Business name — shown for business role */}
          {role === 'business' && (
            <div>
              <label className="label">Business Name</label>
              <input {...register('businessName')} className="input" placeholder="e.g. Lakshmi Beauty Salon" />
              {errors.businessName && <p className="text-red-500 text-xs mt-1">{errors.businessName.message}</p>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{role === 'business' ? 'Owner / Contact Name' : t('auth.register.name')}</label>
              <input {...register('name')} className="input" placeholder="Alex Morgan" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="label">
                {t('auth.register.phone')}
                {role === 'worker' && <span className="text-violet-500 ml-1 text-xs font-normal">(required if no email)</span>}
              </label>
              <input {...register('phone')} className="input" placeholder="0771234567" />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
            </div>
          </div>

          <div>
            <label className="label">
              {t('auth.register.email')}
              {role === 'worker' && <span className="text-stone-400 ml-1 text-xs font-normal">(optional)</span>}
            </label>
            <input {...register('email')} className="input" type="email" placeholder={role === 'worker' ? 'Leave blank if you have no email' : 'you@example.com'} />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            {role === 'worker' && (
              <p className="text-xs text-stone-400 mt-1.5 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                Pros without email can log in using their phone number instead.
              </p>
            )}
          </div>

          <div>
            <label className="label">{t('auth.register.password')}</label>
            <input {...register('password')} className="input" type="password" placeholder={t('auth.register.passwordHint')} />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>

          {/* Worker-specific fields */}
          {role === 'worker' && (
            <>
              <div>
                <label className="label">{t('auth.register.category')}</label>
                <select {...register('category')} className="input">
                  <option value="">{t('auth.register.selectTrade')}</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c.slug}>{c.name}</option>
                  ))}
                </select>
                {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">{t('auth.register.experienceYears')}</label>
                  <input {...register('experienceYears')} className="input" type="number" placeholder="5" />
                </div>
                <div>
                  <label className="label">{t('auth.register.dayRateMin')}</label>
                  <input {...register('dayRateMin')} className="input" type="number" placeholder="2500" />
                </div>
                <div>
                  <label className="label">{t('auth.register.dayRateMax')}</label>
                  <input {...register('dayRateMax')} className="input" type="number" placeholder="5000" />
                </div>
              </div>
            </>
          )}

          {/* Business-specific fields */}
          {role === 'business' && (
            <div>
              <label className="label">Business Type</label>
              <select {...register('businessType')} className="input">
                <option value="">Select type…</option>
                {BUSINESS_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              {errors.businessType && <p className="text-red-500 text-xs mt-1">{errors.businessType.message}</p>}
            </div>
          )}

          {/* Terms consent */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                {...register('agreeTerms')}
                type="checkbox"
                className="mt-0.5 w-4 h-4 accent-violet-600 flex-shrink-0"
              />
              <span className="text-sm text-stone-600 leading-snug">
                {t('auth.register.agreeTerms')}{' '}
                <Link to="/terms" target="_blank" className="text-violet-600 font-medium hover:underline">
                  {t('auth.register.termsLink')}
                </Link>{' '}
                {t('auth.register.and')}{' '}
                <Link to="/privacy" target="_blank" className="text-violet-600 font-medium hover:underline">
                  {t('auth.register.privacyLink')}
                </Link>
              </span>
            </label>
            {errors.agreeTerms && (
              <p className="text-red-500 text-xs mt-1 ml-7">{t('auth.register.mustAgree')}</p>
            )}
          </div>

          <button type="submit" className="btn-primary w-full" disabled={mutation.isPending}>
            {mutation.isPending ? t('auth.register.loading') : t('auth.register.submit')}
          </button>
        </form>

        <p className="text-sm text-stone-500 text-center mt-4">
          {t('auth.register.hasAccount')}{' '}
          <Link to="/login" className="text-violet-600 font-medium hover:underline">
            {t('auth.register.signIn')}
          </Link>
        </p>
      </div>
    </div>
  );
}

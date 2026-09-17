import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import SEO from '../components/SEO';

const schema = z.object({
  // Accept email address OR phone number
  email: z.string().min(1, 'Email or phone required'),
  password: z.string().min(1, 'Password required'),
});

export default function Login() {
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();

  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (data) => api.post('/auth/login', data),
    onSuccess: ({ data }) => {
      const { user, accessToken, refreshToken } = data.data;
      setAuth(user, accessToken, refreshToken);
      // If came from a profile page, go back there after login
      const redirect = searchParams.get('redirect');
      if (redirect) return navigate(redirect);
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'worker') navigate('/dashboard/worker');
      else if (user.role === 'business') navigate('/dashboard/business');
      else navigate('/dashboard/client');
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-stone-50">
      <SEO title="Log In" noindex />
      <div className="card w-full max-w-md">
        <h1 className="text-2xl font-bold mb-1">{t('auth.login.title')}</h1>
        <p className="text-stone-500 text-sm mb-6">{t('auth.login.subtitle')}</p>

        {mutation.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
            {mutation.error.response?.data?.message || t('common.error')}
          </div>
        )}

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Email or Phone Number</label>
            <input
              {...register('email')}
              className="input"
              type="text"
              inputMode="email"
              placeholder="you@example.com or 0771234567"
              autoComplete="username"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">{t('auth.login.password')}</label>
              <Link to="/forgot-password" className="text-xs text-violet-600 hover:underline font-medium">
                Forgot password?
              </Link>
            </div>
            <input {...register('password')} className="input" type="password" placeholder="••••••••" />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>
          <button type="submit" className="btn-primary w-full" disabled={mutation.isPending}>
            {mutation.isPending ? t('auth.login.loading') : t('auth.login.submit')}
          </button>
        </form>

        <p className="text-sm text-stone-500 text-center mt-4">
          {t('auth.login.noAccount')}{' '}
          <Link to="/register" className="text-violet-600 font-medium hover:underline">
            {t('auth.login.register')}
          </Link>
        </p>
      </div>
    </div>
  );
}

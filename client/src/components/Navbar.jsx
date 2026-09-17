import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../lib/axios';
import logo from '../img/logo.png';
import NotificationBell from './NotificationBell';
import { AvatarWithFallback } from './Avatar';
import LanguageSwitcher from './LanguageSwitcher';

const ACCEPTED = 'image/jpeg,image/png,image/webp';

// Thin wrapper so existing usage stays clean
function Avatar({ user, size = 32 }) {
  return <AvatarWithFallback name={user?.name} photo={user?.profilePhoto} size={size} />;
}

export default function Navbar() {
  const { user, clearAuth, updateUser } = useAuthStore();
  const { fetchNotifications } = useNotificationStore();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen]       = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [uploading, setUploading]     = useState(false);
  const [uploadDone, setUploadDone]   = useState(false);
  const menuRef  = useRef(null);
  const mobileNavRef = useRef(null);
  const mobileBtnRef = useRef(null);
  const photoRef = useRef(null);

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadDone(false);
    try {
      const fd = new FormData();
      fd.append('profilePhoto', file);
      const res = await api.put('/users/me', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      updateUser({ profilePhoto: res.data.data.profilePhoto });
      setUploadDone(true);
      setTimeout(() => setUploadDone(false), 3000);
    } catch {
      // silently fail — user can retry
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  // Poll notifications
  useEffect(() => {
    if (!user || user.role === 'admin') return;
    fetchNotifications();
    const id = setInterval(fetchNotifications, 15_000);
    return () => clearInterval(id);
  }, [user]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      if (
        mobileNavRef.current &&
        !mobileNavRef.current.contains(e.target) &&
        !mobileBtnRef.current?.contains(e.target)
      ) {
        setMobileNavOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const { data: actionCount } = useQuery({
    queryKey: ['adminActionCount'],
    queryFn: () => api.get('/admin/action-count').then((r) => r.data.data),
    enabled: user?.role === 'admin',
    refetchInterval: 30_000,
  });

  function logout() {
    clearAuth();
    setMenuOpen(false);
    navigate('/');
  }

  function dashboardLink() {
    if (!user) return '/login';
    if (user.role === 'admin')    return '/admin';
    if (user.role === 'worker')   return '/dashboard/worker';
    if (user.role === 'business') return '/dashboard/business';
    return '/dashboard/client';
  }

  const roleBadge = {
    admin:    { label: 'Admin',    cls: 'bg-red-100 text-red-700' },
    worker:   { label: 'Pro',      cls: 'bg-violet-100 text-violet-700' },
    business: { label: 'Business', cls: 'bg-amber-100 text-amber-700' },
    client:   { label: 'Client',   cls: 'bg-green-100 text-green-700' },
  }[user?.role] || {};

  return (
    <nav className="bg-white border-b border-stone-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

        {/* ── Logo ─────────────────────────────────────────────────────── */}
        <Link to="/" className="shrink-0">
          <img src={logo} alt="SkillHub" className="h-8 w-auto" />
        </Link>

        {/* ── Public nav links (hidden when logged in as admin) ─────────── */}
        {user?.role !== 'admin' && (
          <div className="hidden sm:flex items-center gap-5">
            <Link to="/services"      className="text-sm text-stone-600 hover:text-violet-600 font-medium transition-colors">Browse</Link>
            <Link to="/professionals" className="text-sm text-stone-600 hover:text-violet-600 font-medium transition-colors">{t('nav.findWorkers')}</Link>
            <Link to="/live-classes"  className="text-sm text-stone-600 hover:text-violet-600 font-medium transition-colors flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
              Live Classes
            </Link>
            <Link to="/shop" className="text-sm text-stone-600 hover:text-fuchsia-600 font-medium transition-colors flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500"></span>
              Shop
            </Link>
            <Link to="/businesses"    className="text-sm text-stone-600 hover:text-violet-600 font-medium transition-colors">{t('nav.findBusinesses')}</Link>
          </div>
        )}

        {/* ── Right side ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 ml-auto">

          {/* Language switcher — desktop only (mobile gets it inside the menu) */}
          <div className="hidden sm:block">
            <LanguageSwitcher compact />
          </div>

          {/* Hamburger — mobile only, hidden for admin */}
          {user?.role !== 'admin' && (
            <button
              ref={mobileBtnRef}
              type="button"
              onClick={() => setMobileNavOpen((o) => !o)}
              className="sm:hidden p-2 -mr-1 rounded-md text-stone-600 hover:bg-stone-100 transition-colors"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileNavOpen}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {mobileNavOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          )}

          {user ? (
            <>
              {/* Notification bell — workers & clients only */}
              {user.role !== 'admin' && <NotificationBell />}

              {/* User pill + dropdown */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-stone-200
                             hover:border-violet-300 hover:shadow-sm transition-all bg-white"
                >
                  <Avatar user={user} size={30} />
                  <span className="hidden sm:block text-sm font-medium text-stone-700 max-w-[120px] truncate">
                    {user.name?.split(' ')[0]}
                  </span>
                  {/* Admin action badge */}
                  {user.role === 'admin' && actionCount?.total > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-bold px-1">
                      {actionCount.total > 9 ? '9+' : actionCount.total}
                    </span>
                  )}
                  <svg className={`w-3.5 h-3.5 text-stone-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
                       fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown */}
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-stone-100 py-2 z-50">
                    {/* User info header — click avatar to upload photo */}
                    <div className="px-4 py-3 border-b border-stone-100">
                      <div className="flex items-center gap-2.5">

                        {/* Clickable avatar */}
                        <button
                          type="button"
                          onClick={() => photoRef.current?.click()}
                          className="relative group shrink-0 rounded-full focus:outline-none"
                          title="Click to change profile photo"
                          disabled={uploading}
                        >
                          <Avatar user={user} size={40} />
                          {/* Camera overlay */}
                          <span className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center
                                           opacity-0 group-hover:opacity-100 transition-opacity">
                            {uploading ? (
                              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round"
                                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            )}
                          </span>
                          {/* Done tick */}
                          {uploadDone && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center border-2 border-white text-white">
                              <Check className="w-2.5 h-2.5" strokeWidth={3} />
                            </span>
                          )}
                        </button>

                        <input
                          ref={photoRef}
                          type="file"
                          accept={ACCEPTED}
                          className="hidden"
                          onChange={handlePhotoChange}
                        />

                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-stone-800 truncate">{user.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleBadge.cls}`}>
                              {roleBadge.label}
                            </span>
                            {uploadDone && <span className="text-xs text-green-600 font-medium flex items-center gap-0.5"><Check className="w-3 h-3" strokeWidth={2.5} />Updated</span>}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Menu items */}
                    <div className="py-1">
                      <Link
                        to={dashboardLink()}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-stone-700 hover:bg-violet-50 hover:text-violet-700 transition-colors"
                      >
                        {user.role === 'admin' ? t('nav.adminPanel') : t('nav.dashboard')}
                        {user.role === 'admin' && actionCount?.total > 0 && (
                          <span className="ml-auto bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-bold px-1">
                            {actionCount.total > 9 ? '9+' : actionCount.total}
                          </span>
                        )}
                      </Link>

                      {user.role === 'worker' && (
                        <Link
                          to="/dashboard/worker/profile"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-stone-700 hover:bg-violet-50 hover:text-violet-700 transition-colors"
                        >
                          Edit Profile
                        </Link>
                      )}
                      {user.role === 'business' && (
                        <Link
                          to="/dashboard/business"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-stone-700 hover:bg-violet-50 hover:text-violet-700 transition-colors"
                        >
                          My Storefront
                        </Link>
                      )}

                      <div className="border-t border-stone-100 mt-1 pt-1">
                        <button
                          onClick={logout}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          {t('nav.logout')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="hidden sm:flex items-center gap-3">
              <Link to="/login"    className="text-sm text-stone-600 hover:text-violet-600 font-medium transition-colors">
                {t('nav.login')}
              </Link>
              <Link to="/register" className="btn-primary text-sm py-2 px-4">
                {t('nav.signUp')}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile nav panel — toggled by hamburger ───────────────────── */}
      {mobileNavOpen && user?.role !== 'admin' && (
        <div ref={mobileNavRef} className="sm:hidden border-t border-stone-200 bg-white shadow-lg">
          <Link to="/services" onClick={() => setMobileNavOpen(false)}
                className="block px-5 py-3 text-sm font-medium text-stone-700 hover:bg-violet-50 hover:text-violet-700 transition-colors">
            Browse
          </Link>
          <Link to="/professionals" onClick={() => setMobileNavOpen(false)}
                className="block px-5 py-3 text-sm font-medium text-stone-700 hover:bg-violet-50 hover:text-violet-700 transition-colors border-t border-stone-100">
            {t('nav.findWorkers')}
          </Link>
          <Link to="/live-classes" onClick={() => setMobileNavOpen(false)}
                className="block px-5 py-3 text-sm font-medium text-stone-700 hover:bg-violet-50 hover:text-violet-700 transition-colors border-t border-stone-100">
            🎓 Live Classes
          </Link>
          <Link to="/shop" onClick={() => setMobileNavOpen(false)}
                className="block px-5 py-3 text-sm font-medium text-stone-700 hover:bg-fuchsia-50 hover:text-fuchsia-700 transition-colors border-t border-stone-100">
            🎨 Shop
          </Link>
          <Link to="/businesses" onClick={() => setMobileNavOpen(false)}
                className="block px-5 py-3 text-sm font-medium text-stone-700 hover:bg-violet-50 hover:text-violet-700 transition-colors border-t border-stone-100">
            {t('nav.findBusinesses')}
          </Link>

          {/* Language switcher — mobile menu */}
          <div className="px-5 py-3 border-t border-stone-100 flex items-center justify-between">
            <span className="text-sm font-medium text-stone-700">Language</span>
            <LanguageSwitcher compact />
          </div>

          {!user && (
            <div className="border-t border-stone-200 px-5 py-3 flex items-center gap-3">
              <Link to="/login" onClick={() => setMobileNavOpen(false)}
                    className="flex-1 text-center text-sm font-semibold text-stone-700 border border-stone-300 rounded-lg py-2 hover:bg-stone-50 transition-colors">
                {t('nav.login')}
              </Link>
              <Link to="/register" onClick={() => setMobileNavOpen(false)}
                    className="flex-1 text-center btn-primary text-sm py-2 px-4">
                {t('nav.signUp')}
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * Shared wrapper for all dashboard sub-pages.
 * Provides: gradient background, consistent back button, max-width container.
 *
 * Usage:
 *   <DashSubPageWrapper title="Profile Settings" subtitle="Manage your public info" backTo="/dashboard/worker">
 *     ...page content...
 *   </DashSubPageWrapper>
 *
 * Props:
 *   title      – page heading (string)
 *   subtitle   – optional subheading (string)
 *   icon       – optional Lucide icon node shown left of title
 *   backTo     – fallback route if browser history is empty (default "/dashboard/worker")
 *   children   – page content
 *   maxWidth   – tailwind max-w class (default "max-w-4xl")
 */
export default function DashSubPageWrapper({
  title,
  subtitle,
  icon,
  backTo = '/dashboard/worker',
  children,
  maxWidth = 'max-w-4xl',
}) {
  const navigate = useNavigate();

  function goBack() {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(backTo);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50/40 to-pink-50/20">
      <div className={`${maxWidth} mx-auto px-4 py-10`}>

        {/* Back button */}
        <button
          onClick={goBack}
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-violet-700 transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" strokeWidth={2} />
          Back
        </button>

        {/* Page header */}
        {(title || icon) && (
          <header className="flex items-center gap-3 mb-8">
            {icon && (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-pink-500 flex items-center justify-center shadow-sm shrink-0">
                {icon}
              </div>
            )}
            <div>
              {title && <h1 className="text-2xl font-black text-stone-900">{title}</h1>}
              {subtitle && <p className="text-sm text-stone-500 mt-0.5">{subtitle}</p>}
            </div>
          </header>
        )}

        {children}
      </div>
    </div>
  );
}

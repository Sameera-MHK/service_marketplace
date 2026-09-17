import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2, Banknote, Flag, AlertTriangle, XCircle, Image } from 'lucide-react';
import { useNotificationStore } from '../store/notificationStore';
import { useAuthStore } from '../store/authStore';

/* Map notification type → { Icon, bg, fg, label, route } */
const TYPE_META = {
  new_lead:         { Icon: Bell,          bg: 'bg-violet-100',  fg: 'text-violet-600',  label: 'New lead',         route: () => '/dashboard/worker' },
  job_accepted:     { Icon: CheckCircle2,  bg: 'bg-green-100',   fg: 'text-green-600',   label: 'Job accepted',     route: () => '/dashboard/client' },
  deposit_received: { Icon: Banknote,      bg: 'bg-emerald-100', fg: 'text-emerald-600', label: 'Deposit received', route: () => '/dashboard/worker' },
  job_completed:    { Icon: Flag,          bg: 'bg-blue-100',    fg: 'text-blue-600',    label: 'Job completed',    route: () => '/dashboard/client' },
  dispute_opened:   { Icon: AlertTriangle, bg: 'bg-amber-100',   fg: 'text-amber-600',   label: 'Dispute opened',   route: (role) => role === 'worker' ? '/dashboard/worker' : '/dashboard/client' },
  bio_approved:     { Icon: CheckCircle2,  bg: 'bg-green-100',   fg: 'text-green-600',   label: 'Bio approved',     route: () => '/dashboard/worker/profile' },
  bio_rejected:     { Icon: XCircle,       bg: 'bg-red-100',     fg: 'text-red-600',     label: 'Bio rejected',     route: () => '/dashboard/worker/profile' },
  photo_approved:   { Icon: Image,         bg: 'bg-indigo-100',  fg: 'text-indigo-600',  label: 'Photo approved',   route: () => '/dashboard/worker/profile' },
  photo_rejected:   { Icon: Image,         bg: 'bg-red-100',     fg: 'text-red-600',     label: 'Photo rejected',   route: () => '/dashboard/worker/profile' },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { notifications, unreadCount, markRead, markAllRead } = useNotificationStore();

  /* Close on outside click */
  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleNotifClick(n) {
    if (!n.read) markRead(n._id);
    const meta = TYPE_META[n.type];
    const route = meta ? meta.route(user?.role) : (user?.role === 'worker' ? '/dashboard/worker' : '/dashboard/client');
    setOpen(false);
    navigate(route);
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg text-stone-500 hover:text-violet-600 hover:bg-stone-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5 leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-stone-200 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
            <h3 className="font-semibold text-sm text-stone-800">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-violet-600 hover:underline font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <ul className="max-h-80 overflow-y-auto divide-y divide-stone-50">
            {notifications.length === 0 ? (
              <li className="py-10 text-center text-stone-400 text-sm">
                <Bell size={28} className="mx-auto mb-2 opacity-30" />
                No notifications yet
              </li>
            ) : (
              notifications.map((n) => {
                const meta = TYPE_META[n.type] || { Icon: Bell, bg: 'bg-stone-100', fg: 'text-stone-500' };
                return (
                  <li key={n._id}>
                    <button
                      onClick={() => handleNotifClick(n)}
                      className={`w-full text-left px-4 py-3 flex gap-3 items-start hover:bg-stone-50 transition-colors ${
                        !n.read ? 'bg-violet-50/50' : ''
                      }`}
                    >
                      {/* Icon */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${meta.bg}`}>
                        <meta.Icon className={`w-4 h-4 ${meta.fg}`} strokeWidth={1.75} />
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-snug ${!n.read ? 'font-medium text-stone-800' : 'text-stone-600'}`}>
                          {n.message}
                        </p>
                        <p className="text-xs text-stone-400 mt-0.5">{timeAgo(n.createdAt)}</p>
                      </div>

                      {/* Unread dot */}
                      {!n.read && (
                        <span className="flex-shrink-0 w-2 h-2 rounded-full bg-violet-600 mt-1.5" />
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-stone-100 px-4 py-2 text-center">
              <button
                onClick={() => {
                  setOpen(false);
                  navigate(user?.role === 'worker' ? '/dashboard/worker' : '/dashboard/client');
                }}
                className="text-xs text-stone-500 hover:text-violet-600"
              >
                View dashboard →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { useApp } from './context.jsx';

const timeAgo = (value) => {
  // created_at vient de SQLite en UTC sans fuseau
  const diff = (Date.now() - new Date(`${value.replace(' ', 'T')}Z`)) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
};

export default function NotificationBell() {
  const { notifications, markNotificationsRead } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const unread = notifications.filter((n) => !n.is_read).length;

  // Fermeture au clic en dehors
  useEffect(() => {
    if (!open) return;
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const toggle = () => {
    // Ouvrir le panneau marque tout comme lu ; les pastilles restent visibles jusqu'à la fermeture
    if (!open && unread > 0) setTimeout(markNotificationsRead, 1500);
    setOpen((o) => !o);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        aria-label={`Notifications${unread ? ` (${unread} non lues)` : ''}`}
        className="relative p-2 rounded-full text-gray-600 hover:text-purple-600 hover:bg-purple-50 transition"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-gray-100 font-semibold text-gray-900">Notifications</div>
          {notifications.length === 0 ? (
            <div className="px-4 py-10 text-center text-gray-400 text-sm">
              <BellOff className="w-8 h-8 mx-auto mb-2" />
              Aucune notification
            </div>
          ) : (
            <ul className="max-h-96 overflow-y-auto divide-y divide-gray-100">
              {notifications.map((n) => (
                <li key={n.id} className={`px-4 py-3 ${n.is_read ? '' : 'bg-purple-50/60'}`}>
                  <div className="flex items-start gap-2">
                    {!n.is_read && <span className="mt-1.5 w-2 h-2 rounded-full bg-purple-600 shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                      <p className="text-sm text-gray-600 mt-0.5">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

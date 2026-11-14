import React, { useCallback, useEffect, useState } from 'react';
import { Bus, Car, Calendar, Users, Trash2, ArrowRight, QrCode, X, CheckCircle2, Loader2 } from 'lucide-react';
import { useApp } from './context.jsx';

const formatServiceDate = (iso) =>
  new Date(`${iso}T12:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const Section = ({ icon: Icon, title, count, children }) => (
  <section className="space-y-3">
    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
      <span className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
        <Icon className="w-4 h-4" />
      </span>
      {title}
      {count > 0 && <span className="text-purple-600">({count})</span>}
    </h2>
    {children}
  </section>
);

// validated_at est un horodatage UTC « AAAA-MM-JJ HH:MM:SS »
const formatTime = (ts) =>
  new Date(`${ts.replace(' ', 'T')}Z`).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

// Billet à présenter au chauffeur : même QR code que dans l'email de confirmation
function TicketModal({ booking, token, onClose }) {
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/bus-bookings/${booking.id}/ticket`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setTicket)
      .catch(() => setError('Impossible de charger le billet'));
  }, [booking.id, token]);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-end -mt-2 -mr-2">
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100" title="Fermer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-lg font-bold text-gray-900">Ligne « {booking.line_name} »</p>
        <p className="text-sm text-gray-500 mt-1">
          {formatServiceDate(booking.service_date)} · {booking.seats} place{booking.seats > 1 ? 's' : ''}
        </p>
        <div className="my-5 flex justify-center">
          {error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : ticket ? (
            <img src={ticket.qr} alt="QR code du billet" className={`w-64 h-64 ${ticket.validated_at ? 'opacity-30' : ''}`} />
          ) : (
            <div className="w-64 h-64 flex items-center justify-center"><Loader2 className="w-8 h-8 text-purple-600 animate-spin" /></div>
          )}
        </div>
        {ticket?.validated_at ? (
          <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-green-700">
            <CheckCircle2 className="w-4 h-4" /> Validé à la montée à {formatTime(ticket.validated_at)}
          </p>
        ) : (
          <p className="text-sm text-gray-600">Présentez ce QR code au chauffeur lors de la montée dans le bus.</p>
        )}
      </div>
    </div>
  );
}

const Empty = ({ children }) => (
  <p className="p-6 rounded-2xl border-2 border-dashed border-gray-200 text-center text-gray-500">{children}</p>
);

export default function MyBookingsPage() {
  const { token, isAuthenticated, setCurrentPage } = useApp();
  const [bookings, setBookings] = useState([]);
  const [busBookings, setBusBookings] = useState([]);
  const [ticketFor, setTicketFor] = useState(null);

  const load = useCallback(async () => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [carRes, busRes] = await Promise.all([
        fetch('/api/bookings', { headers }),
        fetch('/api/bus-bookings', { headers }),
      ]);
      if (carRes.ok) setBookings(await carRes.json());
      if (busRes.ok) setBusBookings(await busRes.json());
    } catch {
      /* ignore */
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const cancelBus = async (b) => {
    if (!confirm(`Annuler votre réservation sur la ligne « ${b.line_name} » ?`)) return;
    const res = await fetch(`/api/bus-bookings/${b.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setBusBookings((list) => list.filter((x) => x.id !== b.id));
    else alert((await res.json().catch(() => ({}))).error || 'Annulation impossible');
  };

  if (!isAuthenticated) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Connectez-vous pour voir vos réservations</h1>
        <button onClick={() => setCurrentPage('login')} className="text-purple-600 font-semibold">Se connecter</button>
      </div>
    );
  }

  const today = todayISO();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        <h1 className="text-3xl font-bold text-gray-900">Mes réservations</h1>

        <Section icon={Bus} title="Bus pour l'Église" count={busBookings.length}>
          {busBookings.length === 0 ? (
            <Empty>
              Aucune réservation de bus.{' '}
              <button onClick={() => setCurrentPage('home')} className="inline-flex items-center gap-1 font-semibold text-purple-600">
                Réserver <ArrowRight className="w-4 h-4" />
              </button>
            </Empty>
          ) : (
            <ul className="space-y-3">
              {busBookings.map((b) => {
                const past = b.service_date < today;
                return (
                  <li key={b.id} className={`flex items-center justify-between gap-4 p-4 rounded-2xl bg-white border ${past ? 'border-gray-100 opacity-60' : 'border-purple-100'}`}>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">Ligne « {b.line_name} »</p>
                      <p className="text-sm text-gray-500 flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                        <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {formatServiceDate(b.service_date)}</span>
                        <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {b.seats} place{b.seats > 1 ? 's' : ''}</span>
                        {b.validated_at && (
                          <span className="flex items-center gap-1.5 text-green-700 font-medium">
                            <CheckCircle2 className="w-4 h-4" /> Monté à {formatTime(b.validated_at)}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-1">
                      {!past && (
                        <button
                          onClick={() => setTicketFor(b)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 transition"
                        >
                          <QrCode className="w-4 h-4" /> Billet
                        </button>
                      )}
                      {past ? (
                        <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">Passé</span>
                      ) : !b.validated_at && (
                        <button
                          onClick={() => cancelBus(b)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition"
                        >
                          <Trash2 className="w-4 h-4" /> Annuler
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <Section icon={Car} title="Covoiturage" count={bookings.length}>
          {bookings.length === 0 ? (
            <Empty>Aucune réservation de covoiturage.</Empty>
          ) : (
            <ul className="space-y-3">
              {bookings.map((b) => (
                <li key={b.id} className="p-4 rounded-2xl bg-white border border-purple-100">
                  <p className="font-semibold text-gray-900">
                    {b.departure} → {b.arrival} le {b.travel_date} à {b.travel_time}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {b.seats} place(s) • {b.status} • Gratuit
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
      {ticketFor && <TicketModal booking={ticketFor} token={token} onClose={() => { setTicketFor(null); load(); }} />}
    </div>
  );
}

import React, { useCallback, useEffect, useState } from 'react';
import { Bus, Car, Calendar, Users, Trash2, ArrowRight } from 'lucide-react';
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

const Empty = ({ children }) => (
  <p className="p-6 rounded-2xl border-2 border-dashed border-gray-200 text-center text-gray-500">{children}</p>
);

export default function MyBookingsPage() {
  const { token, isAuthenticated, setCurrentPage } = useApp();
  const [bookings, setBookings] = useState([]);
  const [busBookings, setBusBookings] = useState([]);

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
                      </p>
                    </div>
                    {past ? (
                      <span className="shrink-0 px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">Passé</span>
                    ) : (
                      <button
                        onClick={() => cancelBus(b)}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition"
                      >
                        <Trash2 className="w-4 h-4" /> Annuler
                      </button>
                    )}
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
    </div>
  );
}

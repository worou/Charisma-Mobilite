import React, { useCallback, useEffect, useState } from 'react';
import { Bus, Calendar, Users, Church, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { useApp } from './context.jsx';

const pad = (n) => String(n).padStart(2, '0');
const toISODate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Date proposée par défaut : le prochain dimanche (aujourd'hui si on est dimanche)
const nextSunday = () => {
  const d = new Date();
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
  return toISODate(d);
};

const formatDate = (iso) =>
  new Date(`${iso}T12:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

const inputClass =
  'w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-gray-100 bg-gray-50 text-gray-900 ' +
  'focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-100 transition';

const Label = ({ htmlFor, children }) => (
  <label htmlFor={htmlFor} className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 ml-1">
    {children}
  </label>
);

export default function BusBookingForm() {
  const { token, isAuthenticated, setCurrentPage, refreshNotifications } = useApp();
  const [date, setDate] = useState(nextSunday);
  const [lines, setLines] = useState(null);
  const [lineId, setLineId] = useState('');
  const [seats, setSeats] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { type: 'success' | 'error', message }

  const loadLines = useCallback(async () => {
    try {
      const res = await fetch(`/api/bus-lines?date=${date}`);
      setLines(res.ok ? await res.json() : []);
    } catch {
      setLines([]);
    }
  }, [date]);

  useEffect(() => { loadLines(); }, [loadLines]);

  const selected = lines?.find((l) => String(l.id) === String(lineId));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResult(null);
    if (!isAuthenticated) {
      setCurrentPage('login');
      return;
    }
    if (!lineId) {
      setResult({ type: 'error', message: 'Choisissez une ligne de bus' });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/bus-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ line_id: Number(lineId), date, seats }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setResult({
          type: 'success',
          message: `${seats} place${seats > 1 ? 's' : ''} réservée${seats > 1 ? 's' : ''} sur la ligne « ${data.booking.line_name} » pour le ${formatDate(date)}.`,
        });
      } else {
        setResult({ type: 'error', message: data.error || 'Réservation impossible' });
        // Le serveur a créé une notification « plus de places » : on met la cloche à jour
        if (res.status === 409) refreshNotifications();
      }
      loadLines();
    } catch {
      setResult({ type: 'error', message: 'Impossible de contacter le serveur' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (lines && lines.length === 0) {
    return (
      <div className="text-center py-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-purple-50 flex items-center justify-center">
          <Bus className="w-8 h-8 text-purple-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Aucune ligne de bus pour le moment</h3>
        <p className="text-gray-600">Les lignes vers l'Église seront bientôt ouvertes par l'administration.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <p className="flex items-center gap-2 text-sm text-gray-600 mb-4 ml-1">
        <Church className="w-4 h-4 text-purple-600" />
        Réservez votre place dans le bus pour vous rendre à l'Église.
      </p>

      <div className="grid gap-3 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-3">
          <Label htmlFor="bus-date">Date du culte</Label>
          <div className="relative">
            <Calendar className="w-5 h-5 text-purple-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="bus-date"
              type="date"
              min={toISODate(new Date())}
              value={date}
              onChange={(e) => { setDate(e.target.value); setResult(null); }}
              className={`${inputClass} pr-2`}
              required
            />
          </div>
        </div>

        <div className="lg:col-span-4">
          <Label htmlFor="bus-line">Ligne</Label>
          <div className="relative">
            <Bus className="w-5 h-5 text-purple-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              id="bus-line"
              value={lineId}
              onChange={(e) => { setLineId(e.target.value); setResult(null); }}
              className={`${inputClass} appearance-none cursor-pointer`}
              disabled={!lines}
            >
              <option value="">{lines ? 'Choisir une ligne' : 'Chargement…'}</option>
              {lines?.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} — {l.available > 0 ? `${l.available} place${l.available > 1 ? 's' : ''} libre${l.available > 1 ? 's' : ''}` : 'complet'}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="lg:col-span-2">
          <Label htmlFor="bus-seats">Places</Label>
          <div className="relative">
            <Users className="w-5 h-5 text-purple-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              id="bus-seats"
              value={seats}
              onChange={(e) => { setSeats(parseInt(e.target.value)); setResult(null); }}
              className={`${inputClass} appearance-none cursor-pointer`}
            >
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="lg:col-span-3 flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-purple-300/50 hover:-translate-y-0.5 transition disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bus className="w-5 h-5" />}
          {isAuthenticated ? 'Réserver' : 'Se connecter pour réserver'}
        </button>
      </div>

      {selected && (
        <div className="mt-4 ml-1">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
            <span>Remplissage de « {selected.name} » le {formatDate(date)}</span>
            <span className="font-semibold">{selected.reserved}/{selected.seats}</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${selected.available === 0 ? 'bg-red-500' : selected.available <= 3 ? 'bg-amber-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`}
              style={{ width: `${Math.min(100, (selected.reserved / selected.seats) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {result && (
        <div
          role={result.type === 'error' ? 'alert' : 'status'}
          className={`mt-4 flex items-start gap-3 p-4 rounded-xl border ${
            result.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {result.type === 'success' ? <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" /> : <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />}
          <div className="text-sm">
            <p className="font-medium">{result.message}</p>
            {result.type === 'success' && (
              <button
                type="button"
                onClick={() => setCurrentPage('my-bookings')}
                className="mt-1 inline-flex items-center gap-1 font-semibold text-green-700 hover:text-green-900"
              >
                Voir mes réservations <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </form>
  );
}

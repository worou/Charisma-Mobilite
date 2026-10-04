import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowRight, ArrowUpDown, MapPin, Navigation, Calendar, Users, FileText,
  CheckCircle2, AlertCircle, Loader2, Car, Clock, Send,
} from 'lucide-react';
import { useApp } from './context.jsx';

const EMPTY_FORM = { departure: '', destination: '', date: '', hour: '', minute: '00', seats: 1, description: '' };
const MAX_SEATS = 8;

// Heure choisie dans des listes 00–23 : l'input datetime-local suivrait la langue du navigateur (AM/PM)
const pad = (n) => String(n).padStart(2, '0');
const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
const MINUTES = Array.from({ length: 12 }, (_, i) => pad(i * 5));

// Date du jour au format AAAA-MM-JJ, en heure locale
const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const toDatetime = ({ date, hour, minute }) => (date && hour !== '' ? `${date}T${hour}:${minute}` : '');

const formatDate = (value) =>
  new Date(value).toLocaleString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });


const inputClass =
  'w-full pl-11 pr-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 ' +
  'focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-100 transition';

const Field = ({ label, icon: Icon, children, hint }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
    <div className="relative">
      <Icon className="w-5 h-5 text-gray-400 absolute left-4 top-3.5 pointer-events-none" />
      {children}
    </div>
    {hint && <p className="text-xs text-gray-400 mt-1.5">{hint}</p>}
  </div>
);

function MyTrips({ trips, isLoading }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }
  if (trips.length === 0) {
    return (
      <div className="text-center py-10 px-6 rounded-2xl border-2 border-dashed border-gray-200">
        <Car className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Vous n'avez encore publié aucun trajet.</p>
      </div>
    );
  }
  const now = new Date();
  return (
    <ul className="space-y-3">
      {trips.map((trip) => {
        const past = new Date(trip.datetime) < now;
        return (
          <li
            key={trip.id}
            className={`p-4 rounded-2xl border bg-white transition hover:shadow-md ${past ? 'opacity-60 border-gray-100' : 'border-purple-100'}`}
          >
            <p className="font-semibold text-gray-900 truncate">
              {trip.departure} <ArrowRight className="inline w-4 h-4 text-purple-500 mx-1" /> {trip.destination}
            </p>
            <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-1">
              <Clock className="w-4 h-4" /> {formatDate(trip.datetime)}
            </p>
            <div className="flex items-center gap-2 mt-3 text-xs font-medium">
              {past ? (
                <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">Terminé</span>
              ) : trip.seats === 0 ? (
                <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">Complet</span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                  {trip.seats} place{trip.seats > 1 ? 's' : ''} libre{trip.seats > 1 ? 's' : ''}
                </span>
              )}
              {trip.booked_seats > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-700">
                  {trip.booked_seats} réservée{trip.booked_seats > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function PublishTripPage() {
  const { setCurrentPage, token, isAuthenticated, logout } = useApp();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [myTrips, setMyTrips] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(true);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleAuthError = useCallback(() => {
    logout();
    setCurrentPage('login');
  }, [logout, setCurrentPage]);

  const loadMyTrips = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/announcements/mine', { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401 || res.status === 403) return handleAuthError();
      if (res.ok) setMyTrips(await res.json());
    } finally {
      setTripsLoading(false);
    }
  }, [token, handleAuthError]);

  useEffect(() => {
    if (isAuthenticated) loadMyTrips();
  }, [isAuthenticated, loadMyTrips]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const { departure, destination, seats, description } = form;
    const datetime = toDatetime(form);
    if (!departure.trim() || !destination.trim() || !datetime) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }
    if (new Date(datetime) <= new Date()) {
      setError('La date de départ doit être dans le futur');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ departure, destination, datetime, seats, description }),
      });
      if (res.status === 401 || res.status === 403) return handleAuthError();
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error);
      }
      setSuccess(true);
      setForm(EMPTY_FORM);
      loadMyTrips();
    } catch (err) {
      setError(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white rounded-2xl shadow-xl shadow-purple-100 p-10 text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center mx-auto mb-6">
            <Car className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Connectez-vous pour publier un trajet</h1>
          <p className="text-gray-500 mb-6">Partagez vos places libres et voyagez à plusieurs.</p>
          <button
            onClick={() => setCurrentPage('login')}
            className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition"
          >
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  const hasRoute = form.departure.trim() && form.destination.trim();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* En-tête */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-purple-800 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24">
          <button
            onClick={() => setCurrentPage('home')}
            className="flex items-center text-purple-100 hover:text-white mb-6 transition"
          >
            <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
            Retour à l'accueil
          </button>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Publier un trajet</h1>
          <p className="text-purple-100 text-lg">Proposez vos places libres en quelques secondes.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 pb-16 grid gap-8 lg:grid-cols-5">
        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="lg:col-span-3 bg-white rounded-2xl shadow-xl shadow-purple-100/50 p-6 sm:p-8 space-y-6">
          {success && (
            <div role="status" className="flex items-start gap-3 p-4 rounded-xl bg-green-50 border border-green-200 text-green-800">
              <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Trajet publié !</p>
                <p className="text-sm">Il est maintenant visible dans les résultats de recherche.</p>
              </div>
            </div>
          )}
          {error && (
            <div role="alert" className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
              <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          {/* Itinéraire */}
          <div className="relative space-y-4">
            <Field label="Ville de départ" icon={MapPin}>
              <input
                type="text"
                placeholder="Ex. Paris"
                value={form.departure}
                onChange={update('departure')}
                className={inputClass}
                required
              />
            </Field>
            <button
              type="button"
              onClick={() => setForm({ ...form, departure: form.destination, destination: form.departure })}
              aria-label="Inverser départ et destination"
              title="Inverser"
              className="absolute right-4 top-[70px] z-10 w-9 h-9 rounded-full bg-white border-2 border-gray-200 text-purple-600 flex items-center justify-center hover:border-purple-500 hover:rotate-180 transition-all duration-300"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
            <Field label="Destination" icon={Navigation}>
              <input
                type="text"
                placeholder="Ex. Lyon"
                value={form.destination}
                onChange={update('destination')}
                className={inputClass}
                required
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-5">
            <div className="sm:col-span-3">
              <Field label="Date de départ" icon={Calendar}>
                <input
                  type="date"
                  min={todayLocal()}
                  value={form.date}
                  onChange={update('date')}
                  className={inputClass}
                  required
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Heure</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Clock className="w-5 h-5 text-gray-400 absolute left-4 top-3.5 pointer-events-none" />
                  <select
                    aria-label="Heure"
                    value={form.hour}
                    onChange={update('hour')}
                    className={`${inputClass} appearance-none cursor-pointer`}
                    required
                  >
                    <option value="" disabled>--</option>
                    {HOURS.map((h) => <option key={h} value={h}>{h} h</option>)}
                  </select>
                </div>
                <span className="font-bold text-gray-400">:</span>
                <select
                  aria-label="Minutes"
                  value={form.minute}
                  onChange={update('minute')}
                  className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-900 focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-100 transition appearance-none cursor-pointer"
                >
                  {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Places */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <Users className="w-4 h-4 text-gray-400" /> Places disponibles
            </label>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: MAX_SEATS }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setForm({ ...form, seats: n })}
                  aria-pressed={form.seats === n}
                  className={`w-11 h-11 rounded-xl font-semibold border-2 transition ${
                    form.seats === n
                      ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white border-transparent shadow-md shadow-purple-200'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-purple-400'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <Field label="Description (facultatif)" icon={FileText}>
            <textarea
              rows={3}
              maxLength={500}
              placeholder="Point de rendez-vous, bagages acceptés, pauses prévues…"
              value={form.description}
              onChange={update('description')}
              className={`${inputClass} resize-none`}
            />
          </Field>

          <button
            type="submit"
            disabled={isSubmitting}
            className="group w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-purple-200 hover:-translate-y-0.5 active:translate-y-0 transition disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {isSubmitting ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Publication en cours...</>
            ) : (
              <><Send className="w-5 h-5 transition-transform group-hover:translate-x-1" /> Publier le trajet</>
            )}
          </button>
        </form>

        {/* Aperçu + mes trajets */}
        <aside className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-2xl shadow-xl shadow-purple-100/50 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Aperçu de l'annonce</p>
            <div className="flex gap-4">
              <div className="flex flex-col items-center pt-1.5">
                <span className="w-3 h-3 rounded-full border-2 border-purple-600" />
                <span className="w-0.5 flex-1 bg-purple-200 my-1" />
                <span className="w-3 h-3 rounded-full bg-purple-600" />
              </div>
              <div className="flex-1 space-y-6 min-w-0">
                <p className={`font-semibold truncate ${form.departure ? 'text-gray-900' : 'text-gray-300'}`}>
                  {form.departure || 'Départ'}
                </p>
                <p className={`font-semibold truncate ${form.destination ? 'text-gray-900' : 'text-gray-300'}`}>
                  {form.destination || 'Destination'}
                </p>
              </div>
            </div>
            <div className="mt-5 pt-5 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-1.5 text-gray-500">
                <Clock className="w-4 h-4" />
                {toDatetime(form) ? formatDate(toDatetime(form)) : 'Date à définir'}
              </span>
              <span className="flex items-center gap-1.5 text-gray-500">
                <Users className="w-4 h-4" /> {form.seats} place{form.seats > 1 ? 's' : ''}
              </span>
            </div>
            {form.description && (
              <p className="mt-4 text-sm text-gray-600 bg-gray-50 rounded-xl p-3 break-words">{form.description}</p>
            )}
            {!hasRoute && (
              <p className="mt-4 text-xs text-gray-400">L'aperçu se met à jour pendant que vous remplissez le formulaire.</p>
            )}
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Mes trajets publiés {myTrips.length > 0 && <span className="text-purple-600">({myTrips.length})</span>}
            </h2>
            <MyTrips trips={myTrips} isLoading={tripsLoading} />
          </div>
        </aside>
      </div>
    </div>
  );
}

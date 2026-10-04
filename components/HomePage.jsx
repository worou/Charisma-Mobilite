import React, { useEffect, useRef, useState } from 'react';
import {
  Leaf, Heart, Shield, Smartphone, Gift, Users, MapPin, Navigation, Calendar,
  Search, ArrowUpDown, ArrowRight, Clock, Car, Bus, Train, Sparkles, UserPlus, MessageCircle,
} from 'lucide-react';
import Toast from './Toast';
import BusBookingForm from './BusBookingForm';
import TrainItineraryForm from './TrainItineraryForm';
import { useApp } from './context.jsx';

const FEATURES = [
  { icon: Gift, title: '100 % gratuit', description: 'Aucun frais, aucune commission : tous les trajets sont offerts à la communauté.', color: 'from-pink-500 to-rose-500' },
  { icon: Leaf, title: 'Écologique', description: 'Moins de voitures sur la route, moins de CO₂ : chaque place partagée compte.', color: 'from-emerald-500 to-teal-500' },
  { icon: Shield, title: 'Sereine', description: 'Chaque membre a un compte, et chaque réservation est liée à un trajet publié.', color: 'from-indigo-500 to-blue-500' },
  { icon: Smartphone, title: 'Simple', description: 'Publiez ou réservez en quelques clics, depuis votre ordinateur ou votre téléphone.', color: 'from-purple-500 to-fuchsia-500' },
  { icon: Users, title: 'Solidaire', description: 'Rendez service, profitez de places libres et voyagez autrement.', color: 'from-amber-500 to-orange-500' },
  { icon: Heart, title: 'Conviviale', description: 'Rencontrez de nouvelles personnes et rendez vos trajets plus agréables.', color: 'from-red-500 to-pink-500' },
];

const STEPS = [
  { icon: Search, title: 'Recherchez', description: 'Indiquez votre départ, votre destination et la date qui vous convient.' },
  { icon: Car, title: 'Réservez', description: 'Choisissez un trajet et réservez vos places en un clic.' },
  { icon: MessageCircle, title: 'Voyagez', description: 'Retrouvez votre conducteur au point de rendez-vous et profitez du voyage.' },
];

const TRANSPORT_MODES = [
  { id: 'carpool', label: 'Covoiturage', icon: Car, available: true },
  { id: 'bus', label: 'Bus', icon: Bus, available: true },
  { id: 'train', label: 'Train', icon: Train, available: true },
];

const inputClass =
  'w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-gray-100 bg-gray-50 text-gray-900 placeholder-gray-400 ' +
  'focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-100 transition';

const formatDeparture = (value) =>
  new Date(value).toLocaleString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function UpcomingTrips({ onSelect }) {
  const [trips, setTrips] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/announcements')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (cancelled) return;
        const now = new Date();
        setTrips(data.filter((t) => new Date(t.datetime) > now && t.seats > 0).slice(0, 6));
      })
      .catch(() => !cancelled && setTrips([]));
    return () => { cancelled = true; };
  }, []);

  if (!trips || trips.length === 0) return null;

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-purple-600 mb-2">En ce moment</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Prochains départs</h2>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip) => (
            <button
              key={trip.id}
              onClick={() => onSelect(trip)}
              className="group text-left p-6 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-xl hover:shadow-purple-100 hover:-translate-y-1 hover:border-purple-200 transition-all"
            >
              <div className="flex items-center justify-between mb-5">
                <span className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Clock className="w-4 h-4" /> {formatDeparture(trip.datetime)}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                  {trip.seats} place{trip.seats > 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex gap-4">
                <div className="flex flex-col items-center pt-1.5">
                  <span className="w-3 h-3 rounded-full border-2 border-purple-600" />
                  <span className="w-0.5 flex-1 bg-purple-200 my-1" />
                  <span className="w-3 h-3 rounded-full bg-purple-600" />
                </div>
                <div className="flex-1 min-w-0 space-y-4">
                  <p className="font-semibold text-gray-900 truncate capitalize">{trip.departure}</p>
                  <p className="font-semibold text-gray-900 truncate capitalize">{trip.destination}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-5 pt-5 border-t border-gray-100">
                <span className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center font-semibold">
                    {(trip.driver_name || '?').charAt(0).toUpperCase()}
                  </span>
                  {trip.driver_name}
                </span>
                <span className="flex items-center gap-1 text-sm font-semibold text-purple-600">
                  Réserver <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const { currentPage, setCurrentPage, setSearchParams, setSelectedTrip } = useApp();
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ depart: '', destination: '', date: '', passengers: 1 });
  const [mode, setMode] = useState('carpool');
  const howItWorksRef = useRef(null);

  // L'entrée "Comment ça marche" du menu affiche l'accueil : on fait défiler jusqu'à la section
  useEffect(() => {
    if (currentPage === 'how-it-works') howItWorksRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentPage]);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const handleSearch = (e) => {
    e.preventDefault();
    if (!form.depart.trim() || !form.destination.trim()) {
      showToast('Indiquez une ville de départ et une destination', 'error');
      return;
    }
    setSearchParams({
      depart: form.depart.trim(),
      destination: form.destination.trim(),
      date: form.date,
      passengers: form.passengers,
    });
    setCurrentPage('search-results');
  };

  const selectTrip = (trip) => {
    setSelectedTrip(trip);
    setCurrentPage('booking');
  };

  return (
    <div className="bg-gray-50">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-purple-700 to-fuchsia-700 text-white">
        <div className="absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-indigo-400/30 blur-3xl" />
        <div className="absolute top-20 -right-24 w-[26rem] h-[26rem] rounded-full bg-fuchsia-400/30 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 md:pt-24 pb-52 text-center">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur border border-white/20 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4 text-amber-300" /> Covoiturage 100 % gratuit
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6">
            Partagez la route,<br />
            <span className="bg-gradient-to-r from-amber-200 via-pink-200 to-white bg-clip-text text-transparent">
              pas les frais.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-purple-100 max-w-2xl mx-auto">
            Charisma'Move met en relation conducteurs et passagers pour des trajets plus économiques,
            plus écologiques et plus conviviaux.
          </p>
        </div>

        {/* Vague de transition */}
        <svg className="absolute bottom-0 left-0 w-full h-16 md:h-24 text-gray-50" viewBox="0 0 1440 100" preserveAspectRatio="none" aria-hidden="true">
          <path fill="currentColor" d="M0,64 C240,100 480,100 720,72 C960,44 1200,20 1440,48 L1440,100 L0,100 Z" />
        </svg>
      </section>

      {/* Recherche */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-44">
        {/* Modes de transport : seul le covoiturage est disponible pour l'instant */}
        <div role="tablist" aria-label="Mode de transport" className="flex gap-1.5">
          {TRANSPORT_MODES.map(({ id, label, icon: Icon, available }) => {
            const active = mode === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setMode(id)}
                className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-t-2xl font-semibold transition ${
                  active
                    ? 'bg-white text-purple-700'
                    : 'bg-white/15 text-white hover:bg-white/25 backdrop-blur'
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
                {!available && (
                  <span className={`hidden sm:inline text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                    active ? 'bg-purple-100 text-purple-600' : 'bg-white/20 text-white'
                  }`}>
                    Bientôt
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {mode === 'bus' ? (
          <div role="tabpanel" className="bg-white rounded-3xl shadow-2xl shadow-purple-900/10 p-4 md:p-6">
            <BusBookingForm />
          </div>
        ) : mode === 'train' ? (
          <div role="tabpanel" className="bg-white rounded-3xl shadow-2xl shadow-purple-900/10 p-4 md:p-6">
            <TrainItineraryForm />
          </div>
        ) : mode !== 'carpool' ? (
          <div role="tabpanel" className="bg-white rounded-3xl rounded-tl-none shadow-2xl shadow-purple-900/10 p-8 md:p-10 text-center">
            {(() => {
              const { icon: Icon, label } = TRANSPORT_MODES.find((m) => m.id === mode);
              return (
                <>
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-purple-50 flex items-center justify-center">
                    <Icon className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Recherche en {label.toLowerCase()} bientôt disponible</h3>
                  <p className="text-gray-600 mb-6">Nous travaillons sur cette fonctionnalité. En attendant, trouvez un covoiturage.</p>
                  <button
                    type="button"
                    onClick={() => setMode('carpool')}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition"
                  >
                    <Car className="w-5 h-5" /> Rechercher un covoiturage
                  </button>
                </>
              );
            })()}
          </div>
        ) : (
        <form role="tabpanel" onSubmit={handleSearch} className="bg-white rounded-3xl rounded-tl-none shadow-2xl shadow-purple-900/10 p-4 md:p-6">
          <div className="grid gap-3 lg:grid-cols-12 lg:items-end">
            <div className="relative lg:col-span-6 grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="home-depart" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 ml-1">Départ</label>
                <div className="relative">
                  <MapPin className="w-5 h-5 text-purple-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="home-depart"
                    type="text"
                    value={form.depart}
                    onChange={(e) => setForm({ ...form, depart: e.target.value })}
                    placeholder="Paris, Gare de Lyon…"
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="home-destination" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 ml-1">Destination</label>
                <div className="relative">
                  <Navigation className="w-5 h-5 text-purple-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="home-destination"
                    type="text"
                    value={form.destination}
                    onChange={(e) => setForm({ ...form, destination: e.target.value })}
                    placeholder="Lyon, Part-Dieu…"
                    className={inputClass}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setForm({ ...form, depart: form.destination, destination: form.depart })}
                aria-label="Inverser départ et destination"
                title="Inverser"
                className="hidden sm:flex absolute left-1/2 bottom-2.5 -translate-x-1/2 z-10 w-9 h-9 rounded-full bg-white border-2 border-gray-100 shadow text-purple-600 items-center justify-center hover:border-purple-400 transition"
              >
                <ArrowUpDown className="w-4 h-4 rotate-90" />
              </button>
            </div>

            <div className="lg:col-span-3 grid gap-3 grid-cols-5">
              <div className="col-span-3">
                <label htmlFor="home-date" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 ml-1">Date</label>
                <div className="relative">
                  <Calendar className="w-5 h-5 text-purple-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="home-date"
                    type="date"
                    min={todayLocal()}
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className={`${inputClass} pr-2`}
                  />
                </div>
              </div>
              <div className="col-span-2">
                <label htmlFor="home-passengers" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 ml-1">Places</label>
                <div className="relative">
                  <Users className="w-5 h-5 text-purple-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    id="home-passengers"
                    value={form.passengers}
                    onChange={(e) => setForm({ ...form, passengers: parseInt(e.target.value) })}
                    className={`${inputClass} appearance-none cursor-pointer`}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="lg:col-span-3 group flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-purple-300/50 hover:-translate-y-0.5 transition"
            >
              <Search className="w-5 h-5" />
              Rechercher
            </button>
          </div>
        </form>
        )}

        <p className="text-center text-gray-600 mt-6">
          Vous conduisez ?{' '}
          <button
            onClick={() => setCurrentPage('publish')}
            className="inline-flex items-center gap-1 font-semibold text-purple-600 hover:text-purple-800 group"
          >
            Publiez votre trajet <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </p>
      </section>

      {/* Comment ça marche */}
      <section ref={howItWorksRef} className="scroll-mt-20 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold uppercase tracking-wider text-purple-600 mb-2">Comment ça marche</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Trois étapes, c'est tout</h2>
          </div>
          <div className="relative grid md:grid-cols-3 gap-10">
            <div className="hidden md:block absolute top-10 left-[16.66%] right-[16.66%] border-t-2 border-dashed border-purple-200" />
            {STEPS.map(({ icon: Icon, title, description }, i) => (
              <div key={title} className="relative text-center">
                <div className="relative w-20 h-20 mx-auto mb-6 rounded-2xl bg-white shadow-lg shadow-purple-100 flex items-center justify-center">
                  <Icon className="w-9 h-9 text-purple-600" />
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white text-sm font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-600 max-w-xs mx-auto">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <UpcomingTrips onSelect={selectTrip} />

      {/* Atouts */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold uppercase tracking-wider text-purple-600 mb-2">Nos atouts</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Pourquoi choisir Charisma'Move ?</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Une expérience de covoiturage repensée pour tous vos déplacements.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, description, color }) => (
              <div
                key={title}
                className="group p-8 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-purple-100 hover:-translate-y-1 transition-all"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-white mb-6 shadow-lg transition-transform group-hover:scale-110 group-hover:rotate-3`}>
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-600 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Appel à l'action */}
      <section className="px-4 sm:px-6 lg:px-8 pb-20">
        <div className="relative overflow-hidden max-w-7xl mx-auto rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 px-8 py-14 md:px-16 text-white">
          <div className="absolute -bottom-24 -right-16 w-80 h-80 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -top-20 left-1/3 w-64 h-64 rounded-full bg-pink-300/20 blur-3xl" />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-3">Des places libres dans votre voiture ?</h2>
              <p className="text-purple-100 text-lg max-w-xl">
                Publiez votre trajet gratuitement et faites voyager d'autres membres avec vous.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <button
                onClick={() => setCurrentPage('publish')}
                className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white text-purple-700 font-semibold shadow-lg hover:-translate-y-0.5 hover:shadow-xl transition"
              >
                <Car className="w-5 h-5" /> Publier un trajet
              </button>
              <button
                onClick={() => setCurrentPage('register')}
                className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border-2 border-white/40 text-white font-semibold hover:bg-white/10 transition"
              >
                <UserPlus className="w-5 h-5" /> Créer un compte
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

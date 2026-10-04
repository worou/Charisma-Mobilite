import React, { memo, useEffect, useState } from 'react';
import { ArrowRight, MapPin, Clock, Users } from 'lucide-react';
import { useApp } from './context.jsx';

// Les noms de champs du formulaire de recherche ne sont pas ceux de l'API :
// depart -> departure, passengers -> seats.
const buildQuery = (searchParams) => {
  if (!searchParams) return '';
  const q = new URLSearchParams();
  if (searchParams.depart)      q.set('departure', searchParams.depart);
  if (searchParams.destination) q.set('destination', searchParams.destination);
  if (searchParams.date)        q.set('date', searchParams.date);
  if (searchParams.passengers)  q.set('seats', searchParams.passengers);
  const s = q.toString();
  return s ? `?${s}` : '';
};

const formatDate = (value) => {
  const d = new Date(value);
  if (isNaN(d)) return value;
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
};

const formatTime = (value) => {
  const d = new Date(value);
  if (isNaN(d)) return '';
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

const SearchResultsPage = () => {
  const { setCurrentPage, searchParams, setSelectedTrip } = useApp();
  const [trips, setTrips]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/announcements${buildQuery(searchParams)}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { if (!cancelled) { setTrips(data); setLoading(false); } })
      .catch(() => { if (!cancelled) { setError('Impossible de charger les trajets'); setLoading(false); } });
    return () => { cancelled = true; };
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <button onClick={() => setCurrentPage('home')} className="flex items-center text-purple-600 hover:text-purple-800 mb-4">
            <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
            Retour à la recherche
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Trajets disponibles</h1>
          {loading ? (
            <p className="text-gray-600">Chargement…</p>
          ) : searchParams ? (
            <p className="text-gray-600">
              {searchParams.depart} → {searchParams.destination} • {trips.length} trajet(s) trouvé(s)
            </p>
          ) : (
            <p className="text-gray-600">{trips.length} trajet(s) trouvé(s)</p>
          )}
        </div>

        {error && <div className="bg-red-50 text-red-700 text-sm p-4 rounded-xl mb-6">{error}</div>}

        {!loading && !error && trips.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <p className="text-gray-500 mb-4">Aucun trajet trouvé</p>
            <button
              onClick={() => setCurrentPage('publish')}
              className="text-purple-600 hover:text-purple-800 font-medium"
            >
              Publier un trajet
            </button>
          </div>
        )}

        <div className="space-y-6">
          {trips.map((trip) => (
            <div key={trip.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="flex flex-col md:flex-row md:items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-semibold mr-4 flex-shrink-0">
                      {trip.driver_name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{trip.driver_name}</h3>
                      <div className="text-sm text-gray-600">{formatDate(trip.datetime)}</div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                      <div>
                        <div className="font-medium">{trip.departure}</div>
                        <div className="text-sm text-gray-600">→ {trip.destination}</div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                      <div>
                        <div className="font-medium">{formatTime(trip.datetime)}</div>
                        <div className="text-sm text-gray-600">Départ</div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Users className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                      <div>
                        <div className="font-medium">{trip.seats} place(s)</div>
                        {trip.description && <div className="text-sm text-gray-600">{trip.description}</div>}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <div className="text-2xl font-bold text-purple-600 mb-2">
                    {trip.price ? `${trip.price} €` : 'Gratuit'}
                  </div>
                  <button
                    onClick={() => { setSelectedTrip(trip); setCurrentPage('booking'); }}
                    className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Réserver
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default memo(SearchResultsPage);

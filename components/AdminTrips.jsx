import React, { useEffect, useState } from 'react';
import { Search, Trash2 } from 'lucide-react';
import { useAdmin } from './AdminContext.jsx';

const AdminTrips = () => {
  const { token } = useAdmin();
  const [trips, setTrips]     = useState([]);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch('/api/admin/announcements', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { setTrips(data); setLoading(false); })
      .catch(() => { setError('Impossible de charger les trajets'); setLoading(false); });
  }, [token]);

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce trajet ?')) return;
    const res = await fetch(`/api/admin/announcements/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setTrips(prev => prev.filter(t => t.id !== id));
  };

  const filtered = trips.filter(t =>
    t.departure?.toLowerCase().includes(search.toLowerCase()) ||
    t.destination?.toLowerCase().includes(search.toLowerCase()) ||
    t.driver_name?.toLowerCase().includes(search.toLowerCase())
  );

  const isUpcoming = dt => new Date(dt) > new Date();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par ville ou conducteur…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <span className="text-sm text-gray-500">
          {filtered.length} trajet{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">{error}</div>}

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Chargement…</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trajet</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conducteur</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Places</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map(trip => (
                <tr key={trip.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-gray-900">{trip.departure}</span>
                    <span className="text-gray-400 mx-1.5">→</span>
                    <span className="text-sm font-medium text-gray-900">{trip.destination}</span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{trip.driver_name}</p>
                    <p className="text-xs text-gray-400">{trip.driver_email}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                    {new Date(trip.datetime).toLocaleString('fr-FR', {
                      dateStyle: 'short', timeStyle: 'short',
                    })}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{trip.seats}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      isUpcoming(trip.datetime)
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {isUpcoming(trip.datetime) ? 'À venir' : 'Passé'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(trip.id)}
                      className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 text-sm">
                    Aucun trajet trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminTrips;

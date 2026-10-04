import React, { useEffect, useState } from 'react';
import { Search, CheckCircle } from 'lucide-react';
import { useAdmin } from './AdminContext.jsx';

const STATUS = {
  pending:   { label: 'En attente', cls: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: 'Confirmée',  cls: 'bg-green-100 text-green-700'  },
  cancelled: { label: 'Annulée',    cls: 'bg-red-100 text-red-700'      },
};

const AdminBookings = () => {
  const { token } = useAdmin();
  const [bookings, setBookings] = useState([]);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch('/api/admin/bookings', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { setBookings(data); setLoading(false); })
      .catch(() => { setError('Impossible de charger les réservations'); setLoading(false); });
  }, [token]);

  const handleConfirm = async (id) => {
    const res = await fetch(`/api/bookings/${id}/confirm`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'confirmed' } : b));
    }
  };

  const filtered = bookings.filter(b =>
    b.user_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.departure?.toLowerCase().includes(search.toLowerCase()) ||
    b.arrival?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par utilisateur ou ville…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <span className="text-sm text-gray-500">
          {filtered.length} réservation{filtered.length !== 1 ? 's' : ''}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilisateur</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trajet</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Places</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map(b => {
                const s = STATUS[b.status] || { label: b.status, cls: 'bg-gray-100 text-gray-600' };
                return (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{b.user_name}</p>
                      <p className="text-xs text-gray-400">{b.user_email}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {b.departure} → {b.arrival}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                      {b.travel_date
                        ? new Date(b.travel_date).toLocaleDateString('fr-FR')
                        : '—'}
                      {b.travel_time ? ` ${b.travel_time.slice(0, 5)}` : ''}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{b.seats}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {b.status === 'pending' && (
                        <button
                          onClick={() => handleConfirm(b.id)}
                          className="text-green-500 hover:text-green-700 p-1 rounded hover:bg-green-50 transition-colors"
                          title="Confirmer la réservation"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 text-sm">
                    Aucune réservation trouvée
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

export default AdminBookings;

import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, Bus } from 'lucide-react';
import { useAdmin } from './AdminContext.jsx';

const formatDate = (iso) =>
  new Date(`${iso}T12:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });

const inputClass =
  'px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

const AdminBusLines = () => {
  const { token } = useAdmin();
  const [lines, setLines] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newLine, setNewLine] = useState({ name: '', seats: 50 });
  const [editing, setEditing] = useState(null); // { id, name, seats }
  const [filter, setFilter] = useState({ line_id: '', date: '' });

  const api = useCallback(async (url, options = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Erreur serveur');
    return data;
  }, [token]);

  const loadLines = useCallback(() =>
    api('/api/admin/bus-lines').then(setLines).catch(() => setError('Impossible de charger les lignes'))
  , [api]);

  const loadBookings = useCallback(() => {
    const q = new URLSearchParams(Object.entries(filter).filter(([, v]) => v));
    return api(`/api/admin/bus-bookings?${q}`).then(setBookings).catch(() => setError('Impossible de charger les réservations'));
  }, [api, filter]);

  useEffect(() => { loadLines().finally(() => setLoading(false)); }, [loadLines]);
  useEffect(() => { loadBookings(); }, [loadBookings]);

  const run = async (action) => {
    setError(null);
    try {
      await action();
      await Promise.all([loadLines(), loadBookings()]);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const ok = await run(() => api('/api/admin/bus-lines', { method: 'POST', body: JSON.stringify(newLine) }));
    if (ok) setNewLine({ name: '', seats: 50 });
  };

  const handleSave = async () => {
    const ok = await run(() => api(`/api/admin/bus-lines/${editing.id}`, {
      method: 'PUT',
      body: JSON.stringify({ name: editing.name, seats: editing.seats }),
    }));
    if (ok) setEditing(null);
  };

  const toggleActive = (line) =>
    run(() => api(`/api/admin/bus-lines/${line.id}`, { method: 'PUT', body: JSON.stringify({ active: !line.active }) }));

  const handleDelete = (line) => {
    if (!confirm(`Supprimer la ligne « ${line.name} » et toutes ses réservations ?`)) return;
    run(() => api(`/api/admin/bus-lines/${line.id}`, { method: 'DELETE' }));
  };

  const deleteBooking = (b) => {
    if (!confirm(`Supprimer la réservation de ${b.user_first_name || ''} ${b.user_name} ?`)) return;
    run(() => api(`/api/admin/bus-bookings/${b.id}`, { method: 'DELETE' }));
  };

  const th = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider';

  return (
    <div className="space-y-6">
      {/* Création */}
      <form onSubmit={handleCreate} className="bg-white rounded-xl border shadow-sm p-5 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">Nom de la ligne</label>
          <input
            type="text"
            placeholder="Ex. Ligne Nord – Cotonou"
            value={newLine.name}
            onChange={e => setNewLine({ ...newLine, name: e.target.value })}
            className={`${inputClass} w-full`}
            required
          />
        </div>
        <div className="w-36">
          <label className="block text-xs font-medium text-gray-500 mb-1">Places dans le bus</label>
          <input
            type="number"
            min="1"
            max="500"
            value={newLine.seats}
            onChange={e => setNewLine({ ...newLine, seats: parseInt(e.target.value) || '' })}
            className={`${inputClass} w-full`}
            required
          />
        </div>
        <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> Créer la ligne
        </button>
      </form>

      {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">{error}</div>}

      {/* Lignes */}
      <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Chargement…</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className={th}>Ligne</th>
                <th className={th}>Places</th>
                <th className={th}>Prochains cultes (réservées / places)</th>
                <th className={th}>Statut</th>
                <th className={`${th} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {lines.map(line => {
                const isEditing = editing?.id === line.id;
                return (
                  <tr key={line.id} className="hover:bg-gray-50 align-top">
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} className={`${inputClass} w-full`} />
                      ) : (
                        <span className="flex items-center gap-2 text-sm font-medium text-gray-900">
                          <Bus className="w-4 h-4 text-gray-400" /> {line.name}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {isEditing ? (
                        <input type="number" min="1" max="500" value={editing.seats}
                          onChange={e => setEditing({ ...editing, seats: parseInt(e.target.value) || '' })}
                          className={`${inputClass} w-24`} />
                      ) : line.seats}
                    </td>
                    <td className="px-6 py-4">
                      {line.upcoming.length === 0 ? (
                        <span className="text-sm text-gray-400">Aucune réservation à venir</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {line.upcoming.map(u => (
                            <button
                              key={u.service_date}
                              onClick={() => setFilter({ line_id: String(line.id), date: u.service_date })}
                              title="Voir les réservations"
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                u.reserved >= line.seats ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700'
                              } hover:ring-2 hover:ring-blue-200`}
                            >
                              {formatDate(u.service_date)} : {u.reserved}/{line.seats}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleActive(line)}
                        title={line.active ? 'Cliquer pour désactiver' : 'Cliquer pour activer'}
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          line.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {line.active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      {isEditing ? (
                        <>
                          <button onClick={handleSave} className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-50" title="Enregistrer">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 ml-1" title="Annuler">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => setEditing({ id: line.id, name: line.name, seats: line.seats })} className="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50" title="Modifier">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(line)} className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 ml-1" title="Supprimer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
              {lines.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">
                    Aucune ligne. Créez la première ligne ci-dessus.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Réservations */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-800 mr-auto">Réservations de bus</h2>
          <select value={filter.line_id} onChange={e => setFilter({ ...filter, line_id: e.target.value })} className={inputClass}>
            <option value="">Toutes les lignes</option>
            {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <input type="date" value={filter.date} onChange={e => setFilter({ ...filter, date: e.target.value })} className={inputClass} />
          {(filter.line_id || filter.date) && (
            <button onClick={() => setFilter({ line_id: '', date: '' })} className="text-sm text-blue-600 hover:text-blue-800">
              Réinitialiser
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className={th}>Voyageur</th>
                <th className={th}>Ligne</th>
                <th className={th}>Culte</th>
                <th className={th}>Places</th>
                <th className={`${th} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {bookings.map(b => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{b.user_first_name} {b.user_name}</p>
                    <p className="text-xs text-gray-400">{b.user_email}{b.user_phone ? ` · ${b.user_phone}` : ''}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{b.line_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{formatDate(b.service_date)}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{b.seats}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => deleteBooking(b)} className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50" title="Supprimer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">Aucune réservation</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminBusLines;

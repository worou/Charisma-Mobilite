import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, Bus, ArrowUp, ArrowDown, MapPin, Flag, UserCheck, CheckCircle2 } from 'lucide-react';
import { useAdmin } from './AdminContext.jsx';

const formatDate = (iso) =>
  new Date(`${iso}T12:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });

const inputClass =
  'px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

// validated_at est un horodatage UTC « AAAA-MM-JJ HH:MM:SS »
const formatTime = (ts) =>
  new Date(`${ts.replace(' ', 'T')}Z`).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

const personName = (u) => [u.first_name, u.name].filter(Boolean).join(' ');

// Chauffeurs de la ligne : ils valident les QR codes des voyageurs à la montée
const LineDrivers = ({ line, users, onAdd, onRemove }) => {
  const available = users.filter(u => !line.drivers.some(d => d.id === u.id));
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {line.drivers.map(d => (
        <span key={d.id} title={d.email} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs font-medium">
          <UserCheck className="w-3.5 h-3.5" /> {personName(d)}
          <button onClick={() => onRemove(d)} className="p-0.5 rounded-full hover:bg-purple-100" title="Retirer ce chauffeur">
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <select
        value=""
        onChange={e => e.target.value && onAdd(parseInt(e.target.value))}
        className="text-xs border border-dashed border-gray-300 rounded-full px-2 py-0.5 text-gray-500 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[11rem]"
      >
        <option value="">+ Chauffeur</option>
        {available.map(u => <option key={u.id} value={u.id}>{personName(u)} ({u.email})</option>)}
      </select>
    </div>
  );
};

const emptyLine = () => ({ name: '', seats: 50, stops: ['', ''] });

// Arrêts du départ (premier) à la destination (dernier) ; les arrêts intermédiaires s'insèrent entre les deux
const StopsEditor = ({ stops, onChange }) => {
  const update = (i, value) => onChange(stops.map((s, j) => (j === i ? value : s)));
  const remove = (i) => onChange(stops.filter((_, j) => j !== i));
  const move = (i, delta) => {
    const next = [...stops];
    [next[i], next[i + delta]] = [next[i + delta], next[i]];
    onChange(next);
  };
  const addStop = () => onChange([...stops.slice(0, -1), '', stops[stops.length - 1]]);
  const last = stops.length - 1;

  return (
    <div className="space-y-2">
      {stops.map((stop, i) => {
        const label = i === 0 ? 'Départ' : i === last ? 'Destination' : `Arrêt ${i}`;
        const Icon = i === 0 ? MapPin : i === last ? Flag : null;
        return (
          <div key={i} className="flex items-center gap-2">
            <span className="w-24 shrink-0 flex items-center gap-1.5 text-xs font-medium text-gray-500">
              {Icon ? <Icon className="w-3.5 h-3.5 text-blue-500" /> : <span className="w-3.5 h-3.5 flex justify-center"><span className="w-1.5 h-1.5 mt-1 rounded-full bg-gray-300" /></span>}
              {label}
            </span>
            <input
              type="text"
              value={stop}
              onChange={e => update(i, e.target.value)}
              placeholder={i === 0 ? 'Ex. Gare de Sevran' : i === last ? 'Ex. Église Charisma' : "Nom de l'arrêt"}
              className={`${inputClass} flex-1 min-w-0`}
            />
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
              className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent" title="Monter">
              <ArrowUp className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === last}
              className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent" title="Descendre">
              <ArrowDown className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => remove(i)} disabled={stops.length <= 2}
              className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent" title="Retirer l'arrêt">
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
      <button type="button" onClick={addStop} className="ml-[6.5rem] flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
        <Plus className="w-4 h-4" /> Ajouter un arrêt
      </button>
    </div>
  );
};

// Arrêts affichés sous le nom de la ligne : « Départ → … → Destination »
const StopsSummary = ({ stops }) =>
  stops.length === 0 ? (
    <p className="text-xs text-gray-400 mt-1">Aucun arrêt renseigné</p>
  ) : (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-0.5 mt-1 text-xs text-gray-500">
      {stops.map((s, i) => (
        <li key={i} className="flex items-center gap-1">
          {i > 0 && <span className="text-gray-300">→</span>}
          <span className={i === 0 || i === stops.length - 1 ? 'font-medium text-gray-700' : ''}>{s}</span>
        </li>
      ))}
    </ol>
  );

const AdminBusLines = () => {
  const { token } = useAdmin();
  const [lines, setLines] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newLine, setNewLine] = useState(emptyLine);
  const [editing, setEditing] = useState(null); // { id, name, seats, stops }
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
  useEffect(() => { api('/api/admin/users').then(setUsers).catch(() => {}); }, [api]);
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
    if (ok) setNewLine(emptyLine());
  };

  const handleSave = async () => {
    const ok = await run(() => api(`/api/admin/bus-lines/${editing.id}`, {
      method: 'PUT',
      body: JSON.stringify({ name: editing.name, seats: editing.seats, stops: editing.stops }),
    }));
    if (ok) setEditing(null);
  };

  const toggleActive = (line) =>
    run(() => api(`/api/admin/bus-lines/${line.id}`, { method: 'PUT', body: JSON.stringify({ active: !line.active }) }));

  const handleDelete = (line) => {
    if (!confirm(`Supprimer la ligne « ${line.name} » et toutes ses réservations ?`)) return;
    run(() => api(`/api/admin/bus-lines/${line.id}`, { method: 'DELETE' }));
  };

  const addDriver = (line, userId) =>
    run(() => api(`/api/admin/bus-lines/${line.id}/drivers/${userId}`, { method: 'PUT' }));

  const removeDriver = (line, driver) => {
    if (!confirm(`Retirer ${personName(driver)} des chauffeurs de la ligne « ${line.name} » ?`)) return;
    run(() => api(`/api/admin/bus-lines/${line.id}/drivers/${driver.id}`, { method: 'DELETE' }));
  };

  const deleteBooking = (b) => {
    if (!confirm(`Supprimer la réservation de ${b.user_first_name || ''} ${b.user_name} ?`)) return;
    run(() => api(`/api/admin/bus-bookings/${b.id}`, { method: 'DELETE' }));
  };

  const th = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider';

  return (
    <div className="space-y-6">
      {/* Création */}
      <form onSubmit={handleCreate} className="bg-white rounded-xl border shadow-sm p-5 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
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
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Arrêts, du départ jusqu'à la destination</p>
          <StopsEditor stops={newLine.stops} onChange={stops => setNewLine({ ...newLine, stops })} />
        </div>
        <div className="flex justify-end">
          <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> Créer la ligne
          </button>
        </div>
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
                <th className={th}>Chauffeurs</th>
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
                        <div className="space-y-3 min-w-[420px]">
                          <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} className={`${inputClass} w-full`} />
                          <StopsEditor stops={editing.stops} onChange={stops => setEditing({ ...editing, stops })} />
                        </div>
                      ) : (
                        <>
                          <span className="flex items-center gap-2 text-sm font-medium text-gray-900">
                            <Bus className="w-4 h-4 text-gray-400" /> {line.name}
                          </span>
                          <StopsSummary stops={line.stops} />
                        </>
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
                      <LineDrivers line={line} users={users} onAdd={id => addDriver(line, id)} onRemove={d => removeDriver(line, d)} />
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
                          <button onClick={() => setEditing({ id: line.id, name: line.name, seats: line.seats, stops: line.stops.length ? line.stops : ['', ''] })} className="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50" title="Modifier">
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
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 text-sm">
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
                <th className={th}>Montée</th>
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
                  <td className="px-6 py-4 text-sm whitespace-nowrap">
                    {b.validated_at ? (
                      <span className="inline-flex items-center gap-1 text-green-700"><CheckCircle2 className="w-4 h-4" /> {formatTime(b.validated_at)}</span>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => deleteBooking(b)} className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50" title="Supprimer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 text-sm">Aucune réservation</td>
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

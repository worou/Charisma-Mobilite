import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { useApp } from './context.jsx';

export default function BookingPage() {
  const { setCurrentPage, token, user, selectedTrip, setSelectedTrip } = useApp();
  const [seats, setSeats] = useState(1);
  const [profile, setProfile] = useState(null);
  const [info, setInfo] = useState({ name: '', first_name: '', phone: '', gender: '' });
  const [needsInfo, setNeedsInfo] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!token || !user) return;
      try {
        const res = await fetch(`/api/users/${user.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
          setInfo({
            name: data.name || '',
            first_name: data.first_name || '',
            phone: data.phone || '',
            gender: data.gender || '',
          });
          if (!data.phone || !data.gender || !data.first_name || !data.name) {
            setNeedsInfo(true);
          }
        }
      } catch {
        /* ignore */
      }
    };
    fetchProfile();
  }, [token, user]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(info),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setNeedsInfo(false);
      } else {
        alert('Erreur lors de la mise à jour du profil');
      }
    } catch {
      alert('Erreur lors de la mise à jour du profil');
    }
  };
  const handleSubmit = async () => {
    if (needsInfo || !selectedTrip) return;
    setError(null);
    setSaving(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ announcement_id: selectedTrip.id, seats }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          res.status === 409 ? `Il ne reste que ${data.available} place(s) sur ce trajet`
          : res.status === 404 ? "Ce trajet n'existe plus"
          : 'Erreur lors de la réservation'
        );
        setSaving(false);
        return;
      }
      setSelectedTrip(null);
      setCurrentPage('my-bookings');
    } catch {
      setError('Erreur lors de la réservation');
      setSaving(false);
    }
  };

  // Le contexte vit en mémoire : un rechargement sur cette page perd le trajet.
  if (!selectedTrip) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Aucun trajet sélectionné</h1>
        <p className="text-gray-600 mb-6">Choisissez un trajet dans la liste pour le réserver.</p>
        <button onClick={() => setCurrentPage('search-results')} className="text-purple-600 hover:text-purple-800 font-medium">
          Voir les trajets disponibles
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-xl mx-auto">
      <button
        onClick={() => setCurrentPage('search-results')}
        className="flex items-center text-purple-600 hover:text-purple-800 mb-6"
      >
        <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
        Retour
      </button>

      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-3">
          {selectedTrip.departure} → {selectedTrip.destination}
        </h2>
        <dl className="text-sm text-gray-600 space-y-1">
          <div className="flex justify-between">
            <dt>Conducteur</dt><dd className="text-gray-900">{selectedTrip.driver_name}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Départ</dt><dd className="text-gray-900">{String(selectedTrip.datetime).replace('T', ' à ')}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Places restantes</dt><dd className="text-gray-900">{selectedTrip.seats}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Prix</dt><dd className="text-gray-900">{selectedTrip.price ? `${selectedTrip.price} €` : 'Gratuit'}</dd>
          </div>
        </dl>
      </div>
      {needsInfo && (
        <form onSubmit={handleProfileSubmit} className="bg-white rounded-xl shadow-lg p-6 space-y-4 mb-6">
          <h2 className="font-semibold">Complétez votre profil</h2>
          <input
            type="text"
            placeholder="Nom"
            value={info.name}
            onChange={(e) => setInfo({ ...info, name: e.target.value })}
            className="w-full border px-3 py-2 rounded"
          />
          <input
            type="text"
            placeholder="Prénom"
            value={info.first_name}
            onChange={(e) => setInfo({ ...info, first_name: e.target.value })}
            className="w-full border px-3 py-2 rounded"
          />
          <input
            type="tel"
            placeholder="Téléphone"
            value={info.phone}
            onChange={(e) => setInfo({ ...info, phone: e.target.value })}
            className="w-full border px-3 py-2 rounded"
          />
          <select
            value={info.gender}
            onChange={(e) => setInfo({ ...info, gender: e.target.value })}
            className="w-full border px-3 py-2 rounded"
          >
            <option value="">Genre</option>
            <option value="M">Homme</option>
            <option value="F">Femme</option>
            <option value="O">Autre</option>
          </select>
          <button type="submit" className="w-full bg-purple-600 text-white py-2 rounded-lg">
            Enregistrer
          </button>
        </form>
      )}
      <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
        {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">{error}</div>}
        <div>
          <label className="block text-sm font-medium mb-1">Nombre de places</label>
          <input
            type="number"
            value={seats}
            min="1"
            max={selectedTrip.seats}
            onChange={(e) => setSeats(Math.min(parseInt(e.target.value) || 1, selectedTrip.seats))}
            className="w-full border px-3 py-2 rounded"
          />
          <p className="text-xs text-gray-400 mt-1">{selectedTrip.seats} place(s) disponible(s)</p>
        </div>
        <button
          onClick={handleSubmit}
          disabled={saving || selectedTrip.seats < 1}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 disabled:opacity-50 text-white py-2 rounded-lg"
        >
          {saving ? 'Réservation…' : 'Confirmer la réservation'}
        </button>
      </div>
    </div>
  );
}

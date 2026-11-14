import React, { useEffect, useState } from 'react';
import { ScanLine, ArrowRight } from 'lucide-react';
import { useApp } from './context.jsx';

export default function ProfilePage() {
  const { user, token, setCurrentPage, setIsAuthenticated, setUser, setToken } = useApp();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!token || !user) return;
    fetch(`/api/users/${user.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setProfile(data));
  }, [token, user]);

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setToken(null);
    setCurrentPage('home');
  };

  if (!profile) return <div className="p-8">Chargement...</div>;

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Profil</h1>
      <p className="mb-2"><strong>Nom:</strong> {profile.name}</p>
      <p className="mb-2"><strong>Prénom:</strong> {profile.first_name}</p>
      <p className="mb-2"><strong>Téléphone:</strong> {profile.phone}</p>
      <p className="mb-2"><strong>Genre:</strong> {profile.gender}</p>
      <p className="mb-4"><strong>Email:</strong> {profile.email}</p>
      {user?.is_driver && (
        <div className="mb-6 p-4 rounded-2xl border border-purple-100 bg-purple-50">
          <p className="flex items-center gap-2 font-semibold text-gray-900">
            <ScanLine className="w-5 h-5 text-purple-600" /> Chauffeur de bus
          </p>
          <p className="text-sm text-gray-600 mt-1">Scannez les QR codes des voyageurs à la montée pour valider leurs billets.</p>
          <button
            onClick={() => setCurrentPage('driver')}
            className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700"
          >
            Ouvrir le scanner <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
      <button onClick={logout} className="text-purple-600">Se déconnecter</button>
    </div>
  );
}

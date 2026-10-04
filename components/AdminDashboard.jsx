import React, { useEffect, useState } from 'react';
import { Users, Car, Calendar, Activity } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useAdmin } from './AdminContext.jsx';

const StatCard = ({ title, value, icon: Icon, bg }) => (
  <div className="bg-white rounded-xl border shadow-sm p-6 flex items-center justify-between">
    <div>
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">
        {value != null ? Number(value).toLocaleString('fr-FR') : '—'}
      </p>
    </div>
    <div className={`p-3 rounded-lg ${bg}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
  </div>
);

const AdminDashboard = () => {
  const { token, logout } = useAdmin();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(setStats)
      // jeton expiré en cours de session : reconnexion plutôt qu'un message
      // d'erreur dont on ne peut pas sortir
      .catch(status => {
        if (status === 401 || status === 403) logout();
        else setError('Impossible de charger les statistiques');
      });
  }, [token]);

  const chartData = stats
    ? [
        { name: 'Utilisateurs',    value: stats.total_users   },
        { name: 'Trajets publiés', value: stats.total_trips   },
        { name: 'Réservations',    value: stats.total_bookings },
        { name: 'Trajets actifs',  value: stats.active_trips  },
      ]
    : [];

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard title="Utilisateurs"   value={stats?.total_users}    icon={Users}    bg="bg-blue-500"   />
        <StatCard title="Trajets publiés" value={stats?.total_trips}   icon={Car}      bg="bg-green-500"  />
        <StatCard title="Réservations"   value={stats?.total_bookings} icon={Calendar} bg="bg-yellow-500" />
        <StatCard title="Trajets actifs" value={stats?.active_trips}   icon={Activity} bg="bg-purple-500" />
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Vue d'ensemble</h2>
        {stats ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip formatter={v => v.toLocaleString('fr-FR')} />
              <Bar dataKey="value" name="Total" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
            Chargement des données…
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;

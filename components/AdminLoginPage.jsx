import React, { useState } from 'react';
import {
  Mail, Lock, Eye, EyeOff, ShieldCheck, Loader2, AlertCircle,
  ArrowRight, Users, Car, CalendarCheck, BarChart3,
} from 'lucide-react';
import { useAdmin } from './AdminContext.jsx';

const FEATURES = [
  { icon: Users, label: 'Gestion des utilisateurs' },
  { icon: Car, label: 'Suivi des trajets publiés' },
  { icon: CalendarCheck, label: 'Contrôle des réservations' },
  { icon: BarChart3, label: "Statistiques d'activité" },
];

export default function AdminLoginPage() {
  const { setIsAuthenticated, setAdminUser, setToken } = useAdmin();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const data = await res.json();
        setAdminUser(data.admin);
        setToken(data.token);
        setIsAuthenticated(true);
      } else if (res.status === 401) {
        setError('Email ou mot de passe invalide');
      } else {
        setError("Erreur lors de la connexion. Veuillez réessayer plus tard.");
      }
    } catch (err) {
      setError("Impossible de contacter le serveur");
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    'w-full pl-11 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 ' +
    'focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-100 transition';

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Panneau de marque (masqué sur mobile) */}
      <aside className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-purple-800 text-white p-12 flex-col justify-between">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-pink-400/20 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
            <Car className="w-6 h-6" />
          </div>
          <span className="text-2xl font-bold tracking-tight">Charisma'Mobilité</span>
        </div>

        <div className="relative">
          <h2 className="text-4xl font-bold leading-tight mb-4">
            Pilotez votre plateforme<br />de covoiturage.
          </h2>
          <p className="text-purple-100 text-lg mb-10 max-w-md">
            Un espace unique pour superviser la communauté, les trajets et les réservations.
          </p>
          <ul className="space-y-4">
            {FEATURES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </span>
                <span className="font-medium">{label}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-purple-200">
          © {new Date().getFullYear()} Charisma'Move · Espace administrateur
        </p>
      </aside>

      {/* Formulaire */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8 text-purple-700">
            <Car className="w-7 h-7" />
            <span className="text-2xl font-bold">Charisma'Mobilité</span>
          </div>

          <div className="bg-white rounded-2xl shadow-xl shadow-purple-100 border border-gray-100 p-8 sm:p-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center mb-6 shadow-lg shadow-purple-200">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Connexion Admin</h1>
            <p className="text-gray-500 mb-8">Accès réservé aux administrateurs.</p>

            {error && (
              <div role="alert" className="flex items-start gap-3 mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
                <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="admin-email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Adresse email
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="admin-email"
                    type="email"
                    autoComplete="username"
                    placeholder="admin@charisma-move.fr"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={`${inputClass} pr-4`}
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="admin-password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Votre mot de passe"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className={`${inputClass} pr-12`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="group w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-purple-200 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Connexion en cours...
                  </>
                ) : (
                  <>
                    Se connecter
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            <a href="/" className="text-purple-600 hover:text-purple-800 font-medium">
              ← Retour au site
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}

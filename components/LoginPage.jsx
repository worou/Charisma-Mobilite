import React, { useState, useEffect } from 'react';
import { useApp } from './context.jsx';
import Toast from './Toast';
import OAuthButtons from './OAuthButtons';

const LoginPage = () => {
  const { login, setCurrentPage, error, clearError } = useApp();
  const [form, setForm] = useState({
    email: '',
    password: ''
  });
  // Affiche l'erreur éventuelle d'un retour Google/GitHub
  const [toast, setToast] = useState(() => (error ? { message: error, type: 'error' } : null));
  useEffect(() => { clearError(); }, [clearError]);
  const [isLoading, setIsLoading] = useState(false);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.email || !form.password) {
      showToast('Veuillez remplir tous les champs', 'error');
      return;
    }

    setIsLoading(true);
    const result = await login(form.email, form.password);
    
    if (result.success) {
      showToast('Connexion réussie !', 'success');
      setTimeout(() => setCurrentPage('home'), 1000);
    } else {
      showToast(result.error || 'Erreur de connexion', 'error');
    }
    
    setIsLoading(false);
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-purple-800 flex items-center justify-center p-4">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Connexion</h1>
          <p className="text-gray-600">Accédez à votre compte Charisma'Move</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
              Adresse email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="votre@email.com"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
              Mot de passe
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Votre mot de passe"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </form>

        <div className="mt-6">
          <OAuthButtons />
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Pas encore de compte ?{' '}
            <button
              onClick={() => setCurrentPage('register')}
              className="text-purple-600 hover:text-purple-700 font-semibold"
            >
              S'inscrire
            </button>
          </p>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => setCurrentPage('home')}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            ← Retour à l'accueil
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

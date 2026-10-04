import React, { useState } from 'react';
import { useApp } from './context.jsx';
import Toast from './Toast';
import OAuthButtons from './OAuthButtons';

const RegisterPage = () => {
  const { setCurrentPage } = useApp();
  const [form, setForm] = useState({
    name: '',
    firstName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    gender: ''
  });
  const [toast, setToast] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const validateForm = () => {
    if (!form.name || !form.email || !form.password || !form.confirmPassword) {
      showToast('Veuillez remplir tous les champs obligatoires', 'error');
      return false;
    }

    if (form.password !== form.confirmPassword) {
      showToast('Les mots de passe ne correspondent pas', 'error');
      return false;
    }

    if (form.password.length < 6) {
      showToast('Le mot de passe doit contenir au moins 6 caractères', 'error');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      showToast('Veuillez entrer une adresse email valide', 'error');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          first_name: form.firstName,
          email: form.email,
          password: form.password,
          phone: form.phone,
          gender: form.gender
        })
      });

      if (response.ok) {
        showToast('Inscription réussie ! Vous pouvez maintenant vous connecter.', 'success');
        setTimeout(() => setCurrentPage('login'), 2000);
      } else {
        const data = await response.json();
        showToast(data.error || 'Erreur lors de l\'inscription', 'error');
      }
    } catch (error) {
      showToast('Erreur de connexion au serveur', 'error');
    } finally {
      setIsLoading(false);
    }
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Inscription</h1>
          <p className="text-gray-600">Rejoignez la communauté Charisma'Move</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
              Nom <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Votre nom"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
              required
            />
          </div>

          <div>
            <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700 mb-2">
              Prénom
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              placeholder="Votre prénom"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
              Email <span className="text-red-500">*</span>
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
              Mot de passe <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Au moins 6 caractères"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
              required
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
              Confirmer le mot de passe <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Confirmez votre mot de passe"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
              required
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
              Téléphone
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="06 12 34 56 78"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label htmlFor="gender" className="block text-sm font-semibold text-gray-700 mb-2">
              Genre
            </label>
            <select
              id="gender"
              name="gender"
              value={form.gender}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
            >
              <option value="">Sélectionner</option>
              <option value="M">Homme</option>
              <option value="F">Femme</option>
              <option value="O">Autre</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            {isLoading ? 'Inscription en cours...' : 'S\'inscrire'}
          </button>
        </form>

        <div className="mt-6">
          <OAuthButtons />
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Déjà un compte ?{' '}
            <button
              onClick={() => setCurrentPage('login')}
              className="text-purple-600 hover:text-purple-700 font-semibold"
            >
              Se connecter
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

export default RegisterPage;

import React, { useState } from 'react';
import { Car, Home, Search, BookOpen, Heart, Calendar, Menu, X, ScanLine } from 'lucide-react';
import { useApp } from './context.jsx';
import NotificationBell from './NotificationBell';
import InstallAppButton from './InstallAppButton';

const Navigation = () => {
  const { currentPage, setCurrentPage, isAuthenticated, user } = useApp();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menuItems = [
    { id: 'home', label: 'Accueil', icon: <Home className="w-4 h-4" /> },
    { id: 'search-results', label: 'Rechercher', icon: <Search className="w-4 h-4" /> },
    { id: 'publish', label: 'Publier', icon: <Car className="w-4 h-4" /> },
    { id: 'how-it-works', label: 'Comment ça marche', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'about', label: 'À propos', icon: <Heart className="w-4 h-4" /> },
    { id: 'my-bookings', label: 'Mes réservations', icon: <Calendar className="w-4 h-4" /> },
    // Chauffeurs de bus : scan des billets à la montée
    ...(isAuthenticated && user?.is_driver ? [{ id: 'driver', label: 'Chauffeur', icon: <ScanLine className="w-4 h-4" /> }] : []),
  ];

  return (
    <header className="bg-white shadow-lg sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <button onClick={() => setCurrentPage('home')} className="flex items-center">
              <Car className="h-8 w-8 text-purple-600 mr-2" />
              <span className="text-xl 2xl:text-2xl font-bold whitespace-nowrap bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Charisma'Mobilité
              </span>
            </button>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden xl:block">
            <div className="ml-6 flex items-baseline space-x-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  className={`px-2.5 py-2 rounded-lg text-sm whitespace-nowrap font-medium transition-colors flex items-center ${
                    currentPage === item.id ? 'text-purple-600 bg-purple-50' : 'text-gray-900 hover:text-purple-600'
                  }`}
                >
                  {item.icon}
                  <span className="ml-2">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Auth Buttons */}
          <div className="hidden xl:flex items-center space-x-2 ml-2">
            <InstallAppButton variant="nav" />
            {isAuthenticated ? (
              <>
                <NotificationBell />
                <button onClick={() => setCurrentPage('profile')} className="text-purple-600 hover:text-purple-800 font-medium whitespace-nowrap">
                  Mon profil
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setCurrentPage('login')} className="text-purple-600 hover:text-purple-800 font-medium whitespace-nowrap">
                  Se connecter
                </button>
                <button
                  onClick={() => setCurrentPage('register')}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-5 py-2 rounded-full font-medium whitespace-nowrap hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105"
                >
                  S'inscrire
                </button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="xl:hidden flex items-center gap-2">
            {isAuthenticated && <NotificationBell />}
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-gray-500 hover:text-gray-600">
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="xl:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t">
              <InstallAppButton variant="menu" className="mb-2" onDone={() => setIsMenuOpen(false)} />
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentPage(item.id);
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center w-full px-3 py-2 text-base font-medium text-gray-900 hover:text-purple-600"
                >
                  {item.icon}
                  <span className="ml-2">{item.label}</span>
                </button>
              ))}
              {isAuthenticated ? (
                <button
                  onClick={() => {
                    setCurrentPage('profile');
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center w-full px-3 py-2 text-base font-medium text-gray-900 hover:text-purple-600"
                >
                  Mon profil
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setCurrentPage('login');
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center w-full px-3 py-2 text-base font-medium text-gray-900 hover:text-purple-600"
                  >
                    Se connecter
                  </button>
                  <button
                    onClick={() => {
                      setCurrentPage('register');
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center w-full px-3 py-2 text-base font-medium text-gray-900 hover:text-purple-600"
                  >
                    S'inscrire
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Navigation;

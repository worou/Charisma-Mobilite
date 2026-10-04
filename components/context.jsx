import React, { useState, useEffect, useCallback } from 'react';

export const AppContext = React.createContext();

export const useApp = () => {
  const context = React.useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [currentPage, setCurrentPage] = useState('home');
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setTokenState] = useState(() => localStorage.getItem('token'));
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams, setSearchParams] = useState(null);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [error, setError] = useState(null);

  const setToken = useCallback((t) => {
    if (t) {
      localStorage.setItem('token', t);
    } else {
      localStorage.removeItem('token');
    }
    setTokenState(t);
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      if (!response.ok) {
        throw new Error('Identifiants invalides');
      }
      
      const data = await response.json();
      setToken(data.token);
      setUser(data.user);
      setIsAuthenticated(true);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, [setToken]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setSearchResults([]);
    setSearchParams(null);
  }, [setToken]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Retour de connexion Google/GitHub : le backend renvoie le jeton (ou l'erreur) dans le fragment d'URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const oauthToken = params.get('oauth_token');
    const oauthError = params.get('oauth_error');
    if (!oauthToken && !oauthError) return;
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    if (oauthToken) {
      setToken(oauthToken);
    } else {
      setError(oauthError);
      setCurrentPage('login');
    }
  }, [setToken]);

  // Notifications (ex. bus complet) : rechargées à la connexion puis toutes les minutes
  const [notifications, setNotifications] = useState([]);

  const refreshNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setNotifications(await res.json());
    } catch {
      /* réseau indisponible : on garde la liste actuelle */
    }
  }, [token]);

  const markNotificationsRead = useCallback(async () => {
    if (!token) return;
    setNotifications((list) => list.map((n) => ({ ...n, is_read: 1 })));
    await fetch('/api/notifications/read', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      return;
    }
    refreshNotifications();
    const timer = setInterval(refreshNotifications, 60000);
    return () => clearInterval(timer);
  }, [isAuthenticated, refreshNotifications]);

  // Vérifier l'authentification au chargement
  useEffect(() => {
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('Token invalide');
        })
        .then(data => {
          setUser(data.user);
          setIsAuthenticated(true);
        })
        .catch(() => {
          logout();
        });
    }
  }, [token, logout]);

  const value = {
    currentPage,
    setCurrentPage,
    user,
    setUser,
    isAuthenticated,
    setIsAuthenticated,
    token,
    setToken,
    searchResults,
    setSearchResults,
    isLoading,
    setIsLoading,
    searchParams,
    setSearchParams,
    selectedTrip,
    setSelectedTrip,
    error,
    setError,
    clearError,
    login,
    logout,
    notifications,
    refreshNotifications,
    markNotificationsRead
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

import React, { useState, useEffect } from 'react';

// La présence d'un jeton dans localStorage ne suffit pas : au-delà de sa durée
// de vie (8 h pour un admin) l'API le refuse en 403. Sans ce contrôle,
// l'interface se croit connectée et chaque section affiche son message
// d'erreur, sans jamais proposer de se reconnecter.
const readValidToken = () => {
  const t = localStorage.getItem('adminToken');
  if (!t) return null;
  try {
    const { exp } = JSON.parse(atob(t.split('.')[1]));
    return exp && exp * 1000 > Date.now() ? t : null;
  } catch {
    return null; // jeton illisible : traité comme absent
  }
};

export const AdminContext = React.createContext();

export const useAdmin = () => {
  const context = React.useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within AdminProvider');
  }
  return context;
};

export const AdminProvider = ({ children }) => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [adminUser, setAdminUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!readValidToken());
  const [token, setTokenState] = useState(readValidToken);

  // purge un jeton expiré ou illisible resté en stockage
  useEffect(() => {
    if (!readValidToken()) localStorage.removeItem('adminToken');
  }, []);

  const setToken = (t) => {
    if (t) {
      localStorage.setItem('adminToken', t);
    } else {
      localStorage.removeItem('adminToken');
    }
    setTokenState(t);
  };

  // Expiration en cours de session : ramène à l'écran de connexion.
  const logout = () => {
    setToken(null);
    setAdminUser(null);
    setIsAuthenticated(false);
    setCurrentPage('dashboard');
  };

  const value = {
    currentPage,
    setCurrentPage,
    adminUser,
    setAdminUser,
    isAuthenticated,
    setIsAuthenticated,
    token,
    setToken,
    logout,
  };

  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
};

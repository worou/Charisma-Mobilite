import React, { lazy, Suspense } from 'react';
import { BarChart3, Users, Car, Bus, Calendar, Settings, LogOut, ChevronRight, ChevronLeft } from 'lucide-react';
import { useAdmin } from './AdminContext.jsx';
import AdminLoginPage from './AdminLoginPage.jsx';

const AdminDashboard = lazy(() => import('./AdminDashboard'));
const AdminUsers    = lazy(() => import('./AdminUsers'));
const AdminTrips    = lazy(() => import('./AdminTrips'));
const AdminBookings = lazy(() => import('./AdminBookings'));
const AdminBusLines = lazy(() => import('./AdminBusLines'));
const AdminSettings = lazy(() => import('./AdminSettings'));

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard',      icon: BarChart3  },
  { id: 'users',     label: 'Utilisateurs',   icon: Users      },
  { id: 'trips',     label: 'Trajets',         icon: Car        },
  { id: 'bookings',  label: 'Réservations',   icon: Calendar   },
  { id: 'bus',       label: 'Lignes de bus',  icon: Bus        },
  { id: 'settings',  label: 'Paramètres',     icon: Settings   },
];

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  users:     'Utilisateurs',
  trips:     'Trajets',
  bookings:  'Réservations',
  bus:       'Lignes de bus',
  settings:  'Paramètres',
};

const AdminApp = () => {
  const {
    currentPage, setCurrentPage,
    isAuthenticated,
    adminUser,
    setIsAuthenticated, setAdminUser, setToken,
  } = useAdmin();
  const [collapsed, setCollapsed] = React.useState(false);

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAdminUser(null);
    setToken(null);
    setCurrentPage('dashboard');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <AdminDashboard />;
      case 'users':     return <AdminUsers />;
      case 'trips':     return <AdminTrips />;
      case 'bookings':  return <AdminBookings />;
      case 'bus':       return <AdminBusLines />;
      case 'settings':  return <AdminSettings />;
      default:          return <AdminDashboard />;
    }
  };

  if (!isAuthenticated) return <AdminLoginPage />;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-gray-900 text-white flex flex-col flex-shrink-0 transition-all duration-200`}>
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-700">
          {!collapsed && (
            <span className="font-bold text-white truncate">Charisma'Mobilité</span>
          )}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="p-1.5 rounded hover:bg-gray-700 transition-colors ml-auto flex-shrink-0"
          >
            {collapsed
              ? <ChevronRight className="w-4 h-4" />
              : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 space-y-0.5">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setCurrentPage(id)}
              title={collapsed ? label : undefined}
              className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-colors ${
                currentPage === id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="ml-3">{label}</span>}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-700 p-4">
          {!collapsed && adminUser && (
            <div className="mb-3">
              <p className="text-sm font-medium text-white truncate">{adminUser.name}</p>
              <p className="text-xs text-gray-400 truncate">{adminUser.email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            title={collapsed ? 'Déconnexion' : undefined}
            className="w-full flex items-center px-2 py-2 text-sm text-gray-300 hover:text-red-400 hover:bg-gray-800 rounded transition-colors"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span className="ml-3">Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b flex items-center px-6 shadow-sm">
          <h1 className="text-xl font-semibold text-gray-800">
            {PAGE_TITLES[currentPage] || 'Admin'}
          </h1>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Suspense fallback={
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
              Chargement…
            </div>
          }>
            {renderPage()}
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default AdminApp;

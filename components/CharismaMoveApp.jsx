import React, { Suspense, lazy } from 'react';
import { useApp } from './context.jsx';
import Navigation from './Navigation';
import Footer from './Footer';
import HomePage from './HomePage';

const SearchResultsPage = lazy(() => import('./SearchResultsPage'));
const AboutPage = lazy(() => import('./AboutPage'));
const LoginPage = lazy(() => import('./LoginPage'));
const RegisterPage = lazy(() => import('./RegisterPage'));
const ProfilePage = lazy(() => import('./ProfilePage'));
const PublishTripPage = lazy(() => import('./PublishTripPage'));
const BookingPage = lazy(() => import('./BookingPage'));
const MyBookingsPage = lazy(() => import('./MyBookingsPage'));

const CharismaMoveApp = () => {
  const { currentPage } = useApp();

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage />;
      case 'search-results':
        return <SearchResultsPage />;
      case 'about':
        return <AboutPage />;
      case 'login':
        return <LoginPage />;
      case 'register':
        return <RegisterPage />;
      case 'profile':
        return <ProfilePage />;
      case 'publish':
        return <PublishTripPage />;
      case 'booking':
        return <BookingPage />;
      case 'my-bookings':
        return <MyBookingsPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <main>
        <Suspense fallback={<div className="p-8">Chargement...</div>}>
          {renderPage()}
        </Suspense>
      </main>
      <Footer />
    </div>
  );
};

export default CharismaMoveApp;

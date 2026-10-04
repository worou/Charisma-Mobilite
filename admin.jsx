import './apiBase.js';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { AdminProvider } from './components/AdminContext.jsx';
import AdminApp from './components/AdminApp';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AdminProvider>
      <AdminApp />
    </AdminProvider>
  </React.StrictMode>
);

import React from 'react';
import { Shield, Mail, ExternalLink, Server } from 'lucide-react';
import { useAdmin } from './AdminContext.jsx';

const AdminSettings = () => {
  const { adminUser } = useAdmin();

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Compte administrateur</h2>
        <dl className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Shield className="w-4 h-4 text-purple-500 flex-shrink-0" />
            <dt className="text-gray-500 w-24">Rôle</dt>
            <dd className="font-medium text-gray-900">Administrateur</dd>
          </div>
          {adminUser && (
            <>
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <dt className="text-gray-500 w-24">Email</dt>
                <dd className="font-medium text-gray-900">{adminUser.email}</dd>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Shield className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <dt className="text-gray-500 w-24">Nom</dt>
                <dd className="font-medium text-gray-900">{adminUser.name}</dd>
              </div>
            </>
          )}
          <div className="flex items-center gap-3 text-sm">
            <Server className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <dt className="text-gray-500 w-24">API</dt>
            <dd className="font-medium text-gray-900">http://localhost:3001</dd>
          </div>
        </dl>
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-2">Documentation API</h2>
        <p className="text-sm text-gray-600 mb-4">
          Consultez la documentation Swagger pour explorer et tester tous les endpoints de l'API.
        </p>
        <a
          href="http://localhost:3001/api-docs"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Ouvrir Swagger UI
        </a>
      </div>
    </div>
  );
};

export default AdminSettings;

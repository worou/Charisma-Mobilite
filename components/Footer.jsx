import React from 'react';
import { Car } from 'lucide-react';
import { useApp } from './context.jsx';

const Footer = () => {
  const { setCurrentPage } = useApp();

  return (
    <footer className="bg-gray-900 text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center mb-6">
              <Car className="h-8 w-8 text-purple-400 mr-2" />
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Charisma'Mobilité
              </span>
            </div>
            <p className="text-gray-400 mb-6 max-w-md">
              La plateforme de covoiturage qui révolutionne vos déplacements en France.
              Économique, écologique et convivial.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-6 text-purple-400">Entreprise</h4>
            <ul className="space-y-3">
              <li>
                <button onClick={() => setCurrentPage('about')} className="text-gray-400 hover:text-white transition-colors">
                  À propos
                </button>
              </li>
              <li>
                <button className="text-gray-400 hover:text-white transition-colors">Carrières</button>
              </li>
              <li>
                <button className="text-gray-400 hover:text-white transition-colors">Presse</button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-6 text-purple-400">Support</h4>
            <ul className="space-y-3">
              <li>
                <button className="text-gray-400 hover:text-white transition-colors">Centre d'aide</button>
              </li>
              <li>
                <button className="text-gray-400 hover:text-white transition-colors">Nous contacter</button>
              </li>
              <li>
                <button className="text-gray-400 hover:text-white transition-colors">Sécurité</button>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
          <p>&copy; 2025 Charisma'Move. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

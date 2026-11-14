import React, { useEffect, useState } from 'react';
import { Download, Smartphone, X, Share, PlusSquare, MoreVertical, CheckCircle2 } from 'lucide-react';
import { canPromptInstall, isIOS, isStandalone, promptInstall, subscribe } from '../pwa.js';

const Step = ({ n, children }) => (
  <li className="flex items-start gap-3">
    <span className="shrink-0 w-7 h-7 rounded-full bg-purple-100 text-purple-700 text-sm font-bold flex items-center justify-center">{n}</span>
    <span className="text-gray-700 pt-0.5">{children}</span>
  </li>
);

// Instructions quand le navigateur ne propose pas de fenêtre d'installation (iPhone, Firefox…)
function InstallHelp({ onClose }) {
  const ios = isIOS();
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-title"
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <img src="/icons/icon-192.png" alt="" className="w-12 h-12 rounded-xl" />
            <div>
              <h2 id="install-title" className="text-lg font-bold text-gray-900">Installer Charisma'Mobilité</h2>
              <p className="text-sm text-gray-500">Gratuit · sans passer par un store</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {ios ? (
          <ol className="space-y-4">
            <Step n={1}>Ouvrez ce site dans <strong>Safari</strong>.</Step>
            <Step n={2}>
              Touchez le bouton <strong>Partager</strong> <Share className="inline w-4 h-4 text-blue-500 -mt-1" /> en bas de l'écran.
            </Step>
            <Step n={3}>
              Choisissez <strong>« Sur l'écran d'accueil »</strong> <PlusSquare className="inline w-4 h-4 -mt-1" />, puis <strong>Ajouter</strong>.
            </Step>
          </ol>
        ) : (
          <ol className="space-y-4">
            <Step n={1}>
              Ouvrez le menu du navigateur <MoreVertical className="inline w-4 h-4 -mt-1" /> (en haut à droite).
            </Step>
            <Step n={2}>
              Choisissez <strong>« Installer l'application »</strong> ou <strong>« Ajouter à l'écran d'accueil »</strong>.
            </Step>
            <Step n={3}>Confirmez : l'icône Charisma'Mobilité apparaît avec vos autres applications.</Step>
          </ol>
        )}

        <button
          onClick={onClose}
          className="mt-6 w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition"
        >
          J'ai compris
        </button>
      </div>
    </div>
  );
}

// variant : « nav » (bouton compact du menu ordinateur), « menu » (ligne du menu mobile), « hero »
export default function InstallAppButton({ variant = 'hero', className = '', onDone }) {
  const [, refresh] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => subscribe(() => refresh((n) => n + 1)), []);

  // Déjà ouverte comme application installée : pas de bouton
  if (isStandalone()) return null;

  const handleClick = async () => {
    if (canPromptInstall()) {
      if (await promptInstall()) {
        setInstalled(true);
        onDone?.();
      }
    } else {
      setShowHelp(true);
    }
  };
  const closeHelp = () => {
    setShowHelp(false);
    onDone?.();
  };

  if (installed) {
    return (
      <span className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold text-green-700 bg-green-50 ${className}`}>
        <CheckCircle2 className="w-4 h-4" /> Application installée
      </span>
    );
  }

  const help = showHelp && <InstallHelp onClose={closeHelp} />;

  if (variant === 'nav') {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          title="Télécharger l'application mobile"
          aria-label="Télécharger l'application mobile"
          className={`inline-flex items-center gap-1.5 p-2 2xl:px-3 rounded-full text-sm font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 transition whitespace-nowrap ${className}`}
        >
          <Download className="w-4 h-4" />
          <span className="hidden 2xl:inline">Application</span>
        </button>
        {help}
      </>
    );
  }

  if (variant === 'menu') {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          className={`flex items-center w-full px-3 py-3 rounded-xl text-base font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 ${className}`}
        >
          <Smartphone className="w-5 h-5" />
          <span className="ml-2 flex-1 text-left">Télécharger l'application</span>
          <Download className="w-5 h-5" />
        </button>
        {help}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`group inline-flex items-center gap-3 pl-4 pr-6 py-3 rounded-2xl bg-white text-purple-700 font-semibold shadow-lg shadow-purple-900/20 hover:-translate-y-0.5 hover:shadow-xl transition ${className}`}
      >
        <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center">
          <Smartphone className="w-5 h-5" />
        </span>
        <span className="text-left leading-tight">
          <span className="block text-xs font-medium text-purple-500">Gratuit · Android & iPhone</span>
          Télécharger l'application
        </span>
        <Download className="w-5 h-5 transition-transform group-hover:translate-y-0.5" />
      </button>
      {help}
    </>
  );
}

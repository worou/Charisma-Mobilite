// Application installable (PWA) : enregistrement du service worker et gestion de l'installation.
// L'évènement « beforeinstallprompt » n'est émis qu'une fois, tôt au chargement : on le garde ici
// pour que le bouton « Télécharger l'application » puisse l'utiliser plus tard.
let deferredPrompt = null;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

export const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPad en mode « bureau »

export const canPromptInstall = () => deferredPrompt !== null;

export const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

// Affiche la fenêtre d'installation native ; renvoie true si l'utilisateur accepte
export async function promptInstall() {
  if (!deferredPrompt) return false;
  const prompt = deferredPrompt;
  deferredPrompt = null;
  prompt.prompt();
  const { outcome } = await prompt.userChoice;
  notify();
  return outcome === 'accepted';
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault(); // on affiche notre propre bouton à la place de la bannière du navigateur
  deferredPrompt = event;
  notify();
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  notify();
});

// En développement, pas de service worker : son cache masquerait les rechargements de Vite
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('Service worker non enregistré :', err));
  });
}

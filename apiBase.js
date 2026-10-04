// En production, le site et l'API sont sur deux domaines différents.
// VITE_API_URL (fixée au build) préfixe tous les appels « /api/... » ; en développement
// elle est vide et le proxy Vite transmet /api au backend local.
export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export const apiUrl = (path) => (API_URL && path.startsWith('/api') ? API_URL + path : path);

if (API_URL) {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init) => nativeFetch(typeof input === 'string' ? apiUrl(input) : input, init);
}

import React from 'react';
import { Github } from 'lucide-react';

// Navigation pleine page : le backend redirige vers Google/GitHub puis revient sur le site.
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z" />
    <path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
  </svg>
);

const OAuthButtons = () => (
  <div className="space-y-3">
    <div className="flex items-center gap-3 text-sm text-gray-400">
      <span className="flex-1 h-px bg-gray-200" />
      ou
      <span className="flex-1 h-px bg-gray-200" />
    </div>
    <a
      href="/api/auth/google"
      className="w-full flex items-center justify-center gap-3 border-2 border-gray-200 py-3 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
    >
      <GoogleIcon />
      Continuer avec Google
    </a>
    <a
      href="/api/auth/github"
      className="w-full flex items-center justify-center gap-3 bg-gray-900 py-3 rounded-xl font-semibold text-white hover:bg-gray-800 transition-colors"
    >
      <Github className="w-5 h-5" />
      Continuer avec GitHub
    </a>
  </div>
);

export default OAuthButtons;

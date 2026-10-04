import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Sert admin.html sur /admin (et /admin/...) sans exposer l'extension .html.
// Réécriture interne : l'URL affichée reste /admin.
function adminRoute() {
  const rewrite = (req, _res, next) => {
    const [pathname, search = ''] = req.url.split('?');
    if (pathname === '/admin' || pathname === '/admin/' || pathname.startsWith('/admin/')) {
      req.url = '/admin.html' + (search ? `?${search}` : '');
    }
    next();
  };

  return {
    name: 'charisma-admin-route',
    configureServer(server) {
      server.middlewares.use(rewrite);
    },
    configurePreviewServer(server) {
      server.middlewares.use(rewrite);
    },
  };
}

export default defineConfig({
  plugins: [react(), adminRoute()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'vendor';
          if (id.includes('node_modules/recharts')) return 'charts';
          if (id.includes('node_modules/lucide-react')) return 'icons';
        },
      },
    },
  },
});

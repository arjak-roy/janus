import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendTarget = env.VITE_PROXY_BACKEND_TARGET || 'http://localhost:8080';
  const janusWsTarget = env.VITE_PROXY_JANUS_WS_TARGET || 'ws://localhost:8188';

  return {
    plugins: [react()],
    server: {
      port: 3000,
      host: true,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true
        },
        '/health': {
          target: backendTarget,
          changeOrigin: true
        },
        '/janus-ws': {
          target: janusWsTarget,
          ws: true,
          changeOrigin: true
        }
      }
    },
    define: {
      // janus-gateway expects 'global' to be defined (it's a Node.js-ism)
      global: 'window'
    },
    optimizeDeps: {
      // Force Vite to pre-bundle janus-gateway so its CJS exports are resolved
      include: ['janus-gateway', 'webrtc-adapter']
    }
  };
});

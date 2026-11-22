import { defineConfig, normalizePath } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cesium build directory in monorepo root
const cesiumSource = normalizePath(path.resolve(__dirname, '../node_modules/cesium/Build/Cesium'));
const cesiumBaseUrl = 'cesium';

export default defineConfig({
  define: {
    CESIUM_BASE_URL: JSON.stringify(`/${cesiumBaseUrl}`),
  },
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        { src: `${cesiumSource}/Assets/*`, dest: `${cesiumBaseUrl}/Assets` },
        { src: `${cesiumSource}/Workers/*`, dest: `${cesiumBaseUrl}/Workers` },
        { src: `${cesiumSource}/Widgets/*`, dest: `${cesiumBaseUrl}/Widgets` },
        { src: `${cesiumSource}/ThirdParty/*`, dest: `${cesiumBaseUrl}/ThirdParty` },
      ],
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});

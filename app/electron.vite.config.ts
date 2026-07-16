import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { TanStackRouterVite } from '@tanstack/router-vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

const shared = path.resolve(__dirname, 'shared');

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: { '@shared': shared } },
    build: {
      rollupOptions: { input: { index: path.resolve(__dirname, 'electron/main.ts') } },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: { '@shared': shared } },
    build: {
      rollupOptions: { input: { index: path.resolve(__dirname, 'electron/preload.ts') } },
    },
  },
  renderer: {
    root: '.',
    resolve: { alias: { '@': path.resolve(__dirname, 'src'), '@shared': shared } },
    plugins: [
      react(),
      TanStackRouterVite({
        routesDirectory: './src/routes',
        generatedRouteTree: './src/routeTree.gen.ts',
      }),
      tailwindcss(),
    ],
    build: {
      rollupOptions: { input: { index: path.resolve(__dirname, 'index.html') } },
    },
  },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { execSync } from 'child_process';

// Get git commit hash for version indicator
function getGitCommitHash(): string {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'unknown';
  }
}

export default defineConfig({
  plugins: [react()],
  root: '.',
  base: './',

  define: {
    __GIT_COMMIT__: JSON.stringify(getGitCommitHash()),
  },

  build: {
    outDir: 'dist',
    target: 'es2020',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      'shared': resolve(__dirname, '../../shared/types'),
    },
  },

  server: {
    port: 3000,
    open: true,
  },

  preview: {
    port: 4173,
  },
});

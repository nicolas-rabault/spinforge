/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Le jeu est servi depuis https://nicolas-rabault.github.io/spinforge/
  base: '/spinforge/',
  plugins: [react()],
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});

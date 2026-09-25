import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En GitHub Pages el sitio vive en /Castillo-Medieval/; en local, en la raíz.
export default defineConfig({
  base: process.env.PAGES_BASE ?? '/',
  plugins: [react()],
});

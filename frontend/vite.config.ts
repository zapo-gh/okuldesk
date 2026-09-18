import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const ZOD_ANNOTATION_WARNING_FILES = [
  'node_modules/zod/v4/core/util.js',
  'node_modules/zod/v4/core/regexes.js',
];

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Derlenmiş frontend, backend'in dist/public klasörüne gider
    outDir: path.resolve(__dirname, '../backend/dist/public'),
    emptyOutDir: true,
    rollupOptions: {
      onwarn(warning, defaultWarn) {
        const isKnownZodAnnotationWarning =
          warning.code === 'INVALID_ANNOTATION' &&
          typeof warning.id === 'string' &&
          ZOD_ANNOTATION_WARNING_FILES.some((file) => warning.id?.includes(file));

        if (isKnownZodAnnotationWarning) {
          return;
        }

        defaultWarn(warning);
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});

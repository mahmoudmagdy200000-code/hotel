import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Enable source maps for debugging (optional, remove in prod if desired)
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime — cached long-term, rarely changes
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Data layer — tanstack query + axios
          'vendor-data': ['@tanstack/react-query', 'axios'],
          // UI primitives — Radix + shadcn deps
          'vendor-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-label',
            '@radix-ui/react-popover',
            '@radix-ui/react-slot',
            '@radix-ui/react-tabs',
            'class-variance-authority',
            'clsx',
            'tailwind-merge',
          ],
          // Date utilities
          'vendor-date': ['date-fns', 'react-day-picker'],
          // Icons — lucide tree-shakes well but isolating prevents it from bloating app chunk
          'vendor-icons': ['lucide-react'],
          // i18n
          'vendor-i18n': ['i18next', 'react-i18next'],
        },
      },
    },
  },
})

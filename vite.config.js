import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: true,
    port: 5173
  },
  build: {
    target: 'esnext',
    cssMinify: true,
    // Raise warning threshold — lazy chunks are expected to be large individually
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Granular vendor splitting + React.lazy() pages get their own auto chunks
        manualChunks(id) {
          if (!id.includes('node_modules')) return // let lazy pages auto-chunk

          // Individual phosphor icons are tiny — merge them into one chunk
          if (id.includes('@phosphor-icons')) return 'vendor-icons'
          if (id.includes('@supabase'))       return 'vendor-supabase'
          if (id.includes('motion'))          return 'vendor-motion'
          // react + react-dom + react-router together (always co-loaded)
          if (id.includes('react'))           return 'vendor-react'
          // Everything else (small utils)
          return 'vendor-common'
        }
      }
    }
  }
})

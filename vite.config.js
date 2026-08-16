import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Plugin to replace placeholders in firebase-messaging-sw.js with actual env values
function firebaseSwConfigPlugin() {
  let env = {};

  return {
    name: 'firebase-sw-config',
    configResolved(resolvedConfig) {
      // Load env variables when config is resolved
      env = loadEnv(resolvedConfig.mode, process.cwd(), 'VITE_');
    },
    // Handle dev server - serve processed service worker
    configureServer(server) {
      server.middlewares.use('/firebase-messaging-sw.js', (req, res, next) => {
        const swPath = path.resolve('public/firebase-messaging-sw.js');
        let content = fs.readFileSync(swPath, 'utf-8');

        const replacements = {
          '__FIREBASE_API_KEY__': env.VITE_FIREBASE_API_KEY || '',
          '__FIREBASE_AUTH_DOMAIN__': env.VITE_FIREBASE_AUTH_DOMAIN || '',
          '__FIREBASE_PROJECT_ID__': env.VITE_FIREBASE_PROJECT_ID || '',
          '__FIREBASE_STORAGE_BUCKET__': env.VITE_FIREBASE_STORAGE_BUCKET || '',
          '__FIREBASE_MESSAGING_SENDER_ID__': env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
          '__FIREBASE_APP_ID__': env.VITE_FIREBASE_APP_ID || '',
        };

        for (const [placeholder, value] of Object.entries(replacements)) {
          content = content.replace(new RegExp(placeholder, 'g'), value);
        }

        res.setHeader('Content-Type', 'application/javascript');
        res.setHeader('Service-Worker-Allowed', '/');
        res.end(content);
      });
    },
    // Handle build - process the copied service worker in the output directory
    closeBundle() {
      const outputPath = path.resolve('dist/firebase-messaging-sw.js');
      if (fs.existsSync(outputPath)) {
        let content = fs.readFileSync(outputPath, 'utf-8');

        const replacements = {
          '__FIREBASE_API_KEY__': env.VITE_FIREBASE_API_KEY || '',
          '__FIREBASE_AUTH_DOMAIN__': env.VITE_FIREBASE_AUTH_DOMAIN || '',
          '__FIREBASE_PROJECT_ID__': env.VITE_FIREBASE_PROJECT_ID || '',
          '__FIREBASE_STORAGE_BUCKET__': env.VITE_FIREBASE_STORAGE_BUCKET || '',
          '__FIREBASE_MESSAGING_SENDER_ID__': env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
          '__FIREBASE_APP_ID__': env.VITE_FIREBASE_APP_ID || '',
        };

        for (const [placeholder, value] of Object.entries(replacements)) {
          content = content.replace(new RegExp(placeholder, 'g'), value);
        }

        fs.writeFileSync(outputPath, content);
        console.log('[firebase-sw-config] Processed service worker with Firebase config');
      }
    },
  };
}

export default defineConfig({
  envPrefix: ['VITE_'], // Only VITE_ prefix is safe — avoids leaking server-side secrets
  plugins: [react(), firebaseSwConfigPlugin()],
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
          // Use path-segment matching to avoid false positives like @uploadthing/react
          if (/[/\\]node_modules[/\\](react-dom|react-router|react-router-dom|react)[/\\]/.test(id)) return 'vendor-react'
          // Everything else (small utils)
          return 'vendor-common'
        }
      }
    }
  }
})

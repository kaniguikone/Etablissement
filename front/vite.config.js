import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Accepte les connexions depuis n'importe quel hostname local
    host: '0.0.0.0',
    port: 5173,
    // Permet aux sous-domaines .localhost d'accéder au frontend
    allowedHosts: ['.localhost'],
  },
})

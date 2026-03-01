import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // WithoutBG API proxy - bypass CORS
      '/api/withoutbg': {
        target: 'https://api.withoutbg.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/withoutbg/, ''),
        headers: {
          'Origin': 'https://api.withoutbg.com',
        },
      },
    },
  },
})

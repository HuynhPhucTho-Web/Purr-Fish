import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'react-vendor',
              test: /node_modules\/(react|react-dom)/,
              priority: 2,
            },
            {
              name: 'firebase-firestore',
              test: /node_modules\/(@firebase\/firestore|firebase\/firestore)/,
              priority: 3,
            },
            {
              name: 'firebase-auth',
              test: /node_modules\/(@firebase\/auth|firebase\/auth)/,
              priority: 3,
            },
            {
              name: 'firebase-vendor',
              test: /node_modules\/(@firebase|firebase)/,
              priority: 1,
            },
          ],
        },
      },
    },
  },
})

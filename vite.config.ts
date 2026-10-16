import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// GitHub Pages serves the app from /ZettaLive/.
export default defineConfig({
  base: '/ZettaLive/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
})

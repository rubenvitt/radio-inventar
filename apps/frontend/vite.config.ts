import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [TanStackRouterVite({
    target: 'react',
    autoCodeSplitting: true,
  }), react(), tailwindcss(), sentryVitePlugin({
    org: "rubeen",
    project: "radio-frontend",
    url: "https://sentry.rubeen.dev/"
  })],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  build: {
    sourcemap: true
  }
})
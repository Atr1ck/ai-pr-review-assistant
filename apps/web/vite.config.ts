import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { timerify } from 'node:perf_hooks';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), 
            tailwindcss()
  ],
})

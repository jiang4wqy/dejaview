import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Deployed under https://jiang4wqy.github.io/dejaview/ , so every asset must
// resolve beneath the /dejaview/ sub-path. Overridable via BASE_PATH for a
// local preview at the root (BASE_PATH=/ npm run build).
const base = process.env.BASE_PATH ?? '/dejaview/'

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2020',
  },
})

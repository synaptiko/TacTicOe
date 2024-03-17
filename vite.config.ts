import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig((config) => ({
  plugins: [react()],
  base: config.mode === 'production' ? '/TacTicOe/' : '',
}));

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import glslHmr from './vite-plugin-glsl-hmr';

// https://vitejs.dev/config/
export default defineConfig((config) => ({
  plugins: [glslHmr(), react()],
  base: config.mode === 'production' ? '/TacTicOe/' : '',
}));

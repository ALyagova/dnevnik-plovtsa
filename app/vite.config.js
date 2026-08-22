import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ mode }) => ({
    // На GitHub Pages сайт открывается по адресу /dnevnik-plovtsa/.
    // В локальной разработке сохраняем привычный адрес в корне.
    base: mode === 'github-pages' ? '/dnevnik-plovtsa/' : '/',
    plugins: [react()],
}));

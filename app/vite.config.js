import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    // На GitHub Pages сайт открывается по адресу /dnevnik-plovtsa/.
    // В локальной разработке сохраняем привычный адрес в корне.
    base: process.env.GITHUB_ACTIONS ? '/dnevnik-plovtsa/' : '/',
    plugins: [react()],
});

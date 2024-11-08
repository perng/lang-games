import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    base: '/',
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                theArticleGame: resolve(__dirname, 'src/games/the-article-game/index.html')
            },
            output: {
                manualChunks: {
                    'home-vendor': ['./src/styles/global.css', './src/styles/home.css'],
                    'article-game': ['./src/games/the-article-game/main.ts']
                }
            }
        }
    },
    server: {
        open: true,
        proxy: {
            '/games': {
                target: 'http://localhost:3000',
                changeOrigin: true
            }
        }
    }
}) 
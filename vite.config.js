import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'node:path'

export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@': resolve(__dirname, './resources/js')
        }
    },
    base: './',
    build: {
        manifest: true,
        outDir: 'dist',
        emptyOutDir: true
    },
    server: {
        port: 5173,
        host: true
    }
})

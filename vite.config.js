import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'

import Components from 'unplugin-vue-components/vite'
import { BootstrapVueNextResolver } from 'bootstrap-vue-next/resolvers'

// https://vite.dev/config/
export default defineConfig({
	server: {
		host: true,
		port: 8080,
	},
	plugins: [
		vue(),
		vueJsx(),
		vueDevTools(),
		Components({ resolvers: [BootstrapVueNextResolver()] }),
	],
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url)),
		},
	},
	build: {
		rollupOptions: {
			output: {
				manualChunks: {
					pdfjs: ['pdfjs-dist'], // if using pdfjs
					vendor: ['vue', 'vue-router', 'pinia'], // core libraries
				},
			},
		},
	},
})

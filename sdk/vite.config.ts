import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
	plugins: [
		svelte({
			compilerOptions: {
				// Custom elements bundle their own tiny runtime — no separate
				// Svelte dependency for whoever embeds this.
				customElement: true
			}
		})
	],
	build: {
		lib: {
			entry: 'src/index.ts',
			name: 'Pzzlr',
			fileName: (format) => (format === 'es' ? 'pzzlr-sdk.js' : `pzzlr-sdk.${format}.js`),
			formats: ['es', 'iife']
		}
	}
});

import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// Deployed to Cloudflare Workers with a D1 database binding (see
			// wrangler.jsonc) — needed for a real HTTPS domain, which Sign in
			// with Apple requires.
			adapter: adapter(),

			// Apple's callback is a genuine cross-site POST (response_mode=
			// form_post from appleid.apple.com) — SvelteKit's CSRF guard blocks
			// that by default, separately from the trustedOrigins already set
			// on the better-auth side in auth.ts. Only enforced in production,
			// which is why this didn't show up in local dev.
			csrf: {
				trustedOrigins: ['https://appleid.apple.com']
			},

			typescript: {
				config: (config) => {
					config.include.push('../drizzle.config.ts');
				}
			}
		})
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});

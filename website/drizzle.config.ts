import { defineConfig } from 'drizzle-kit';

// Only used to generate SQL migration files from schema.ts — applying them
// to D1 (local or remote) goes through `wrangler d1 migrations apply`
// instead, so this doesn't need any live database credentials.
export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './migrations',
	dialect: 'sqlite',
	verbose: true,
	strict: false
});

import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';
import { getRequestEvent } from '$app/server';

let cachedDb: ReturnType<typeof drizzle<typeof schema>> | undefined;

// The D1 binding only exists once a request has actually arrived at the
// Worker (see wrangler.jsonc) — there's no module-load-time equivalent of
// the old `DATABASE_URL` env var to build this from eagerly. getRequestEvent
// reaches into the request that's currently being handled, so every caller
// (games.ts, puzzle-attempts.ts, auth.ts) just calls getDb() instead of
// importing a static singleton, and this still only wraps the binding once
// per Worker instance.
export function getDb() {
	if (cachedDb) return cachedDb;
	const { platform } = getRequestEvent();
	if (!platform?.env.DB) {
		throw new Error('D1 binding "DB" is not available on this platform');
	}
	cachedDb = drizzle(platform.env.DB, { schema });
	return cachedDb;
}

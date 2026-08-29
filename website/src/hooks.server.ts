import { sequence } from '@sveltejs/kit/hooks';
import { building } from '$app/environment';
import { getAuth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import type { Handle } from '@sveltejs/kit';

// The embeddable SDK runs on third-party pages, so exactly the routes it
// calls (see sdk/src/Ladder.svelte, sdk/src/Wordle.svelte,
// sdk/src/Quordle.svelte, and sdk/src/Absurdle.svelte) need permissive
// CORS: fetching a game's daily puzzle, validating a guess, and
// (wordle/quordle only) revealing the answer(s) once an attempt is over.
// Everything else — auth, game create/edit/delete, the "your games" index —
// is only ever called same-origin by our own frontend, so it's deliberately
// left off this list rather than opened up by a blanket /api/* match.
// Scoping this to a specific allowlist of trusted embed origins (instead of
// "any origin can read these routes") is a later concern, not a blocker.
const EMBED_ROUTES = [
	/^\/api\/games\/[^/]+\/daily$/,
	/^\/api\/games\/[^/]+\/guess$/,
	/^\/api\/games\/[^/]+\/wordle\/daily$/,
	/^\/api\/games\/[^/]+\/wordle\/guess$/,
	/^\/api\/games\/[^/]+\/wordle\/reveal$/,
	/^\/api\/games\/[^/]+\/quordle\/daily$/,
	/^\/api\/games\/[^/]+\/quordle\/guess$/,
	/^\/api\/games\/[^/]+\/quordle\/reveal$/,
	/^\/api\/games\/[^/]+\/absurdle\/start$/,
	/^\/api\/games\/[^/]+\/absurdle\/guess$/
];

const CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
	// x-api-key carries a private game's embed key — see lib/server/embed-key.ts.
	'Access-Control-Allow-Headers': 'Content-Type, x-api-key'
};

const originalHandle: Handle = async ({ event, resolve }) => {
	if (!EMBED_ROUTES.some((pattern) => pattern.test(event.url.pathname))) {
		return resolve(event);
	}

	if (event.request.method === 'OPTIONS') {
		return new Response(null, { headers: CORS_HEADERS });
	}

	const response = await resolve(event);

	for (const [key, value] of Object.entries(CORS_HEADERS)) {
		response.headers.set(key, value);
	}

	return response;
};

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	const auth = await getAuth();
	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

export const handle = sequence(originalHandle, handleBetterAuth);

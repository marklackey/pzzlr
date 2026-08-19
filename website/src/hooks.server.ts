import type { Handle } from '@sveltejs/kit';

// The embeddable SDK runs on third-party pages and calls this API
// cross-origin, so /api/* needs permissive CORS. Tightening this to an
// allowlist of registered embed origins is a later concern, not a blocker
// for getting the SDK <-> backend wiring working.
const CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type'
};

export const handle: Handle = async ({ event, resolve }) => {
	if (!event.url.pathname.startsWith('/api/')) {
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

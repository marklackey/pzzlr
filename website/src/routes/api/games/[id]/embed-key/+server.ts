import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { rotateEmbedKey } from '$lib/server/game-mutations';

export const POST: RequestHandler = async ({ request, params, locals }) => {
	const config = await rotateEmbedKey(params.id, locals.user, request.headers);
	return json(config);
};

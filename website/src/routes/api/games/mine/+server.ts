import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listGamesByOwner } from '$lib/server/db/games';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		throw error(401, 'sign in to see your games');
	}
	return json(await listGamesByOwner(locals.user.id));
};

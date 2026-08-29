import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { listGamesByOwner } from '$lib/server/db/games';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}
	return { games: await listGamesByOwner(locals.user.id) };
};

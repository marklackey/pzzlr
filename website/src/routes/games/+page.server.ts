import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { listGamesByOwner } from '$lib/server/db/games';

// A signed-out visitor is sent to /create rather than shown an empty shelf
// or a sign-in form: this page's old job — explaining to someone without an
// account what one would get them — moved to /create, which is what the nav
// offers them now. See +layout.svelte.
export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(302, '/create');
	}
	return { games: await listGamesByOwner(locals.user.id) };
};

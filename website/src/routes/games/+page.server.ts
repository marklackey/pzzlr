import type { PageServerLoad } from './$types';
import { listGamesByOwner } from '$lib/server/db/games';

// Deliberately no redirect to /login for a signed-out visitor: "My games" is
// in the nav for everyone (see +layout.svelte), so this page is where someone
// without an account finds out what an account would get them. Bouncing them
// straight to a sign-in form would skip that explanation.
export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		return { signedIn: false as const, games: [] };
	}
	return { signedIn: true as const, games: await listGamesByOwner(locals.user.id) };
};

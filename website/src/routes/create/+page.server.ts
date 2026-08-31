import { fail, isHttpError, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { gameFormToBody } from '$lib/server/game-input';
import { createGame } from '$lib/server/game-mutations';
import { graphStats } from '$lib/server/graph-stats';

// A signed-out visitor gets the pitch rather than a redirect: Create is
// what the nav offers them (see +layout.svelte), so this is where someone
// without an account finds out what one would get them. Bouncing them
// straight to a sign-in form would skip that explanation — and the form
// below is no use to them anyway, since createGame refuses without a user.
export const load: PageServerLoad = ({ locals }) => {
	if (!locals.user) {
		return { signedIn: false as const, graphStats: [] };
	}
	// Lets the form warn about lengths where a ladder mostly can't be built
	// — see the connectivity note in graph-stats.ts.
	return { signedIn: true as const, graphStats: graphStats() };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const formData = await request.formData();
		const body = gameFormToBody(formData);

		let game;
		try {
			game = await createGame(body, locals.user);
		} catch (e) {
			if (isHttpError(e)) {
				return fail(e.status, { message: e.body.message });
			}
			throw e;
		}

		redirect(303, `/g/${game.id}`);
	}
};

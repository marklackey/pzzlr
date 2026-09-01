import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { canManageGame, getGameConfig } from '$lib/server/db/games';
import { listFavoriteGames, toggleFavorite } from '$lib/server/db/favorites';
import { safeReturnTo } from '$lib/server/return-to';

// A shelf only exists for someone with an account to hang it on, so a
// signed-out visitor is sent to sign in rather than shown an empty one they
// have no way to fill.
export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}
	return { games: await listFavoriteGames(locals.user.id) };
};

export const actions: Actions = {
	/**
	 * The whole site's star button, in one place: a favourite isn't a
	 * property of any one page, and duplicating this action onto every route
	 * that lists games would be three copies of the same six lines. Pages
	 * post here with a `returnTo` and get sent straight back.
	 */
	toggle: async ({ request, locals }) => {
		const form = await request.formData();
		// Untrusted: every star on the site posts here and says in the form
		// where it came from. See safeReturnTo.
		const returnTo = safeReturnTo(form.get('returnTo'), '/favorites');
		if (!locals.user) {
			redirect(303, '/login');
		}
		const gameId = typeof form.get('gameId') === 'string' ? String(form.get('gameId')) : '';
		const config = gameId ? await getGameConfig(gameId) : null;
		// The same visibility rule the game page and the API apply: a game
		// you can't see is a game you can't star, and a private id doesn't
		// get confirmed as existing by the way this fails.
		if (!config || (!config.public && !canManageGame(locals.user, config))) {
			return fail(404, { message: `no game with id "${gameId}"` });
		}
		await toggleFavorite(locals.user.id, gameId);
		redirect(303, returnTo);
	}
};

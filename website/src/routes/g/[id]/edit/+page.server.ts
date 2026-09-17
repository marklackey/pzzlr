import { error, fail, isHttpError, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { canManageGame, getGameConfig } from '$lib/server/db/games';
import { graphStats } from '$lib/server/graph-stats';
import { gameFormToBody } from '$lib/server/game-input';
import { deleteGame, rotateEmbedKey, updateGame } from '$lib/server/game-mutations';

/**
 * The owner's settings, embed key and delete button for one game. Its own
 * page rather than a panel under the board: on a phone, anything below a
 * full-height board pushes against the keyboard that's meant to sit on the
 * bottom edge, so the game page links here from its top corner instead.
 */
export const load: PageServerLoad = async ({ params, locals }) => {
	const config = await getGameConfig(params.id);
	if (!config) {
		throw error(404, `no game with id "${params.id}"`);
	}
	if (!canManageGame(locals.user, config)) {
		// Same rule as the game page: a private game doesn't exist for anyone
		// who can't manage it. A public one does, so send them to play it.
		if (!config.public) {
			throw error(404, `no game with id "${params.id}"`);
		}
		redirect(302, `/g/${params.id}`);
	}

	// No withoutSecret: only a manager gets this far, and the form needs a
	// wordle's secret to show what it's currently set to.
	return {
		config,
		// Lets the form warn about lengths where a ladder mostly can't be
		// built — see the connectivity note in graph-stats.ts.
		graphStats: graphStats()
	};
};

/** Runs a game-mutations call and turns its thrown HttpError into a form fail() — the one conversion every action below needs. */
async function runMutation(mutate: () => Promise<unknown>) {
	try {
		await mutate();
		return { success: true };
	} catch (e) {
		if (isHttpError(e)) {
			return fail(e.status, { message: e.body.message });
		}
		throw e;
	}
}

export const actions: Actions = {
	update: async ({ request, params, locals }) => {
		const formData = await request.formData();
		const body = gameFormToBody(formData);
		const result = await runMutation(() =>
			updateGame(params.id, body, locals.user, request.headers)
		);
		// Told apart from a key rotation's success, which also lands on this
		// page: only a save sends the owner back to the board (see the page).
		return 'success' in result ? { saved: true } : result;
	},

	regenerateKey: async ({ request, params, locals }) => {
		return runMutation(() => rotateEmbedKey(params.id, locals.user, request.headers));
	},

	remove: async ({ request, params, locals }) => {
		const result = await runMutation(() => deleteGame(params.id, locals.user, request.headers));
		if ('success' in result) {
			redirect(303, '/games');
		}
		return result;
	}
};

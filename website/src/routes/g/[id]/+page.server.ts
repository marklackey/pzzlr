import { error, fail, isHttpError, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { canManageGame, getGameConfig, withoutSecret } from '$lib/server/db/games';
import { gameFormToBody } from '$lib/server/game-input';
import { deleteGame, rotateEmbedKey, updateGame } from '$lib/server/game-mutations';

export const load: PageServerLoad = async ({ params, locals }) => {
	const config = await getGameConfig(params.id);
	if (!config) {
		throw error(404, `no game with id "${params.id}"`);
	}
	const canManage = canManageGame(locals.user, config);
	// A private game is invisible to everyone but its manager — same as the
	// API, a 404 here doesn't confirm whether the id even exists.
	if (!config.public && !canManage) {
		throw error(404, `no game with id "${params.id}"`);
	}
	// `config` gets serialized into this page's hydration payload for
	// *every* visitor, manager or not — a wordle game's secret has to be
	// stripped here for the same reason the API strips it. See
	// withoutSecret.
	return { config: withoutSecret(config, canManage), canManage };
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
		return runMutation(() => updateGame(params.id, body, locals.user, request.headers));
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

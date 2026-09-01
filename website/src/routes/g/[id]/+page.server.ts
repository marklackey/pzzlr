import { error, fail, isHttpError, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { canManageGame, getGameConfig, withoutSecret } from '$lib/server/db/games';
import { isFavorite } from '$lib/server/db/favorites';
import { archiveDays, isPastPuzzleDate } from '$lib/server/archive';
import { graphStats } from '$lib/server/graph-stats';
import { gameFormToBody } from '$lib/server/game-input';
import { deleteGame, rotateEmbedKey, updateGame } from '$lib/server/game-mutations';

export const load: PageServerLoad = async ({ params, url, locals }) => {
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
	// A game has an archive only if its puzzle actually changed from one day
	// to the next. Absurdle never picks a secret at all, and a wordle with a
	// pinned secret is the same word every day — "yesterday's" board would be
	// today's answer wearing an old date, to play through or to reveal. A
	// fixed-target ladder does vary: the target holds, the start word doesn't.
	const hasDailyPuzzles =
		config.mode === 'ladder' ||
		config.mode === 'quordle' ||
		(config.mode === 'wordle' && config.target === null);
	const archive = hasDailyPuzzles ? archiveDays(config.createdAt) : [];
	// `?date=` opens a finished day from that archive. Anything else — a
	// typo, tomorrow, a day before this game existed, or any date at all on
	// an absurdle game — falls back to today's board rather than erroring:
	// this is still the game's own page, and the visitor asked for the game.
	const requestedDay = url.searchParams.get('date');
	if (requestedDay && !(archive.length > 0 && isPastPuzzleDate(requestedDay, config.createdAt))) {
		redirect(302, `/g/${params.id}`);
	}

	// `config` gets serialized into this page's hydration payload for
	// *every* visitor, manager or not — a wordle game's secret has to be
	// stripped here for the same reason the API strips it. See
	// withoutSecret.
	return {
		config: withoutSecret(config, canManage),
		canManage,
		// False rather than absent for a signed-out visitor: the star isn't
		// rendered for them at all (see +page.svelte), and there's no shelf
		// to ask about.
		favorited: locals.user ? await isFavorite(locals.user.id, config.id) : false,
		archive,
		/** The past day being played, or null for today's board. */
		day: requestedDay,
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

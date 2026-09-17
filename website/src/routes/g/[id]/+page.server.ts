import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { canManageGame, getGameConfig, withoutSecret } from '$lib/server/db/games';
import { isFavorite } from '$lib/server/db/favorites';
import { archiveDays, isPastPuzzleDate } from '$lib/server/archive';

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
		day: requestedDay
	};
};

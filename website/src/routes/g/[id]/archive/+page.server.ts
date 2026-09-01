import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { canManageGame, getGameConfig, withoutSecret } from '$lib/server/db/games';
import { archiveDays } from '$lib/server/archive';

/**
 * Every day this game has already played through. Its own page rather than
 * a panel beside the board: a list of dates is what you come here for, and
 * on a phone anything sharing the screen with a full-height board is a
 * scroll away from being invisible.
 */
export const load: PageServerLoad = async ({ params, locals }) => {
	const config = await getGameConfig(params.id);
	if (!config) {
		throw error(404, `no game with id "${params.id}"`);
	}
	const canManage = canManageGame(locals.user, config);
	// Same rule as the game page: a private game is invisible to everyone
	// but its manager, and a 404 here doesn't confirm the id even exists.
	if (!config.public && !canManage) {
		throw error(404, `no game with id "${params.id}"`);
	}

	// The same "did the puzzle actually change from day to day" test the
	// game page applies — a wordle with a pinned secret and an absurdle both
	// play the same board every day, so neither has an archive to list. See
	// the game page's load for why this is decided server-side.
	const hasDailyPuzzles =
		config.mode === 'ladder' ||
		config.mode === 'quordle' ||
		(config.mode === 'wordle' && config.target === null);
	const days = hasDailyPuzzles ? archiveDays(config.createdAt) : [];
	if (days.length === 0) {
		redirect(302, `/g/${params.id}`);
	}

	return { config: withoutSecret(config, canManage), days };
};

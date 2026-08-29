import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { puzzleDate } from '$lib/server/date';
import { loadGameForMode } from '$lib/server/route-helpers';
import { getAttempt } from '$lib/server/db/puzzle-attempts';
import { ladderPuzzle } from '$lib/server/ladder-attempt';
import { settingsForAttempt } from '$lib/server/attempt-continuity';

/**
 * Today's ladder. With `?token=`, also returns the caller's attempt so far
 * (see puzzle-attempts.ts), which is what makes a ladder one-a-day rather
 * than something you can restart by reloading: the steps already taken come
 * back with the puzzle, and a finished one comes back finished.
 */
export const GET: RequestHandler = async (event) => {
	const { params, url } = event;
	const loaded = await loadGameForMode(event, 'ladder', 'daily');

	const date = url.searchParams.get('date') ?? puzzleDate();
	const token = url.searchParams.get('token');

	const attempt = token ? await getAttempt(loaded.config.id, date, token) : null;
	// An attempt already under way is served the game it began, not the
	// edited one — see attempt-continuity.
	const { config, graph } = settingsForAttempt(loaded.config, loaded.graph, attempt);

	const puzzle = ladderPuzzle(graph, config, date);
	if (!puzzle) {
		throw error(404, `could not generate a puzzle for game "${params.id}" on ${date}`);
	}

	const resumed = attempt ? { guesses: attempt.guesses, solved: attempt.solved } : null;

	return json({ id: config.id, name: config.name, mode: 'ladder' as const, ...puzzle, resumed });
};

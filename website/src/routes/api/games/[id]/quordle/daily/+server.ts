import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAttempt } from '$lib/server/db/puzzle-attempts';
import { pickDailyQuordle, scoreGuess } from '$lib/server/engine';
import { puzzleDate } from '$lib/server/date';
import { loadGameForMode } from '$lib/server/route-helpers';
import { settingsForAttempt } from '$lib/server/attempt-continuity';

/**
 * Today's quordle board-set metadata — deliberately excludes `targets`,
 * same reasoning as the wordle daily route.
 *
 * With `?token=`, also returns the caller's attempt so far, so a reload
 * resumes the board set instead of starting it over. Every guess is scored
 * again here, once per board, rather than stored pre-scored — same as
 * wordle, so a change to how guesses are scored can't leave old rows
 * disagreeing with new ones. A board already solved has its word spelled
 * out by its own all-correct row, which is exactly what the player who
 * solved it already saw.
 */
export const GET: RequestHandler = async (event) => {
	const { params, url } = event;
	const loaded = await loadGameForMode(event, 'quordle', 'daily');

	// Same reasoning as the other daily routes: boardCount/maxGuesses always
	// come from the stored config, never the query string, so "today's
	// puzzle" means the same challenge for every player.
	const date = url.searchParams.get('date') ?? puzzleDate();
	const token = url.searchParams.get('token');

	const attempt = token ? await getAttempt(loaded.config.id, date, token) : null;
	// An attempt already under way is served the game it began — see
	// attempt-continuity.
	const { config, graph } = settingsForAttempt(loaded.config, loaded.graph, attempt);

	const puzzle = pickDailyQuordle(graph, date, config.boardCount, { seedKey: config.id });
	if (!puzzle) {
		throw error(404, `could not generate a board set for game "${params.id}" on ${date}`);
	}

	const resumed = attempt
		? {
				guesses: attempt.guesses,
				// One row of letter statuses per board per guess, in board order
				// — the shape the widget already keeps its boards in.
				boardResults: puzzle.targets.map((target) =>
					attempt.guesses.map((guess) => scoreGuess(target, guess))
				),
				solved: attempt.solved
			}
		: null;

	return json({
		id: config.id,
		name: config.name,
		mode: 'quordle' as const,
		date: puzzle.date,
		puzzleNumber: puzzle.puzzleNumber,
		length: puzzle.length,
		boardCount: config.boardCount,
		maxGuesses: config.maxGuesses,
		resumed
	});
};

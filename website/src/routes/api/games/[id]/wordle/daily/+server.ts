import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAttempt } from '$lib/server/db/puzzle-attempts';
import { pickDailyWord, scoreGuess } from '$lib/server/engine';
import { puzzleDate } from '$lib/server/date';
import { loadGameForMode } from '$lib/server/route-helpers';

/**
 * Today's wordle puzzle metadata — deliberately excludes `target`. The
 * secret only ever gets checked server-side, in .../guess; sending it here
 * would let anyone read it straight out of the network tab.
 *
 * With `?token=`, also returns the caller's in-progress attempt (if any)
 * so reloading the widget resumes instead of losing guesses already made —
 * scored the same way .../guess scores a live submission, recomputed from
 * the stored guesses rather than persisted, so it can't drift from the
 * current scoring logic.
 */
export const GET: RequestHandler = async (event) => {
	const { params, url } = event;
	const { config, graph } = await loadGameForMode(event, 'wordle', 'daily');

	// See the matching comment in the ladder daily route: maxGuesses always
	// comes from the stored config, never the query string, so "today's
	// puzzle" means the same challenge for every player.
	const date = url.searchParams.get('date') ?? puzzleDate();
	const token = url.searchParams.get('token');

	const puzzle = pickDailyWord(graph, config.target, date, { seedKey: config.id });
	if (!puzzle) {
		throw error(404, `could not generate a puzzle for game "${params.id}" on ${date}`);
	}

	const attempt = token ? await getAttempt(config.id, date, token) : null;
	const resumed = attempt
		? {
				guesses: attempt.guesses.map((guess) => scoreGuess(puzzle.target, guess)),
				solved: attempt.solved
			}
		: null;

	return json({
		id: config.id,
		name: config.name,
		mode: 'wordle' as const,
		date: puzzle.date,
		puzzleNumber: puzzle.puzzleNumber,
		length: puzzle.length,
		maxGuesses: config.maxGuesses,
		resumed
	});
};

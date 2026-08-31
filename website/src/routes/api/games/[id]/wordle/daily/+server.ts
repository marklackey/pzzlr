import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAttempt } from '$lib/server/db/puzzle-attempts';
import { pickDailyWord, scoreGuess } from '$lib/server/engine';
import { puzzleDate } from '$lib/server/date';
import { loadGameForMode } from '$lib/server/route-helpers';
import { settingsForAttempt } from '$lib/server/attempt-continuity';

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
	const loaded = await loadGameForMode(event, 'wordle', 'daily');

	// See the matching comment in the ladder daily route: maxGuesses always
	// comes from the stored config, never the query string, so "today's
	// puzzle" means the same challenge for every player.
	const date = url.searchParams.get('date') ?? puzzleDate();
	const token = url.searchParams.get('token');

	const attempt = token ? await getAttempt(loaded.config.id, date, token) : null;
	// An attempt already under way keeps the secret it started on, whatever
	// the game says now — see attempt-continuity.
	const { config, graph } = settingsForAttempt(loaded.config, loaded.graph, attempt);

	const puzzle = pickDailyWord(graph, config.target, date, { seedKey: config.id });
	if (!puzzle) {
		throw error(404, `could not generate a puzzle for game "${params.id}" on ${date}`);
	}
	const resumed = attempt
		? {
				guesses: attempt.guesses.map((guess) => scoreGuess(puzzle.target, guess)),
				solved: attempt.solved,
				// What this attempt is actually being played under, which on an
				// 'optional' game is the player's own settled answer rather than
				// anything the game says now. See the hardMode column in schema.ts.
				hardMode: attempt.hardMode
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
		// The game's policy, for a board with no attempt yet: whether the
		// widget shows hard mode as on, off, or the player's to choose. See
		// HardModePolicy in $lib/types.
		hardMode: config.hardMode,
		resumed
	});
};

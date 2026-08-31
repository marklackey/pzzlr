import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAttempt } from '$lib/server/db/puzzle-attempts';
import { pickDailyWord } from '$lib/server/engine';
import { puzzleDate } from '$lib/server/date';
import { loadGameForMode } from '$lib/server/route-helpers';
import { settingsForAttempt } from '$lib/server/attempt-continuity';

/**
 * Reveals today's secret — only once the caller's own attempt (see
 * puzzle-attempts.ts) is actually over: solved, or every guess used. That
 * makes this the "show the answer after a loss" UI action it's meant to
 * be, not a shortcut around playing — see the comment on puzzleAttempt in
 * schema.ts for the (soft, anonymous-token) trust model this rides on.
 *
 * "Today" is whichever day the caller's board is on (`?date=`), so a board
 * that ran out of guesses just after the rollover reveals the word it was
 * actually played against rather than tomorrow's — see the widget's
 * puzzleDay. It is also the attempt this reveal is gated on, so without it
 * such a board would find no finished attempt at all and be refused.
 */
export const GET: RequestHandler = async (event) => {
	const { params, url } = event;
	const loaded = await loadGameForMode(event, 'wordle', 'reveal');

	// An empty ?date= means the same as none: today's.
	const date = url.searchParams.get('date') || puzzleDate();
	const token = url.searchParams.get('token');
	if (!token) {
		throw error(400, 'expected ?token=<attempt token>');
	}

	const attempt = await getAttempt(loaded.config.id, date, token);
	// Reveal the secret this attempt was actually played against — see
	// attempt-continuity.
	const { config, graph } = settingsForAttempt(loaded.config, loaded.graph, attempt);
	if (!attempt || (!attempt.solved && attempt.guesses.length < config.maxGuesses)) {
		throw error(403, 'guesses remaining — keep playing before revealing the answer');
	}

	const puzzle = pickDailyWord(graph, config.target, date, { seedKey: config.id });
	if (!puzzle) {
		throw error(404, `could not generate a puzzle for game "${params.id}" on ${date}`);
	}

	return json({ target: puzzle.target });
};

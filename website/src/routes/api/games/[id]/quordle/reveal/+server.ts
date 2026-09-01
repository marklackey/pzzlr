import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAttempt } from '$lib/server/db/puzzle-attempts';
import { pickDailyQuordle } from '$lib/server/engine';
import { puzzleDate } from '$lib/server/date';
import { loadGameForMode } from '$lib/server/route-helpers';
import { settingsForAttempt } from '$lib/server/attempt-continuity';

/**
 * Reveals every board's secret for the day — only once the caller's own
 * attempt is actually over: every board solved, or every guess used. Same
 * gate as the wordle reveal route, which this mode used to lack entirely
 * (it had no attempt record to check against, so anyone could ask for the
 * day's words at any time). See the comment on puzzleAttempt in schema.ts
 * for the soft, anonymous-token trust model this rides on.
 *
 * The day is the caller's board set's (`?date=`), so one that ran out of
 * guesses just after the rollover reveals the words it was actually played
 * against rather than tomorrow's — see the widget's puzzleDay. It's also
 * the attempt this reveal is gated on.
 */
export const GET: RequestHandler = async (event) => {
	const { params, url } = event;
	const loaded = await loadGameForMode(event, 'quordle', 'reveal');

	// An empty ?date= means the same as none: today's.
	const date = url.searchParams.get('date') || puzzleDate();
	const token = url.searchParams.get('token');
	if (!token) {
		throw error(400, 'expected ?token=<attempt token>');
	}

	const attempt = await getAttempt(loaded.config.id, date, token);
	// Reveal the secrets this attempt was actually played against — see
	// attempt-continuity.
	const { config, graph } = settingsForAttempt(loaded.config, loaded.graph, attempt);
	if (!attempt || (!attempt.solved && attempt.guesses.length < config.maxGuesses)) {
		throw error(403, 'guesses remaining — keep playing before revealing the answers');
	}

	const puzzle = pickDailyQuordle(graph, date, config.boardCount, { seedKey: config.id });
	if (!puzzle) {
		throw error(404, `could not generate a board set for game "${params.id}" on ${date}`);
	}

	return json({ targets: puzzle.targets });
};

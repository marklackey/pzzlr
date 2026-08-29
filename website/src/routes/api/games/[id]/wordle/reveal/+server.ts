import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAttempt } from '$lib/server/db/puzzle-attempts';
import { pickDailyWord } from '$lib/server/engine';
import { todayUTC } from '$lib/server/date';
import { loadGameForMode } from '$lib/server/route-helpers';

/**
 * Reveals today's secret — only once the caller's own attempt (see
 * puzzle-attempts.ts) is actually over: solved, or every guess used. That
 * makes this the "show the answer after a loss" UI action it's meant to
 * be, not a shortcut around playing — see the comment on puzzleAttempt in
 * schema.ts for the (soft, anonymous-token) trust model this rides on.
 */
export const GET: RequestHandler = async (event) => {
	const { params, url } = event;
	const { config, graph } = await loadGameForMode(event, 'wordle', 'reveal');

	const date = url.searchParams.get('date') ?? todayUTC();
	const token = url.searchParams.get('token');
	if (!token) {
		throw error(400, 'expected ?token=<attempt token>');
	}

	const attempt = await getAttempt(config.id, date, token);
	if (!attempt || (!attempt.solved && attempt.guesses.length < config.maxGuesses)) {
		throw error(403, 'guesses remaining — keep playing before revealing the answer');
	}

	const puzzle = pickDailyWord(graph, config.target, date, { seedKey: config.id });
	if (!puzzle) {
		throw error(404, `could not generate a puzzle for game "${params.id}" on ${date}`);
	}

	return json({ target: puzzle.target });
};

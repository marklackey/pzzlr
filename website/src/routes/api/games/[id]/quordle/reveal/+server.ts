import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { pickDailyQuordle } from '$lib/server/engine';
import { todayUTC } from '$lib/server/date';
import { loadGameForMode } from '$lib/server/route-helpers';

/**
 * Reveals every board's secret for the day. Unlike the wordle reveal route,
 * this isn't gated on a server-known "attempt is actually over" check —
 * quordle mode keeps no server-side attempt record (see the daily/guess
 * routes' doc comments), so there's nothing to check it against. The widget
 * only calls this once its own guess count reaches maxGuesses, but a
 * determined caller could call it early; that's the same soft, anonymous
 * trust model the wordle attempt token already rides on (see puzzleAttempt
 * in schema.ts), just without even the token-based speed bump.
 */
export const GET: RequestHandler = async (event) => {
	const { params, url } = event;
	const { config, graph } = await loadGameForMode(event, 'quordle', 'reveal');

	const date = url.searchParams.get('date') ?? todayUTC();

	const puzzle = pickDailyQuordle(graph, date, config.boardCount, { seedKey: config.id });
	if (!puzzle) {
		throw error(404, `could not generate a board set for game "${params.id}" on ${date}`);
	}

	return json({ targets: puzzle.targets });
};

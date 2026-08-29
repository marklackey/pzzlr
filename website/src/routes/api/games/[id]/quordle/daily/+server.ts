import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { pickDailyQuordle } from '$lib/server/engine';
import { todayUTC } from '$lib/server/date';
import { loadGameForMode } from '$lib/server/route-helpers';

/**
 * Today's quordle board-set metadata — deliberately excludes `targets`, same
 * reasoning as the wordle daily route. Unlike wordle, this mode has no
 * server-side attempt tracking (see wordle_attempt in schema.ts): a quordle
 * game's guesses live entirely in the client, so there's no `resumed` field
 * here and a reload just starts the board set over.
 */
export const GET: RequestHandler = async (event) => {
	const { params, url } = event;
	const { config, graph } = await loadGameForMode(event, 'quordle', 'daily');

	// Same reasoning as the other daily routes: boardCount/maxGuesses always
	// come from the stored config, never the query string, so "today's
	// puzzle" means the same challenge for every player.
	const date = url.searchParams.get('date') ?? todayUTC();

	const puzzle = pickDailyQuordle(graph, date, config.boardCount, { seedKey: config.id });
	if (!puzzle) {
		throw error(404, `could not generate a board set for game "${params.id}" on ${date}`);
	}

	return json({
		id: config.id,
		name: config.name,
		mode: 'quordle' as const,
		date: puzzle.date,
		puzzleNumber: puzzle.puzzleNumber,
		length: puzzle.length,
		boardCount: config.boardCount,
		maxGuesses: config.maxGuesses
	});
};

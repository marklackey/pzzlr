import { pickDailyPuzzle, type DailyPuzzle } from '$lib/server/engine';
import type { WordGraph } from '$lib/server/engine/graph';

type LadderConfig = {
	id: string;
	target: string | null;
	minSteps: number;
	rungsGiven: number;
};

/**
 * Today's ladder for a game, generated the same way for every caller — the
 * daily and guess routes both need it and must not disagree about which
 * puzzle "today" is.
 */
export function ladderPuzzle(
	graph: WordGraph,
	config: LadderConfig,
	date: string
): DailyPuzzle | null {
	// minSteps/rungsGiven come from the stored config, never a query string:
	// they steer which start word the seeded generator lands on, so every
	// player has to get the same values for "today's puzzle" to mean one
	// puzzle. See schema.ts.
	return pickDailyPuzzle(graph, config.target, date, {
		minSteps: config.minSteps,
		rungsGiven: config.rungsGiven,
		seedKey: config.id
	});
}

/**
 * The words on the board: what the puzzle handed over for free, then every
 * step the player has actually taken. Rebuilt from the stored guesses on
 * each request rather than persisted, so a stored attempt stays valid if
 * the free-rung count on a game ever changes.
 */
export function ladderChain(puzzle: DailyPuzzle, guesses: string[]): string[] {
	return [puzzle.start, ...puzzle.revealedRungs, ...guesses];
}

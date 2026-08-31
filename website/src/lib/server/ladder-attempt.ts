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

/**
 * Whether the board a client is stepping from is still the board its
 * attempt is actually on.
 *
 * `from` is the last word the client has on screen. It is a check and
 * nothing else — the step is always taken from the stored attempt (see the
 * guess route), so naming a word here can't move the ladder, only refuse a
 * guess. A client that sends nothing is trusted as before, which keeps an
 * older embedded copy of the widget working.
 *
 * The two come apart when something else moves the attempt on: a second
 * tab on the same token taking its own steps, or a client that doesn't say
 * which day's board it is on (see the guess route's `date`) still sitting
 * on a ladder the rollover has since replaced. Judging the guess anyway
 * measures it against a word the player can't see — «"arms" isn't one
 * letter away from "laze"» — and a guess that happens to fit the other
 * ladder lands on it silently, which is worse.
 */
export function boardIsCurrent(chain: string[], from: string | null | undefined): boolean {
	return !from || from === chain[chain.length - 1];
}

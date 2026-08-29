import type { WordGraph } from './graph';
import { DEFAULT_EPOCH, dailyIndices, puzzleNumberFor } from './daily-seed';

export interface DailyQuordle {
	/** UTC calendar date this puzzle belongs to, YYYY-MM-DD. */
	date: string;
	/** Increments by one per day since `epoch`, for display ("#370"). */
	puzzleNumber: number;
	/** One secret per board, distinct — callers serving this to a player must strip it before responding. */
	targets: string[];
	length: number;
}

export interface PickDailyQuordleOptions {
	/** Date that puzzleNumber 1 falls on. */
	epoch?: string;
	/** Mixed into the seed so different quordle games don't land on the same board set on the same day — pass the game id. */
	seedKey: string;
}

/**
 * Same `boardCount` secret words for everyone on a given UTC date, distinct
 * within that day's set — seeded from date + seedKey, so (like
 * pickDailyWord's daily mode) it needs no server-side storage to stay
 * consistent across requests. Unlike pickDailyWord, quordle has no "fixed
 * target" mode: a permanently pinned board set would just be the same N
 * answers forever, which defeats the point of a shared guess stream against
 * several of them at once.
 *
 * Draws a contiguous, wrapped slice of a fixed permutation of the
 * dictionary (see dailyIndices) rather than an independent per-day shuffle,
 * so a board's target doesn't just avoid repeating the *other* boards
 * running alongside it that day — the whole dictionary gets used up before
 * any date's set repeats.
 */
export function pickDailyQuordle(
	graph: WordGraph,
	date: string,
	boardCount: number,
	options: PickDailyQuordleOptions
): DailyQuordle | null {
	const { epoch = DEFAULT_EPOCH, seedKey } = options;
	if (boardCount < 1) return null;

	const pool = graph.allWords();
	if (pool.length < boardCount) return null;

	const indices = dailyIndices(date, epoch, pool.length, seedKey, boardCount);
	const targets = indices.map((i) => pool[i]);

	return { date, puzzleNumber: puzzleNumberFor(date, epoch), targets, length: graph.length };
}

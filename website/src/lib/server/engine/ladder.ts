import type { WordGraph } from './graph';
import { DEFAULT_EPOCH, dailyIndices, dailyRandom, puzzleNumberFor } from './daily-seed';

/** A candidate ladder puzzle: get from `start` to `end`, both words of `length`. */
export interface LadderPuzzle {
	start: string;
	end: string;
	length: number;
	/** Word count of the shortest known path, start and end inclusive. */
	minSteps: number;
}

export interface LadderValidation {
	valid: boolean;
	reason?: string;
}

/** Breadth-first shortest path between two words, or null if unreachable. */
export function shortestPath(graph: WordGraph, start: string, end: string): string[] | null {
	if (!graph.has(start) || !graph.has(end)) return null;
	if (start === end) return [start];

	const prev = new Map<string, string>();
	const visited = new Set<string>([start]);
	const queue: string[] = [start];

	for (let head = 0; head < queue.length; head++) {
		const word = queue[head];
		for (const next of graph.neighbors(word)) {
			if (visited.has(next)) continue;
			visited.add(next);
			prev.set(next, word);
			if (next === end) return reconstructPath(prev, start, end);
			queue.push(next);
		}
	}
	return null;
}

function reconstructPath(prev: Map<string, string>, start: string, end: string): string[] {
	const path = [end];
	let cur = end;
	while (cur !== start) {
		cur = prev.get(cur)!;
		path.push(cur);
	}
	path.reverse();
	return path;
}

export function isSolvable(graph: WordGraph, start: string, end: string): boolean {
	return shortestPath(graph, start, end) !== null;
}

export interface StepValidation {
	isWord: boolean;
	isNeighbor: boolean;
}

/** Checks whether `guess` is a legal single next step from `current`. */
export function checkStep(graph: WordGraph, current: string, guess: string): StepValidation {
	const isWord = graph.has(guess);
	const isNeighbor = isWord && graph.neighbors(current).includes(guess);
	return { isWord, isNeighbor };
}

/** Checks that `steps` is a legal ladder from `start` to `end` in `graph`. */
export function validateLadder(
	graph: WordGraph,
	start: string,
	end: string,
	steps: string[]
): LadderValidation {
	if (steps.length === 0) return { valid: false, reason: 'empty' };
	if (steps[0] !== start) return { valid: false, reason: 'does-not-start-at-start' };
	if (steps[steps.length - 1] !== end) return { valid: false, reason: 'does-not-end-at-end' };

	for (const word of steps) {
		if (!graph.has(word)) return { valid: false, reason: `not-a-word:${word}` };
	}
	for (let i = 1; i < steps.length; i++) {
		if (!graph.neighbors(steps[i - 1]).includes(steps[i])) {
			return { valid: false, reason: `not-adjacent:${steps[i - 1]}->${steps[i]}` };
		}
	}
	return { valid: true };
}

export interface PickPuzzleOptions {
	/** Minimum ladder length (word count including start/end). Default 2. */
	minSteps?: number;
	/** Maximum ladder length. Default: unbounded. */
	maxSteps?: number;
	maxAttempts?: number;
	/** Injectable for deterministic tests. Default Math.random. */
	random?: () => number;
	/** Fix the end word instead of sampling it randomly (e.g. a fixed daily target). */
	end?: string;
}

interface PuzzleWithPath extends LadderPuzzle {
	/** The shortest start->end path pickPuzzle already had to compute to find this pair — handed to pickDailyPuzzle so it doesn't re-run the same search. */
	path: string[];
}

/**
 * Picks a random solvable start/end pair by sampling words and checking
 * reachability. Many words in sparse (long) buckets have no neighbors at
 * all, so this can fail to find a match — callers should treat a null
 * result as "try a shorter word length" rather than retry indefinitely.
 */
function findPuzzle(graph: WordGraph, options: PickPuzzleOptions = {}): PuzzleWithPath | null {
	const {
		minSteps = 2,
		maxSteps = Infinity,
		maxAttempts = 500,
		random = Math.random,
		end: fixedEnd
	} = options;
	const words = graph.allWords();
	if (words.length < 2) return null;
	if (fixedEnd !== undefined && !graph.has(fixedEnd)) return null;

	// A ladder is a walk along edges, so it can't leave its component or
	// visit more words than that component holds: anything smaller than
	// minSteps can't contain a puzzle of this difficulty, however many times
	// we sample it. Checking that up front turns "no puzzle exists" from
	// something we discover by burning every attempt on doomed pairs into an
	// immediate, explainable answer — the create form reports it rather than
	// letting the game 404 its own daily puzzle later.
	if (fixedEnd !== undefined && graph.componentSize(fixedEnd) < minSteps) return null;

	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		const start = words[Math.floor(random() * words.length)];
		if (graph.componentSize(start) < minSteps) continue;
		const end = fixedEnd ?? words[Math.floor(random() * words.length)];
		if (start === end) continue;
		// Cheap reject before the breadth-first search: unrelated islands can
		// never be joined, and at long word lengths most random pairs are.
		if (!graph.sameComponent(start, end)) continue;

		const path = shortestPath(graph, start, end);
		if (!path) continue;
		if (path.length < minSteps || path.length > maxSteps) continue;

		return { start, end, length: graph.length, minSteps: path.length, path };
	}
	return null;
}

export function pickPuzzle(graph: WordGraph, options: PickPuzzleOptions = {}): LadderPuzzle | null {
	const found = findPuzzle(graph, options);
	if (!found) return null;
	return { start: found.start, end: found.end, length: found.length, minSteps: found.minSteps };
}

export interface DailyPuzzle {
	/** UTC calendar date this puzzle belongs to, YYYY-MM-DD. */
	date: string;
	/** Increments by one per day since `epoch`, for display ("#370"). */
	puzzleNumber: number;
	target: string;
	start: string;
	length: number;
	/** Word count of the *full* optimal path (start through target), unaffected by rungsGiven. */
	minSteps: number;
	/**
	 * Words immediately after `start` on the optimal path, handed over for
	 * free — words[0] is one step from `start`, words[1] two steps, etc.
	 * Guaranteed degree >= 2 (an edge in and an edge out), so a rung can
	 * never itself be a dead end.
	 */
	revealedRungs: string[];
}

export interface PickDailyPuzzleOptions {
	/** Difficulty floor for what's left for the player *after* rungsGiven are removed. */
	minSteps?: number;
	maxSteps?: number;
	maxAttempts?: number;
	/** Date that puzzleNumber 1 falls on. */
	epoch?: string;
	/** How many rungs after `start` to reveal for free. Default 0. */
	rungsGiven?: number;
	/**
	 * Extra string mixed into the seed. Required (pass the game id) when
	 * `target` is null — without a fixed target, the date alone would give
	 * every random-mode game the same start/target pair on the same day.
	 * Ignored when `target` is set, since the target already makes the seed
	 * unique per game and changing this would shift already-live games'
	 * daily puzzles.
	 */
	seedKey?: string;
}

/**
 * Same puzzle for everyone on a given UTC date — seeded from date + target
 * (the "always end at POOP" mechanic), so it needs no server-side storage
 * to stay consistent across requests. Pass `target: null` for "random
 * mode", where the target cycles through the dictionary a word at a time
 * (see the dailyTarget comment below) instead of being pinned.
 */
export function pickDailyPuzzle(
	graph: WordGraph,
	target: string | null,
	date: string,
	options: PickDailyPuzzleOptions = {}
): DailyPuzzle | null {
	const {
		minSteps = 2,
		maxSteps = Infinity,
		maxAttempts = 500,
		epoch = DEFAULT_EPOCH,
		rungsGiven = 0,
		seedKey = ''
	} = options;
	const random = dailyRandom(date, target, seedKey);

	// In random mode (target === null), the target itself walks a fixed
	// permutation of the dictionary (see dailyIndices) instead of being
	// resampled independently each day — every word gets used as a target
	// before any of them repeat, a guarantee plain per-day rerolling can't
	// make. `start` still comes from independent daily resampling below
	// (findPuzzle's random-retry search): only one of the pair needs a hard
	// non-repeat guarantee for "today's puzzle" to reliably look different,
	// and start/end aren't independently choosable anyway — start has to
	// actually reach whatever end this picks.
	const words = graph.allWords();
	const dailyTarget =
		target ??
		(words.length > 0 ? words[dailyIndices(date, epoch, words.length, seedKey)[0]] : undefined);

	// minSteps/maxSteps describe the challenge left for the player *after*
	// rungsGiven words are handed over, so shift the search floor/ceiling
	// by rungsGiven when looking for a full start-to-target path.
	const puzzle = findPuzzle(graph, {
		minSteps: minSteps + rungsGiven,
		maxSteps: maxSteps === Infinity ? Infinity : maxSteps + rungsGiven,
		maxAttempts,
		random,
		end: dailyTarget
	});
	if (!puzzle) return null;

	return {
		date,
		puzzleNumber: puzzleNumberFor(date, epoch),
		target: puzzle.end,
		start: puzzle.start,
		length: puzzle.length,
		minSteps: puzzle.minSteps,
		revealedRungs: puzzle.path.slice(1, 1 + rungsGiven)
	};
}

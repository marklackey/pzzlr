import type { WordGraph } from './graph';

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
}

/**
 * Picks a random solvable start/end pair by sampling words and checking
 * reachability. Many words in sparse (long) buckets have no neighbors at
 * all, so this can fail to find a match — callers should treat a null
 * result as "try a shorter word length" rather than retry indefinitely.
 */
export function pickPuzzle(graph: WordGraph, options: PickPuzzleOptions = {}): LadderPuzzle | null {
	const { minSteps = 2, maxSteps = Infinity, maxAttempts = 500, random = Math.random } = options;
	const words = graph.allWords();
	if (words.length < 2) return null;

	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		const start = words[Math.floor(random() * words.length)];
		const end = words[Math.floor(random() * words.length)];
		if (start === end) continue;

		const path = shortestPath(graph, start, end);
		if (!path) continue;
		if (path.length < minSteps || path.length > maxSteps) continue;

		return { start, end, length: graph.length, minSteps: path.length };
	}
	return null;
}

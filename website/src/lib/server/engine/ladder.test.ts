import { describe, expect, it } from 'vitest';
import { WordGraph } from './graph';
import { isSolvable, pickPuzzle, shortestPath, validateLadder } from './ladder';
import type { WordGraphData } from './types';

// cat - cot - cog - dog chain, plus an isolated word with no neighbors.
const fixture: WordGraphData = {
	length: 3,
	words: ['cat', 'cot', 'cog', 'dog', 'zzz'],
	adjacency: [[1], [0, 2], [1, 3], [2], []]
};

describe('shortestPath', () => {
	it('finds the direct edge', () => {
		const g = new WordGraph(fixture);
		expect(shortestPath(g, 'cat', 'cot')).toEqual(['cat', 'cot']);
	});

	it('finds a multi-hop path', () => {
		const g = new WordGraph(fixture);
		expect(shortestPath(g, 'cat', 'dog')).toEqual(['cat', 'cot', 'cog', 'dog']);
	});

	it('returns the trivial single-word path for start === end', () => {
		const g = new WordGraph(fixture);
		expect(shortestPath(g, 'cat', 'cat')).toEqual(['cat']);
	});

	it('returns null for an isolated word', () => {
		const g = new WordGraph(fixture);
		expect(shortestPath(g, 'cat', 'zzz')).toBeNull();
	});

	it('returns null for a word not in the graph', () => {
		const g = new WordGraph(fixture);
		expect(shortestPath(g, 'cat', 'nope')).toBeNull();
	});
});

describe('isSolvable', () => {
	it('mirrors shortestPath reachability', () => {
		const g = new WordGraph(fixture);
		expect(isSolvable(g, 'cat', 'dog')).toBe(true);
		expect(isSolvable(g, 'cat', 'zzz')).toBe(false);
	});
});

describe('validateLadder', () => {
	const g = new WordGraph(fixture);

	it('accepts a correct full ladder', () => {
		expect(validateLadder(g, 'cat', 'dog', ['cat', 'cot', 'cog', 'dog'])).toEqual({ valid: true });
	});

	it('rejects a ladder that skips a step', () => {
		const result = validateLadder(g, 'cat', 'dog', ['cat', 'cog', 'dog']);
		expect(result.valid).toBe(false);
		expect(result.reason).toBe('not-adjacent:cat->cog');
	});

	it('rejects a ladder that does not start at start', () => {
		const result = validateLadder(g, 'cat', 'dog', ['cot', 'cog', 'dog']);
		expect(result.valid).toBe(false);
		expect(result.reason).toBe('does-not-start-at-start');
	});

	it('rejects a ladder that does not end at end', () => {
		const result = validateLadder(g, 'cat', 'dog', ['cat', 'cot', 'cog']);
		expect(result.valid).toBe(false);
		expect(result.reason).toBe('does-not-end-at-end');
	});

	it('rejects a step that is not a real word', () => {
		const result = validateLadder(g, 'cat', 'dog', ['cat', 'cot', 'zog', 'dog']);
		expect(result.valid).toBe(false);
		expect(result.reason).toBe('not-a-word:zog');
	});
});

describe('pickPuzzle', () => {
	it('only returns pairs within the requested step range', () => {
		const g = new WordGraph(fixture);
		// Deterministic "random": alternates between the indices for
		// "cat" (0) and "dog" (3), the only pair four steps apart.
		const values = [0 / 5, 3 / 5];
		let call = 0;
		const random = () => values[call++ % values.length];

		const puzzle = pickPuzzle(g, { minSteps: 4, maxSteps: 4, random });
		expect(puzzle).not.toBeNull();
		expect(puzzle!.minSteps).toBe(4);
		expect(['cat', 'dog']).toContain(puzzle!.start);
		expect(['cat', 'dog']).toContain(puzzle!.end);
	});

	it('gives up and returns null when no pair fits within maxAttempts', () => {
		const g = new WordGraph(fixture);
		// Always samples the isolated word paired with itself-adjacent index,
		// which never yields a solvable pair with minSteps 10.
		const random = () => 0;
		const puzzle = pickPuzzle(g, { minSteps: 10, maxAttempts: 20, random });
		expect(puzzle).toBeNull();
	});
});

import { describe, expect, it } from 'vitest';
import { WordGraph } from './graph';
import {
	checkStep,
	countPossiblePuzzles,
	isSolvable,
	pickDailyPuzzle,
	pickPuzzle,
	reachTarget,
	shortestPath,
	validateLadder
} from './ladder';
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

	it('respects a fixed end word instead of sampling one', () => {
		const g = new WordGraph(fixture);
		const random = () => 0; // always samples index 0 ("cat")
		const puzzle = pickPuzzle(g, { end: 'dog', minSteps: 4, random });
		expect(puzzle).toEqual({ start: 'cat', end: 'dog', length: 3, minSteps: 4 });
	});

	it('returns null for a fixed end word not in the graph', () => {
		const g = new WordGraph(fixture);
		expect(pickPuzzle(g, { end: 'nope' })).toBeNull();
	});
});

describe('pickDailyPuzzle', () => {
	it('is deterministic for the same date and target', () => {
		const g = new WordGraph(fixture);
		const a = pickDailyPuzzle(g, 'dog', '2026-08-19', { minSteps: 2 });
		const b = pickDailyPuzzle(g, 'dog', '2026-08-19', { minSteps: 2 });
		expect(a).toEqual(b);
		expect(a?.target).toBe('dog');
	});

	it('varies across dates (in general)', () => {
		const g = new WordGraph(fixture);
		// Any single pair of dates could coincidentally hash to the same
		// start, so check a spread of dates for more than one distinct
		// result rather than asserting on two specific ones.
		const starts = new Set(
			Array.from({ length: 10 }, (_, i) =>
				pickDailyPuzzle(g, 'dog', `2026-08-${10 + i}`, { minSteps: 2 })
			).map((p) => p?.start)
		);
		expect(starts.size).toBeGreaterThan(1);
	});

	it('numbers puzzles sequentially from the epoch date', () => {
		const g = new WordGraph(fixture);
		const puzzle = pickDailyPuzzle(g, 'dog', '2026-08-22', {
			minSteps: 2,
			epoch: '2026-08-19'
		});
		expect(puzzle?.puzzleNumber).toBe(4);
	});

	it('returns null for a target not in the graph', () => {
		const g = new WordGraph(fixture);
		expect(pickDailyPuzzle(g, 'nope', '2026-08-19')).toBeNull();
	});

	it('defaults to zero revealed rungs', () => {
		const g = new WordGraph(fixture);
		const puzzle = pickDailyPuzzle(g, 'dog', '2026-08-19', { minSteps: 2 });
		expect(puzzle?.revealedRungs).toEqual([]);
	});

	it('reveals exactly the requested number of words from the true shortest path', () => {
		const g = new WordGraph(fixture);
		const puzzle = pickDailyPuzzle(g, 'dog', '2026-08-19', { minSteps: 2, rungsGiven: 1 });
		expect(puzzle).not.toBeNull();

		const fullPath = shortestPath(g, puzzle!.start, 'dog')!;
		expect(puzzle!.revealedRungs).toEqual(fullPath.slice(1, 2));
		expect(puzzle!.revealedRungs).toHaveLength(1);
	});

	it('never reveals a rung that is a dead end (needs an in-edge and an out-edge)', () => {
		const g = new WordGraph(fixture);
		const puzzle = pickDailyPuzzle(g, 'dog', '2026-08-19', { minSteps: 2, rungsGiven: 1 });
		for (const rung of puzzle!.revealedRungs) {
			expect(g.neighbors(rung).length).toBeGreaterThanOrEqual(2);
		}
	});

	it('minSteps still describes the full path, unaffected by rungsGiven', () => {
		const g = new WordGraph(fixture);
		const withoutRungs = pickDailyPuzzle(g, 'dog', '2026-08-19', { minSteps: 2 });
		const withRungs = pickDailyPuzzle(g, 'dog', '2026-08-19', { minSteps: 2, rungsGiven: 1 });
		// Same seed (date+target), but a higher effective floor with rungsGiven
		// set can land on a different, longer candidate start — minSteps
		// should still equal that candidate's own full path length either way.
		expect(withoutRungs?.minSteps).toBe(shortestPath(g, withoutRungs!.start, 'dog')!.length);
		expect(withRungs?.minSteps).toBe(shortestPath(g, withRungs!.start, 'dog')!.length);
	});

	it('never reveals the target itself as a rung, for every valid minSteps/rungsGiven combo', () => {
		const g = new WordGraph(fixture);
		for (let rungsGiven = 0; rungsGiven <= 2; rungsGiven++) {
			// minSteps 2 is the API-enforced floor; this is the boundary case
			// most likely to leak the target if the slice math were off by one.
			const puzzle = pickDailyPuzzle(g, 'dog', '2026-08-19', { minSteps: 2, rungsGiven });
			if (puzzle) {
				expect(puzzle.revealedRungs).not.toContain('dog');
			}
		}
	});

	describe('random mode (target: null)', () => {
		it('picks both start and target from the graph, deterministically per seedKey', () => {
			const g = new WordGraph(fixture);
			const a = pickDailyPuzzle(g, null, '2026-08-19', { minSteps: 2, seedKey: 'game-a' });
			const b = pickDailyPuzzle(g, null, '2026-08-19', { minSteps: 2, seedKey: 'game-a' });
			expect(a).toEqual(b);
			expect(a?.target).not.toBeNull();
			expect(a?.start).not.toBe(a?.target);
		});

		it('varies by seedKey on the same date (in general)', () => {
			const g = new WordGraph(fixture);
			const pairs = new Set(
				Array.from({ length: 10 }, (_, i) =>
					pickDailyPuzzle(g, null, '2026-08-19', { minSteps: 2, seedKey: `game-${i}` })
				).map((p) => `${p?.start}:${p?.target}`)
			);
			expect(pairs.size).toBeGreaterThan(1);
		});
	});
});

describe('component-aware puzzle picking', () => {
	// cat-cot-cog-dog is a four-word chain; bevy-levy an island of two.
	const islands: WordGraphData = {
		length: 3,
		words: ['cat', 'cot', 'cog', 'dog', 'hut', 'zzz'],
		// hut and zzz are alone; cat-cot-cog-dog form the chain.
		adjacency: [[1], [0, 2], [1, 3], [2], [], []]
	};

	it('refuses a target whose island is too small to hold the ladder', () => {
		const g = new WordGraph(islands);
		// hut has no neighbours, so no ladder of any length can end there.
		expect(pickDailyPuzzle(g, 'hut', '2026-08-29', { minSteps: 2 })).toBeNull();
	});

	it('still builds one when the target has a big enough island', () => {
		const g = new WordGraph(islands);
		const puzzle = pickDailyPuzzle(g, 'dog', '2026-08-29', { minSteps: 4 });
		expect(puzzle?.target).toBe('dog');
		expect(puzzle?.start).toBe('cat');
	});

	it('never pairs words from different islands', () => {
		const g = new WordGraph(islands);
		for (let day = 1; day <= 20; day++) {
			const puzzle = pickDailyPuzzle(g, null, `2026-08-${String(day).padStart(2, '0')}`, {
				minSteps: 3,
				seedKey: 'game'
			});
			if (!puzzle) continue;
			expect(g.sameComponent(puzzle.start, puzzle.target)).toBe(true);
		}
	});
});

describe('targets outside the dictionary', () => {
	// cat-cot-cog-dog chain. "cet" is not a word here, but sits one letter
	// from both cat and cot, so a ladder can still end at it.
	const g = new WordGraph({
		length: 3,
		words: ['cat', 'cot', 'cog', 'dog'],
		adjacency: [[1], [0, 2], [1, 3], [2]]
	});

	it('reaches a non-dictionary target through its neighbours', () => {
		const reach = reachTarget(g, 'cet');
		expect(reach.inDictionary).toBe(false);
		expect(reach.anchors.sort()).toEqual(['cat', 'cot']);
		// dog is furthest: dog-cog-cot-cet.
		expect(reach.longestLadder).toBe(4);
	});

	it('reports nothing reachable when no word is one letter away', () => {
		const reach = reachTarget(g, 'xyz');
		expect(reach.anchors).toEqual([]);
		expect(reach.longestLadder).toBe(0);
		expect(countPossiblePuzzles(reach, 2)).toBe(0);
	});

	it('counts only starts far enough away to meet minSteps', () => {
		const reach = reachTarget(g, 'cet');
		// Ladders: cat/cot are 2 words, cog 3, dog 4.
		expect(countPossiblePuzzles(reach, 2)).toBe(4);
		expect(countPossiblePuzzles(reach, 4)).toBe(1);
		expect(countPossiblePuzzles(reach, 5)).toBe(0);
	});

	it('builds a path that ends on the non-dictionary word', () => {
		const path = shortestPath(g, 'dog', 'cet');
		expect(path).toEqual(['dog', 'cog', 'cot', 'cet']);
	});

	it('generates a daily puzzle ending at it', () => {
		const puzzle = pickDailyPuzzle(g, 'cet', '2026-08-29', { minSteps: 3 });
		expect(puzzle?.target).toBe('cet');
		expect(g.has(puzzle!.start)).toBe(true);
	});

	it('accepts the custom target as a winning guess, but only from a neighbour', () => {
		// The whole point: this one non-word is playable, as the last rung.
		expect(checkStep(g, 'cot', 'cet', 'cet')).toEqual({ isWord: true, isNeighbor: true });
		// Not adjacent, so still not a legal step.
		expect(checkStep(g, 'dog', 'cet', 'cet')).toEqual({ isWord: true, isNeighbor: false });
		// Any other non-dictionary word stays rejected.
		expect(checkStep(g, 'cot', 'cit', 'cet')).toEqual({ isWord: false, isNeighbor: false });
		// And without the game's target it isn't a word at all.
		expect(checkStep(g, 'cot', 'cet')).toEqual({ isWord: false, isNeighbor: false });
	});
});

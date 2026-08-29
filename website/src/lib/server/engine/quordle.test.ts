import { describe, expect, it } from 'vitest';
import { WordGraph } from './graph';
import { pickDailyQuordle } from './quordle';
import type { WordGraphData } from './types';

const fixture: WordGraphData = {
	length: 3,
	words: ['cat', 'cot', 'cog', 'dog', 'zzz'],
	adjacency: [[1], [0, 2], [1, 3], [2], []]
};

describe('pickDailyQuordle', () => {
	it('is deterministic per seedKey and date', () => {
		const g = new WordGraph(fixture);
		const a = pickDailyQuordle(g, '2026-08-19', 3, { seedKey: 'game-a' });
		const b = pickDailyQuordle(g, '2026-08-19', 3, { seedKey: 'game-a' });
		expect(a).toEqual(b);
	});

	it('draws the requested number of distinct targets', () => {
		const g = new WordGraph(fixture);
		const puzzle = pickDailyQuordle(g, '2026-08-19', 4, { seedKey: 'game-a' });
		expect(puzzle?.targets).toHaveLength(4);
		expect(new Set(puzzle?.targets).size).toBe(4);
		for (const target of puzzle?.targets ?? []) {
			expect(fixture.words).toContain(target);
		}
	});

	it('returns null when boardCount exceeds the number of words in the graph', () => {
		const g = new WordGraph(fixture);
		expect(
			pickDailyQuordle(g, '2026-08-19', fixture.words.length + 1, { seedKey: 'game-a' })
		).toBeNull();
	});

	it('does not mutate the graph across repeated calls', () => {
		const g = new WordGraph(fixture);
		const before = g.allWords().slice();
		pickDailyQuordle(g, '2026-08-19', 3, { seedKey: 'game-a' });
		pickDailyQuordle(g, '2026-08-20', 3, { seedKey: 'game-b' });
		expect(g.allWords()).toEqual(before);
	});

	it('varies by date (in general)', () => {
		const g = new WordGraph(fixture);
		const draws = Array.from({ length: 5 }, (_, i) =>
			pickDailyQuordle(g, `2026-08-${10 + i}`, 3, { seedKey: 'game-a' })?.targets.join(',')
		);
		expect(new Set(draws).size).toBeGreaterThan(1);
	});

	it('varies by seedKey on the same date (in general)', () => {
		const g = new WordGraph(fixture);
		const draws = Array.from({ length: 5 }, (_, i) =>
			pickDailyQuordle(g, '2026-08-19', 3, { seedKey: `game-${i}` })?.targets.join(',')
		);
		expect(new Set(draws).size).toBeGreaterThan(1);
	});

	it('puzzleNumber counts days since the epoch', () => {
		const g = new WordGraph(fixture);
		const epoch = '2026-08-19';
		expect(pickDailyQuordle(g, epoch, 3, { seedKey: 'game-a', epoch })?.puzzleNumber).toBe(1);
		expect(pickDailyQuordle(g, '2026-08-22', 3, { seedKey: 'game-a', epoch })?.puzzleNumber).toBe(
			4
		);
	});
});

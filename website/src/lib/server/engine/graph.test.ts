import { describe, expect, it } from 'vitest';
import { WordGraph } from './graph';
import type { WordGraphData } from './types';

// cat - cot - cog - dog chain, plus an isolated word with no neighbors.
const fixture: WordGraphData = {
	length: 3,
	words: ['cat', 'cot', 'cog', 'dog', 'zzz'],
	adjacency: [[1], [0, 2], [1, 3], [2], []]
};

describe('WordGraph', () => {
	it('reports membership', () => {
		const g = new WordGraph(fixture);
		expect(g.has('cat')).toBe(true);
		expect(g.has('nope')).toBe(false);
	});

	it('resolves neighbors by word, not index', () => {
		const g = new WordGraph(fixture);
		expect(g.neighbors('cot')).toEqual(['cat', 'cog']);
	});

	it('returns no neighbors for unknown or isolated words', () => {
		const g = new WordGraph(fixture);
		expect(g.neighbors('nope')).toEqual([]);
		expect(g.neighbors('zzz')).toEqual([]);
	});

	it('exposes size and all words', () => {
		const g = new WordGraph(fixture);
		expect(g.size()).toBe(5);
		expect(g.allWords()).toEqual(fixture.words);
	});
});

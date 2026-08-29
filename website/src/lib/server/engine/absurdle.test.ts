import { describe, expect, it } from 'vitest';
import { absurdleGuess, decodeCandidates, encodeCandidates } from './absurdle';
import { WordGraph } from './graph';
import type { WordGraphData } from './types';

const fixture: WordGraphData = {
	length: 5,
	words: ['aaaaa', 'aaaab', 'bbbbb', 'ccccc', 'ddddd'],
	adjacency: [[], [], [], [], []]
};

describe('absurdleGuess', () => {
	it('keeps the largest bucket rather than the one the "real" answer would be in', () => {
		// Guessing "aaaaa": "aaaaa" itself scores all-correct (bucket size 1),
		// "aaaab" scores correct*4+absent (bucket size 1), and the rest score
		// all-absent (bucket size 3) — the algorithm should keep that
		// larger all-absent bucket, not reveal a near-win.
		const candidates = ['aaaaa', 'aaaab', 'bbbbb', 'ccccc', 'ddddd'];
		const outcome = absurdleGuess(candidates, 'aaaaa');
		expect(outcome.candidates.sort()).toEqual(['bbbbb', 'ccccc', 'ddddd']);
		expect(outcome.won).toBe(false);
		expect(outcome.result.every((r) => r.status === 'absent')).toBe(true);
	});

	it('breaks a tie between equally-sized buckets toward the grayest pattern, never the win', () => {
		// All three candidates land in their own singleton bucket against
		// "aaaaa" — a three-way tie. The all-correct bucket ("aaaaa" itself)
		// and the near-miss bucket ("aaaab") are both more informative than
		// the all-absent bucket ("bbbbb"), so the grayest should win the tie.
		const candidates = ['aaaaa', 'aaaab', 'bbbbb'];
		const outcome = absurdleGuess(candidates, 'aaaaa');
		expect(outcome.candidates).toEqual(['bbbbb']);
		expect(outcome.won).toBe(false);
		expect(outcome.result.every((r) => r.status === 'absent')).toBe(true);
	});

	it('only reports a win when a single candidate remains and the guess matches it exactly', () => {
		const outcome = absurdleGuess(['bbbbb'], 'bbbbb');
		expect(outcome.won).toBe(true);
		expect(outcome.candidates).toEqual(['bbbbb']);
		expect(outcome.result.every((r) => r.status === 'correct')).toBe(true);
	});

	it('does not mutate the candidates array passed in', () => {
		const candidates = ['aaaaa', 'aaaab', 'bbbbb', 'ccccc', 'ddddd'];
		const before = candidates.slice();
		absurdleGuess(candidates, 'aaaaa');
		expect(candidates).toEqual(before);
	});
});

describe('encodeCandidates / decodeCandidates', () => {
	it('round-trips a candidate subset, regardless of input order', () => {
		const graph = new WordGraph(fixture);
		const token = encodeCandidates(graph, ['ccccc', 'aaaaa']);
		expect(decodeCandidates(graph, token)?.sort()).toEqual(['aaaaa', 'ccccc']);
	});

	it('round-trips the full candidate set', () => {
		const graph = new WordGraph(fixture);
		const token = encodeCandidates(graph, graph.allWords());
		expect(decodeCandidates(graph, token)?.sort()).toEqual([...graph.allWords()].sort());
	});

	it('round-trips a single remaining candidate', () => {
		const graph = new WordGraph(fixture);
		const token = encodeCandidates(graph, ['ddddd']);
		expect(decodeCandidates(graph, token)).toEqual(['ddddd']);
	});

	it('chains through absurdleGuess the same way passing candidates directly does', () => {
		const graph = new WordGraph(fixture);
		const step1 = absurdleGuess(graph.allWords(), 'aaaaa');
		const token1 = encodeCandidates(graph, step1.candidates);

		const resumed = decodeCandidates(graph, token1)!;
		const step2FromToken = absurdleGuess(resumed, 'bbbbb');
		const step2Direct = absurdleGuess(step1.candidates, 'bbbbb');

		expect(step2FromToken.candidates.sort()).toEqual(step2Direct.candidates.sort());
	});

	it('returns null for a malformed token', () => {
		const graph = new WordGraph(fixture);
		expect(decodeCandidates(graph, 'not-valid-base64url!!!')).toBeNull();
	});

	it('returns null for a token sized for a different graph', () => {
		const graph = new WordGraph(fixture);
		const biggerGraph = new WordGraph({
			...fixture,
			words: [...fixture.words, 'eeeee', 'fffff', 'ggggg', 'hhhhh'],
			adjacency: [...fixture.adjacency, [], [], [], []]
		});
		const token = encodeCandidates(biggerGraph, biggerGraph.allWords());
		expect(decodeCandidates(graph, token)).toBeNull();
	});
});

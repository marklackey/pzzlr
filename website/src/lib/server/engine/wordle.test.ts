import { describe, expect, it } from 'vitest';
import { WordGraph } from './graph';
import { hardModeViolation, isWin, pickDailyWord, scoreGuess } from './wordle';
import type { WordGraphData } from './types';

const fixture: WordGraphData = {
	length: 3,
	words: ['cat', 'cot', 'cog', 'dog', 'zzz'],
	adjacency: [[1], [0, 2], [1, 3], [2], []]
};

describe('scoreGuess', () => {
	it('marks exact-position letters correct', () => {
		expect(scoreGuess('cat', 'cat')).toEqual([
			{ letter: 'c', status: 'correct' },
			{ letter: 'a', status: 'correct' },
			{ letter: 't', status: 'correct' }
		]);
	});

	it('marks a present-but-misplaced letter, and absent ones', () => {
		expect(scoreGuess('cat', 'tac')).toEqual([
			{ letter: 't', status: 'present' },
			{ letter: 'a', status: 'correct' },
			{ letter: 'c', status: 'present' }
		]);
		expect(scoreGuess('cat', 'dog')).toEqual([
			{ letter: 'd', status: 'absent' },
			{ letter: 'o', status: 'absent' },
			{ letter: 'g', status: 'absent' }
		]);
	});

	it('does not double-count a repeated guessed letter beyond how many times it appears in the secret', () => {
		// secret "leper" has two "e"s (index 1 and 3); guess[3] lands on
		// index 3's "e" exactly, leaving exactly one unclaimed "e" (index 1)
		// for guess[2] to claim as "present" — neither guessed "e" goes
		// unscored, but a third guessed "e" would have, since the pool is
		// exhausted after these two.
		expect(scoreGuess('leper', 'sleep')).toEqual([
			{ letter: 's', status: 'absent' },
			{ letter: 'l', status: 'present' },
			{ letter: 'e', status: 'present' },
			{ letter: 'e', status: 'correct' },
			{ letter: 'p', status: 'present' }
		]);
	});

	it('throws on a length mismatch', () => {
		expect(() => scoreGuess('cat', 'cats')).toThrow();
	});
});

describe('isWin', () => {
	it('is true only when every letter is correct', () => {
		expect(isWin(scoreGuess('cat', 'cat'))).toBe(true);
		expect(isWin(scoreGuess('cat', 'cot'))).toBe(false);
	});
});

describe('pickDailyWord', () => {
	describe('fixed target', () => {
		it('is deterministic and just echoes the target back', () => {
			const g = new WordGraph(fixture);
			const a = pickDailyWord(g, 'dog', '2026-08-19');
			const b = pickDailyWord(g, 'dog', '2026-08-19');
			expect(a).toEqual(b);
			expect(a?.target).toBe('dog');
		});

		it('returns null when the target is not in the graph', () => {
			const g = new WordGraph(fixture);
			expect(pickDailyWord(g, 'nope', '2026-08-19')).toBeNull();
		});
	});

	describe('daily mode (target: null)', () => {
		it('is deterministic per seedKey and date', () => {
			const g = new WordGraph(fixture);
			const a = pickDailyWord(g, null, '2026-08-19', { seedKey: 'game-a' });
			const b = pickDailyWord(g, null, '2026-08-19', { seedKey: 'game-a' });
			expect(a).toEqual(b);
			expect(a?.target).toBeTypeOf('string');
		});

		it('varies by date (in general)', () => {
			const g = new WordGraph(fixture);
			const targets = new Set(
				Array.from(
					{ length: 5 },
					(_, i) => pickDailyWord(g, null, `2026-08-${10 + i}`, { seedKey: 'game-a' })?.target
				)
			);
			expect(targets.size).toBeGreaterThan(1);
		});

		it('varies by seedKey on the same date (in general)', () => {
			const g = new WordGraph(fixture);
			const targets = new Set(
				Array.from(
					{ length: 5 },
					(_, i) => pickDailyWord(g, null, '2026-08-19', { seedKey: `game-${i}` })?.target
				)
			);
			expect(targets.size).toBeGreaterThan(1);
		});
	});

	it('puzzleNumber counts days since the epoch', () => {
		const g = new WordGraph(fixture);
		const epoch = '2026-08-19';
		expect(pickDailyWord(g, 'dog', epoch, { epoch })?.puzzleNumber).toBe(1);
		expect(pickDailyWord(g, 'dog', '2026-08-22', { epoch })?.puzzleNumber).toBe(4);
	});
});

describe('hardModeViolation', () => {
	const scored = (secret: string, guess: string) => scoreGuess(secret, guess);

	it('allows any guess when nothing has been revealed', () => {
		expect(hardModeViolation([], 'cat')).toBeNull();
	});

	it('requires a green letter to stay put', () => {
		// secret "cot", guess "cat": c green, a absent, t green.
		const previous = [scored('cot', 'cat')];
		expect(hardModeViolation(previous, 'dot')).toMatch(/C must stay in position 1/);
		expect(hardModeViolation(previous, 'cut')).toBeNull();
	});

	it('requires a yellow letter to be used somewhere', () => {
		// secret "cot", guess "tag": t is present but misplaced.
		const previous = [scored('cot', 'tag')];
		expect(hardModeViolation(previous, 'cob')).toMatch(/T must be used somewhere/);
		expect(hardModeViolation(previous, 'cot')).toBeNull();
	});

	it('reports each requirement once, however many rows revealed it', () => {
		const previous = [scored('cot', 'cat'), scored('cot', 'cut')];
		const message = hardModeViolation(previous, 'dog');
		expect(message?.match(/C must stay/g)).toHaveLength(1);
	});
});

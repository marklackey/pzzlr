import { describe, expect, it } from 'vitest';
import { boardIsCurrent, ladderChain } from './ladder-attempt';
import type { DailyPuzzle } from './engine';

const puzzle: DailyPuzzle = {
	date: '2026-08-30',
	puzzleNumber: 12,
	target: 'poop',
	start: 'dive',
	length: 4,
	minSteps: 6,
	revealedRungs: ['dove']
};

describe('ladderChain', () => {
	it('is the free words followed by the steps actually taken', () => {
		expect(ladderChain(puzzle, ['cove', 'core'])).toEqual(['dive', 'dove', 'cove', 'core']);
	});

	it('is just the free words before any guess', () => {
		expect(ladderChain(puzzle, [])).toEqual(['dive', 'dove']);
	});
});

describe('boardIsCurrent', () => {
	const chain = ladderChain(puzzle, ['cove']);

	it('accepts a board standing on the word the attempt ends on', () => {
		expect(boardIsCurrent(chain, 'cove')).toBe(true);
	});

	it('rejects a board standing anywhere else, including earlier in this same ladder', () => {
		// Yesterday's board still on screen after the rollover, and a second
		// tab a step behind on the same attempt.
		expect(boardIsCurrent(chain, 'laze')).toBe(false);
		expect(boardIsCurrent(chain, 'dove')).toBe(false);
	});

	it('checks nothing when the client sends no board — an older embedded widget still plays', () => {
		expect(boardIsCurrent(chain, null)).toBe(true);
		expect(boardIsCurrent(chain, undefined)).toBe(true);
	});
});

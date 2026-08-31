import { describe, expect, it } from 'vitest';
import { boardIsCurrent, hardModeFor } from './wordle-attempt';

describe('boardIsCurrent', () => {
	const guesses = ['crane', 'stoic'];

	it('accepts a board showing exactly the rows the attempt has', () => {
		expect(boardIsCurrent(guesses, 2)).toBe(true);
		expect(boardIsCurrent([], 0)).toBe(true);
	});

	it('rejects a board showing any other number of rows', () => {
		// Yesterday's board still on screen after the rollover (its own rows
		// against a fresh attempt), and a second tab a guess behind.
		expect(boardIsCurrent([], 3)).toBe(false);
		expect(boardIsCurrent(guesses, 1)).toBe(false);
	});

	it('checks nothing when the client sends no count — an older embedded widget still plays', () => {
		expect(boardIsCurrent(guesses, null)).toBe(true);
		expect(boardIsCurrent(guesses, undefined)).toBe(true);
	});
});

describe('hardModeFor', () => {
	it('holds everyone to it, or nobody, when the game has decided', () => {
		expect(hardModeFor('required', false)).toBe(true);
		expect(hardModeFor('forbidden', true)).toBe(false);
	});

	it('takes the player at their word when the game leaves it to them', () => {
		expect(hardModeFor('optional', true)).toBe(true);
		expect(hardModeFor('optional', false)).toBe(false);
	});
});

import { describe, expect, it } from 'vitest';
import { possibleDailies } from './puzzle-counts';

describe('possibleDailies', () => {
	it('is the whole dictionary when a day takes one word', () => {
		// Wordle: 5,180 length-5 words in the Expanded dictionary, so 5,180
		// days before the first repeat.
		expect(possibleDailies(5180)).toBe(5180);
	});

	it('counts board sets, not words, when a day takes several', () => {
		// Quordle's window advances by the board count and wraps, so it
		// returns to a start it has used after wordCount/gcd days.
		expect(possibleDailies(5180, 4)).toBe(1295);
		// Coprime with the pool: every start is used before any repeats.
		expect(possibleDailies(5179, 4)).toBe(5179);
	});

	it('is one when a day uses the whole dictionary', () => {
		expect(possibleDailies(4, 4)).toBe(1);
	});

	it('is zero when a day needs more words than exist', () => {
		expect(possibleDailies(3, 4)).toBe(0);
		expect(possibleDailies(0)).toBe(0);
	});
});

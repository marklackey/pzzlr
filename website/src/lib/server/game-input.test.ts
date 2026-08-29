import { describe, expect, it } from 'vitest';
import { gameFormToBody, parseGameInput } from './game-input';

// "aback" is a common word present in every dictionary tier; "aahed" only
// clears the ESDB size-80 cut — it's absent from the smaller 50/60 tiers.
// See graphbuilder/data/esdb/README.md for what each size tier means.
const COMMON_WORD = 'aback';
const SIZE_80_ONLY_WORD = 'aahed';

describe('parseGameInput dictionarySize', () => {
	it('defaults to 80 when omitted', () => {
		const input = parseGameInput({ name: 'Test game', target: COMMON_WORD, length: 5 });
		expect(input.dictionarySize).toBe(80);
	});

	it('accepts a smaller tier and validates the target against it', () => {
		const input = parseGameInput({
			name: 'Test game',
			target: COMMON_WORD,
			length: 5,
			dictionarySize: 50
		});
		expect(input.dictionarySize).toBe(50);
	});

	// Targets are no longer required to be dictionary words at all — a game
	// may end at a name or an invented word, reached from a real one (see
	// checkStep's customTarget). A word that only clears a larger tier is
	// just one case of that, so the tier now constrains the ladder's steps
	// and the guesses, not the destination.
	it('allows a target from a larger tier, since a reachable non-word target is allowed', () => {
		const input = parseGameInput({
			name: 'Test game',
			target: SIZE_80_ONLY_WORD,
			length: 5,
			dictionarySize: 50
		});
		expect(input.target).toBe(SIZE_80_ONLY_WORD);
	});

	// Unwinnable games are allowed on purpose — see the target note in
	// game-input.ts. Nothing here is one letter from this, so no ladder could
	// ever reach it, and it's still accepted.
	it('accepts a target no word can reach, leaving the game unwinnable', () => {
		const input = parseGameInput({
			name: 'Test game',
			target: 'zxqvw',
			length: 5,
			dictionarySize: 50
		});
		expect(input.target).toBe('zxqvw');
	});

	it('accepts the same target once the tier is widened enough to include it', () => {
		const input = parseGameInput({
			name: 'Test game',
			target: SIZE_80_ONLY_WORD,
			length: 5,
			dictionarySize: 80
		});
		expect(input.dictionarySize).toBe(80);
	});

	it('rejects a dictionarySize outside the supported tiers', () => {
		expect(() =>
			parseGameInput({ name: 'Test game', target: COMMON_WORD, length: 5, dictionarySize: 99 })
		).toThrowError(expect.objectContaining({ status: 400 }));
	});
});

describe('gameFormToBody dictionarySize', () => {
	it('reads dictionarySize from the submitted form field', () => {
		const formData = new FormData();
		formData.set('target', COMMON_WORD);
		formData.set('dictionarySize', '60');
		const body = gameFormToBody(formData);
		expect(body.dictionarySize).toBe(60);
	});

	it('defaults to 80 when the form omits it', () => {
		const formData = new FormData();
		formData.set('target', COMMON_WORD);
		const body = gameFormToBody(formData);
		expect(body.dictionarySize).toBe(80);
	});
});

describe('parseGameInput name', () => {
	it('rejects a game with no name', () => {
		expect(() => parseGameInput({ target: COMMON_WORD, length: 5 })).toThrowError(
			expect.objectContaining({ status: 400 })
		);
	});

	it('rejects a name that is only whitespace', () => {
		expect(() => parseGameInput({ name: '   ', target: COMMON_WORD, length: 5 })).toThrowError(
			expect.objectContaining({ status: 400 })
		);
	});
});

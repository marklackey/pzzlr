import { describe, expect, it } from 'vitest';
import { gameFormToBody, parseGameInput } from './game-input';

// "aback" is a common word present in every dictionary tier; "aahed" only
// clears the ESDB size-80 cut — it's absent from the smaller 50/60 tiers.
// See graphbuilder/data/esdb/README.md for what each size tier means.
const COMMON_WORD = 'aback';
const SIZE_80_ONLY_WORD = 'aahed';

describe('parseGameInput dictionarySize', () => {
	it('defaults to 80 when omitted', () => {
		const input = parseGameInput({ target: COMMON_WORD, length: 5 });
		expect(input.dictionarySize).toBe(80);
	});

	it('accepts a smaller tier and validates the target against it', () => {
		const input = parseGameInput({ target: COMMON_WORD, length: 5, dictionarySize: 50 });
		expect(input.dictionarySize).toBe(50);
	});

	it('rejects a target that only exists in a larger tier', () => {
		expect(() =>
			parseGameInput({ target: SIZE_80_ONLY_WORD, length: 5, dictionarySize: 50 })
		).toThrowError(expect.objectContaining({ status: 400 }));
	});

	it('accepts the same target once the tier is widened enough to include it', () => {
		const input = parseGameInput({ target: SIZE_80_ONLY_WORD, length: 5, dictionarySize: 80 });
		expect(input.dictionarySize).toBe(80);
	});

	it('rejects a dictionarySize outside the supported tiers', () => {
		expect(() =>
			parseGameInput({ target: COMMON_WORD, length: 5, dictionarySize: 99 })
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

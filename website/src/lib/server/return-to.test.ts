import { describe, expect, it } from 'vitest';
import { safeReturnTo } from './return-to';

const FALLBACK = '/favorites';

describe('safeReturnTo', () => {
	it('keeps a path on this site, query string and all', () => {
		expect(safeReturnTo('/explore?q=poop&page=2', FALLBACK)).toBe('/explore?q=poop&page=2');
	});

	it('keeps a game page path', () => {
		expect(safeReturnTo('/g/demo', FALLBACK)).toBe('/g/demo');
	});

	it.each([
		['an absolute URL', 'https://evil.example/phish'],
		['a protocol-relative URL', '//evil.example/phish'],
		['a backslash-escaped host', '/\\evil.example'],
		['a javascript: URL', 'javascript:alert(1)'],
		['a bare path with no leading slash', 'explore'],
		['an empty string', '']
	])('refuses %s', (_label, value) => {
		expect(safeReturnTo(value, FALLBACK)).toBe(FALLBACK);
	});

	it('refuses a missing field, and anything that came in as a file', () => {
		expect(safeReturnTo(null, FALLBACK)).toBe(FALLBACK);
		expect(safeReturnTo(new File([], 'x'), FALLBACK)).toBe(FALLBACK);
	});
});

import { describe, expect, it } from 'vitest';
import { puzzleDate } from './date';

// The rollover boundary is the whole point of this helper — a puzzle that
// flips at the wrong hour is the bug this replaced (UTC put it at 6pm for
// US players), so pin the edges rather than just the happy path.
describe('puzzleDate', () => {
	it('rolls over at midnight US Eastern during daylight saving', () => {
		expect(puzzleDate(new Date('2026-08-29T03:59:00Z'))).toBe('2026-08-28');
		expect(puzzleDate(new Date('2026-08-29T04:00:00Z'))).toBe('2026-08-29');
	});

	it('still rolls over at midnight Eastern in winter, an hour later in UTC', () => {
		expect(puzzleDate(new Date('2026-01-15T04:59:00Z'))).toBe('2026-01-14');
		expect(puzzleDate(new Date('2026-01-15T05:00:00Z'))).toBe('2026-01-15');
	});

	it('does not flip at UTC midnight, which is still the evening before in Eastern', () => {
		expect(puzzleDate(new Date('2026-08-29T00:00:00Z'))).toBe('2026-08-28');
	});

	it('formats as YYYY-MM-DD, which is what the daily seeds and stored attempts key on', () => {
		expect(puzzleDate(new Date('2026-03-07T18:00:00Z'))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});
});

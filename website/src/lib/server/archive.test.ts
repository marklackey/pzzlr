import { describe, expect, it } from 'vitest';
import { ARCHIVE_LIMIT, archiveDays, firstPuzzleDate, isPastPuzzleDate } from './archive';

// The numbering epoch (see DEFAULT_EPOCH) — day 1 for every game.
const EPOCH = '2026-08-19';
// Created at noon Eastern on the 25th, so the timezone question ("which
// date is this instant?") is never the thing under test here.
const CREATED = new Date('2026-08-25T16:00:00Z');

describe('archiveDays', () => {
	it('lists every day from the game’s first through yesterday, newest first', () => {
		expect(archiveDays(CREATED, '2026-08-28')).toEqual([
			{ date: '2026-08-27', puzzleNumber: 9 },
			{ date: '2026-08-26', puzzleNumber: 8 },
			{ date: '2026-08-25', puzzleNumber: 7 }
		]);
	});

	it('leaves today out — it is the board on the page, and it is not over', () => {
		const days = archiveDays(CREATED, '2026-08-28');
		expect(days.map((d) => d.date)).not.toContain('2026-08-28');
	});

	it('is empty on a game’s first day, when nothing has finished yet', () => {
		expect(archiveDays(CREATED, '2026-08-25')).toEqual([]);
	});

	it('never reaches back past the game’s creation', () => {
		const days = archiveDays(CREATED, '2026-09-30');
		expect(days.at(-1)?.date).toBe('2026-08-25');
	});

	it('stops at the display cap for a long-running game', () => {
		const days = archiveDays(new Date('2026-08-19T16:00:00Z'), '2027-08-19');
		expect(days).toHaveLength(ARCHIVE_LIMIT);
		expect(days[0].date).toBe('2027-08-18');
	});

	it('crosses a month boundary without skipping or repeating a day', () => {
		const days = archiveDays(CREATED, '2026-09-02');
		expect(days.map((d) => d.date)).toEqual([
			'2026-09-01',
			'2026-08-31',
			'2026-08-30',
			'2026-08-29',
			'2026-08-28',
			'2026-08-27',
			'2026-08-26',
			'2026-08-25'
		]);
	});
});

describe('firstPuzzleDate', () => {
	it('is the day the game was created', () => {
		expect(firstPuzzleDate(CREATED)).toBe('2026-08-25');
	});

	it('never predates the numbering epoch', () => {
		expect(firstPuzzleDate(new Date('2020-01-01T16:00:00Z'))).toBe(EPOCH);
	});
});

describe('isPastPuzzleDate', () => {
	const today = '2026-08-28';

	it('accepts a finished day the game existed for', () => {
		expect(isPastPuzzleDate('2026-08-26', CREATED, today)).toBe(true);
	});

	it('refuses today — the puzzle is still being played', () => {
		expect(isPastPuzzleDate(today, CREATED, today)).toBe(false);
	});

	it('refuses tomorrow, which is the whole point of a daily', () => {
		expect(isPastPuzzleDate('2026-08-29', CREATED, today)).toBe(false);
		expect(isPastPuzzleDate('2030-01-01', CREATED, today)).toBe(false);
	});

	it('refuses a day before the game existed', () => {
		expect(isPastPuzzleDate('2026-08-24', CREATED, today)).toBe(false);
	});

	it.each([null, '', 'yesterday', '2026-8-1', '2026-08-26T00:00:00Z', 'not-a-date'])(
		'refuses %p, which is not a puzzle date',
		(value) => {
			expect(isPastPuzzleDate(value, CREATED, today)).toBe(false);
		}
	);
});

import { DEFAULT_EPOCH, puzzleNumberFor } from './engine/daily-seed';
import { puzzleDate, shiftDate } from './date';

export interface ArchiveDay {
	/** YYYY-MM-DD, the same key attempts and daily seeds use. */
	date: string;
	/** What the board shows for that day ("#12"). */
	puzzleNumber: number;
}

/**
 * How many past days a game page offers at once. The puzzles themselves are
 * generated on demand from (date, game) and stretch back forever in
 * principle, so this is a display bound, not a data one — far more than
 * anyone scrolls, small enough that the list stays a list.
 */
export const ARCHIVE_LIMIT = 60;

/**
 * The first day a game has a puzzle worth offering: the day it was created,
 * or the numbering epoch if it somehow predates it.
 *
 * The generators are happy to produce a puzzle for any date, including ones
 * before the game existed — they're pure functions of (date, game id). But
 * "puzzle #3" of a game created last week is a puzzle nobody could have
 * played, so the archive starts where the game does.
 */
export function firstPuzzleDate(createdAt: Date): string {
	const created = puzzleDate(createdAt);
	return created > DEFAULT_EPOCH ? created : DEFAULT_EPOCH;
}

/**
 * A game's past puzzles, newest first — every day from its first through
 * yesterday, capped at ARCHIVE_LIMIT.
 *
 * Today is deliberately absent: it's the board already on the page, and
 * it isn't finished, so it has no answer to give away.
 */
export function archiveDays(createdAt: Date, today: string = puzzleDate()): ArchiveDay[] {
	const first = firstPuzzleDate(createdAt);
	const days: ArchiveDay[] = [];
	// Dates in this format sort as strings, which is what makes walking
	// backwards until we pass `first` a plain comparison.
	for (
		let date = shiftDate(today, -1);
		date >= first && days.length < ARCHIVE_LIMIT;
		date = shiftDate(date, -1)
	) {
		days.push({ date, puzzleNumber: puzzleNumberFor(date, DEFAULT_EPOCH) });
	}
	return days;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Whether `date` names a day whose puzzle is over and therefore fair game
 * to open or reveal.
 *
 * Rejects today and anything after it — the whole point of a daily is that
 * nobody sees tomorrow early — and anything before the game existed, or
 * that isn't a date at all. Callers get one answer for "can this be
 * played?" and "can this be revealed?" because it's the same question.
 */
export function isPastPuzzleDate(
	date: string | null,
	createdAt: Date,
	today: string = puzzleDate()
): date is string {
	if (!date || !DATE_PATTERN.test(date)) return false;
	if (Number.isNaN(Date.parse(`${date}T00:00:00Z`))) return false;
	return date < today && date >= firstPuzzleDate(createdAt);
}

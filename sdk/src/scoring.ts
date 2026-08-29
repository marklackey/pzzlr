import type { LetterResult, LetterStatus } from './types';

// "correct" always wins over "present"/"absent" once seen, since a letter
// can be correct in one guess and merely present had it appeared elsewhere
// in an earlier guess.
const STATUS_RANK: Record<LetterStatus, number> = { absent: 0, present: 1, correct: 2 };

/**
 * Best status seen for `letter` across every scored row, or null if it
 * hasn't been guessed yet — used to color the on-screen keyboard. Callers
 * with more than one row-group to consider (e.g. quordle's per-board
 * results) can flatten them into a single iterable first.
 */
export function bestLetterStatus(
	rows: Iterable<LetterResult[]>,
	letter: string
): LetterStatus | null {
	let best: LetterStatus | null = null;
	for (const row of rows) {
		for (const { letter: l, status: s } of row) {
			if (l !== letter) continue;
			if (!best || STATUS_RANK[s] > STATUS_RANK[best]) best = s;
		}
	}
	return best;
}

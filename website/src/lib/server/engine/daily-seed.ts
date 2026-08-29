/**
 * Deterministic "same puzzle for everyone on a given date" seeding, shared
 * by every daily-puzzle picker (ladder, wordle, …) so they all agree on
 * what a puzzle's epoch/numbering/seed derivation means.
 */

export const DEFAULT_EPOCH = '2026-08-19';

// FNV-1a-ish string hash -> mulberry32 PRNG. Not cryptographic, just needs
// to turn "2026-08-19:poop" into the same sequence of numbers every time so
// everyone gets the same puzzle on the same day.
export function seedFromString(s: string): number {
	let h = 1779033703 ^ s.length;
	for (let i = 0; i < s.length; i++) {
		h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
		h = (h << 13) | (h >>> 19);
	}
	return h >>> 0;
}

export function mulberry32(seed: number): () => number {
	let a = seed;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export function daysBetween(fromDate: string, toDate: string): number {
	const msPerDay = 24 * 60 * 60 * 1000;
	return Math.round(
		(Date.parse(`${toDate}T00:00:00Z`) - Date.parse(`${fromDate}T00:00:00Z`)) / msPerDay
	);
}

/** `puzzleNumber` for a given date under a given epoch — day 1 on the epoch date itself. */
export function puzzleNumberFor(date: string, epoch: string): number {
	return daysBetween(epoch, date) + 1;
}

/**
 * A seeded RNG for a given day, mixing in `target` when it's fixed (so a
 * pinned target still varies the seed by date) or `seedKey` when it's not
 * (so different random-mode games don't all land on the same word on the
 * same day — see the callers' PickDailyOptions.seedKey doc).
 */
export function dailyRandom(date: string, target: string | null, seedKey: string): () => number {
	return mulberry32(seedFromString(target !== null ? `${date}:${target}` : `${date}:${seedKey}`));
}

/**
 * A fixed pseudorandom permutation of [0, size) — seeded by `seedKey`
 * alone, not date, so every date shares the same permutation and only the
 * slice drawn from it (see dailyIndices) changes day to day. O(size) to
 * build; cheap enough to redo per call for the dictionary sizes this app
 * uses.
 */
function permutationFor(size: number, seedKey: string): number[] {
	const random = mulberry32(seedFromString(seedKey));
	const indices = Array.from({ length: size }, (_, i) => i);
	for (let i = size - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[indices[i], indices[j]] = [indices[j], indices[i]];
	}
	return indices;
}

/**
 * `count` indices into a size-`size` pool for `date` — a contiguous,
 * wrapped slice of a fixed permutation (see permutationFor), advancing by
 * `count` one slice per day. Within one date's slice the indices are
 * always distinct (as long as `count <= size`); across dates, slices don't
 * repeat until they've cycled all the way through the permutation, at
 * which point the sequence "rolls over" and starts again from the same
 * order — unlike dailyRandom, which can reroll an earlier day's pick at
 * any time purely by chance. Use this wherever "today's puzzle" means
 * drawing from a fixed, known-size pool and a repeat should only ever come
 * from actually exhausting that pool (see pickDailyWord, pickDailyPuzzle,
 * pickDailyQuordle).
 */
export function dailyIndices(
	date: string,
	epoch: string,
	size: number,
	seedKey: string,
	count = 1
): number[] {
	const day = puzzleNumberFor(date, epoch) - 1;
	const perm = permutationFor(size, seedKey);
	const start = (day * count) % size;
	return Array.from({ length: count }, (_, i) => perm[(start + i) % size]);
}

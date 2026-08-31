/**
 * How many distinct daily puzzles a guessing game can produce before it
 * starts over — the wordle/quordle counterpart of the ladder form's
 * "possible puzzles for this target" (see countPossiblePuzzles).
 *
 * This is an exact cycle length rather than an estimate, because both
 * modes walk a fixed permutation of the dictionary instead of rerolling
 * each day (see dailyIndices): every one of these puzzles comes up before
 * any of them comes up a second time. It's also, therefore, the number of
 * days the game runs before it repeats.
 *
 * `drawsPerDay` is 1 for wordle and the board count for quordle. Each day
 * takes the next `drawsPerDay` words along the permutation, so the day's
 * puzzle is decided by where that window starts — and the window advances
 * by `drawsPerDay` and wraps, which brings it back to a start it has
 * already used after wordCount / gcd(wordCount, drawsPerDay) days.
 *
 * Lives outside server/ because the create form needs it in the browser,
 * same reasoning as DICTIONARY_SIZES in $lib/types.
 */
export function possibleDailies(wordCount: number, drawsPerDay = 1): number {
	// Fewer words than a day needs is the case pickDailyQuordle refuses
	// outright: no puzzle at all, rather than a short one.
	if (drawsPerDay < 1 || wordCount < drawsPerDay) return 0;
	return wordCount / greatestCommonDivisor(wordCount, drawsPerDay);
}

function greatestCommonDivisor(a: number, b: number): number {
	while (b !== 0) [a, b] = [b, a % b];
	return a;
}

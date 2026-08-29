/**
 * The timezone whose midnight rolls every game over to its next puzzle.
 *
 * One fixed zone rather than each player's own, so a game's daily puzzle is
 * the same puzzle for everyone at the same moment — the thing that makes a
 * shared score worth comparing, and what an embedded game on someone else's
 * site needs to stay coherent for its audience. (Wordle instead rolls over
 * at each player's local midnight, which trades that away.) US Eastern
 * because it puts the switch late at night for most players rather than
 * mid-evening, which is where UTC landed it.
 */
const PUZZLE_TIMEZONE = 'America/New_York';

/**
 * Today's puzzle date, YYYY-MM-DD, in PUZZLE_TIMEZONE. en-CA formats as
 * YYYY-MM-DD, and the Intl lookup handles daylight saving on its own, so
 * the switch stays at local midnight through the year rather than drifting
 * an hour twice a year.
 */
export function puzzleDate(now: Date = new Date()): string {
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: PUZZLE_TIMEZONE,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(now);
}

import type { HardModePolicy } from '$lib/types';

/**
 * Whether a new attempt is played under hard mode: the game decides unless
 * it has handed the decision to the player, in which case `requested` is
 * their answer.
 *
 * Only ever consulted when an attempt is created (see getOrCreateAttempt),
 * so a player's answer on an 'optional' game is settled by their first
 * guess and can't be revised later in the day — the point being that hard
 * mode isn't a rule you can step out of for one awkward guess. See
 * HardModePolicy in $lib/types.
 */
export function hardModeFor(policy: HardModePolicy, requested: boolean): boolean {
	if (policy === 'required') return true;
	if (policy === 'forbidden') return false;
	return requested;
}

/**
 * Whether the board a client is guessing from is still the board its
 * attempt is actually on.
 *
 * `rows` is how many scored rows the client has on screen. Like the
 * ladder's boardIsCurrent it is a check and nothing else — the guess is
 * always appended to the stored attempt, so a count named here can only
 * refuse a guess, never place one. A client that sends nothing is trusted
 * as before, which keeps an older embedded copy of the widget working.
 *
 * The two come apart when something else has moved the attempt on: a
 * second tab on the same token making its own guesses, or a client that
 * doesn't say which day's board it is on (see the guess route's `date`)
 * still sitting on a board the rollover has since replaced. Scoring the
 * guess anyway spends a guess out of a board the player can't see, and
 * hands back tile colors for a word they were never playing.
 */
export function boardIsCurrent(guesses: string[], rows: number | null | undefined): boolean {
	return typeof rows !== 'number' || rows === guesses.length;
}

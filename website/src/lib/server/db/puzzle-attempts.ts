import { and, eq } from 'drizzle-orm';
import { getDb } from './index';
import { puzzleAttempt, type AttemptConfig } from './schema';

export async function getAttempt(gameId: string, date: string, token: string) {
	const [row] = await getDb()
		.select()
		.from(puzzleAttempt)
		.where(
			and(
				eq(puzzleAttempt.gameId, gameId),
				eq(puzzleAttempt.date, date),
				eq(puzzleAttempt.token, token)
			)
		);
	return row ?? null;
}

/**
 * Fetches the existing attempt for this (game, day, token), or starts a
 * fresh one against `config` — which the new attempt keeps, so an edit to
 * the game part-way through doesn't change the puzzle underneath it. See
 * the config column in schema.ts.
 *
 * `hardMode` is only read when the attempt is actually created, which is
 * what makes a player's choice on an 'optional' game stick for the rest of
 * the day: after the first guess this is an existing row, and what the
 * caller passes stops mattering. See the hardMode column in schema.ts.
 */
export async function getOrCreateAttempt(
	gameId: string,
	date: string,
	token: string,
	config: AttemptConfig,
	hardMode = false
) {
	const existing = await getAttempt(gameId, date, token);
	if (existing) return existing;

	const [row] = await getDb()
		.insert(puzzleAttempt)
		.values({ gameId, date, token, guesses: [], solved: false, config, hardMode })
		// A second request racing the first to create the same (game, date,
		// token) row loses the insert and falls through to the select below
		// instead of erroring — same "at most one true attempt" guarantee
		// the unique index exists to enforce.
		.onConflictDoNothing()
		.returning();

	return row ?? (await getAttempt(gameId, date, token))!;
}

/** Appends one guess and updates `solved`. Callers own checking the guess/attempt limits first, and pass the attempt they already have in hand (e.g. from getOrCreateAttempt) rather than this re-reading it. */
export async function appendGuess(
	attempt: { id: string; guesses: string[]; solved: boolean },
	guess: string,
	solved: boolean
) {
	const [row] = await getDb()
		.update(puzzleAttempt)
		.set({ guesses: [...attempt.guesses, guess], solved: attempt.solved || solved })
		.where(eq(puzzleAttempt.id, attempt.id))
		.returning();
	return row ?? null;
}

import { and, eq } from 'drizzle-orm';
import { getDb } from './index';
import { wordleAttempt } from './schema';

export async function getAttempt(gameId: string, date: string, token: string) {
	const [row] = await getDb()
		.select()
		.from(wordleAttempt)
		.where(
			and(
				eq(wordleAttempt.gameId, gameId),
				eq(wordleAttempt.date, date),
				eq(wordleAttempt.token, token)
			)
		);
	return row ?? null;
}

/** Fetches the existing attempt for this (game, day, token), or starts a fresh one. */
export async function getOrCreateAttempt(gameId: string, date: string, token: string) {
	const existing = await getAttempt(gameId, date, token);
	if (existing) return existing;

	const [row] = await getDb()
		.insert(wordleAttempt)
		.values({ gameId, date, token, guesses: [], solved: false })
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
		.update(wordleAttempt)
		.set({ guesses: [...attempt.guesses, guess], solved: attempt.solved || solved })
		.where(eq(wordleAttempt.id, attempt.id))
		.returning();
	return row ?? null;
}

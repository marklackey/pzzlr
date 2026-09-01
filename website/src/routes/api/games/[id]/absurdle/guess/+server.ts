import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { appendGuess, getOrCreateAttempt } from '$lib/server/db/puzzle-attempts';
import { absurdleGuess, decodeCandidates, encodeCandidates } from '$lib/server/engine';
import { puzzleDate } from '$lib/server/date';
import { loadGameForMode } from '$lib/server/route-helpers';
import { snapshotOf } from '$lib/server/attempt-continuity';

/**
 * Scores one guess adversarially against every word still consistent with
 * this run's guesses so far (see absurdle.ts).
 *
 * Two different tokens meet here, and they do different jobs. `token` is
 * the player's attempt token, the same per-(browser, game) id every other
 * mode uses, and it's what makes a run survive a reload — the guess is
 * recorded against it (see puzzle-attempts.ts). `candidates` is the opaque
 * "what's still possible" set (see encodeCandidates), echoed back from the
 * previous call and omitted on the first guess of a run. Trusting the
 * client to carry that set is safe in a way it wouldn't be for wordle:
 * absurdle has no secret to leak early, so a narrowed candidate set is the
 * mechanic working as designed rather than a soft trust tradeoff. When it's
 * missing, every word is a candidate again — which is why the stored
 * guesses, not this, are what a resumed board is rebuilt from (see the
 * start route).
 *
 * Unlike wordle there's no guesses-remaining or reveal: absurdle has no
 * turn cap, so the only way to finish is to corner it into one word.
 */
export const POST: RequestHandler = async (event) => {
	const { config, graph } = await loadGameForMode(event, 'absurdle', 'guess');

	const body = await event.request.json().catch(() => null);
	const guess = typeof body?.guess === 'string' ? body.guess.toLowerCase() : null;
	const token = typeof body?.token === 'string' && body.token.length > 0 ? body.token : null;
	const candidateToken = typeof body?.candidates === 'string' ? body.candidates : null;
	if (!guess || !token) {
		throw error(400, 'expected { guess: string, token: string, candidates?: string }');
	}

	// An invalid word doesn't consume a guess — same as every other mode.
	if (guess.length !== config.length || !graph.has(guess)) {
		return json({ isWord: false });
	}

	const date = puzzleDate();
	const attempt = await getOrCreateAttempt(config.id, date, token, snapshotOf(config));
	if (attempt.solved) {
		throw error(409, 'this run is already finished');
	}

	const candidates =
		(candidateToken && decodeCandidates(graph, candidateToken)) || graph.allWords();
	const outcome = absurdleGuess(candidates, guess);

	await appendGuess(attempt, guess, outcome.won);

	return json({
		isWord: true,
		result: outcome.result,
		remaining: outcome.candidates.length,
		won: outcome.won,
		candidates: encodeCandidates(graph, outcome.candidates)
	});
};

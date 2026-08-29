import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { absurdleGuess, decodeCandidates, encodeCandidates } from '$lib/server/engine';
import { loadGameForMode } from '$lib/server/route-helpers';

/**
 * Scores one guess adversarially against every word still consistent with
 * this play session's guesses so far (see absurdle.ts). There's no
 * server-side attempt record — the caller carries "what's still possible"
 * itself, as an opaque `token` (see encodeCandidates/decodeCandidates)
 * echoed back from the previous call, or omitted on the first guess of a
 * game (every word starts a candidate). That's safe (not just convenient)
 * here in a way it isn't for wordle: absurdle has no secret to leak early,
 * so trusting the client to carry its own narrowed candidate set is the
 * entire mechanic working as designed, not a soft trust tradeoff. Also
 * unlike wordle, there's no guesses-remaining/reveal concept: absurdle has
 * no turn cap, so the only way to finish is to actually corner it into one
 * word.
 */
export const POST: RequestHandler = async (event) => {
	const { config, graph } = await loadGameForMode(event, 'absurdle', 'guess');

	const body = await event.request.json().catch(() => null);
	const guess = typeof body?.guess === 'string' ? body.guess.toLowerCase() : null;
	const token = typeof body?.token === 'string' ? body.token : null;
	if (!guess) {
		throw error(400, 'expected { guess: string, token?: string }');
	}

	// An invalid word doesn't consume a guess — same as every other mode.
	if (guess.length !== config.length || !graph.has(guess)) {
		return json({ isWord: false });
	}

	const candidates = (token && decodeCandidates(graph, token)) || graph.allWords();
	const outcome = absurdleGuess(candidates, guess);

	return json({
		isWord: true,
		result: outcome.result,
		remaining: outcome.candidates.length,
		won: outcome.won,
		token: encodeCandidates(graph, outcome.candidates)
	});
};

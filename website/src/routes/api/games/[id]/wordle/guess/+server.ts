import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { appendGuess, getOrCreateAttempt } from '$lib/server/db/wordle-attempts';
import { pickDailyWord, scoreGuess, isWin } from '$lib/server/engine';
import { todayUTC } from '$lib/server/date';
import { loadGameForMode } from '$lib/server/route-helpers';

/**
 * Scores one guess against today's secret without ever putting the secret
 * itself on the wire — the response's `result` echoes each guessed letter
 * back with a status, which is all a client needs to render tiles and
 * detect a win (every letter "correct"). The guess is also recorded against
 * the caller's attempt (see wordle-attempts.ts) so a solve/loss is
 * server-known rather than something the client just claims — see the
 * comment on wordleAttempt in schema.ts for what that guarantee is (and
 * isn't) good for.
 */
export const POST: RequestHandler = async (event) => {
	const { params } = event;
	const { config, graph } = await loadGameForMode(event, 'wordle', 'guess');

	const body = await event.request.json().catch(() => null);
	const guess = typeof body?.guess === 'string' ? body.guess.toLowerCase() : null;
	const token = typeof body?.token === 'string' && body.token.length > 0 ? body.token : null;
	const date = typeof body?.date === 'string' ? body.date : todayUTC();
	if (!guess || !token) {
		throw error(400, 'expected { guess: string, token: string, date?: string }');
	}

	const attempt = await getOrCreateAttempt(config.id, date, token);
	if (attempt.solved) {
		throw error(409, 'already solved — no more guesses to make');
	}
	if (attempt.guesses.length >= config.maxGuesses) {
		throw error(409, 'out of guesses');
	}

	// An invalid word doesn't consume an attempt — same as the ladder game's
	// guess route not penalizing a non-neighbor guess, and same as classic
	// Wordle rejecting non-dictionary entries for free.
	if (guess.length !== config.length || !graph.has(guess)) {
		return json({ isWord: false });
	}

	const puzzle = pickDailyWord(graph, config.target, date, { seedKey: config.id });
	if (!puzzle) {
		throw error(404, `could not generate a puzzle for game "${params.id}" on ${date}`);
	}

	const result = scoreGuess(puzzle.target, guess);
	const won = isWin(result);
	await appendGuess(attempt, guess, won);

	return json({ isWord: true, result, won });
};

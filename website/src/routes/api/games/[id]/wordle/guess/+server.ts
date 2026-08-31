import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { appendGuess, getOrCreateAttempt } from '$lib/server/db/puzzle-attempts';
import { pickDailyWord, scoreGuess, isWin, hardModeViolation } from '$lib/server/engine';
import { puzzleDate } from '$lib/server/date';
import { loadGameForMode } from '$lib/server/route-helpers';
import { boardIsCurrent, hardModeFor } from '$lib/server/wordle-attempt';
import { settingsForAttempt, snapshotOf } from '$lib/server/attempt-continuity';

/**
 * Scores one guess against today's secret without ever putting the secret
 * itself on the wire — the response's `result` echoes each guessed letter
 * back with a status, which is all a client needs to render tiles and
 * detect a win (every letter "correct"). The guess is also recorded against
 * the caller's attempt (see puzzle-attempts.ts) so a solve/loss is
 * server-known rather than something the client just claims — see the
 * comment on puzzleAttempt in schema.ts for what that guarantee is (and
 * isn't) good for.
 *
 * Hard mode, where the game leaves it to the player, is settled the same
 * way: `hard` is only read when this guess is the one that starts the
 * attempt, and after that the attempt's own stored answer governs. See
 * hardModeFor.
 *
 * The day being played comes from the request (`date`), not from the
 * clock: a board that was on screen when the puzzle rolled over goes on
 * being that day's board until it's done, rather than having tomorrow's
 * secret swapped in underneath it — see the widget's puzzleDay, and the
 * same "finish what you started" rule attempt-continuity applies to a
 * game's settings.
 */
export const POST: RequestHandler = async (event) => {
	const { params } = event;
	const loaded = await loadGameForMode(event, 'wordle', 'guess');

	const body = await event.request.json().catch(() => null);
	const guess = typeof body?.guess === 'string' ? body.guess.toLowerCase() : null;
	const token = typeof body?.token === 'string' && body.token.length > 0 ? body.token : null;
	// Today's is the default, for a caller that doesn't say which board
	// it's on — an older embedded copy of the widget, or one whose `date`
	// prop is unset and so sends ''.
	const date = typeof body?.date === 'string' && body.date ? body.date : puzzleDate();
	// Optional: how many scored rows the caller's board is showing, checked
	// against this attempt's own guess count below. See boardIsCurrent.
	const rows = typeof body?.rows === 'number' ? body.rows : null;
	// The player's answer on a game that leaves hard mode to them, which
	// only counts if this guess is the one starting the attempt.
	const hard = body?.hard === true;
	if (!guess || !token) {
		throw error(
			400,
			'expected { guess: string, token: string, date?: string, rows?: number, hard?: boolean }'
		);
	}

	const attempt = await getOrCreateAttempt(
		loaded.config.id,
		date,
		token,
		snapshotOf(loaded.config),
		hardModeFor(loaded.config.hardMode, hard)
	);
	// Whatever this attempt started under, it keeps — see attempt-continuity.
	const { config, graph } = settingsForAttempt(loaded.config, loaded.graph, attempt);
	if (attempt.solved) {
		throw error(409, 'already solved — no more guesses to make');
	}
	if (attempt.guesses.length >= config.maxGuesses) {
		throw error(409, 'out of guesses');
	}
	// A board that isn't this attempt's gets no answer about it — 409 is the
	// same "resync, don't press on" signal the two checks above send, and the
	// widget already reloads on it. See boardIsCurrent for what drifts.
	if (!boardIsCurrent(attempt.guesses, rows)) {
		throw error(409, "that board isn't the current one");
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

	// The attempt's own answer, not the game's policy: a game switched to
	// hard mode part-way through someone's day doesn't start holding them
	// to hints they were free to ignore. See the hardMode column in
	// schema.ts.
	if (attempt.hardMode) {
		// Scored from the stored guesses rather than anything the client
		// sends, for the same reason the secret never goes over the wire:
		// otherwise hard mode is a suggestion the client can decline.
		const previous = attempt.guesses.map((g) => scoreGuess(puzzle.target, g));
		const violation = hardModeViolation(previous, guess);
		// Costs no attempt either — it's a rejected entry, not a wrong one.
		if (violation) return json({ isWord: true, hardModeViolation: violation });
	}

	const result = scoreGuess(puzzle.target, guess);
	const won = isWin(result);
	await appendGuess(attempt, guess, won);

	return json({ isWord: true, result, won });
};

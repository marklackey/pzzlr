import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { appendGuess, getOrCreateAttempt } from '$lib/server/db/puzzle-attempts';
import { pickDailyQuordle, scoreGuess, isWin } from '$lib/server/engine';
import { puzzleDate } from '$lib/server/date';
import { loadGameForMode } from '$lib/server/route-helpers';
import { boardIsCurrent } from '$lib/server/wordle-attempt';
import { settingsForAttempt, snapshotOf } from '$lib/server/attempt-continuity';

/**
 * Scores one guess against every board's secret at once, without ever
 * putting a secret on the wire for a board that isn't already solved by
 * this very guess — same "echo letters back, not the word" shape as the
 * wordle guess route.
 *
 * The guess is recorded against the caller's attempt (see
 * puzzle-attempts.ts), which is what makes a quordle one a day rather than
 * something a reload starts over: the same server-side memory wordle and
 * ladder have always had. Before that, this mode trusted the client to
 * count its own guesses, and a refresh handed back a fresh board set.
 *
 * Which day's board set this is comes from the request (`date`), not from
 * the clock: a board that was on screen when the puzzle rolled over goes on
 * being that day's board set until it's done, rather than having tomorrow's
 * secrets swapped in underneath it — see the widget's puzzleDay, and the
 * same "finish what you started" rule attempt-continuity applies to a
 * game's settings.
 */
export const POST: RequestHandler = async (event) => {
	const { params } = event;
	const loaded = await loadGameForMode(event, 'quordle', 'guess');

	const body = await event.request.json().catch(() => null);
	const guess = typeof body?.guess === 'string' ? body.guess.toLowerCase() : null;
	const token = typeof body?.token === 'string' && body.token.length > 0 ? body.token : null;
	// Today's is the default, for a caller that doesn't say which board set
	// it's on — one whose `date` prop is unset and so sends ''.
	const date = typeof body?.date === 'string' && body.date ? body.date : puzzleDate();
	// Optional: how many scored rows the caller's boards are showing,
	// checked against this attempt's own guess count below. See
	// boardIsCurrent.
	const rows = typeof body?.rows === 'number' ? body.rows : null;
	if (!guess || !token) {
		throw error(400, 'expected { guess: string, token: string, date?: string, rows?: number }');
	}

	const attempt = await getOrCreateAttempt(
		loaded.config.id,
		date,
		token,
		snapshotOf(loaded.config)
	);
	// This attempt keeps the game it began, whatever the game says now.
	const { config, graph } = settingsForAttempt(loaded.config, loaded.graph, attempt);

	if (attempt.solved) {
		throw error(409, 'this board set is already solved');
	}
	if (attempt.guesses.length >= config.maxGuesses) {
		throw error(409, 'no guesses left on this board set');
	}
	if (!boardIsCurrent(attempt.guesses, rows)) {
		throw error(409, 'this board set has moved on — reload to catch up');
	}

	// An invalid word doesn't consume a guess — same as the wordle route.
	if (guess.length !== config.length || !graph.has(guess)) {
		return json({ isWord: false });
	}

	const puzzle = pickDailyQuordle(graph, date, config.boardCount, { seedKey: config.id });
	if (!puzzle) {
		throw error(404, `could not generate a board set for game "${params.id}" on ${date}`);
	}

	const results = puzzle.targets.map((target) => scoreGuess(target, guess));
	const solvedBoards = results.map((result) => isWin(result));
	// A quordle is solved when every board is — which needs the boards
	// solved by earlier guesses too, not just this one.
	const alreadySolved = puzzle.targets.map((target) =>
		attempt.guesses.some((earlier) => isWin(scoreGuess(target, earlier)))
	);
	const allSolved = solvedBoards.every((solved, i) => solved || alreadySolved[i]);

	await appendGuess(attempt, guess, allSolved);

	return json({ isWord: true, results, solved: solvedBoards });
};

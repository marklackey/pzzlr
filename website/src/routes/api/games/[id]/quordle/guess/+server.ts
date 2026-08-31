import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { pickDailyQuordle, scoreGuess, isWin } from '$lib/server/engine';
import { puzzleDate } from '$lib/server/date';
import { loadGameForMode } from '$lib/server/route-helpers';

/**
 * Scores one guess against every board's secret at once, without ever
 * putting a secret on the wire for a board that isn't already solved by
 * this very guess — same "echo letters back, not the word" shape as the
 * wordle guess route. Unlike wordle, there's no server-side attempt record:
 * the board set is fully deterministic from (date, game), so it's
 * recomputed fresh on every call instead of being read from storage, and
 * the client is trusted to track its own guesses-used count (see the
 * quordle daily route's doc comment for why that tradeoff is fine here).
 *
 * Which day's board set that is comes from the request (`date`), not from
 * the clock: a board that was on screen when the puzzle rolled over goes
 * on being that day's board set until it's done, rather than having
 * tomorrow's secrets swapped in underneath it — see the widget's
 * puzzleDay, and the same "finish what you started" rule
 * attempt-continuity applies to a game's settings. With no attempt record
 * to fall out of step with, the day is the whole of it here: there's no
 * stored guess count for a stale board to disagree with.
 */
export const POST: RequestHandler = async (event) => {
	const { params } = event;
	const { config, graph } = await loadGameForMode(event, 'quordle', 'guess');

	const body = await event.request.json().catch(() => null);
	const guess = typeof body?.guess === 'string' ? body.guess.toLowerCase() : null;
	// Today's is the default, for a caller that doesn't say which board it's
	// on — an older embedded copy of the widget, or one whose `date` prop is
	// unset and so sends ''.
	const date = typeof body?.date === 'string' && body.date ? body.date : puzzleDate();
	if (!guess) {
		throw error(400, 'expected { guess: string, date?: string }');
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
	const solved = results.map((result) => isWin(result));

	return json({ isWord: true, results, solved });
};

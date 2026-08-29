import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { checkStep } from '$lib/server/engine';
import { puzzleDate } from '$lib/server/date';
import { loadGameForMode } from '$lib/server/route-helpers';
import { appendGuess, getOrCreateAttempt } from '$lib/server/db/puzzle-attempts';
import { ladderChain, ladderPuzzle } from '$lib/server/ladder-attempt';
import { settingsForAttempt, snapshotOf } from '$lib/server/attempt-continuity';

/**
 * Takes one ladder step and records it against the caller's attempt for the
 * day (see puzzle-attempts.ts), which is what makes a solve server-known
 * rather than something the client just claims — and what stops a reload
 * from handing back a fresh board.
 *
 * The word being stepped from is derived from the stored attempt, never
 * taken from the request: a caller that could name its own `current` could
 * skip straight to a word next to the target and "solve" in one step. See
 * the comment on puzzleAttempt in schema.ts for how far this trust model
 * goes (and doesn't).
 *
 * Game-scoped rather than a generic /api/ladder/guess so a
 * smaller-dictionary game actually rejects words that only exist in a
 * larger tier — see dictionarySize in schema.ts.
 */
export const POST: RequestHandler = async (event) => {
	const { params } = event;
	const loaded = await loadGameForMode(event, 'ladder', 'guess');

	const body = await event.request.json().catch(() => null);
	const guess = typeof body?.guess === 'string' ? body.guess.toLowerCase() : null;
	const token = typeof body?.token === 'string' && body.token.length > 0 ? body.token : null;
	const date = typeof body?.date === 'string' ? body.date : puzzleDate();
	if (!guess || !token) {
		throw error(400, 'expected { guess: string, token: string, date?: string }');
	}

	const attempt = await getOrCreateAttempt(
		loaded.config.id,
		date,
		token,
		snapshotOf(loaded.config)
	);
	// Whatever this attempt started under, it keeps — see attempt-continuity.
	const { config, graph } = settingsForAttempt(loaded.config, loaded.graph, attempt);

	const puzzle = ladderPuzzle(graph, config, date);
	if (!puzzle) {
		throw error(404, `could not generate a puzzle for game "${params.id}" on ${date}`);
	}
	if (attempt.solved) {
		throw error(409, "already solved — that's today's ladder done");
	}

	const chain = ladderChain(puzzle, attempt.guesses);
	const current = chain[chain.length - 1];
	// config.target may be a word the dictionary doesn't hold — see checkStep.
	const step = checkStep(graph, current, guess, config.target ?? undefined);

	// A word that isn't a legal next step costs nothing — same as the wordle
	// route not spending a guess on a non-dictionary word.
	if (!step.isNeighbor) return json({ ...step, current });

	const solved = guess === puzzle.target;
	await appendGuess(attempt, guess, solved);

	return json({ ...step, current, solved });
};

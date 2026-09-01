import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAttempt } from '$lib/server/db/puzzle-attempts';
import { absurdleGuess, encodeCandidates } from '$lib/server/engine';
import { puzzleDate } from '$lib/server/date';
import { loadGameForMode } from '$lib/server/route-helpers';

/**
 * Game metadata for an absurdle board — no `target` and no puzzle number:
 * absurdle has no daily/seeded puzzle at all (see the mode column comment
 * in schema.ts), so every day's board starts from the same full pool of
 * words and there is nothing to archive.
 *
 * With `?token=`, also returns the caller's run so far, so a reload picks
 * it back up instead of starting over — the same attempt record every other
 * mode keeps. The board is rebuilt by replaying the stored guesses through
 * the engine rather than storing what they scored: absurdle is entirely
 * deterministic given the guess sequence, so the replay is the same
 * narrowing the player watched happen. That also regenerates the candidate
 * set, which is what the next guess is scored against.
 *
 * The run is keyed to a day like every other mode's attempt, so a fresh
 * board comes round at the same rollover the dailies use — see puzzleDate.
 */
export const GET: RequestHandler = async (event) => {
	const { url } = event;
	const { config, graph } = await loadGameForMode(event, 'absurdle', 'daily');

	const date = puzzleDate();
	const token = url.searchParams.get('token');
	const attempt = token ? await getAttempt(config.id, date, token) : null;

	let resumed = null;
	if (attempt && attempt.guesses.length > 0) {
		let candidates = graph.allWords();
		const results = [];
		let won = false;
		for (const guess of attempt.guesses) {
			const outcome = absurdleGuess(candidates, guess);
			candidates = outcome.candidates;
			results.push(outcome.result);
			won = outcome.won;
		}
		resumed = {
			guesses: attempt.guesses,
			results,
			remaining: candidates.length,
			won,
			candidates: encodeCandidates(graph, candidates)
		};
	}

	return json({
		id: config.id,
		name: config.name,
		mode: 'absurdle' as const,
		date,
		length: config.length,
		totalWords: graph.size(),
		resumed
	});
};

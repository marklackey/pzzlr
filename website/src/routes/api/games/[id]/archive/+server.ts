import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getGameConfig } from '$lib/server/db/games';
import { canAccessGame } from '$lib/server/embed-key';
import { getGraph } from '$lib/server/graphs';
import { isPastPuzzleDate } from '$lib/server/archive';
import { DEFAULT_EPOCH, puzzleNumberFor } from '$lib/server/engine/daily-seed';
import { pickDailyQuordle, pickDailyWord, shortestPath } from '$lib/server/engine';
import { ladderPuzzle } from '$lib/server/ladder-attempt';

/**
 * The answer to a puzzle that's already over.
 *
 * Deliberately not gated on an attempt, unlike wordle/reveal: that route
 * answers "I lost today, what was it?" and has to be sure the asker is out
 * of guesses. This one answers "what was the answer on the 26th?", and by
 * then the day is over for everyone at once — there's nothing left to
 * protect, and requiring an attempt would mean you could only see the
 * answer to a puzzle you'd already played.
 *
 * What it will not do is reach forward. isPastPuzzleDate is what keeps
 * `?date=` from being a window onto tomorrow's puzzle, which the daily
 * routes' own `?date=` (an embedder's testing hook) leaves open.
 *
 * Not in EMBED_ROUTES: the archive is this website's feature, so this
 * answers same-origin only and an embed on someone else's site is
 * unaffected by it existing.
 */
export const GET: RequestHandler = async ({ params, url, request, locals }) => {
	const config = await getGameConfig(params.id);
	if (!config) {
		throw error(404, `no game with id "${params.id}"`);
	}
	if (!(await canAccessGame(config, locals.user, request.headers.get('x-api-key')))) {
		throw error(404, `no game with id "${params.id}"`);
	}

	const date = url.searchParams.get('date');
	if (!isPastPuzzleDate(date, config.createdAt)) {
		throw error(
			403,
			`"${date ?? ''}" is not a finished puzzle for game "${params.id}" — only days this game has already played through can be revealed`
		);
	}

	if (config.mode === 'absurdle') {
		// It never picks a secret at all (see the absurdle engine), so there
		// is no past answer — the game is the same pool of words every day.
		throw error(400, `game "${params.id}" is an absurdle game, which has no daily answer`);
	}
	if (config.mode === 'wordle' && config.target !== null) {
		// A pinned secret is the same word today as it was that day, so this
		// would be a reveal of the live puzzle wearing an old date.
		throw error(
			403,
			`game "${params.id}" keeps one secret for every day, so revealing a past answer would give away the current one`
		);
	}

	const graph = getGraph(config.length, config.dictionarySize);
	if (!graph) {
		throw error(500, `no graph for length ${config.length}`);
	}

	// The game's settings as they stand now, not as they stood that day —
	// an attempt carries its own snapshot (see attempt-continuity), but a
	// reveal has no attempt behind it, and the puzzle these regenerate is
	// the one a player opening that day from the archive would get.
	const puzzleNumber = puzzleNumberFor(date, DEFAULT_EPOCH);

	if (config.mode === 'ladder') {
		const puzzle = ladderPuzzle(graph, config, date);
		if (!puzzle) {
			throw error(404, `could not generate a puzzle for game "${params.id}" on ${date}`);
		}
		return json({
			mode: 'ladder' as const,
			date,
			puzzleNumber,
			start: puzzle.start,
			target: puzzle.target,
			// The ladder's answer isn't its ends — those are on screen from the
			// first move — it's a chain that actually gets from one to the
			// other. Shortest, so it's the one worth having seen.
			path: shortestPath(graph, puzzle.start, puzzle.target) ?? []
		});
	}

	if (config.mode === 'quordle') {
		const puzzle = pickDailyQuordle(graph, date, config.boardCount, { seedKey: config.id });
		if (!puzzle) {
			throw error(404, `could not generate a board set for game "${params.id}" on ${date}`);
		}
		return json({ mode: 'quordle' as const, date, puzzleNumber, targets: puzzle.targets });
	}

	const puzzle = pickDailyWord(graph, config.target, date, { seedKey: config.id });
	if (!puzzle) {
		throw error(404, `could not generate a puzzle for game "${params.id}" on ${date}`);
	}
	return json({ mode: 'wordle' as const, date, puzzleNumber, target: puzzle.target });
};

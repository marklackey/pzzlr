import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { countPossiblePuzzles, reachTarget } from '$lib/server/engine';
import { getGraph } from '$lib/server/graphs';

/**
 * What a prospective ladder target can support: how many distinct puzzles
 * it could ever produce, and the longest ladder that can end there.
 *
 * Exists so the create form can say this while someone is still typing,
 * rather than letting them build a game that turns out to have one possible
 * puzzle — or none. Reads nothing and owns nothing, so it needs no session:
 * the dictionary it reports on is already public, and a caller learning that
 * "levy" is a poor target learns nothing they couldn't get by trying it.
 */
export const GET: RequestHandler = async ({ url }) => {
	const target = url.searchParams.get('target')?.trim().toLowerCase();
	if (!target) {
		throw error(400, 'expected ?target=<word>');
	}

	const dictionarySize = Number(url.searchParams.get('dictionarySize') ?? 80);
	const minSteps = Number(url.searchParams.get('minSteps') ?? 4);
	const rungsGiven = Number(url.searchParams.get('rungsGiven') ?? 0);

	const graph = getGraph(target.length, dictionarySize);
	if (!graph) {
		return json({ known: false });
	}

	const reach = reachTarget(graph, target);
	return json({
		known: true,
		inDictionary: reach.inDictionary,
		anchors: reach.anchors.slice(0, 8),
		anchorCount: reach.anchors.length,
		longestLadder: reach.longestLadder,
		possiblePuzzles: countPossiblePuzzles(reach, minSteps + rungsGiven)
	});
};

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getGraph } from '$lib/server/graphs';
import { pickPuzzle } from '$lib/server/engine';

export const GET: RequestHandler = ({ url }) => {
	const length = Number(url.searchParams.get('length') ?? 5);
	const graph = getGraph(length);
	if (!graph) {
		throw error(400, `no graph for length ${length}`);
	}

	const minSteps = Number(url.searchParams.get('minSteps') ?? 2);
	const puzzle = pickPuzzle(graph, { minSteps });
	if (!puzzle) {
		throw error(404, `could not find a solvable length-${length} puzzle with minSteps=${minSteps}`);
	}

	return json(puzzle);
};

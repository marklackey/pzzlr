import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getGraph } from '$lib/server/graphs';
import { checkStep } from '$lib/server/engine';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	const length = body?.length;
	const current = body?.current;
	const guess = body?.guess;

	if (typeof length !== 'number' || typeof current !== 'string' || typeof guess !== 'string') {
		throw error(400, 'expected { length: number, current: string, guess: string }');
	}

	const graph = getGraph(length);
	if (!graph) {
		throw error(400, `no graph for length ${length}`);
	}

	return json(checkStep(graph, current, guess));
};

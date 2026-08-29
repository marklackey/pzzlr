import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { pickDailyPuzzle } from '$lib/server/engine';
import { todayUTC } from '$lib/server/date';
import { loadGameForMode } from '$lib/server/route-helpers';

export const GET: RequestHandler = async (event) => {
	const { params, url } = event;
	const { config, graph } = await loadGameForMode(event, 'ladder', 'daily');

	// minSteps/rungsGiven intentionally come from the stored config, never
	// from the query string — they affect which start word the seeded
	// generator lands on, so every player has to get the same values for
	// "today's puzzle" to actually mean one puzzle. See schema.ts.
	const date = url.searchParams.get('date') ?? todayUTC();

	const puzzle = pickDailyPuzzle(graph, config.target, date, {
		minSteps: config.minSteps,
		rungsGiven: config.rungsGiven,
		seedKey: config.id
	});
	if (!puzzle) {
		throw error(404, `could not generate a puzzle for game "${params.id}" on ${date}`);
	}

	return json({ id: config.id, name: config.name, mode: 'ladder' as const, ...puzzle });
};

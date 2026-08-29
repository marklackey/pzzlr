import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { loadGameForMode } from '$lib/server/route-helpers';

/**
 * Game metadata for an absurdle board — no `date`, no `target`, not even a
 * `resumed` state: absurdle has no daily/seeded puzzle at all (see the mode
 * column comment in schema.ts) and no server-side attempt record (see the
 * guess route's doc comment), so this is just static config plus how many
 * words are in play before any guesses narrow that down.
 */
export const GET: RequestHandler = async (event) => {
	const { config, graph } = await loadGameForMode(event, 'absurdle', 'daily');

	return json({
		id: config.id,
		name: config.name,
		mode: 'absurdle' as const,
		length: config.length,
		totalWords: graph.size()
	});
};

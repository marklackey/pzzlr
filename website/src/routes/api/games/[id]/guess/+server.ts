import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { checkStep } from '$lib/server/engine';
import { loadGameForMode } from '$lib/server/route-helpers';

/**
 * Validates one ladder step against this game's own dictionary. Has to be
 * game-scoped (rather than the old generic /api/ladder/guess, which only
 * ever took a bare `length`) so a smaller-dictionary game actually rejects
 * words that only exist in a larger tier — see dictionarySize in schema.ts.
 */
export const POST: RequestHandler = async (event) => {
	const { graph } = await loadGameForMode(event, 'ladder', 'guess');

	const body = await event.request.json().catch(() => null);
	const current = typeof body?.current === 'string' ? body.current.toLowerCase() : null;
	const guess = typeof body?.guess === 'string' ? body.guess.toLowerCase() : null;
	if (!current || !guess) {
		throw error(400, 'expected { current: string, guess: string }');
	}

	return json(checkStep(graph, current, guess));
};

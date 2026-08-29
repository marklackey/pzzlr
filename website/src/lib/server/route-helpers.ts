import { error } from '@sveltejs/kit';
import { getGameConfig } from './db/games';
import { canAccessGame } from './embed-key';
import { getGraph } from './graphs';
import type { GameMode } from './game-input';

interface GameRouteEvent {
	params: { id: string };
	request: Request;
	locals: App.Locals;
}

/**
 * Where each mode's entry points live, for the "wrong game mode" error
 * message below — only the actions a mode actually supports appear (e.g.
 * absurdle has no `reveal` route).
 */
const ENTRY_POINT: Record<GameMode, Partial<Record<'daily' | 'guess' | 'reveal', string>>> = {
	ladder: { daily: 'daily', guess: 'guess' },
	wordle: { daily: 'wordle/daily', guess: 'wordle/guess', reveal: 'wordle/reveal' },
	quordle: { daily: 'quordle/daily', guess: 'quordle/guess', reveal: 'quordle/reveal' },
	absurdle: { daily: 'absurdle/start', guess: 'absurdle/guess' }
};

/**
 * Shared preamble for every /api/games/[id]/... route: load the config,
 * reject a mismatched game mode (pointing at the right entry point when the
 * actual mode has one for this action), enforce public/owner/embed-key
 * access, and load the word graph. Every game-scoped route needs exactly
 * this sequence before doing anything mode-specific.
 */
export async function loadGameForMode(
	event: GameRouteEvent,
	mode: GameMode,
	action: 'daily' | 'guess' | 'reveal'
) {
	const { params, request, locals } = event;
	const config = await getGameConfig(params.id);
	if (!config) {
		throw error(404, `no game with id "${params.id}"`);
	}
	if (config.mode !== mode) {
		const entry = ENTRY_POINT[config.mode][action];
		throw error(
			400,
			entry
				? `game "${params.id}" is a ${config.mode} game — use /api/games/${params.id}/${entry} instead`
				: `game "${params.id}" is a ${config.mode} game`
		);
	}
	const presentedKey = request.headers.get('x-api-key');
	if (!(await canAccessGame(config, locals.user, presentedKey))) {
		throw error(404, `no game with id "${params.id}"`);
	}

	const graph = getGraph(config.length, config.dictionarySize);
	if (!graph) {
		throw error(500, `no graph for length ${config.length}`);
	}

	return { config, graph };
}

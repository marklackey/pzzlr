import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listAllGames } from '$lib/server/db/games';
import { createGame } from '$lib/server/game-mutations';

/** Public index — anyone can browse every game. See /api/games/mine for "just yours". */
export const GET: RequestHandler = async () => {
	return json(await listAllGames());
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const body = await request.json().catch(() => null);
	const config = await createGame(body, locals.user);
	return json(config, { status: 201 });
};

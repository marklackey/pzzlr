import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { canManageGame, getGameConfig, withoutSecret } from '$lib/server/db/games';
import { canAccessGame } from '$lib/server/embed-key';
import { deleteGame, updateGame } from '$lib/server/game-mutations';

export const GET: RequestHandler = async ({ params, request, locals }) => {
	const config = await getGameConfig(params.id);
	if (!config) {
		throw error(404, `no game with id "${params.id}"`);
	}
	// A private game a caller can't access looks exactly like a missing one
	// — a 403 would confirm the id exists, which defeats the point.
	const presentedKey = request.headers.get('x-api-key');
	if (!(await canAccessGame(config, locals.user, presentedKey))) {
		throw error(404, `no game with id "${params.id}"`);
	}

	// embedKeyId/embedKey are a management concern for the owner's /g/[id]
	// page, never part of this general-purpose metadata response. Setting
	// them undefined (rather than destructuring them off) drops the keys
	// entirely once JSON.stringify runs. target is stripped the same way
	// for a wordle game's non-manager viewers — see withoutSecret.
	const safeConfig = withoutSecret(config, canManageGame(locals.user, config));
	return json({ ...safeConfig, embedKeyId: undefined, embedKey: undefined });
};

export const PATCH: RequestHandler = async ({ request, params, locals }) => {
	const body = await request.json().catch(() => null);
	const config = await updateGame(params.id, body, locals.user, request.headers);
	return json(config);
};

export const DELETE: RequestHandler = async ({ request, params, locals }) => {
	await deleteGame(params.id, locals.user, request.headers);
	return json({ ok: true });
};

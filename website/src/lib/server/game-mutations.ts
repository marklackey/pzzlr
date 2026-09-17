import { error } from '@sveltejs/kit';
import {
	canManageGame,
	createGameConfig,
	deleteGameConfig,
	generateGameId,
	getGameConfig,
	updateGameConfig
} from './db/games';
import { parseGameInput } from './game-input';
import { issueEmbedKey, revokeEmbedKey } from './embed-key';

type SessionUser = App.Locals['user'];

/**
 * The four game-management mutations, shared by their /api/games route and
 * the /create and /g/[id]/edit page's form actions — both are just different
 * front ends onto the same create/edit/delete/rotate-key operations, so
 * the auth check, validation, and embed-key bookkeeping only need to live
 * once. Each throws a SvelteKit HttpError (via error()) on failure, same as
 * a route handler would; callers in a form action catch that with
 * isHttpError() and turn it into a fail().
 */

export async function createGame(body: unknown, user: SessionUser) {
	if (!user) {
		throw error(401, 'sign in to create a game');
	}

	const input = parseGameInput(body);
	// Generated up front rather than left to createGameConfig's default,
	// since the id is also the seed a game's daily puzzles derive from and
	// callers want it in hand. Readable when the game has a name — see
	// generateGameId.
	const id = await generateGameId(input.name);

	const embedKey = input.public ? null : await issueEmbedKey(id, user.id);
	return createGameConfig({
		id,
		...input,
		ownerId: user.id,
		embedKeyId: embedKey?.embedKeyId ?? null,
		embedKey: embedKey?.embedKey ?? null
	});
}

export async function updateGame(id: string, body: unknown, user: SessionUser, headers: Headers) {
	if (!user) {
		throw error(401, 'sign in to edit a game');
	}
	const existing = await getGameConfig(id);
	if (!existing) {
		throw error(404, `no game with id "${id}"`);
	}
	if (!canManageGame(user, existing)) {
		throw error(403, 'you can only edit your own games');
	}

	const input = parseGameInput(body);

	let embedKeyId = existing.embedKeyId;
	let embedKey = existing.embedKey;

	if (input.public && existing.embedKeyId) {
		// Going public again — the old key shouldn't keep working.
		await revokeEmbedKey(existing.embedKeyId, headers);
		embedKeyId = null;
		embedKey = null;
	} else if (!input.public && !existing.embedKeyId) {
		// Newly private — issue a key under the acting (verified-owner) user
		// rather than existing.ownerId, since a null-owner legacy game has
		// no user of its own to own the key. See canManageGame.
		const issued = await issueEmbedKey(existing.id, user.id);
		embedKeyId = issued.embedKeyId;
		embedKey = issued.embedKey;
	}

	return updateGameConfig(existing.id, { ...input, embedKeyId, embedKey });
}

export async function deleteGame(id: string, user: SessionUser, headers: Headers) {
	if (!user) {
		throw error(401, 'sign in to delete a game');
	}
	const existing = await getGameConfig(id);
	if (!existing) {
		throw error(404, `no game with id "${id}"`);
	}
	if (!canManageGame(user, existing)) {
		throw error(403, 'you can only delete your own games');
	}

	if (existing.embedKeyId) {
		await revokeEmbedKey(existing.embedKeyId, headers);
	}
	await deleteGameConfig(existing.id);
}

/** Rotates a private game's embed key — the old one stops working immediately. */
export async function rotateEmbedKey(id: string, user: SessionUser, headers: Headers) {
	if (!user) {
		throw error(401, 'sign in to manage a game');
	}
	const existing = await getGameConfig(id);
	if (!existing) {
		throw error(404, `no game with id "${id}"`);
	}
	if (!canManageGame(user, existing)) {
		throw error(403, 'you can only manage your own games');
	}
	if (existing.public) {
		throw error(400, 'game is public — make it private first');
	}

	if (existing.embedKeyId) {
		await revokeEmbedKey(existing.embedKeyId, headers);
	}
	const issued = await issueEmbedKey(existing.id, user.id);
	return updateGameConfig(existing.id, {
		embedKeyId: issued.embedKeyId,
		embedKey: issued.embedKey
	});
}

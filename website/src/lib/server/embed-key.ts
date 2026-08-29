import { getAuth } from './auth';
import { canManageGame } from './db/games';

/**
 * Private-game access control, backed by the `apiKey` plugin (see auth.ts).
 * Each private game gets its own key, scoped via `permissions: { game: [gameId] }`
 * so a leaked key only exposes the one game it was issued for — the embed
 * has to paste it into public HTML on someone else's site, so it can never
 * be treated as a real secret the way an account-level key would be.
 */

function gamePermission(gameId: string) {
	return { game: [gameId] };
}

/**
 * Issues a fresh key scoped to `gameId`, owned by `ownerId`. Deliberately
 * called without `headers` — the apiKey plugin treats a call carrying
 * headers as "on behalf of a client" and forbids setting `permissions`
 * directly on those (they'd have to come from a pre-configured default).
 * Omitting headers is what makes this the trusted, server-only call that's
 * allowed to hand out a scoped permission, since we've already verified
 * `ownerId` may manage this game before calling in.
 */
export async function issueEmbedKey(
	gameId: string,
	ownerId: string
): Promise<{ embedKeyId: string; embedKey: string }> {
	const auth = await getAuth();
	const created = await auth.api.createApiKey({
		body: { name: `game:${gameId}`, userId: ownerId, permissions: gamePermission(gameId) }
	});
	return { embedKeyId: created.id, embedKey: created.key };
}

/** No-ops (rather than throwing) if the key is already gone — revoking is idempotent. */
export async function revokeEmbedKey(embedKeyId: string, headers: Headers): Promise<void> {
	const auth = await getAuth();
	await auth.api.deleteApiKey({ body: { keyId: embedKeyId }, headers }).catch(() => {});
}

/** Whether `key` is valid and scoped to `gameId`. Safe to call unauthenticated. */
export async function verifyEmbedKey(gameId: string, key: string | null): Promise<boolean> {
	if (!key) return false;
	const auth = await getAuth();
	const result = await auth.api
		.verifyApiKey({ body: { key, permissions: gamePermission(gameId) } })
		.catch(() => ({ valid: false }));
	return result.valid === true;
}

/**
 * Whether a request may read `config`: public games are open to everyone,
 * private ones need either the owner's session or a valid embed key for
 * that specific game.
 */
export async function canAccessGame(
	config: { id: string; ownerId: string | null; public: boolean },
	user: { id: string } | null | undefined,
	presentedKey: string | null
): Promise<boolean> {
	if (config.public) return true;
	if (canManageGame(user, config)) return true;
	return verifyEmbedKey(config.id, presentedKey);
}

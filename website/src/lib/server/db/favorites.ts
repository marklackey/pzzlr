import { and, desc, eq, inArray } from 'drizzle-orm';
import { getDb } from './index';
import { favorite, gameConfig } from './schema';
import { canManageGame, withoutSecret } from './games';

/**
 * Stars a game for a user. Idempotent: starring something already starred
 * is the same fact, so a repeat (a double-tap, a resubmitted form, two
 * tabs) is a no-op rather than a primary-key error.
 */
export async function addFavorite(userId: string, gameId: string) {
	await getDb().insert(favorite).values({ userId, gameId }).onConflictDoNothing();
}

export async function removeFavorite(userId: string, gameId: string) {
	await getDb()
		.delete(favorite)
		.where(and(eq(favorite.userId, userId), eq(favorite.gameId, gameId)));
}

export async function isFavorite(userId: string, gameId: string): Promise<boolean> {
	const [row] = await getDb()
		.select({ gameId: favorite.gameId })
		.from(favorite)
		.where(and(eq(favorite.userId, userId), eq(favorite.gameId, gameId)));
	return row !== undefined;
}

/**
 * Flips a game's starred state and reports where it landed, so a caller
 * doesn't have to read-then-write to know what to say about it.
 *
 * Two tabs racing here can both read "not starred" and both insert, but
 * addFavorite is idempotent and the delete is keyed on the same pair, so
 * the worst case is a redundant write, never a duplicate row.
 */
export async function toggleFavorite(userId: string, gameId: string): Promise<boolean> {
	if (await isFavorite(userId, gameId)) {
		await removeFavorite(userId, gameId);
		return false;
	}
	await addFavorite(userId, gameId);
	return true;
}

/**
 * Which of `gameIds` this user has starred — one query for a whole listing,
 * rather than a lookup per row. Returns a Set so a list component can ask
 * about a row with `.has(id)`.
 */
export async function favoriteIdsIn(userId: string, gameIds: string[]): Promise<Set<string>> {
	if (gameIds.length === 0) return new Set();
	const rows = await getDb()
		.select({ gameId: favorite.gameId })
		.from(favorite)
		.where(and(eq(favorite.userId, userId), inArray(favorite.gameId, gameIds)));
	return new Set(rows.map((row) => row.gameId));
}

/**
 * A user's shelf, most recently starred first.
 *
 * A game can go private after it was starred, and a private game is
 * invisible to everyone but its manager — so the same rule the game page
 * and the API apply is applied here too, rather than letting the shelf
 * become a back door to a game its owner has since closed. Rows the viewer
 * doesn't manage are sanitized for the same reason listAllGames sanitizes
 * its own: a wordle secret can't ride along in a listing. Stars on
 * now-hidden games are left in place, not deleted — if the owner makes the
 * game public again it comes back to the shelf it was always on.
 */
export async function listFavoriteGames(userId: string) {
	const rows = await getDb()
		.select({ game: gameConfig })
		.from(favorite)
		.innerJoin(gameConfig, eq(gameConfig.id, favorite.gameId))
		.where(eq(favorite.userId, userId))
		.orderBy(desc(favorite.createdAt));

	const viewer = { id: userId };
	return rows
		.map(({ game }) => game)
		.filter((game) => game.public || canManageGame(viewer, game))
		.map((game) => withoutSecret(game, canManageGame(viewer, game)));
}

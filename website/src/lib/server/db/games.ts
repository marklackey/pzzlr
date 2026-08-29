import { and, desc, eq, like, or, sql } from 'drizzle-orm';
import { getDb } from './index';
import { gameConfig } from './schema';

export interface NewGameConfig {
	/** Pass a specific id when the caller needs to know it before insert (e.g. to seed pickDailyPuzzle). Defaults to a random uuid. */
	id?: string;
	name?: string;
	/** Defaults to 'ladder' (the column default) when omitted. See schema.ts. */
	mode?: 'ladder' | 'wordle' | 'quordle' | 'absurdle';
	/** Null for "daily mode" — see the comment on the target column in schema.ts. */
	target: string | null;
	length: number;
	/** Defaults to 80 (the column default) when omitted. See schema.ts. */
	dictionarySize?: number;
	minSteps: number;
	rungsGiven?: number;
	maxGuesses?: number;
	/** quordle mode only. Defaults to 4 (the column default) when omitted. See schema.ts. */
	boardCount?: number;
	/** wordle/quordle only: revealed hints must be reused. See schema.ts. */
	hardMode?: boolean;
	/** Null for games not created by a logged-in user (e.g. the seed script). */
	ownerId?: string | null;
	/** Defaults to true (listed in the public index). See embed-key.ts for what "false" gates. */
	public?: boolean;
	embedKeyId?: string | null;
	embedKey?: string | null;
}

export type GameConfigUpdate = Partial<
	Pick<
		NewGameConfig,
		| 'name'
		| 'mode'
		| 'target'
		| 'length'
		| 'dictionarySize'
		| 'minSteps'
		| 'rungsGiven'
		| 'maxGuesses'
		| 'boardCount'
		| 'hardMode'
		| 'public'
		| 'embedKeyId'
		| 'embedKey'
	>
>;

export async function createGameConfig(input: NewGameConfig) {
	const [row] = await getDb().insert(gameConfig).values(input).returning();
	return row;
}

export async function updateGameConfig(id: string, input: GameConfigUpdate) {
	const [row] = await getDb()
		.update(gameConfig)
		.set(input)
		.where(eq(gameConfig.id, id))
		.returning();
	return row ?? null;
}

export async function deleteGameConfig(id: string) {
	await getDb().delete(gameConfig).where(eq(gameConfig.id, id));
}

export async function getGameConfig(id: string) {
	const [row] = await getDb().select().from(gameConfig).where(eq(gameConfig.id, id));
	return row ?? null;
}

/** Would collide with a static sibling route if used as a game id (see /api/games/mine). */
const RESERVED_IDS = new Set(['mine']);

/** Lowercase, hyphenated, alphanumeric-only — '' if that leaves nothing (no name, or a name that's all punctuation/emoji). */
function slugify(name: string | undefined): string {
	return (name ?? '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

/**
 * The id a new game is created and served under — callers pass this to
 * createGameConfig rather than leaving it to the column default, same
 * reasoning as the NewGameConfig.id doc comment (a route/seed key has to be
 * known up front, and can never change afterward — see the target column
 * comment in schema.ts for why "today's puzzle" depends on that).
 *
 * Readable ("my-cool-game") when `name` slugifies to something usable;
 * falls back to a random uuid otherwise — same as before this existed —
 * for an unnamed game, a reserved id, or an actual slug collision (rare
 * enough that a short random suffix is a fine way to break the tie).
 */
export async function generateGameId(name: string | undefined): Promise<string> {
	const slug = slugify(name);
	if (!slug || RESERVED_IDS.has(slug)) return crypto.randomUUID();

	for (let attempt = 0; attempt < 5; attempt++) {
		const candidate = attempt === 0 ? slug : `${slug}-${crypto.randomUUID().slice(0, 5)}`;
		if (!(await getGameConfig(candidate))) return candidate;
	}
	return `${slug}-${crypto.randomUUID()}`;
}

/**
 * Whether `user` may edit or delete `config`. Null ownerId means a
 * legacy/seed game with no specific owner (see the target column comment
 * in schema.ts) — any signed-in user can manage those, same as the public
 * index already lets anyone browse and play any game regardless of owner.
 */
export function canManageGame(
	user: { id: string } | null | undefined,
	config: { ownerId: string | null }
): boolean {
	if (!user) return false;
	return config.ownerId === null || config.ownerId === user.id;
}

/**
 * Strips `target` from a wordle/quordle game's row for anyone who isn't its
 * manager — the secret is the entire mechanic, so it can never round-trip
 * through a listing or detail response to a non-owner (see the wordle/
 * quordle routes under api/games/[id], which never send it either). Ladder
 * games pass through unchanged: their target is the player's visible goal,
 * not a secret, and always has been. (In practice a quordle game's target
 * is always null already — see boardCount on schema.ts — but this stays
 * consistent with wordle rather than assuming that.)
 */
export function withoutSecret<T extends { mode: string; target: string | null }>(
	config: T,
	canManage: boolean
): T {
	if ((config.mode !== 'wordle' && config.mode !== 'quordle') || canManage) return config;
	return { ...config, target: null };
}

export async function listGamesByOwner(ownerId: string) {
	return getDb()
		.select()
		.from(gameConfig)
		.where(eq(gameConfig.ownerId, ownerId))
		.orderBy(desc(gameConfig.createdAt));
}

/**
 * Every public game, for the public index — private ones are excluded
 * entirely, not just unlisted. No caller of this list is ever the specific
 * game's manager (that's what listGamesByOwner/getGameConfig are for), so
 * every row is sanitized as a non-manager view — see withoutSecret.
 */
export async function listAllGames() {
	const rows = await getDb()
		.select()
		.from(gameConfig)
		.where(eq(gameConfig.public, true))
		.orderBy(desc(gameConfig.createdAt));
	return rows.map((row) => withoutSecret(row, false));
}

export interface ListGamesOptions {
	/** Matched against name and target (SQLite LIKE, case-insensitive for ASCII). */
	query?: string;
	/** 1-based. */
	page?: number;
	pageSize?: number;
}

export interface GamesPage {
	games: (typeof gameConfig.$inferSelect)[];
	page: number;
	pageSize: number;
	total: number;
}

/**
 * Paginated, optionally-searched game listing for the Explore page. Same
 * "no caller is ever the manager" reasoning as listAllGames — every row
 * gets the non-manager treatment. The target-search half of the query is
 * additionally restricted to ladder games: letting a search match a wordle
 * game's secret would turn the search box into a way to fish for answers.
 */
export async function listGames({
	query,
	page = 1,
	pageSize = 10
}: ListGamesOptions = {}): Promise<GamesPage> {
	const trimmed = query?.trim();
	const searchCondition = trimmed
		? or(
				like(gameConfig.name, `%${trimmed}%`),
				and(eq(gameConfig.mode, 'ladder'), like(gameConfig.target, `%${trimmed}%`))
			)
		: undefined;
	const where = searchCondition
		? and(eq(gameConfig.public, true), searchCondition)
		: eq(gameConfig.public, true);

	const [games, [{ count }]] = await Promise.all([
		getDb()
			.select()
			.from(gameConfig)
			.where(where)
			.orderBy(desc(gameConfig.createdAt))
			.limit(pageSize)
			.offset((page - 1) * pageSize),
		getDb()
			.select({ count: sql<number>`count(*)` })
			.from(gameConfig)
			.where(where)
	]);

	return { games: games.map((row) => withoutSecret(row, false)), page, pageSize, total: count };
}

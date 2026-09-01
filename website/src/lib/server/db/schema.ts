import { integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { HARD_MODES, DEFAULT_HARD_MODE } from '$lib/types';
import { user } from './auth.schema';

// One row per "clone with a different name" — the target word (and whatever
// generation parameters affect it) has to be pinned per game, not passed as
// a request-time query param, or two players could see different daily
// puzzles for the same game on the same day. See minSteps on pickDailyPuzzle.
export const gameConfig = sqliteTable('game_config', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text('name'),
	// 'ladder': the word-chain game (pickDailyPuzzle) — minSteps/rungsGiven
	// apply. 'wordle': classic secret-word guessing (pickDailyWord) —
	// maxGuesses applies instead. 'quordle': boardCount simultaneous secret
	// words (pickDailyQuordle), one shared guess stream scored against all
	// of them — maxGuesses applies same as wordle, boardCount additionally.
	// 'absurdle': adversarial guessing (absurdleGuess) —
	// no secret is ever picked, so target/minSteps/rungsGiven/maxGuesses/
	// boardCount are all unused for it; only length/dictionarySize matter.
	// The four engines don't share a puzzle shape, so every route/form
	// branches on this before touching the mode-specific columns.
	mode: text('mode', { enum: ['ladder', 'wordle', 'quordle', 'absurdle'] })
		.notNull()
		.default('ladder'),
	// Null means "daily mode" — the puzzle's secret/target is picked by the
	// seeded generator instead of being pinned. See pickDailyPuzzle and
	// pickDailyWord. For wordle games this is the normal setting: a pinned
	// target would just be the same answer forever.
	target: text('target'),
	length: integer('length').notNull(),
	// ESDB size tier (see graphbuilder/data/esdb/README.md) that this game's
	// puzzles are drawn from and validated against — smaller means fewer,
	// more-common-only words. Pinned per-game for the same reason
	// minSteps/rungsGiven are: it shifts which words are valid targets/
	// guesses, so it has to be fixed or "today's puzzle" stops being
	// well-defined. See DICTIONARY_SIZES in $lib/types.
	dictionarySize: integer('dictionary_size').notNull().default(80),
	minSteps: integer('min_steps').notNull().default(4),
	// How many words after `start` on the optimal path get handed over for
	// free — see revealedRungs on DailyPuzzle. Pinned per-game for the same
	// reason minSteps is: it shifts pickDailyPuzzle's search floor, so it
	// has to be fixed or the "daily" puzzle stops being well-defined.
	rungsGiven: integer('rungs_given').notNull().default(0),
	// wordle/quordle modes only: how many guesses the player gets before the
	// secret(s) are revealed as a loss. Pinned per-game so a shared "today's
	// puzzle" means the same challenge for everyone, same reasoning as
	// minSteps.
	maxGuesses: integer('max_guesses').notNull().default(6),
	// wordle mode only: what the game says about hard mode, where hints
	// already revealed have to be reused in later guesses — a green letter
	// kept in place, a yellow one kept somewhere. 'optional' leaves it to
	// the player, whose answer is recorded on their own attempt (see the
	// hardMode column below) rather than here. Enforced server-side in the
	// guess route, since a client-side check would just be advice. See
	// HardModePolicy in $lib/types for why this isn't a boolean, and why
	// quordle doesn't offer it.
	hardMode: text('hard_mode', { enum: HARD_MODES }).notNull().default(DEFAULT_HARD_MODE),
	// quordle mode only: how many simultaneous secret words a single shared
	// guess stream is scored against. Pinned per-game for the same reason
	// every other daily-shape knob is — see pickDailyQuordle.
	boardCount: integer('board_count').notNull().default(4),
	// Null for games created before auth existed, or by service scripts
	// (like the seeded "demo" game) rather than a logged-in user.
	ownerId: text('owner_id').references(() => user.id, { onDelete: 'cascade' }),
	// Private games are excluded from listAllGames/listGames (the public
	// index) and can't be loaded via the API without embedKey. See
	// src/lib/server/embed-key.ts.
	public: integer('public', { mode: 'boolean' }).notNull().default(true),
	// Id of the apikey row (from the apiKey plugin) scoped to this game, so
	// it can be revoked when the game goes public again or the key is
	// rotated. Null for public games.
	embedKeyId: text('embed_key_id'),
	// The apiKey plugin only returns a key's raw value once, at creation —
	// we mirror it here so the owner can come back and see/copy it later.
	// Not a meaningful secret to protect server-side: it's designed to be
	// pasted into public HTML on someone else's site.
	embedKey: text('embed_key'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

/**
 * Everything about a game that decides what its puzzle is and which guesses
 * are legal — snapshotted onto an attempt so it can outlive an edit. See
 * the config column below.
 */
export interface AttemptConfig {
	mode: 'ladder' | 'wordle' | 'quordle' | 'absurdle';
	target: string | null;
	length: number;
	dictionarySize: number;
	minSteps: number;
	rungsGiven: number;
	maxGuesses: number;
}

/**
 * One row per (game, day, player) attempt at a daily puzzle — the
 * server-side memory that makes guesses, reveals, and "you already played
 * today" authoritative instead of an honor system. Shared by every mode
 * that persists progress (wordle and ladder today); a game is exactly one
 * mode, so a game id never has rows of two different shapes.
 * `token` is an opaque id the client mints and persists (localStorage),
 * *not* a login: the SDK widget is played anonymously on embed pages, so
 * there's no account to hang this off of. That means a determined caller
 * can always mint a fresh token and start over — this stops the normal
 * widget from re-rolling guesses or revealing early, it isn't a hard
 * anti-cheat boundary. Good enough for "don't let the UI cheat itself" and
 * for a future per-attempt score to mean something; revisit if real
 * leaderboard stakes ever need it to be tamper-proof.
 */
export const puzzleAttempt = sqliteTable(
	'puzzle_attempt',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		gameId: text('game_id')
			.notNull()
			.references(() => gameConfig.id, { onDelete: 'cascade' }),
		date: text('date').notNull(),
		token: text('token').notNull(),
		// Guessed words in order, and only the words: what they *mean* is
		// recomputed on read (wordle re-scores them against the target,
		// ladder replays them up the chain) from a target this never stores,
		// since the daily pickers regenerate that from game/date anyway. So
		// the table stays valid if either mode's scoring output changes.
		guesses: text('guesses', { mode: 'json' }).notNull().$type<string[]>().default([]),
		// The puzzle-shaping settings as they stood when this attempt began.
		// Editing a game changes what the next attempt gets, not what someone
		// already mid-puzzle is looking at: their stored guesses only mean
		// anything against the puzzle they were made on, so a changed target
		// or dictionary would turn a half-finished game into nonsense. Null
		// for attempts started before this column existed, which fall back to
		// the game's current settings.
		config: text('config', { mode: 'json' }).$type<AttemptConfig>(),
		// Whether this particular attempt is being played under hard mode —
		// settled when the attempt is created (its first guess) and never
		// after, so a player can't drop the rule for one awkward guess and
		// pick it back up. Follows from the game's policy for a 'required'
		// or 'forbidden' game; on an 'optional' one it's the player's own
		// answer, which is why it lives here and not only on the game. See
		// HardModePolicy in $lib/types.
		hardMode: integer('hard_mode', { mode: 'boolean' }).notNull().default(false),
		solved: integer('solved', { mode: 'boolean' }).notNull().default(false),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(table) => [
		// At most one attempt per player per game per day — guess/reveal
		// both read-then-write this row, so it has to be unique or a second
		// browser tab could fork into two "true" attempts for the same play.
		uniqueIndex('puzzle_attempt_game_date_token_idx').on(table.gameId, table.date, table.token)
	]
);

/**
 * One row per (account holder, game) they've starred. Keyed on the pair
 * rather than a surrogate id: favouriting is idempotent — a second star on
 * the same game is the same fact, not a second one — and the composite
 * primary key is what makes that true in the database rather than only in
 * the code that writes to it.
 *
 * Both sides cascade. A deleted game shouldn't leave stars pointing at
 * nothing, and a closed account shouldn't leave its shelf behind.
 *
 * Unlike puzzle_attempt, which is keyed by an anonymous client-minted token
 * because the embedded widget has no login, this is deliberately tied to a
 * user id: a favourite is a thing you come back to across devices, which is
 * exactly what an account is for.
 */
export const favorite = sqliteTable(
	'favorite',
	{
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		gameId: text('game_id')
			.notNull()
			.references(() => gameConfig.id, { onDelete: 'cascade' }),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(table) => [primaryKey({ columns: [table.userId, table.gameId] })]
);

export * from './auth.schema';

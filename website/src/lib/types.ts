/**
 * ESDB size tiers pzzlr ships graphs for (see graphbuilder/data/esdb/README.md)
 * — smaller sizes mean a smaller, more-common-words-only dictionary. Shared
 * between server (graph loading, validation) and client (the game form's
 * dropdown) code, so it can't live under server/ even though most of its
 * consumers are server-side.
 */
export const DICTIONARY_SIZES = [50, 60, 80] as const;
export type DictionarySize = (typeof DICTIONARY_SIZES)[number];
export const DEFAULT_DICTIONARY_SIZE: DictionarySize = 80;

export const DICTIONARY_LABELS: Record<DictionarySize, string> = {
	50: 'Common',
	60: 'Expanded',
	80: 'Max'
};

export function isDictionarySize(value: unknown): value is DictionarySize {
	return DICTIONARY_SIZES.includes(value as DictionarySize);
}

/**
 * What a game says about hard mode, where "hard mode" is the rule that
 * revealed hints have to be reused (see hardModeViolation).
 *
 * Three states rather than a boolean because "on" and "available" are
 * different offers to make a player: 'required' holds everyone to it,
 * 'optional' lets each player decide for their own attempt (locked in once
 * they've guessed — see the hardMode column on puzzleAttempt), and
 * 'forbidden' takes the choice away entirely.
 *
 * Wordle only. Quordle's hints come from several boards at once and
 * routinely contradict each other — a green A in position 1 on one board
 * against a green B there on another leaves no legal guess at all — so
 * there's no coherent rule to hold anyone to, and the mode doesn't offer
 * this.
 */
export const HARD_MODES = ['forbidden', 'optional', 'required'] as const;
export type HardModePolicy = (typeof HARD_MODES)[number];
export const DEFAULT_HARD_MODE: HardModePolicy = 'forbidden';

/** Author-facing wording — the value names describe the rule, these describe what a player gets. */
export const HARD_MODE_LABELS: Record<HardModePolicy, string> = {
	forbidden: 'Off',
	optional: "Player's choice",
	required: 'Always on'
};

export function isHardModePolicy(value: unknown): value is HardModePolicy {
	return HARD_MODES.includes(value as HardModePolicy);
}

export const GAME_MODES = ['ladder', 'wordle', 'quordle', 'absurdle'] as const;
export type GameMode = (typeof GAME_MODES)[number];

/** How each mode is named to players — capitalized, since it's a proper name for the game rather than a description of it. */
export const MODE_LABELS: Record<GameMode, string> = {
	ladder: 'Ladder',
	wordle: 'Wordle',
	quordle: 'Quordle',
	absurdle: 'Absurdle'
};

/**
 * Shape GameList and ExploreGames need — a subset of the gameConfig row.
 * `target` is null both for genuine daily-mode games and for any wordle
 * game shown to a non-manager (see withoutSecret in db/games.ts) — the two
 * cases are indistinguishable here on purpose.
 */
export interface GameRow {
	id: string;
	name: string | null;
	mode: GameMode;
	target: string | null;
	length: number;
	minSteps: number;
	rungsGiven: number;
	maxGuesses: number;
	// quordle mode only.
	boardCount: number;
	// number, not DictionarySize: rows come straight from the DB column
	// (drizzle infers plain number), same reasoning as getGraph's size
	// param in server/graphs.ts.
	dictionarySize: number;
	public: boolean;
}

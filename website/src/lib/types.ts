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
 * Shape GameList and ExploreGames need — a subset of the gameConfig row.
 * `target` is null both for genuine daily-mode games and for any wordle
 * game shown to a non-manager (see withoutSecret in db/games.ts) — the two
 * cases are indistinguishable here on purpose.
 */
export interface GameRow {
	id: string;
	name: string | null;
	mode: 'ladder' | 'wordle' | 'quordle' | 'absurdle';
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

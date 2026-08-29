import type { WordGraph } from './graph';
import { DEFAULT_EPOCH, dailyIndices, puzzleNumberFor } from './daily-seed';

export type LetterStatus = 'correct' | 'present' | 'absent';

export interface LetterResult {
	letter: string;
	status: LetterStatus;
}

/**
 * Scores a guess against a secret word, Wordle-style. Duplicate-letter aware:
 * a repeated guessed letter is only marked "present" as many times as it
 * actually remains uncounted in the secret (e.g. guessing "sleep" against
 * secret "leper" doesn't mark both "e"s present just because "e" appears
 * twice in the secret).
 */
export function scoreGuess(secret: string, guess: string): LetterResult[] {
	if (secret.length !== guess.length) {
		throw new Error(`guess length ${guess.length} does not match secret length ${secret.length}`);
	}

	const result: LetterResult[] = new Array(guess.length);
	const remaining = new Map<string, number>();

	for (let i = 0; i < secret.length; i++) {
		if (guess[i] === secret[i]) {
			result[i] = { letter: guess[i], status: 'correct' };
		} else {
			remaining.set(secret[i], (remaining.get(secret[i]) ?? 0) + 1);
		}
	}

	for (let i = 0; i < guess.length; i++) {
		if (result[i]) continue;
		const letter = guess[i];
		const count = remaining.get(letter) ?? 0;
		if (count > 0) {
			result[i] = { letter, status: 'present' };
			remaining.set(letter, count - 1);
		} else {
			result[i] = { letter, status: 'absent' };
		}
	}

	return result;
}

export function isWin(result: LetterResult[]): boolean {
	return result.every((r) => r.status === 'correct');
}

export interface DailyWordle {
	/** UTC calendar date this puzzle belongs to, YYYY-MM-DD. */
	date: string;
	/** Increments by one per day since `epoch`, for display ("#370"). */
	puzzleNumber: number;
	/** The secret word — callers serving this to a player must strip it before responding. */
	target: string;
	length: number;
}

export interface PickDailyWordOptions {
	/** Date that puzzleNumber 1 falls on. */
	epoch?: string;
	/**
	 * Extra string mixed into the seed. Required (pass the game id) when
	 * `target` is null — without a fixed target, the date alone would give
	 * every random-mode game the same secret word on the same day. Ignored
	 * when `target` is set, since the target already makes the seed unique
	 * per game.
	 */
	seedKey?: string;
}

/**
 * Same secret word for everyone on a given UTC date — seeded from date (+
 * target or seedKey, see PickDailyWordOptions.seedKey), so it needs no
 * server-side storage to stay consistent across requests. Pass `target:
 * null` for "daily mode", where the secret is a fresh word each day instead
 * of a fixed one — the normal way to run a Wordle-style game, since a
 * pinned target would just be the same answer forever. The daily word walks
 * a fixed permutation of the dictionary (see dailyIndices) rather than
 * rerolling independently each day, so every word gets used before any of
 * them repeat — a repeat only ever comes from actually exhausting the
 * dictionary, never bad luck.
 */
export function pickDailyWord(
	graph: WordGraph,
	target: string | null,
	date: string,
	options: PickDailyWordOptions = {}
): DailyWordle | null {
	const { epoch = DEFAULT_EPOCH, seedKey = '' } = options;

	if (target !== null) {
		if (!graph.has(target)) return null;
		return { date, puzzleNumber: puzzleNumberFor(date, epoch), target, length: graph.length };
	}

	const words = graph.allWords();
	if (words.length === 0) return null;
	const [index] = dailyIndices(date, epoch, words.length, seedKey);
	const word = words[index];
	return { date, puzzleNumber: puzzleNumberFor(date, epoch), target: word, length: graph.length };
}

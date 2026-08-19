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

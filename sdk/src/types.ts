// Mirrors the response shapes of the backend's /api/games/:id/daily and
// /api/games/:id/guess routes (website/src/lib/server/engine). Duplicated
// here rather than shared via a package because it's two small interfaces
// — revisit if the API surface grows enough that drift becomes a real risk.

export interface StepValidation {
	isWord: boolean;
	isNeighbor: boolean;
}

/** Response of GET /api/games/:id/daily — a specific game's puzzle for a day. */
export interface DailyPuzzle {
	id: string;
	name: string | null;
	mode: 'ladder';
	date: string;
	puzzleNumber: number;
	target: string;
	start: string;
	length: number;
	minSteps: number;
	revealedRungs: string[];
}

export type LetterStatus = 'correct' | 'present' | 'absent';

export interface LetterResult {
	letter: string;
	status: LetterStatus;
}

/**
 * Response of GET /api/games/:id/wordle/daily — deliberately has no
 * `target`. The secret is only ever checked server-side, in .../guess.
 * `resumed` is non-null when a `?token=` attempt already has guesses
 * recorded server-side, so a reload can pick back up instead of losing
 * progress — see wordle-attempts.ts on the backend.
 */
export interface DailyWordle {
	id: string;
	name: string | null;
	mode: 'wordle';
	date: string;
	puzzleNumber: number;
	length: number;
	maxGuesses: number;
	resumed: { guesses: LetterResult[][]; solved: boolean } | null;
}

/** Response of POST /api/games/:id/wordle/guess. */
export interface WordleGuessResponse {
	isWord: boolean;
	result?: LetterResult[];
	won?: boolean;
}

/**
 * Response of GET /api/games/:id/quordle/daily — deliberately has no
 * `targets`. Unlike DailyWordle, there's no `resumed` field: quordle mode
 * keeps no server-side attempt record, so a reload just restarts the board
 * set (see the backend route's doc comment for why that tradeoff is fine).
 */
export interface DailyQuordle {
	id: string;
	name: string | null;
	mode: 'quordle';
	date: string;
	puzzleNumber: number;
	length: number;
	boardCount: number;
	maxGuesses: number;
}

/** Response of POST /api/games/:id/quordle/guess — one result/solved entry per board, in board order. */
export interface QuordleGuessResponse {
	isWord: boolean;
	results?: LetterResult[][];
	solved?: boolean[];
}

/**
 * Response of GET /api/games/:id/absurdle/start. No `date`, no `target`, no
 * `resumed` — absurdle has no daily/seeded puzzle and no server-side
 * attempt record at all (see the backend route's doc comment): the whole
 * game state is just the ordered list of guesses the client itself has
 * made, replayed fresh on every guess.
 */
export interface StartAbsurdle {
	id: string;
	name: string | null;
	mode: 'absurdle';
	length: number;
	totalWords: number;
}

/**
 * Response of POST /api/games/:id/absurdle/guess. No guesses-remaining/loss
 * concept — absurdle has no turn cap. `token` encodes the narrowed
 * candidate set for the caller to echo back on the next guess instead of
 * resending its whole guess history — see encodeCandidates/decodeCandidates
 * on the backend.
 */
export interface AbsurdleGuessResponse {
	isWord: boolean;
	result?: LetterResult[];
	remaining?: number;
	won?: boolean;
	token?: string;
}

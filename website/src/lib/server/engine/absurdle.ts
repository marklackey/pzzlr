import { scoreGuess, type LetterResult, type LetterStatus } from './wordle';
import type { WordGraph } from './graph';

const STATUS_RANK: Record<LetterStatus, number> = { absent: 0, present: 1, correct: 2 };

/** Compact string key for a feedback pattern, for grouping candidates into buckets. */
function patternKey(result: LetterResult[]): string {
	return result.map((r) => r.status[0]).join('');
}

/**
 * Base-3 encoding of a pattern (absent=0, present=1, correct=2 per letter)
 * — lower means grayer/less informative. Used only to break a tie between
 * two buckets of equal size, which is unspecified by the algorithm: picking
 * the grayer of the two keeps the game maximally evasive, consistent with
 * always picking the single largest bucket in the first place.
 */
function patternScore(result: LetterResult[]): number {
	let score = 0;
	for (const { status } of result) score = score * 3 + STATUS_RANK[status];
	return score;
}

export interface AbsurdleOutcome {
	result: LetterResult[];
	/** Candidate words still consistent with every guess made so far, including this one. */
	candidates: string[];
	won: boolean;
}

/**
 * Absurdle's whole mechanic: rather than committing to a secret up front,
 * partition `candidates` by whichever feedback pattern each one would
 * produce against `guess`, then keep the *largest* bucket — the response
 * that rules out the fewest words — instead of the bucket the real secret
 * would've produced. This is applied fresh on every guess, so the "answer"
 * is whatever hasn't been ruled out yet, chosen turn by turn to delay a win
 * as long as possible without ever contradicting an earlier response. A win
 * only happens once `candidates` has been narrowed to exactly one word and
 * the player guesses it — see encodeCandidates/decodeCandidates for how a
 * caller carries `candidates` across guesses without server-side storage.
 */
export function absurdleGuess(candidates: readonly string[], guess: string): AbsurdleOutcome {
	const buckets = new Map<string, { result: LetterResult[]; words: string[] }>();
	for (const candidate of candidates) {
		const result = scoreGuess(candidate, guess);
		const key = patternKey(result);
		let bucket = buckets.get(key);
		if (!bucket) {
			bucket = { result, words: [] };
			buckets.set(key, bucket);
		}
		bucket.words.push(candidate);
	}

	let best: { result: LetterResult[]; words: string[] } | null = null;
	for (const bucket of buckets.values()) {
		if (
			!best ||
			bucket.words.length > best.words.length ||
			(bucket.words.length === best.words.length &&
				patternScore(bucket.result) < patternScore(best.result))
		) {
			best = bucket;
		}
	}
	// candidates is never empty when called through the guess route (it
	// guards against that), so some bucket always exists.
	const chosen = best!;
	const won = chosen.words.length === 1 && chosen.result.every((r) => r.status === 'correct');
	return { result: chosen.result, candidates: chosen.words, won };
}

/**
 * Encodes `candidates` as a compact bitset token — one bit per word in
 * `graph`, in the graph's own stable index order (see WordGraph.indexOf) —
 * so a caller can carry "what's still possible" across guesses without any
 * server-side attempt record: the client echoes the token back on its next
 * guess (see decodeCandidates) instead of resending its whole guess history
 * for the server to replay from scratch every time.
 */
export function encodeCandidates(graph: WordGraph, candidates: readonly string[]): string {
	const bits = new Uint8Array(Math.ceil(graph.size() / 8));
	for (const word of candidates) {
		const i = graph.indexOf(word);
		if (i === undefined) continue;
		bits[i >> 3] |= 1 << (i & 7);
	}
	return bytesToBase64Url(bits);
}

/**
 * Decodes a token from encodeCandidates back into the words it marked.
 * Returns null — rather than throwing — for anything malformed or sized for
 * a different graph, so callers can treat that the same as "no token yet",
 * i.e. the start of a game with every word still a candidate.
 */
export function decodeCandidates(graph: WordGraph, token: string): string[] | null {
	let bits: Uint8Array;
	try {
		bits = base64UrlToBytes(token);
	} catch {
		return null;
	}
	if (bits.length !== Math.ceil(graph.size() / 8)) return null;

	const words = graph.allWords();
	const result: string[] = [];
	for (let i = 0; i < words.length; i++) {
		if ((bits[i >> 3] >> (i & 7)) & 1) result.push(words[i]);
	}
	return result;
}

function bytesToBase64Url(bytes: Uint8Array): string {
	let binary = '';
	for (const b of bytes) binary += String.fromCharCode(b);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(token: string): Uint8Array {
	const padded = token
		.replace(/-/g, '+')
		.replace(/_/g, '/')
		.padEnd(Math.ceil(token.length / 4) * 4, '=');
	const binary = atob(padded);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

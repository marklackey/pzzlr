import { error } from '@sveltejs/kit';
import { getGraph } from './graphs';
import { pickDailyPuzzle, pickDailyQuordle, pickDailyWord, reachTarget } from './engine';
import { puzzleDate } from './date';
import {
	DEFAULT_DICTIONARY_SIZE,
	DEFAULT_HARD_MODE,
	DICTIONARY_SIZES,
	HARD_MODES,
	isDictionarySize,
	isHardModePolicy,
	type DictionarySize,
	type HardModePolicy
} from '$lib/types';

export type GameMode = 'ladder' | 'wordle' | 'quordle' | 'absurdle';

/** Anything that isn't one of the other three modes defaults to 'ladder' — the column default (see schema.ts). */
function toGameMode(raw: unknown): GameMode {
	return raw === 'wordle' || raw === 'quordle' || raw === 'absurdle' ? raw : 'ladder';
}

export interface ParsedGameInput {
	mode: GameMode;
	target: string | null;
	length: number;
	dictionarySize: DictionarySize;
	minSteps: number;
	rungsGiven: number;
	maxGuesses: number;
	/** quordle mode only — how many simultaneous secret words one guess stream is scored against. */
	boardCount: number;
	/** wordle only: whether revealed hints must be reused, may be, or can't. See HardModePolicy in $lib/types. */
	hardMode: HardModePolicy;
	name?: string;
	public: boolean;
}

/**
 * Turns the create/edit HTML form's fields into the JSON body shape
 * parseGameInput expects. Shared by the create and edit pages, whose forms
 * are both rendered by GameForm.svelte and so submit identical field names.
 */
export function gameFormToBody(formData: FormData): Record<string, unknown> {
	const mode = toGameMode(formData.get('mode'));
	// quordle/absurdle have no fixed-target field in the form (see
	// GameForm.svelte) — quordle is always daily mode, same reasoning as
	// boardCount on schema.ts, and absurdle has no target concept at all.
	const randomTarget =
		mode === 'quordle' || mode === 'absurdle' || formData.get('randomTarget') === 'on';
	const target = randomTarget
		? null
		: (formData.get('target')?.toString().trim().toLowerCase() ?? '');
	const length = randomTarget ? Number(formData.get('length')) : target!.length;
	const dictionarySize = Number(formData.get('dictionarySize') || DEFAULT_DICTIONARY_SIZE);
	const minSteps = Number(formData.get('minSteps') || 4);
	const rungsGiven = Number(formData.get('rungsGiven') || 0);
	const maxGuesses = Number(formData.get('maxGuesses') || 6);
	const boardCount = Number(formData.get('boardCount') || 4);
	const hardMode = formData.get('hardMode')?.toString();
	const name = formData.get('name')?.toString().trim() || undefined;
	const isPrivate = formData.get('private') === 'on';
	return {
		mode,
		target,
		length,
		dictionarySize,
		minSteps,
		rungsGiven,
		maxGuesses,
		boardCount,
		hardMode,
		name,
		public: !isPrivate
	};
}

/**
 * Parses and validates a create/update request body, throwing SvelteKit
 * error()s for anything malformed. Shared by POST /api/games (create) and
 * PATCH /api/games/:id (edit) since both have to satisfy the same
 * target/length/dictionary contract.
 */
export function parseGameInput(body: unknown): ParsedGameInput {
	const b = body as Record<string, unknown> | null;

	const mode = toGameMode(b?.mode);

	// Empty string means "daily mode" — no fixed target, see schema.ts.
	// quordle never has a fixed target at all — always daily, see boardCount
	// on schema.ts — and absurdle has no target concept at all (see the mode
	// column comment there) — so any submitted target is ignored for both.
	const target =
		mode !== 'quordle' &&
		mode !== 'absurdle' &&
		typeof b?.target === 'string' &&
		b.target.length > 0
			? b.target.toLowerCase()
			: null;
	const length = typeof b?.length === 'number' ? b.length : null;
	const rawDictionarySize = b?.dictionarySize;
	if (rawDictionarySize !== undefined && !isDictionarySize(rawDictionarySize)) {
		throw error(400, `dictionarySize must be one of ${DICTIONARY_SIZES.join(', ')}`);
	}
	const dictionarySize: DictionarySize = isDictionarySize(rawDictionarySize)
		? rawDictionarySize
		: DEFAULT_DICTIONARY_SIZE;
	const minSteps = typeof b?.minSteps === 'number' ? b.minSteps : 4;
	const rungsGiven = typeof b?.rungsGiven === 'number' ? b.rungsGiven : 0;
	const maxGuesses = typeof b?.maxGuesses === 'number' ? b.maxGuesses : 6;
	const boardCount = typeof b?.boardCount === 'number' ? b.boardCount : 4;
	// Only wordle offers it, so every other mode stores the same "not on
	// offer" value whatever a caller sends — see HardModePolicy in
	// $lib/types for why quordle in particular doesn't get it.
	const hardMode: HardModePolicy =
		mode === 'wordle' && isHardModePolicy(b?.hardMode) ? b.hardMode : DEFAULT_HARD_MODE;
	const name = typeof b?.name === 'string' && b.name.length > 0 ? b.name : undefined;
	const isPublic = typeof b?.public === 'boolean' ? b.public : true;

	if (!length) {
		throw error(
			400,
			`expected { mode?: "ladder" | "wordle" | "quordle" | "absurdle", target?: string, length: number, dictionarySize?: 50 | 60 | 80, minSteps?: number, rungsGiven?: number, maxGuesses?: number, boardCount?: number, hardMode?: ${HARD_MODES.map((m) => `"${m}"`).join(' | ')}, name?: string }`
		);
	}

	// minSteps/rungsGiven only shape a ladder game's search — see the
	// comments on those columns in schema.ts — so a wordle/quordle game just
	// carries their defaults around unused rather than being validated
	// against them.
	if (mode === 'ladder') {
		if (rungsGiven < 0 || rungsGiven > 4) {
			throw error(400, 'rungsGiven must be between 0 and 4');
		}
		// minSteps has to stay >= 2 (start + target, at least one guess) —
		// below that, revealedRungs' slice math can no longer guarantee it
		// stops before the target index, which would leak the answer into
		// the "free" rungs.
		if (minSteps < 2) {
			throw error(400, 'minSteps must be at least 2');
		}
	}
	if ((mode === 'wordle' || mode === 'quordle') && (maxGuesses < 1 || maxGuesses > 15)) {
		throw error(400, 'maxGuesses must be between 1 and 15');
	}
	if (mode === 'quordle' && (boardCount < 2 || boardCount > 64)) {
		throw error(400, 'boardCount must be between 2 and 64');
	}

	// Enforced here as well as in the form: a name is what a game is called
	// everywhere it appears — its own page, Explore, the owner's list — and
	// it's also what its readable URL comes from (see generateGameId), so a
	// nameless game falls back to a uuid nobody can recognise.
	if (!name || name.trim().length === 0) {
		throw error(400, 'a game needs a name');
	}

	const graph = getGraph(length, dictionarySize);
	if (!graph) {
		throw error(400, `no graph for length ${length} at dictionary size ${dictionarySize}`);
	}
	if (target !== null) {
		if (target.length !== length) {
			throw error(400, `target "${target}" must be ${length} letters`);
		}
		// A target outside the dictionary is fine — a name, a brand, an
		// in-joke — reached from whichever dictionary word sits one letter
		// from it; only that final rung escapes the dictionary. A target
		// nothing can reach is fine too, and simply makes an unwinnable game,
		// which is allowed on purpose: the create form reports how many
		// puzzles a target can produce (see /api/target-reach), so an
		// impossible one is a choice rather than an accident. Such a game
		// says it can't generate today's puzzle when someone opens it.
	}

	return {
		mode,
		target,
		length,
		dictionarySize,
		minSteps,
		rungsGiven,
		maxGuesses,
		boardCount,
		hardMode,
		name,
		public: isPublic
	};
}

/**
 * Whether today's puzzle can actually be generated for this game, and why
 * not if it can't.
 *
 * Deliberately not enforced at create time: a game with no solution is
 * allowed. Someone may want a ladder to a word nothing can reach, and the
 * create form already reports how many puzzles a target can produce (see
 * /api/target-reach), so an unwinnable game is an informed choice rather
 * than an accident. This exists for that reporting, and for anything that
 * wants to explain the failure rather than prevent it.
 */
export function assertDailySolvable(input: ParsedGameInput, seedKey: string): void {
	const graph = getGraph(input.length, input.dictionarySize)!; // parseGameInput already confirmed this exists

	if (input.mode === 'wordle') {
		const word = pickDailyWord(graph, input.target, puzzleDate(), { seedKey });
		if (!word) {
			throw error(
				400,
				input.target
					? `target "${input.target}" is not usable as a wordle secret for length ${input.length}`
					: `no word available for a daily wordle secret at length ${input.length}`
			);
		}
		return;
	}

	if (input.mode === 'absurdle') {
		// No daily/seeded puzzle exists for absurdle at all — the "answer"
		// only emerges from a given player's own guesses (see absurdle.ts) —
		// so there's nothing to fail-fast check beyond the graph existing,
		// which parseGameInput already confirmed above.
		return;
	}

	if (input.mode === 'quordle') {
		const puzzle = pickDailyQuordle(graph, puzzleDate(), input.boardCount, { seedKey });
		if (!puzzle) {
			throw error(
				400,
				`fewer than ${input.boardCount} distinct length-${input.length} words are available at dictionary size ${input.dictionarySize} — try a smaller board count or a larger dictionary`
			);
		}
		return;
	}

	const puzzle = pickDailyPuzzle(graph, input.target, puzzleDate(), {
		minSteps: input.minSteps,
		rungsGiven: input.rungsGiven,
		seedKey
	});
	if (!puzzle) {
		if (input.target) {
			// Say what the target can actually manage rather than just that
			// this didn't work — the ceiling is a property of the word, and
			// no amount of retrying changes it.
			const reach = reachTarget(graph, input.target);
			const required = input.minSteps + input.rungsGiven;
			throw error(
				400,
				`"${input.target}" can't support that: the longest ladder ending there is ${reach.longestLadder} words, but minSteps=${input.minSteps} with rungsGiven=${input.rungsGiven} needs ${required} — try a lower minSteps or fewer rungs`
			);
		}
		throw error(
			400,
			`no solvable random puzzle exists for length ${input.length} with minSteps=${input.minSteps} and rungsGiven=${input.rungsGiven} — try a lower minSteps or fewer rungs`
		);
	}
}

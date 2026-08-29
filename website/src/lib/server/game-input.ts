import { error } from '@sveltejs/kit';
import { getGraph } from './graphs';
import { pickDailyPuzzle, pickDailyQuordle, pickDailyWord } from './engine';
import { puzzleDate } from './date';
import {
	DEFAULT_DICTIONARY_SIZE,
	DICTIONARY_SIZES,
	isDictionarySize,
	type DictionarySize
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
	const name = typeof b?.name === 'string' && b.name.length > 0 ? b.name : undefined;
	const isPublic = typeof b?.public === 'boolean' ? b.public : true;

	if (!length) {
		throw error(
			400,
			'expected { mode?: "ladder" | "wordle" | "quordle" | "absurdle", target?: string, length: number, dictionarySize?: 50 | 60 | 80, minSteps?: number, rungsGiven?: number, maxGuesses?: number, boardCount?: number, name?: string }'
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

	const graph = getGraph(length, dictionarySize);
	if (!graph) {
		throw error(400, `no graph for length ${length} at dictionary size ${dictionarySize}`);
	}
	if (target !== null) {
		if (target.length !== length) {
			throw error(400, `target "${target}" must be ${length} letters`);
		}
		if (!graph.has(target)) {
			throw error(
				400,
				`target "${target}" is not a word in the length-${length} dictionary (size ${dictionarySize})`
			);
		}
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
		name,
		public: isPublic
	};
}

/**
 * Fail fast at create/edit time rather than the first time someone loads
 * the game: confirm a daily puzzle can actually be generated with this
 * input before persisting it. `seedKey` should be the game's id, so the
 * check exercises the exact seed the game will actually be served under.
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
		throw error(
			400,
			input.target
				? `no solvable daily puzzle exists for target "${input.target}" with minSteps=${input.minSteps} and rungsGiven=${input.rungsGiven} — try a lower minSteps or fewer rungs`
				: `no solvable random puzzle exists for length ${input.length} with minSteps=${input.minSteps} and rungsGiven=${input.rungsGiven} — try a lower minSteps or fewer rungs`
		);
	}
}

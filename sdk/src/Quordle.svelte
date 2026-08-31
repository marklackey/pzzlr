<svelte:options customElement="pzzlr-quordle" />

<script lang="ts">
	import type { LetterResult } from './types';
	import { KEYBOARD_ROWS, createKeyboardHandlers } from './keyboard';
	import { authHeaders } from './http';
	import { bestLetterStatus } from './scoring';
	import { createShareCopy } from './share';
	import { scrollIntoViewWithin } from './scroll';

	let { apibase = '', game = '', date = '', apikey = '' } = $props<{
		apibase?: string;
		/** Id of a stored game config (mode: "quordle"). See Ladder.svelte for why this is required. */
		game: string;
		/** Override the daily puzzle's date (YYYY-MM-DD); mainly for testing. */
		date?: string;
		/** Required for a private game — see the game's "Manage this game" panel. */
		apikey?: string;
	}>();

	type Status = 'loading' | 'playing' | 'finished' | 'error';

	let status = $state<Status>('loading');
	let wordLength = $state(5);
	let maxGuesses = $state(9);
	let boardCount = $state(4);
	let puzzleNumber = $state<number | null>(null);
	/**
	 * Which day's board set this is (YYYY-MM-DD), fixed when it loaded.
	 * Every guess and the reveal are sent against this day rather than
	 * whatever "today" has since become, so a board set that was open when
	 * the puzzle rolled over (US Eastern midnight — mid-evening in the west)
	 * plays out as the one the player started, instead of being scored
	 * against tomorrow's secrets. A reload is what moves them on.
	 */
	let puzzleDay = $state<string | null>(null);
	let gameName = $state<string | null>(null);
	// One guessed word per row, shared across every board. boardResults[i] is
	// board i's per-guess scoring; boardSolvedAt[i] is the 1-based guess
	// index that solved board i, or null while it's still open. There's no
	// server-side attempt record for quordle (see the backend route's doc
	// comments) — all of this lives only in this component's state, so a
	// reload just starts the board set over.
	let guesses = $state<string[]>([]);
	let boardResults = $state<LetterResult[][][]>([]);
	let boardSolvedAt = $state<(number | null)[]>([]);
	let revealedTargets = $state<string[]>([]);
	let currentGuess = $state('');
	let message = $state('');

	const allSolved = $derived(boardSolvedAt.length > 0 && boardSolvedAt.every((v) => v !== null));

	/** Loads `day`'s board set, defaulting to the `date` override, or to today when there's neither. */
	async function loadPuzzle(day: string | undefined = date || undefined) {
		if (!game) {
			message = 'missing required "game" attribute (a stored game config id)';
			status = 'error';
			return;
		}

		status = 'loading';
		message = '';
		try {
			const params = new URLSearchParams();
			if (day) params.set('date', day);
			const qs = params.toString();
			const res = await fetch(`${apibase}/api/games/${game}/quordle/daily${qs ? `?${qs}` : ''}`, {
				headers: authHeaders(apikey)
			});
			if (!res.ok) throw new Error(`puzzle request failed: ${res.status}`);
			const data = await res.json();

			wordLength = data.length;
			maxGuesses = data.maxGuesses;
			boardCount = data.boardCount;
			puzzleNumber = data.puzzleNumber ?? null;
			puzzleDay = data.date ?? null;
			gameName = data.name ?? null;
			guesses = [];
			boardResults = Array.from({ length: boardCount }, () => []);
			boardSolvedAt = Array.from({ length: boardCount }, () => null);
			rowEls.length = 0;
			for (let i = 0; i < boardCount; i++) rowEls.push([]);
			revealedTargets = [];
			currentGuess = '';
			status = 'playing';
		} catch (err) {
			message = err instanceof Error ? err.message : 'failed to load puzzle';
			status = 'error';
		}
	}

	async function reveal() {
		try {
			const params = new URLSearchParams();
			// This board set's day, not today's — the secrets to show are the
			// ones it was played against. See puzzleDay.
			const day = puzzleDay ?? (date || undefined);
			if (day) params.set('date', day);
			const qs = params.toString();
			const res = await fetch(`${apibase}/api/games/${game}/quordle/reveal${qs ? `?${qs}` : ''}`, {
				headers: authHeaders(apikey)
			});
			if (res.ok) revealedTargets = (await res.json()).targets;
		} catch {
			// Best-effort — finishing without a reveal is still a valid end state.
		}
	}

	async function submitGuess() {
		if (status !== 'playing' || currentGuess.length !== wordLength) return;

		const guess = currentGuess;
		const res = await fetch(`${apibase}/api/games/${game}/quordle/guess`, {
			method: 'POST',
			headers: { 'content-type': 'application/json', ...authHeaders(apikey) },
			// The day is this board set's own (see puzzleDay), not today's — the
			// guess is scored against the secrets being played.
			body: JSON.stringify({ guess, date: puzzleDay ?? (date || undefined) })
		});
		const result = await res.json();

		if (!result.isWord) {
			message = `"${guess}" isn't a word in this dictionary`;
			currentGuess = '';
			return;
		}

		message = '';
		guesses = [...guesses, guess];
		const guessIndex = guesses.length;
		boardResults = boardResults.map((rows: LetterResult[][], i: number) => [
			...rows,
			result.results[i]
		]);
		boardSolvedAt = boardSolvedAt.map((solvedAt: number | null, i: number) =>
			solvedAt === null && result.solved[i] ? guessIndex : solvedAt
		);
		currentGuess = '';

		if (boardSolvedAt.every((v) => v !== null)) {
			status = 'finished';
		} else if (guesses.length >= maxGuesses) {
			status = 'finished';
			await reveal();
		}
	}

	const { typeLetter, backspace, handleKeydown } = createKeyboardHandlers({
		isActive: () => status === 'playing',
		currentGuess: () => currentGuess,
		setCurrentGuess: (value) => (currentGuess = value),
		maxLength: () => wordLength,
		submit: submitGuess
	});

	// Aggregated over every board's every guess, same "correct always wins
	// over present/absent" logic as the plain wordle widget.
	function keyStatus(letter: string) {
		return bestLetterStatus(boardResults.flat(), letter);
	}

	function guessesUsedLabel(): string {
		return allSolved ? String(guesses.length) : 'X';
	}

	function shareText(): string {
		const header = puzzleNumber
			? `Quordle #${puzzleNumber} — ${guessesUsedLabel()}/${maxGuesses}`
			: `Quordle — ${guessesUsedLabel()}/${maxGuesses}`;
		const lines = boardResults.map((rows, i) => {
			const shown = boardSolvedAt[i] !== null ? rows.slice(0, boardSolvedAt[i]!) : rows;
			return shown
				.map((row) =>
					row.map(({ status: s }) => (s === 'correct' ? '🟩' : s === 'present' ? '🟨' : '⬛')).join('')
				)
				.join(' ');
		});
		return [header, ...lines].join('\n');
	}

	let copied = $state(false);
	const copyShare = createShareCopy(shareText, (value) => (copied = value));

	// Two-stage responsive strategy for however many boards the game owner
	// picked: first shrink each board down to a floor of 2 visible rows
	// (extra guesses scroll inside the board instead of pushing the page
	// taller), and only past that floor start shrinking the boards
	// themselves. Plain threshold buckets rather than a measured layout —
	// it's not exact, and very large board counts do end up cramped, but
	// that's an intentional trade rather than a bug to chase. This only
	// reacts to board count, though — a phone-width viewport additionally
	// scales each board's height off the viewport itself (never below a
	// 2-row floor) via a plain CSS media query on .board-rows below, since
	// viewport size isn't available to compute here at render time.
	function visibleRows(count: number, max: number): number {
		if (count <= 4) return max;
		if (count <= 9) return Math.min(max, 4);
		if (count <= 16) return Math.min(max, 3);
		return Math.min(max, 2);
	}
	function tileRem(count: number): number {
		if (count <= 16) return 2;
		if (count <= 36) return 1.5;
		return 1.1;
	}
	const rowsVisible = $derived(visibleRows(boardCount, maxGuesses));
	const tileSize = $derived(tileRem(boardCount));
	const boardMinWidth = $derived(tileSize * wordLength + 0.3 * (wordLength - 1) + 1.2);

	// Refs for keeping the row you're typing into on screen. Each board scrolls
	// independently (see .board-rows), so these are per board — index i is the
	// board, and rowEls[i][n] its nth row. Plain vars rather than $state —
	// nothing renders from them, they're only read in the effect below, which
	// reruns off `guesses` and so always sees refs the DOM has already updated.
	const boardRowsEls: HTMLElement[] = [];
	// One row-ref array per board, sized in loadPuzzle before any row
	// renders — bind:this needs a plain member expression, so rowEls[i]
	// can't be created lazily at bind time.
	const rowEls: HTMLElement[][] = [];

	$effect(() => {
		const activeRow = guesses.length;
		for (let i = 0; i < boardRowsEls.length; i++) {
			// A solved board stops rendering rows at its winning guess, so it
			// simply has no active row to chase.
			scrollIntoViewWithin(boardRowsEls[i], rowEls[i]?.[activeRow]);
		}
	});

	loadPuzzle();
</script>

<svelte:window onkeydown={handleKeydown} />

<div
	class="quordle"
	style="--tile-size: {tileSize}rem; --visible-rows: {rowsVisible}; --board-min-width: {boardMinWidth}rem;"
>
	{#if status === 'loading'}
		<p>Loading puzzle…</p>
	{:else if status === 'error'}
		<p class="message">{message}</p>
	{:else}
		<div class="scroll-area">
			{#if gameName}
				<h2 class="game-name">{gameName}</h2>
			{/if}
			<div class="header">
				{#if puzzleNumber}
					<span class="puzzle-number">#{puzzleNumber}</span>
				{/if}
				<span class="length-hint">{boardCount} boards · {wordLength} letters</span>
				<span class="guess-count">{guesses.length}/{maxGuesses} guesses</span>
			</div>

			<div class="boards">
				{#each Array.from({ length: boardCount }) as _, i (i)}
					<div class="board" class:solved={boardSolvedAt[i] !== null}>
						<div class="board-rows" bind:this={boardRowsEls[i]}>
							{#each Array.from({ length: maxGuesses }) as _, rowIndex (rowIndex)}
								{#if boardSolvedAt[i] !== null && rowIndex >= boardSolvedAt[i]}
									<!-- board is done — no further rows -->
								{:else if rowIndex < boardResults[i].length}
									<div class="row" bind:this={rowEls[i][rowIndex]}>
										{#each boardResults[i][rowIndex] as { letter, status: s }, li (li)}
											<div class="tile filled {s}">{letter.toUpperCase()}</div>
										{/each}
									</div>
								{:else if rowIndex === guesses.length && status === 'playing'}
									<div class="row" bind:this={rowEls[i][rowIndex]}>
										{#each Array.from({ length: wordLength }) as _, li (li)}
											<div class="tile input">{currentGuess[li]?.toUpperCase() ?? ''}</div>
										{/each}
									</div>
								{:else}
									<div class="row" bind:this={rowEls[i][rowIndex]}>
										{#each Array.from({ length: wordLength }) as _, li (li)}
											<div class="tile"></div>
										{/each}
									</div>
								{/if}
							{/each}
						</div>
						{#if boardSolvedAt[i] !== null}
							<p class="board-status solved">guess {boardSolvedAt[i]}</p>
						{:else if status === 'finished' && revealedTargets[i]}
							<p class="board-status lost">{revealedTargets[i].toUpperCase()}</p>
						{/if}
					</div>
				{/each}
			</div>

			{#if status === 'finished'}
				<p class={allSolved ? 'won' : 'lost'}>
					{allSolved
						? `Solved all ${boardCount} boards in ${guesses.length}/${maxGuesses} guesses!`
						: 'Out of guesses.'}
				</p>
				<button type="button" class="copy" onclick={copyShare}>
					{copied ? 'Copied!' : 'Copy result'}
				</button>
			{:else if message}
				<p class="message">{message}</p>
			{/if}
		</div>

		{#if status !== 'finished'}
			<div class="keyboard">
				{#each KEYBOARD_ROWS as krow, i (i)}
					<div class="krow">
						{#each krow as key (key)}
							{#if key === 'enter'}
								<button type="button" class="wide enter" onclick={submitGuess}>ENTER</button>
							{:else if key === 'back'}
								<button type="button" class="wide" onclick={backspace}>&#9003;</button>
							{:else}
								<button
									type="button"
									class={keyStatus(key)}
									onclick={() => typeLetter(key)}
								>
									{key}
								</button>
							{/if}
						{/each}
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<style>
	/* Custom elements default to display:inline, which can't resolve a
	   percentage width — without this, .quordle's width:100% below has
	   nothing concrete to size against. */
	:host {
		display: block;
		width: 100%;
		box-sizing: border-box;
	}
	.quordle {
		--hit: #4a8f5c;
		--present: #b8952f;
		--miss: #6b6578;
		--ink: #201d2b;
		--ink-muted: #6b6578;
		--line: #e4e1db;
		--key-bg: #edeaf7;
		--key-bg-hover: #ded7f5;
		--bg: #fff;
		/* Row geometry, shared by the tiles themselves and by the desktop
		   height below that reserves room for --visible-rows of them. */
		--tile-border: 2px;
		font-family:
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			Roboto,
			sans-serif;
		width: 100%;
		max-width: 64rem;
		box-sizing: border-box;
		color: var(--ink);
		background: var(--bg);
		display: flex;
		flex-direction: column;
		/* Only resolves to something when the host gives this element a
		   definite height (the phone layout does — see .board-card in the
		   website's g/[id] page). Then .scroll-area/.keyboard below split
		   that height and the keyboard sits on the bottom edge. Everywhere
		   else this is auto and the widget just sizes to its content. */
		height: 100%;
	}
	/* Everything above the keyboard. Scrolls within its own share of the
	   height when the widget has one, so a tall board never runs underneath
	   the keyboard — and collapses to plain content height when it doesn't,
	   which is what keeps embeds and desktop in normal flow. */
	.scroll-area {
		flex: 1 1 auto;
		min-height: 0;
		overflow-y: auto;
	}
	.game-name {
		margin: 0 0 0.5rem;
		font-size: 1.3rem;
		font-weight: 700;
	}
	.header {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: baseline;
		gap: 0.5rem;
		font-size: 0.85rem;
		color: var(--ink-muted);
		margin-bottom: 1rem;
	}
	.boards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(var(--board-min-width), 1fr));
		gap: 0.85rem;
		margin-bottom: 1rem;
	}
	.board {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 0;
	}
	.board-rows {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		overflow-y: auto;
		/* Shows exactly --visible-rows rows before scrolling the rest — see
		   the visibleRows()/tileRem() comment above for the reasoning. */
		max-height: calc(
			var(--visible-rows) * (var(--tile-size) + 2 * var(--tile-border) + 0.3rem) - 0.3rem
		);
	}
	/* --visible-rows only reacts to board count, not viewport — a low-board-
	   count game (e.g. 4) still renders every guess row at full height,
	   which is fine on desktop but pushes a phone into a lot of page
	   scrolling to reach the keyboard. Below the same 480px "phone" cutoff
	   the sdk skill uses for its tightest-case checks, scale each board's
	   visible height off the viewport itself (dvh, not a flat row count) so
	   a tall phone still gets more than the bare minimum and a short one
	   (or landscape) doesn't get squeezed past legibility — clamp()'s min
	   band is what actually enforces the 2-row floor, its max band is
	   whatever --visible-rows already allows so this never shows *more*
	   rows than the board-count stage above would. */
	@media (max-width: 480px) {
		.board-rows {
			max-height: clamp(
				calc(2 * (var(--tile-size) + 2 * var(--tile-border) + 0.3rem) - 0.3rem),
				20dvh,
				calc(var(--visible-rows) * (var(--tile-size) + 2 * var(--tile-border) + 0.3rem) - 0.3rem)
			);
		}
	}
	.row {
		display: flex;
		gap: 0.3rem;
		width: 100%;
	}
	.tile {
		flex: 1 1 0;
		max-width: var(--tile-size);
		min-width: 0;
		aspect-ratio: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		border: var(--tile-border) solid var(--line);
		border-radius: 6px;
		font-weight: 700;
		font-size: calc(var(--tile-size) * 0.42);
	}
	.tile.input {
		border-color: #b3aed6;
	}
	.tile.filled.correct {
		background: var(--hit);
		border-color: var(--hit);
		color: white;
	}
	.tile.filled.present {
		background: var(--present);
		border-color: var(--present);
		color: white;
	}
	.tile.filled.absent {
		background: var(--miss);
		border-color: var(--miss);
		color: white;
	}
	.board-status {
		margin: 0;
		font-size: 0.7rem;
		text-align: center;
		color: var(--ink-muted);
	}
	.board-status.solved {
		color: var(--hit);
		font-weight: 700;
	}
	.board-status.lost {
		color: var(--miss);
		font-weight: 700;
		letter-spacing: 0.03em;
	}
	.keyboard {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		flex: 0 0 auto;
		/* Last child of the flex column, and the only one that doesn't flex —
		   so it takes its natural height off the bottom and .scroll-area gets
		   the rest. That's what puts it on the viewport's bottom edge when
		   the host gives this widget the viewport's height. */
		background: var(--bg);
		padding: 0.6rem 0 0.2rem;
	}
	.krow {
		display: flex;
		gap: 0.35rem;
	}
	/* Home row is narrower and centered, same as a physical keyboard —
	   Enter/Backspace already bookend the bottom row edge-to-edge, so it
	   needs no inset of its own. */
	.krow:nth-child(2) {
		padding: 0 4%;
	}
	.krow button {
		flex: 1 1 0;
		min-width: 0;
	}
	button {
		/* Narrow side padding: these are single glyphs, and every pixel
		   spent here across ten keys comes out of the row's shared width —
		   which is what the wider ENTER key needs to fit its label. */
		padding: 1.1rem 0.2rem;
		border: none;
		box-sizing: border-box;
		border-radius: 8px;
		background: var(--key-bg);
		color: var(--ink);
		text-transform: uppercase;
		font-weight: 700;
		font-size: 1.05rem;
		cursor: pointer;
		transition: background 0.1s;
		overflow: hidden;
		white-space: nowrap;
	}
	button:hover {
		background: var(--key-bg-hover);
	}
	button.wide {
		flex: 1.9 1 0;
		font-size: 0.68rem;
		letter-spacing: -0.02em;
		/* Tighter than a letter key's: "ENTER" is five glyphs in a slot only
		   ~1.9x as wide as a one-letter key, so the side padding is what
		   decides whether it fits or gets clipped. */
		padding-left: 0.15rem;
		padding-right: 0.15rem;
	}
	button.enter {
		background: var(--hit);
		color: white;
	}
	button.correct {
		background: var(--hit);
		color: white;
	}
	button.present {
		background: var(--present);
		color: white;
	}
	button.absent {
		background: var(--miss);
		color: white;
	}
	.won {
		color: var(--hit);
		font-weight: 700;
	}
	.lost {
		color: var(--ink-muted);
		font-weight: 700;
	}
	button.copy {
		background: var(--hit);
		color: white;
	}
	.message {
		color: #b91c1c;
		font-size: 0.85rem;
	}
</style>

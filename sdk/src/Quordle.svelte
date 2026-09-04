<svelte:options customElement="pzzlr-quordle" />

<script lang="ts">
	import type { LetterResult } from './types';
	import { KEYBOARD_ROWS, createKeyboardHandlers } from './keyboard';
	import { authHeaders } from './http';
	import { bestLetterStatus } from './scoring';
	import { createShareCopy } from './share';
	import { scrollIntoViewWithin } from './scroll';

	let { apibase = '', game = '', date = '', apikey = '', revealed = '' } = $props<{
		apibase?: string;
		/** Id of a stored game config (mode: "quordle"). See Ladder.svelte for why this is required. */
		game: string;
		/** Override the daily puzzle's date (YYYY-MM-DD); mainly for testing. */
		date?: string;
		/** Comma-separated answer for a day that's over, drawn on the board rather than played for — set by the website's archive (see /g/[id]/archive). */
		revealed?: string;
		/** Required for a private game — see the game's "Manage this game" panel. */
		apikey?: string;
	}>();

	// The answer to a finished day, when the page has fetched one. Splitting
	// here rather than taking JSON keeps this an ordinary attribute a plain
	// HTML page could set.
	const revealedWords = $derived(
		revealed
			.split(',')
			.map((word) => word.trim())
			.filter(Boolean)
	);

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
	// index that solved board i, or null while it's still open. All of it is
	// recomputed from the attempt the server holds (see the daily route's
	// `resumed`), so a reload picks the board set back up where it was
	// rather than starting it over.
	let guesses = $state<string[]>([]);
	let boardResults = $state<LetterResult[][][]>([]);
	let boardSolvedAt = $state<(number | null)[]>([]);
	// Whether the win happened on a board, under this player's hands, as
	// opposed to arriving already won from a resumed attempt. Only a win they
	// watched land is worth animating; replaying the flourish on every reload
	// of a finished board would be a flourish about nothing.
	let solvedLive = $state<boolean[]>([]);
	let revealedTargets = $state<string[]>([]);
	let currentGuess = $state('');
	let message = $state('');

	const allSolved = $derived(boardSolvedAt.length > 0 && boardSolvedAt.every((v) => v !== null));

	// Server-side scoring/reveal is keyed off this per-(browser, game)
	// attempt token rather than a login — the widget is played anonymously
	// on embed pages, so there's no account to hang it off. Persisted in
	// localStorage so a reload resumes the same attempt instead of forking a
	// new one; falls back to an in-memory token (still lets the current page
	// load play normally) if storage is unavailable, e.g. private browsing
	// with storage blocked. Same shape as the wordle widget's.
	function attemptToken(): string {
		const key = `pzzlr-quordle-token:${game}`;
		try {
			let token = localStorage.getItem(key);
			if (!token) {
				token = crypto.randomUUID();
				localStorage.setItem(key, token);
			}
			return token;
		} catch {
			return crypto.randomUUID();
		}
	}
	const token = attemptToken();

	/** Whether every letter of a scored row came back correct — how a solved board reads. */
	function rowSolves(row: LetterResult[]): boolean {
		return row.length > 0 && row.every((letter) => letter.status === 'correct');
	}

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
			const params = new URLSearchParams({ token });
			if (day) params.set('date', day);
			const res = await fetch(`${apibase}/api/games/${game}/quordle/daily?${params}`, {
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
			const resumed = data.resumed as {
				guesses: string[];
				boardResults: LetterResult[][][];
				solved: boolean;
			} | null;
			guesses = resumed?.guesses ?? [];
			boardResults =
				resumed?.boardResults ?? Array.from({ length: boardCount }, () => []);
			// Which guess solved each board falls out of the rows themselves —
			// the first all-correct one — so there's nothing extra to store.
			solvedLive = [];
			boardSolvedAt = boardResults.map((rows) => {
				const index = rows.findIndex(rowSolves);
				return index === -1 ? null : index + 1;
			});
			rowEls.length = 0;
			for (let i = 0; i < boardCount; i++) rowEls.push([]);
			revealedTargets = [];
			currentGuess = '';
			status =
				resumed?.solved || guesses.length >= maxGuesses ? 'finished' : 'playing';
			// A board set that was already over when this loaded still owes the
			// player the words it ended on.
			if (status === 'finished' && !resumed?.solved) await reveal();
		} catch (err) {
			message = err instanceof Error ? err.message : 'failed to load puzzle';
			status = 'error';
		}
	}

	async function reveal() {
		try {
			const params = new URLSearchParams({ token });
			// This board set's day, not today's — the secrets to show are the
			// ones it was played against. See puzzleDay.
			const day = puzzleDay ?? (date || undefined);
			if (day) params.set('date', day);
			const res = await fetch(`${apibase}/api/games/${game}/quordle/reveal?${params}`, {
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
			// `rows` is what the server checks this board set against, so a
			// stale tab can't spend a guess out of a board it isn't showing.
			body: JSON.stringify({
				guess,
				token,
				rows: guesses.length,
				date: puzzleDay ?? (date || undefined)
			})
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
		solvedLive = boardSolvedAt.map(
			(solvedAt: number | null, i: number) => solvedAt === null && result.solved[i]
		);
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

	// A tapped key shouldn't keep the focus: a player who clicks their way
	// through a word and then reaches for Enter on their own keyboard would
	// otherwise press whichever key they last clicked as well. Preventing the
	// mousedown default stops the button taking focus without stopping the
	// click, and leaves tabbing to the keys working as it did.
	function keepFocusOffKeys(e: MouseEvent) {
		e.preventDefault();
	}

	const { typeLetter, backspace, handleKeydown } = createKeyboardHandlers({
		isActive: () => status === 'playing' && revealedWords.length === 0,
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
				<span class="board-count">{boardCount} boards</span>
				<span class="guess-count">{guesses.length}/{maxGuesses} guesses</span>
			</div>

			<!-- --tiles is a word's length, inherited by every row under here:
			     the reveal animation's geometry is written in terms of how many
			     tiles a word is (see .row.answer-row in the styles). -->
			<div class="boards" style="--tiles: {wordLength}">
				{#each Array.from({ length: boardCount }) as _, i (i)}
					<div class="board" class:solved={boardSolvedAt[i] !== null}>
						<div class="board-rows" bind:this={boardRowsEls[i]}>
							{#each Array.from({ length: maxGuesses }) as _, rowIndex (rowIndex)}
								{#if boardSolvedAt[i] !== null && rowIndex >= boardSolvedAt[i]}
									<!-- board is done — no further rows -->
								{:else if rowIndex < boardResults[i].length}
									<!-- The guess that finished this board is its answer, found
									     rather than given — so it opens the way a revealed one
									     does. -->
									<div
										class="row"
										class:just-solved={solvedLive[i] && boardSolvedAt[i] === rowIndex + 1}
										bind:this={rowEls[i][rowIndex]}
									>
										{#each boardResults[i][rowIndex] as { letter, status: s }, li (li)}
											<div class="tile filled {s}">{letter.toUpperCase()}</div>
										{/each}
									</div>
								{:else if rowIndex === boardResults[i].length && revealedWords[i]}
									<!-- The day's answer for this board, in the row a guess
									     would have gone in and scored the way a solving guess
									     scores. -->
									<div
										class="row answer-row"
										style="--row-index: {i}"
										bind:this={rowEls[i][rowIndex]}
									>
										{#each Array.from({ length: wordLength }) as _, li (li)}
											<div class="tile filled correct">
												{revealedWords[i][li]?.toUpperCase() ?? ''}
											</div>
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
								<button
									type="button"
									class="wide enter"
									onmousedown={keepFocusOffKeys}
									onclick={submitGuess}
								>
									ENTER
								</button>
							{:else if key === 'back'}
								<button
									type="button"
									class="wide"
									onmousedown={keepFocusOffKeys}
									onclick={backspace}
								>
									&#9003;
								</button>
							{:else}
								<button
									type="button"
									class={keyStatus(key)}
									onmousedown={keepFocusOffKeys}
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
		/* A flex column rather than a plain block so the root below can fill
		   whatever height the host ends up with — including a height it got
		   by being stretched as someone else's flex item, which a percentage
		   height can't read (the parent's height isn't definite then, so
		   `height: 100%` silently falls back to content height and the
		   keyboard stops sitting on the bottom edge). Still a block-level box
		   with a definite width, which is what the root's width: 100% needs. */
		display: flex;
		flex-direction: column;
		width: 100%;
		box-sizing: border-box;
	}
	.quordle {
		--accent: #2b6d8f;
		--accent-hover: #235a77;
		--hit: #3f7f63;
		--present: #b8883a;
		--miss: #6c6675;
		--ink: #1b1922;
		--ink-muted: #6d6878;
		--line: #e4dfd6;
		--key-bg: #eeeae2;
		--key-bg-hover: #e2dcd0;
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
		/* Fills the host: a definite height given by an embed, or the one
		   the website's phone layout stretches it to (see .board-card in
		   g/[id]/+page.svelte). Then .scroll-area/.keyboard below split
		   that height and the keyboard sits on the bottom edge. With no
		   height to fill, this is just content height and the widget sizes
		   to itself. */
		flex: 1 1 auto;
		min-height: 0;
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
	/* The answer opens as one circle growing out of the middle of the word,
	   rather than flipping letter by letter: the whole word arrives as a
	   single shape, so it reads at once instead of being spelled out.
	   clip-path doesn't touch layout, so the row holds its space the whole
	   time and nothing under it moves while the circle grows. Each board's
	   circle starts a beat after the one before it, so four answers land as a
	   sequence rather than a flash. */
	@keyframes answer-open {
		from {
			clip-path: circle(0px at var(--word-center) 50%);
		}
		to {
			clip-path: circle(var(--word-radius) at var(--word-center) 50%);
		}
	}
	.row.answer-row,
	.row.just-solved {
		/* The row is as wide as the board, but the word in it is only as wide
		   as its tiles, which stop growing at --tile-size — so the middle of
		   the row isn't the middle of the word, and a circle centred on the
		   row would open off to one side of it. Each min() below says the
		   same thing twice: first for a row the tiles have filled (a narrow
		   board, where the word is the row), then for one they haven't (a
		   wide board, where the word is --tiles capped tiles and the gaps
		   between them).

		   The radius has to reach the corners of a row of squares, which is
		   a little over half the word's width — 0.55 covers it from three
		   letters up. Written as a percentage it's 75%: percentages in a
		   radius mean sqrt((w² + h²) / 2) of the box, not its width.
		   A tile's cap is on its content box, so a full-width tile is that
		   plus its two borders. */
		--word-width: calc(
			var(--tiles) * (var(--tile-size) + 2 * var(--tile-border)) +
			(var(--tiles) - 1) * 0.3rem
		);
		--word-center: min(50%, calc(var(--word-width) / 2));
		--word-radius: min(75%, calc(var(--word-width) * 0.55));
		animation: answer-open 1000ms cubic-bezier(0.4, 0, 0.2, 1)
			calc(var(--row-index, 0) * 130ms) both;
	}
	@media (prefers-reduced-motion: reduce) {
		.row.answer-row,
		.row.just-solved {
			animation: none;
		}
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
		border-radius: 9px;
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
		background: var(--accent);
		color: white;
	}
	button.enter:hover {
		background: var(--accent-hover);
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
	/* Phone: the website's game page lets the whole page scroll instead of
	   handing this widget the viewport's height (see .board-card in
	   g/[id]/+page.svelte), so board and keyboard have to earn their space
	   — at full size the two together were taller than a phone screen on
	   their own, which is what made a second, inner scroller necessary in
	   the first place. Smaller tiles, tighter gaps, shorter keys: the same
	   layout, roughly a third less tall, and the page scrolls as one. */
	@media (max-width: 480px) {
		.game-name {
			font-size: 1.1rem;
			margin-bottom: 0.35rem;
		}
		.header {
			margin-bottom: 0.6rem;
		}
		.boards {
			margin-bottom: 0.6rem;
		}
		.keyboard {
			gap: 0.35rem;
			padding: 0.4rem 0 0.4rem;
			/* Pinned to the bottom edge of the screen for as long as any part of
			   the puzzle is on screen. Sticky rather than fixed on purpose: it
			   keeps its place in the flow, so nothing is ever hidden underneath
			   it, and it doesn't sit on top of whatever else the page has below
			   the game. This is why the board scrolls with the page instead of
			   inside its own pane — the keyboard staying put was the thing that
			   layout was for, and it has to hold now that the page owns the
			   scroll. */
			position: sticky;
			bottom: 0;
			z-index: 2;
		}
		.krow {
			gap: 0.25rem;
		}
		button {
			padding: 0.85rem 0.2rem;
			font-size: 1rem;
		}
	}
	/* Dark, in the two ways a widget can be asked for it. The website sets
	   `theme` from the reader's own choice (see ThemeToggle), which has to
	   win even when it disagrees with the device — that's the attribute
	   rule. An embed on someone else's site sets nothing, and follows the
	   device — that's the media query, which steps aside the moment a host
	   asks for light outright. */
	@media (prefers-color-scheme: dark) {
		:host(:not([theme='light'])) .quordle {
			--accent: #5fb4dd;
			--accent-hover: #7cc4e6;
			--hit: #3f8a6c;
			--present: #a8802f;
			--miss: #4a4553;
			--ink: #f0ece5;
			--ink-muted: #a49eae;
			--line: #322d3a;
			--key-bg: #322d3a;
			--key-bg-hover: #3f3949;
			--bg: #201d26;
		}
	}
	:host([theme='dark']) .quordle {
		--accent: #5fb4dd;
		--accent-hover: #7cc4e6;
		--hit: #3f8a6c;
		--present: #a8802f;
		--miss: #4a4553;
		--ink: #f0ece5;
		--ink-muted: #a49eae;
		--line: #322d3a;
		--key-bg: #322d3a;
		--key-bg-hover: #3f3949;
		--bg: #201d26;
	}
</style>

<svelte:options customElement="pzzlr-quordle" />

<script lang="ts">
	import type { LetterResult } from './types';
	import { createKeyboardHandlers } from './keyboard';
	import Keyboard from './Keyboard.svelte';
	import Palette from './Palette.svelte';
	import BoardStyles from './BoardStyles.svelte';
	import { authHeaders } from './http';
	import { bestLetterStatus } from './scoring';
	import { createShareCopy } from './share';
	import { scrollIntoViewWithin } from './scroll';

	let {
		apibase = '',
		game = '',
		date = '',
		apikey = '',
		revealed = ''
	} = $props<{
		apibase?: string;
		/** Id of a stored game config (mode: "quordle"). See Ladder.svelte for why this is required. */
		game: string;
		/** Override the daily puzzle's date (YYYY-MM-DD); mainly for testing. */
		date?: string;
		/** Comma-separated answer for a day that's over, drawn on the board rather than played for — set by the website's archive (see /g/[id]/archive). */
		revealed?: string;
		/** Required for a private game — see the embed key on the game's edit page (/g/[id]/edit). */
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
			boardResults = resumed?.boardResults ?? Array.from({ length: boardCount }, () => []);
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
			status = resumed?.solved || guesses.length >= maxGuesses ? 'finished' : 'playing';
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
					row
						.map(({ status: s }) => (s === 'correct' ? '🟩' : s === 'present' ? '🟨' : '⬛'))
						.join('')
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
	// 2-row floor) via a plain CSS media query on .mini-rows below, since
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
	// independently (see .mini-rows), so these are per board — index i is the
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

<Palette />
<BoardStyles />

<div
	class="quordle"
	style="--tile-max: {tileSize}rem; --visible-rows: {rowsVisible}; --board-min-width: {boardMinWidth}rem;"
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

			<!-- --tiles is the word's length, which the reveal circle's geometry
			     is written in terms of (see .sweep in BoardStyles.svelte); it's
			     inherited by every row here. -->
			<div class="boards" style="--tiles: {wordLength}">
				{#each Array.from({ length: boardCount }) as _, i (i)}
					<div class="mini" class:solved={boardSolvedAt[i] !== null}>
						<div class="mini-rows" bind:this={boardRowsEls[i]}>
							{#each Array.from({ length: maxGuesses }) as _, rowIndex (rowIndex)}
								{@const opening = solvedLive[i] && boardSolvedAt[i] === rowIndex + 1}
								{#if boardSolvedAt[i] !== null && rowIndex >= boardSolvedAt[i]}
									<!-- board is done — no further rows -->
								{:else if rowIndex < boardResults[i].length}
									<!-- The guess that finished this board is its answer, found
									     rather than given — so it opens the way a revealed one
									     does. -->
									<div class="row" class:opening bind:this={rowEls[i][rowIndex]}>
										{#each boardResults[i][rowIndex] as { letter, status: s }, li (li)}
											<div class="tile filled {s}">{letter.toUpperCase()}</div>
										{/each}
										{#if opening}<span class="sweep" aria-hidden="true"></span>{/if}
									</div>
								{:else if rowIndex === boardResults[i].length && revealedWords[i]}
									<!-- The day's answer for this board, in the row a guess
									     would have gone in and scored the way a solving guess
									     scores. -->
									<div class="row opening" bind:this={rowEls[i][rowIndex]}>
										{#each Array.from({ length: wordLength }) as _, li (li)}
											<div class="tile filled correct">
												{revealedWords[i][li]?.toUpperCase() ?? ''}
											</div>
										{/each}
										<!-- Each board opens a beat after the one before it, so
										     four answers land as a sequence, not a flash. -->
										<span class="sweep" style="--delay: {i * 130}ms" aria-hidden="true"></span>
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
							<p class="mini-status solved">guess {boardSolvedAt[i]}</p>
						{:else if status === 'finished' && revealedTargets[i]}
							<p class="mini-status lost">{revealedTargets[i].toUpperCase()}</p>
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
			<Keyboard {keyStatus} onLetter={typeLetter} onEnter={submitGuess} onBackspace={backspace} />
		{/if}
	{/if}
</div>

<style>
	/* Custom elements default to display:inline, which can't resolve a
	   percentage width — without this, .quordle's width:100% below has
	   nothing concrete to size against. */
	:host {
		/* The only colours this game picks for itself; Palette.svelte builds
		   the rest of both themes around them. Quordle wears the violet the
		   ladder used to, having swapped with it when the ladder went blue
		   and the two turned into one colour in a listing — see the mode
		   hues in the website's app.css, which these have to match. */
		--accent-light: #6257d2;
		--accent-hover-light: #5348c4;
		--accent-dark: #9a91f0;
		--accent-hover-dark: #ada6f4;
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
		/* Four boards across means tiles a good deal smaller than a single
		   board's, so this game sets its own row geometry: --tile-max comes
		   from tileRem() on the element itself, and the rest scales with it. */
		--row-gap: 0.3rem;
		--tile-radius: 6px;
		--tile-font: calc(var(--tile-max) * 0.42);
		/* The keyboard is held to the 40rem the other three games' roots stop
		   at, so it is the same size as theirs even though this root is wider.
		   A page can narrow it further with --pzzlr-keyboard-max; the Pzzlr
		   site does, to match the keyboards in its single-board cards. */
		--keyboard-max: var(--pzzlr-keyboard-max, 40rem);
		/* A page can set --pzzlr-font to put the board in its own typeface; the
		   Pzzlr site does, for Inter. Anywhere else it's the system font. */
		font-family: var(--pzzlr-font, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
		width: 100%;
		max-width: 64rem;
		box-sizing: border-box;
		color: var(--ink);
		background: var(--bg);
		display: flex;
		flex-direction: column;
		/* Fills the host: a definite height given by an embed, or the one
		   the website's phone layout stretches it to (see .board-card in
		   g/[id]/+page.svelte). Then .scroll-area below and the keyboard
		   split that height and the keyboard sits on the bottom edge. With no
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
	.mini {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 0;
	}
	.mini-rows {
		display: flex;
		flex-direction: column;
		gap: var(--row-gap);
		overflow-y: auto;
		/* Shows exactly --visible-rows rows before scrolling the rest — see
		   the visibleRows()/tileRem() comment above for the reasoning. */
		max-height: calc(
			var(--visible-rows) * (var(--tile-max) + 2 * var(--tile-border) + var(--row-gap)) -
				var(--row-gap)
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
		.mini-rows {
			max-height: clamp(
				calc(2 * (var(--tile-max) + 2 * var(--tile-border) + var(--row-gap)) - var(--row-gap)),
				20dvh,
				calc(
					var(--visible-rows) * (var(--tile-max) + 2 * var(--tile-border) + var(--row-gap)) -
						var(--row-gap)
				)
			);
		}
	}
	.mini-status {
		margin: 0;
		font-size: 0.7rem;
		text-align: center;
		color: var(--ink-muted);
	}
	.mini-status.solved {
		color: var(--hit-text);
		font-weight: 700;
	}
	.mini-status.lost {
		color: var(--ink-muted);
		font-weight: 700;
		letter-spacing: 0.03em;
	}
	.won {
		color: var(--hit-text);
		font-weight: 700;
	}
	.lost {
		color: var(--ink-muted);
		font-weight: 700;
	}
	.message {
		color: var(--danger);
		font-size: 0.85rem;
	}
	/* Phone: headings shrink along with the boards and keyboard, which give up
	   their own height through the rule above, Palette.svelte and
	   Keyboard.svelte. */
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
	}
</style>

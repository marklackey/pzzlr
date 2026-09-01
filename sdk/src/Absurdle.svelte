<svelte:options customElement="pzzlr-absurdle" />

<script lang="ts">
	import type { LetterResult } from './types';
	import { KEYBOARD_ROWS, createKeyboardHandlers } from './keyboard';
	import { authHeaders } from './http';
	import { bestLetterStatus } from './scoring';
	import { createShareCopy } from './share';
	import { scrollIntoViewWithin } from './scroll';

	let { apibase = '', game = '', apikey = '' } = $props<{
		apibase?: string;
		/** Id of a stored game config (mode: "absurdle"). See Ladder.svelte for why this is required. */
		game: string;
		/** Required for a private game — see the game's "Manage this game" panel. */
		apikey?: string;
	}>();

	type Status = 'loading' | 'playing' | 'won' | 'error';

	let status = $state<Status>('loading');
	let wordLength = $state(5);
	let totalWords = $state(0);
	let remaining = $state(0);
	let gameName = $state<string | null>(null);
	// The board's history, restored from the run the server holds (see the
	// start route's `resumed`), so a reload picks the run back up. Alongside
	// it, candidateToken is the opaque "what's still possible" set the
	// server hands back after each guess and this widget echoes on the next
	// one — the narrowing is the mechanic, and carrying it saves replaying
	// every guess to score the next.
	let guesses = $state<string[]>([]);
	let results = $state<LetterResult[][]>([]);
	let candidateToken = $state<string | null>(null);
	let currentGuess = $state('');
	let message = $state('');

	// Per-(browser, game) attempt token, the same one every other mode uses
	// — the widget plays anonymously on embed pages, so there's no account
	// to hang a run off. Persisted so a reload resumes; falls back to an
	// in-memory id when storage is unavailable (private browsing).
	function attemptToken(): string {
		const key = `pzzlr-absurdle-token:${game}`;
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

	async function loadStart() {
		if (!game) {
			message = 'missing required "game" attribute (a stored game config id)';
			status = 'error';
			return;
		}

		status = 'loading';
		message = '';
		try {
			const res = await fetch(`${apibase}/api/games/${game}/absurdle/start?token=${token}`, {
				headers: authHeaders(apikey)
			});
			if (!res.ok) throw new Error(`puzzle request failed: ${res.status}`);
			const data = await res.json();

			wordLength = data.length;
			totalWords = data.totalWords;
			gameName = data.name ?? null;
			const resumed = data.resumed as {
				guesses: string[];
				results: LetterResult[][];
				remaining: number;
				won: boolean;
				candidates: string;
			} | null;
			guesses = resumed?.guesses ?? [];
			results = resumed?.results ?? [];
			remaining = resumed?.remaining ?? data.totalWords;
			candidateToken = resumed?.candidates ?? null;
			currentGuess = '';
			status = resumed?.won ? 'won' : 'playing';
		} catch (err) {
			message = err instanceof Error ? err.message : 'failed to load puzzle';
			status = 'error';
		}
	}

	async function submitGuess() {
		if (status !== 'playing' || currentGuess.length !== wordLength) return;

		const guess = currentGuess;
		const res = await fetch(`${apibase}/api/games/${game}/absurdle/guess`, {
			method: 'POST',
			headers: { 'content-type': 'application/json', ...authHeaders(apikey) },
			body: JSON.stringify({ guess, token, candidates: candidateToken })
		});
		const result = await res.json();

		if (!result.isWord) {
			message = `"${guess}" isn't a word in this dictionary`;
			currentGuess = '';
			return;
		}

		message = '';
		guesses = [...guesses, guess];
		results = [...results, result.result];
		remaining = result.remaining;
		candidateToken = result.candidates ?? null;
		currentGuess = '';

		if (result.won) status = 'won';
	}

	const { typeLetter, backspace, handleKeydown } = createKeyboardHandlers({
		isActive: () => status === 'playing',
		currentGuess: () => currentGuess,
		setCurrentGuess: (value) => (currentGuess = value),
		maxLength: () => wordLength,
		submit: submitGuess
	});

	function keyStatus(letter: string) {
		return bestLetterStatus(results, letter);
	}

	function shareText(): string {
		const header = `Absurdle — cornered in ${guesses.length} guess${guesses.length === 1 ? '' : 'es'}`;
		const lines = results.map((row) =>
			row.map(({ status: s }) => (s === 'correct' ? '🟩' : s === 'present' ? '🟨' : '⬛')).join('')
		);
		return [header, ...lines].join('\n');
	}

	let copied = $state(false);
	const copyShare = createShareCopy(shareText, (value) => (copied = value));

	// Absurdle has no guess cap, so the board can't pad to a fixed maxGuesses
	// the way wordle/quordle do. Padding to this minimum instead means the
	// keyboard sits at a stable position for a normal-length game and only
	// starts shifting down once a game actually runs long — better than
	// starting at exactly one row and nudging the keyboard down after every
	// single guess from the first one.
	const MIN_VISIBLE_ROWS = 6;
	const totalRows = $derived(
		status === 'playing' ? Math.max(MIN_VISIBLE_ROWS, results.length + 1) : results.length
	);

	// Refs for keeping the row you're typing into on screen: absurdle has no
	// guess cap, so the board outgrows its space in any long game. The effect below reruns off `results` and so always sees refs the DOM
	// has already updated.
	let scrollArea = $state<HTMLElement | undefined>(undefined);
	let boardEl = $state<HTMLElement | undefined>(undefined);
	const rowEls: HTMLElement[] = [];

	$effect(() => {
		// The row being typed into — one past the last scored guess.
		const activeRow = Math.min(results.length, totalRows - 1);
		// Which of the two actually scrolls depends on the breakpoint (the
		// board off phones, the whole area on one — see the CSS), and asking a
		// non-scrolling element to scroll is a no-op, so just ask both rather
		// than duplicating that media query in JS.
		scrollIntoViewWithin(boardEl, rowEls[activeRow]);
		scrollIntoViewWithin(scrollArea, rowEls[activeRow]);
	});

	loadStart();
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="absurdle">
	{#if status === 'loading'}
		<p>Loading…</p>
	{:else if status === 'error'}
		<p class="message">{message}</p>
	{:else}
		<div class="scroll-area" bind:this={scrollArea}>
			{#if gameName}
				<h2 class="game-name">{gameName}</h2>
			{/if}
			<div class="header">
				<span class="remaining"
					>{remaining.toLocaleString()} of {totalWords.toLocaleString()} words possible</span
				>
			</div>

			<div class="board" bind:this={boardEl}>
				{#each Array.from({ length: totalRows }) as _, rowIndex (rowIndex)}
					{#if rowIndex < results.length}
						<div class="row" bind:this={rowEls[rowIndex]}>
							{#each results[rowIndex] as { letter, status: s }, i (i)}
								<div class="tile filled {s}">{letter.toUpperCase()}</div>
							{/each}
						</div>
					{:else if rowIndex === results.length && status === 'playing'}
						<div class="row" bind:this={rowEls[rowIndex]}>
							{#each Array.from({ length: wordLength }) as _, i (i)}
								<div class="tile input">{currentGuess[i]?.toUpperCase() ?? ''}</div>
							{/each}
						</div>
					{:else}
						<div class="row" bind:this={rowEls[rowIndex]}>
							{#each Array.from({ length: wordLength }) as _, i (i)}
								<div class="tile"></div>
							{/each}
						</div>
					{/if}
				{/each}
			</div>

			{#if status === 'won'}
				<p class="won">Cornered it in {guesses.length} guess{guesses.length === 1 ? '' : 'es'}!</p>
				<div class="end-actions">
					<button type="button" class="copy" onclick={copyShare}>
						{copied ? 'Copied!' : 'Copy result'}
					</button>
					<button type="button" class="again" onclick={loadStart}>Play again</button>
				</div>
			{:else if message}
				<p class="message">{message}</p>
			{/if}
		</div>

		{#if status !== 'won'}
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
	   percentage width — without this, .absurdle's width:100% below has
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
	.absurdle {
		--accent: #a8543f;
		--accent-hover: #8e4635;
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
		--tile-max: 3.4rem;
		--row-gap: 0.4rem;
		--visible-rows: 6;
		font-family:
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			Roboto,
			sans-serif;
		width: 100%;
		max-width: 40rem;
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
	.remaining {
		font-weight: 700;
		color: var(--ink);
	}
	.board {
		display: flex;
		flex-direction: column;
		gap: var(--row-gap);
		margin-bottom: 1rem;
	}
	/* Off the phone layout there's no host-given height to divide up, so the
	   board would otherwise grow with every guess and push the keyboard down
	   with it. Pinning it to exactly --visible-rows rows keeps the keyboard
	   put from first paint and scrolls anything past that. The arithmetic is
	   the rows themselves — tile, its two borders, and the gaps between — so
	   it doesn't depend on whatever the heading above happens to measure. */
	@media (min-width: 481px) {
		.board {
			height: calc(
				var(--visible-rows) * (var(--tile-max) + 2 * var(--tile-border) + var(--row-gap)) -
					var(--row-gap)
			);
			overflow-y: auto;
		}
	}
	.row {
		display: flex;
		gap: var(--row-gap);
		width: 100%;
	}
	.tile {
		flex: 1 1 0;
		max-width: var(--tile-max);
		min-width: 0;
		aspect-ratio: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		border: var(--tile-border) solid var(--line);
		border-radius: 9px;
		font-weight: 700;
		font-size: 1.15rem;
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
	.end-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	button.copy {
		background: var(--hit);
		color: white;
	}
	button.again {
		background: var(--key-bg);
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
		.absurdle {
			--tile-max: 2.8rem;
			--row-gap: 0.3rem;
		}
		.game-name {
			font-size: 1.1rem;
			margin-bottom: 0.35rem;
		}
		.header {
			margin-bottom: 0.6rem;
		}
		.board {
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
</style>

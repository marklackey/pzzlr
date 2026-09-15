<svelte:options customElement="pzzlr-absurdle" />

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
		apikey = ''
	} = $props<{
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
	// Whether the win happened on this board, under this player's hands, as
	// opposed to arriving already won from a resumed attempt. Only a win they
	// watched land is worth animating; replaying the flourish on every reload
	// of a finished board would be a flourish about nothing.
	let solvedLive = $state(false);
	let candidateToken = $state<string | null>(null);
	let currentGuess = $state('');
	let message = $state('');

	// Per-(browser, game) attempt token, the same one every other mode uses
	// — the widget plays anonymously on embed pages, so there's no account
	// to hang a run off. Persisted so a reload resumes; falls back to an
	// in-memory id when storage is unavailable (private browsing).
	const tokenKey = `pzzlr-absurdle-token:${game}`;

	function attemptToken(): string {
		try {
			const stored = localStorage.getItem(tokenKey);
			if (stored) return stored;
		} catch {
			return crypto.randomUUID();
		}
		return freshToken();
	}

	// A run is the attempt the server keeps for (game, day, token), so the
	// only thing that makes a *new* run is a new token — the start route
	// hands back whatever that key already holds, finished or not, which is
	// what "Play again" used to walk straight back into.
	function freshToken(): string {
		const token = crypto.randomUUID();
		try {
			localStorage.setItem(tokenKey, token);
		} catch {
			// Private browsing: this run lives in memory and won't survive a
			// reload, same as the fallback above.
		}
		return token;
	}

	let token = $state(attemptToken());

	function playAgain() {
		token = freshToken();
		loadStart();
	}

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
			solvedLive = false;
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

		if (result.won) {
			status = 'won';
			solvedLive = true;
		}
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

<Palette />
<BoardStyles />

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

			<!-- --tiles is the word's length, which the reveal circle's geometry
			     is written in terms of (see .sweep in BoardStyles.svelte); it's
			     inherited by every row here. -->
			<div class="board" style="--tiles: {wordLength}" bind:this={boardEl}>
				{#each Array.from({ length: totalRows }) as _, rowIndex (rowIndex)}
					{@const opening = solvedLive && status === 'won' && rowIndex === results.length - 1}
					{#if rowIndex < results.length}
						<!-- The guess that corners the word is the answer, hunted down
						     rather than given — so it opens as a circle rather than
						     just appearing. -->
						<div class="row" class:opening bind:this={rowEls[rowIndex]}>
							{#each results[rowIndex] as { letter, status: s }, i (i)}
								<div class="tile filled {s}">{letter.toUpperCase()}</div>
							{/each}
							{#if opening}<span class="sweep" aria-hidden="true"></span>{/if}
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
					<button type="button" class="again" onclick={playAgain}>Play again</button>
				</div>
			{:else if message}
				<p class="message">{message}</p>
			{/if}
		</div>

		{#if status !== 'won'}
			<Keyboard {keyStatus} onLetter={typeLetter} onEnter={submitGuess} onBackspace={backspace} />
		{/if}
	{/if}
</div>

<style>
	/* Custom elements default to display:inline, which can't resolve a
	   percentage width — without this, .absurdle's width:100% below has
	   nothing concrete to size against. */
	:host {
		/* The only colours this game picks for itself; Palette.svelte builds
		   the rest of both themes around them. */
		--accent-light: #8c4d9e;
		--accent-hover-light: #764084;
		--accent-dark: #c48fd6;
		--accent-hover-dark: #d1a5df;
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
		/* A page can set --pzzlr-font to put the board in its own typeface; the
		   Pzzlr site does, for Inter. Anywhere else it's the system font. */
		font-family: var(--pzzlr-font, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
		width: 100%;
		max-width: 40rem;
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
	.remaining {
		font-weight: 700;
		color: var(--ink);
	}
	.won {
		color: var(--hit-text);
		font-weight: 700;
	}
	.end-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.message {
		color: var(--danger);
		font-size: 0.85rem;
	}
	/* Phone: headings shrink along with the board and keyboard, which give up
	   their own height through Palette.svelte and Keyboard.svelte. */
	@media (max-width: 480px) {
		.game-name {
			font-size: 1.1rem;
			margin-bottom: 0.35rem;
		}
		.header {
			margin-bottom: 0.6rem;
		}
	}
</style>

<svelte:options customElement="pzzlr-wordle" />

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
		/** Id of a stored game config (mode: "wordle"). See Ladder.svelte for why this is required. */
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

	type Status = 'loading' | 'playing' | 'won' | 'lost' | 'error';

	let status = $state<Status>('loading');
	let wordLength = $state(5);
	let maxGuesses = $state(6);
	let puzzleNumber = $state<number | null>(null);
	/**
	 * Which day's puzzle this board is (YYYY-MM-DD), fixed when it loaded.
	 * Every guess and reveal is sent against this day rather than whatever
	 * "today" has since become, so a board that was open when the puzzle
	 * rolled over (US Eastern midnight — mid-evening in the west) plays out
	 * as the puzzle the player started, instead of being scored against
	 * tomorrow's secret. A reload is what moves them on.
	 */
	let puzzleDay = $state<string | null>(null);
	let gameName = $state<string | null>(null);
	let guesses = $state<LetterResult[][]>([]);
	let currentGuess = $state('');
	let message = $state('');
	let revealedTarget = $state('');
	// Whether the win happened on this board, under this player's hands, as
	// opposed to arriving already won from a resumed attempt. Only a win they
	// watched land is worth animating; replaying the flourish on every reload
	// of a finished board would be a flourish about nothing.
	let solvedLive = $state(false);
	/**
	 * What the game says about hard mode: 'required', 'forbidden', or
	 * 'optional' — the last meaning this board gets to choose. Defaults to
	 * 'forbidden' so a widget talking to a server that doesn't send this
	 * simply shows nothing.
	 */
	let hardModePolicy = $state<'forbidden' | 'optional' | 'required'>('forbidden');
	/** Whether this board is playing under hard mode — the game's answer, or on an optional game this player's. */
	let hardMode = $state(false);
	/**
	 * Whether a guess has already been sent for this board. Tracked because
	 * the server settles hard mode when it creates the attempt, which a
	 * rejected word does just as much as a real one — so the choice closes
	 * on the first guess sent, not the first one scored.
	 */
	let boardStarted = $state(false);
	/** Whether the hard-mode choice is still this player's to make. See hardModeFor server-side. */
	const hardModeOpen = $derived(hardModePolicy === 'optional' && !boardStarted);

	// Server-side scoring/reveal is keyed off this per-(browser, game)
	// attempt token rather than a login — the widget is played anonymously
	// on embed pages, so there's no account to hang it off. Persisted in
	// localStorage so a reload resumes the same attempt instead of forking
	// a new one; falls back to an in-memory token (still lets the current
	// page load play normally) if storage is unavailable, e.g. private
	// browsing with storage blocked.
	function attemptToken(): string {
		const key = `pzzlr-wordle-token:${game}`;
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

	/** Loads `day`'s puzzle, defaulting to the `date` override, or to today when there's neither. */
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
			const res = await fetch(`${apibase}/api/games/${game}/wordle/daily?${params}`, {
				headers: authHeaders(apikey)
			});
			if (!res.ok) throw new Error(`puzzle request failed: ${res.status}`);
			const data = await res.json();

			wordLength = data.length;
			maxGuesses = data.maxGuesses;
			puzzleNumber = data.puzzleNumber ?? null;
			puzzleDay = data.date ?? null;
			gameName = data.name ?? null;
			currentGuess = '';
			revealedTarget = '';
			solvedLive = false;

			hardModePolicy = data.hardMode ?? 'forbidden';
			const resumed = data.resumed as {
				guesses: LetterResult[][];
				solved: boolean;
				hardMode?: boolean;
			} | null;
			// An attempt already under way has settled this; a fresh board
			// takes the game's answer, which on an optional game is "off until
			// you say otherwise".
			boardStarted = resumed !== null;
			hardMode = resumed ? (resumed.hardMode ?? false) : hardModePolicy === 'required';
			guesses = resumed?.guesses ?? [];
			if (resumed?.solved) {
				status = 'won';
			} else if (guesses.length >= maxGuesses) {
				status = 'lost';
				await reveal();
			} else {
				status = 'playing';
			}
		} catch (err) {
			message = err instanceof Error ? err.message : 'failed to load puzzle';
			status = 'error';
		}
	}

	async function reveal() {
		try {
			const params = new URLSearchParams({ token });
			// This board's day, not today's — the secret to show is the one it
			// was played against. See puzzleDay.
			const day = puzzleDay ?? (date || undefined);
			if (day) params.set('date', day);
			const res = await fetch(`${apibase}/api/games/${game}/wordle/reveal?${params}`, {
				headers: authHeaders(apikey)
			});
			if (res.ok) revealedTarget = (await res.json()).target;
		} catch {
			// Best-effort — losing without a reveal is still a valid end state.
		}
	}

	async function submitGuess() {
		if (status !== 'playing' || currentGuess.length !== wordLength) return;

		const guess = currentGuess;
		const res = await fetch(`${apibase}/api/games/${game}/wordle/guess`, {
			method: 'POST',
			headers: { 'content-type': 'application/json', ...authHeaders(apikey) },
			// The day is this board's own (see puzzleDay), not today's — the
			// guess is scored against the puzzle being played. `rows` goes
			// along purely so the server can refuse a guess from a board that
			// isn't this attempt's any more; it never places one. See
			// boardIsCurrent server-side.
			body: JSON.stringify({
				guess,
				token,
				rows: guesses.length,
				// Only read by the server if this guess is the one that starts
				// the attempt; from then on the attempt's own answer governs,
				// which is what the lock below mirrors.
				hard: hardMode,
				date: puzzleDay ?? (date || undefined)
			})
		});
		boardStarted = true;

		if (res.status === 409) {
			// Our local state disagrees with the server's about this attempt —
			// it finished in another tab, or another tab has made guesses this
			// board hasn't seen. Resync from the source of truth instead of
			// pressing on with a stale board, staying on the same day: this is
			// the puzzle being played, not necessarily today's.
			await loadPuzzle(puzzleDay ?? undefined);
			return;
		}
		const result = await res.json();

		if (!result.isWord) {
			message = `"${guess}" isn't a word in this dictionary`;
			currentGuess = '';
			return;
		}

		// A hard-mode rejection costs no guess, so the row stays open and the
		// server explains which hint the guess ignored.
		if (result.hardModeViolation) {
			message = result.hardModeViolation;
			currentGuess = '';
			return;
		}

		message = '';
		guesses = [...guesses, result.result];
		currentGuess = '';

		if (result.won) {
			status = 'won';
			solvedLive = true;
		} else if (guesses.length >= maxGuesses) {
			status = 'lost';
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

	// A <details> closes only when its own summary is clicked, so dismissing
	// it any other way is on us. composedPath() is what reaches into this
	// widget: by the time a click gets to the document its target has been
	// retargeted to the host element, so `contains` would say no to a click
	// on the panel itself.
	let hardModeHelp: HTMLDetailsElement | undefined = $state();
	function handleDocumentClick(e: MouseEvent) {
		if (!hardModeHelp?.open) return;
		if (e.composedPath().includes(hardModeHelp)) return;
		hardModeHelp.open = false;
	}
	function handleDocumentKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && hardModeHelp?.open) hardModeHelp.open = false;
	}

	function keyStatus(letter: string) {
		return bestLetterStatus(guesses, letter);
	}

	function guessesUsedLabel(): string {
		return status === 'won' ? String(guesses.length) : 'X';
	}

	function shareText(): string {
		const lines = guesses.map((row) =>
			row.map(({ status: s }) => (s === 'correct' ? '🟩' : s === 'present' ? '🟨' : '⬛')).join('')
		);
		const header = puzzleNumber
			? `Wordle #${puzzleNumber} — ${guessesUsedLabel()}/${maxGuesses}`
			: `Wordle — ${guessesUsedLabel()}/${maxGuesses}`;
		return [header, ...lines].join('\n');
	}

	let copied = $state(false);
	const copyShare = createShareCopy(shareText, (value) => (copied = value));

	// Refs for keeping the row you're typing into on screen: once the board is
	// taller than the space it has (a phone, or a game with more guesses than
	// the desktop board reserves room for), a new guess would otherwise land
	// below the fold. The effect below reruns off
	// `guesses` and so always sees refs the DOM has already updated.
	let scrollArea = $state<HTMLElement | undefined>(undefined);
	let boardEl = $state<HTMLElement | undefined>(undefined);
	const rowEls: HTMLElement[] = [];

	$effect(() => {
		// The row being typed into, or the last one once they're all used up.
		const activeRow = Math.min(guesses.length, maxGuesses - 1);
		// Which of the two actually scrolls depends on the breakpoint (the
		// board off phones, the whole area on one — see the CSS), and asking a
		// non-scrolling element to scroll is a no-op, so just ask both rather
		// than duplicating that media query in JS.
		scrollIntoViewWithin(boardEl, rowEls[activeRow]);
		scrollIntoViewWithin(scrollArea, rowEls[activeRow]);
	});

	loadPuzzle();
</script>

<svelte:window onkeydown={handleKeydown} />
<svelte:document onclick={handleDocumentClick} onkeydown={handleDocumentKeydown} />

<Palette />
<BoardStyles />

<div class="wordle">
	{#if status === 'loading'}
		<p>Loading puzzle…</p>
	{:else if status === 'error'}
		<p class="message">{message}</p>
	{:else}
		<div class="scroll-area" bind:this={scrollArea}>
			{#if gameName}
				<h2 class="game-name">{gameName}</h2>
			{/if}
			{#if puzzleNumber}
				<div class="header">
					<span class="puzzle-number">#{puzzleNumber}</span>
				</div>
			{/if}

			{#if hardModeOpen || hardMode}
				<div class="hard-mode" class:on={!hardModeOpen}>
					{#if hardModeOpen}
						<label>
							<input type="checkbox" bind:checked={hardMode} />
							Hard mode
						</label>
					{:else}
						<span>Hard mode</span>
					{/if}
					<!-- The rule is two sentences long, and most players already
					     know it — so it sits behind a mark rather than in a line
					     of small print above every board. -->
					<details class="explainer" bind:this={hardModeHelp}>
						<summary aria-label="What is hard mode?">?</summary>
						<div class="explainer-body">
							Every hint has to be reused: a green letter stays where it is, and a yellow one has to
							turn up somewhere in each later guess.
							{#if hardModeOpen}
								Your choice locks in as soon as you guess.
							{/if}
						</div>
					</details>
				</div>
			{/if}

			<!-- --tiles is the word's length, which the reveal circle's geometry
			     is written in terms of (see .sweep in BoardStyles.svelte); it's
			     inherited by every row here. -->
			<div
				class="board"
				class:revealed={revealedWords.length > 0}
				style="--tiles: {wordLength}"
				bind:this={boardEl}
			>
				{#each Array.from({ length: maxGuesses }) as _, rowIndex (rowIndex)}
					{@const opening = solvedLive && status === 'won' && rowIndex === guesses.length - 1}
					<!-- The winning guess is the answer, arrived at rather than
					     given — so it opens the same way a revealed one does. -->
					<div class="row" class:opening bind:this={rowEls[rowIndex]}>
						{#if rowIndex < guesses.length}
							{#each guesses[rowIndex] as { letter, status: s }, i (i)}
								<div class="tile filled {s}">{letter.toUpperCase()}</div>
							{/each}
						{:else if rowIndex === guesses.length && status === 'playing' && revealedWords.length === 0}
							{#each Array.from({ length: wordLength }) as _, i (i)}
								<div class="tile input">{currentGuess[i]?.toUpperCase() ?? ''}</div>
							{/each}
						{:else}
							{#each Array.from({ length: wordLength }) as _, i (i)}
								<div class="tile"></div>
							{/each}
						{/if}
						{#if opening}<span class="sweep" aria-hidden="true"></span>{/if}
					</div>
				{/each}

				{#if revealedWords.length > 0}
					<div class="answer">
						<span class="answer-label">Answer</span>
						<div class="row opening">
							{#each Array.from({ length: wordLength }) as _, i (i)}
								<!-- Every letter correct — what the board looks like when
								     someone guesses it. -->
								<div class="tile filled correct">{revealedWords[0][i]?.toUpperCase() ?? ''}</div>
							{/each}
							<span class="sweep" aria-hidden="true"></span>
						</div>
					</div>
				{/if}
			</div>

			{#if status === 'won'}
				<p class="won">Solved in {guesses.length}/{maxGuesses} guesses!</p>
				<button type="button" class="copy" onclick={copyShare}>
					{copied ? 'Copied!' : 'Copy result'}
				</button>
			{:else if status === 'lost'}
				<p class="lost">
					Out of guesses{revealedTarget ? ` — it was ${revealedTarget.toUpperCase()}` : ''}.
				</p>
				<button type="button" class="copy" onclick={copyShare}>
					{copied ? 'Copied!' : 'Copy result'}
				</button>
			{:else if message}
				<p class="message">{message}</p>
			{/if}
		</div>

		{#if status === 'playing'}
			<Keyboard {keyStatus} onLetter={typeLetter} onEnter={submitGuess} onBackspace={backspace} />
		{/if}
	{/if}
</div>

<style>
	/* Custom elements default to display:inline, which can't resolve a
	   percentage width — without this, .wordle's width:100% below has
	   nothing concrete to size against. */
	:host {
		/* The only colours this game picks for itself; Palette.svelte builds
		   the rest of both themes around them. */
		--accent-light: #0f7d6b;
		--accent-hover-light: #0c6659;
		--accent-dark: #3fb39c;
		--accent-hover-dark: #58c4af;
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
	.wordle {
		/* Bigger than the shared default: a wordle board is one word wide, so
		   its tiles have room the other games' don't. */
		--tile-font: 1.4rem;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		width: 100%;
		/* Generous but bounded — lets the keyboard genuinely fill a wide
		   host container (see .krow button in Keyboard.svelte) without keys
		   turning absurd on an ultra-wide one. */
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
	/* Reads as a note about the rules rather than a control to hunt for:
	   it matters before the first guess and is just a reminder after. */
	.hard-mode {
		/* The panel below hangs off this row rather than off the mark itself,
		   so it spans the widget's own width and can never be clipped by the
		   scroll area for sticking out the side of a narrow embed. */
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.8rem;
		color: var(--ink-muted);
		margin: -0.5rem 0 0.8rem;
	}
	.hard-mode label {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.hard-mode.on {
		font-weight: 700;
	}
	.explainer {
		display: inline-flex;
		font-weight: normal;
	}
	.explainer summary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.1rem;
		height: 1.1rem;
		border-radius: 50%;
		background: var(--key-bg);
		color: var(--ink);
		font-size: 0.7rem;
		font-weight: 700;
		cursor: pointer;
		list-style: none;
	}
	.explainer summary::-webkit-details-marker {
		display: none;
	}
	.explainer-body {
		position: absolute;
		z-index: 1;
		top: 100%;
		left: 0;
		right: 0;
		margin-top: 0.3rem;
		padding: 0.5rem 0.7rem;
		font-size: 0.8rem;
		font-weight: normal;
		line-height: 1.4;
		text-align: left;
		color: var(--ink-muted);
		background: var(--bg);
		border: 1px solid var(--line);
		border-radius: 0.4rem;
		box-shadow: 0 4px 12px rgb(20 22 28 / 0.14);
	}
	/* The answer to a day that's already over, drawn as the board would have
	   drawn it if somebody had played it. Only the small label above says
	   otherwise — the point is to see the solution the way you'd have seen
	   your own. */
	.answer {
		display: flex;
		flex-direction: column;
		gap: var(--row-gap);
		margin-top: 0.6rem;
	}
	.answer-label {
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--ink-muted);
	}

	@keyframes answer-label-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
	/* Opacity is one of the few properties the browser animates off the main
	   thread, so this costs nothing next to the circle it accompanies. */
	.answer-label {
		animation: answer-label-in 500ms ease-out 340ms both;
	}
	@media (prefers-reduced-motion: reduce) {
		.answer-label {
			animation: none;
		}
	}
	.won {
		color: var(--hit-text);
		font-weight: 700;
	}
	.lost {
		color: var(--ink-muted);
		font-weight: 700;
	}
	button.copy {
		background: var(--hit);
		color: var(--hit-ink);
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
		.hard-mode {
			margin: -0.3rem 0 0.5rem;
		}
	}
</style>

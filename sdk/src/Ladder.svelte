<svelte:options customElement="pzzlr-ladder" />

<script lang="ts">
	import { createKeyboardHandlers } from './keyboard';
	import Keyboard from './Keyboard.svelte';
	import Palette from './Palette.svelte';
	import BoardStyles from './BoardStyles.svelte';
	import { authHeaders } from './http';
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
		/** Id of a stored game config. The only way to load a puzzle — there's
		 * one engine, and every game it serves is identified by config id. */
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

	/**
	 * The revealed ladder, minus the word it starts on.
	 *
	 * The path runs from the puzzle's start word, which is already the top
	 * row of the board, so drawing it again would show the same word twice.
	 * That one word and no other: a given rung belongs in the answer even
	 * though it's also on the board, because the answer is the whole ladder
	 * and reading it shouldn't mean stitching two lists together.
	 *
	 * Measured against the puzzle's own start rather than anything on the
	 * board, because the answer has nothing to do with what anyone guessed
	 * — it's the same ladder whether they played it or not.
	 */
	const answerRows = $derived(revealedWords[0] === start ? revealedWords.slice(1) : revealedWords);

	type Status = 'loading' | 'playing' | 'won' | 'error';

	let status = $state<Status>('loading');
	let start = $state('');
	let end = $state('');
	let puzzleLength = $state(4);
	let minStepsResolved = $state(0);
	let puzzleNumber = $state<number | null>(null);
	/**
	 * Which day's ladder this board is (YYYY-MM-DD), fixed when it loaded.
	 * Every guess is sent against this day rather than whatever "today" has
	 * since become, so a board that was open when the puzzle rolled over
	 * (US Eastern midnight — mid-evening in the west) plays out as the
	 * ladder the player started, instead of having the new day's puzzle
	 * swapped in underneath them. A reload is what moves them on.
	 */
	let puzzleDay = $state<string | null>(null);
	let gameName = $state<string | null>(null);
	let rows = $state<string[]>([]);
	// Whether the win happened on this board, under this player's hands, as
	// opposed to arriving already won from a resumed attempt. Only a win they
	// watched land is worth animating; replaying the flourish on every reload
	// of a finished board would be a flourish about nothing.
	let solvedLive = $state(false);
	/** rows[0..givenCount) came free (start + any revealed rungs), not from a guess. */
	let givenCount = $state(1);
	let currentGuess = $state('');
	let message = $state('');

	// Server-side progress is keyed off this per-(browser, game) attempt
	// token rather than a login — the widget is played anonymously on embed
	// pages, so there's no account to hang it off. Persisted in localStorage
	// so a reload resumes today's ladder instead of starting a new one;
	// falls back to an in-memory token (still playable for this page load)
	// if storage is unavailable, e.g. private browsing with storage blocked.
	function attemptToken(): string {
		const key = `pzzlr-ladder-token:${game}`;
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

	/** Loads `day`'s ladder, defaulting to the `date` override, or to today when there's neither. */
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
			const res = await fetch(`${apibase}/api/games/${game}/daily?${params}`, {
				headers: authHeaders(apikey)
			});
			if (!res.ok) throw new Error(`puzzle request failed: ${res.status}`);
			const data = await res.json();

			const revealedRungs: string[] = data.revealedRungs ?? [];

			start = data.start;
			end = data.target;
			puzzleLength = data.length;
			minStepsResolved = data.minSteps;
			puzzleNumber = data.puzzleNumber ?? null;
			puzzleDay = data.date ?? null;
			gameName = data.name ?? null;
			givenCount = 1 + revealedRungs.length;
			const resumed = data.resumed as { guesses: string[]; solved: boolean } | null;
			solvedLive = false;
			rows = [start, ...revealedRungs, ...(resumed?.guesses ?? [])];
			currentGuess = '';
			status = resumed?.solved ? 'won' : 'playing';
		} catch (err) {
			message = err instanceof Error ? err.message : 'failed to load puzzle';
			status = 'error';
		}
	}

	async function submitGuess() {
		if (status !== 'playing' || currentGuess.length !== puzzleLength) return;

		const current = rows[rows.length - 1];
		const guess = currentGuess;

		const res = await fetch(`${apibase}/api/games/${game}/guess`, {
			method: 'POST',
			headers: { 'content-type': 'application/json', ...authHeaders(apikey) },
			// The day is this board's own (see puzzleDay), not today's — the
			// server takes the step on the ladder being played. `current`
			// goes along as `from` purely so it can refuse a guess aimed at a
			// board it isn't on any more; it never chooses the word being
			// stepped from. See boardIsCurrent server-side.
			body: JSON.stringify({ guess, token, from: current, date: puzzleDay ?? (date || undefined) })
		});

		if (res.status === 409) {
			// Our local state disagrees with the server's about this ladder —
			// it was finished in another tab, or another tab has taken steps
			// this board hasn't seen. Resync from the source of truth rather
			// than pressing on with a stale board, staying on the same day:
			// this is the ladder being played, not necessarily today's.
			await loadPuzzle(puzzleDay ?? undefined);
			return;
		}
		const result = await res.json();

		if (!result.isNeighbor) {
			message = result.isWord
				? `"${guess}" isn't one letter away from "${result.current ?? current}"`
				: `"${guess}" isn't a word in this dictionary`;
			currentGuess = '';
			return;
		}

		message = '';
		rows = [...rows, guess];
		currentGuess = '';
		if (result.solved) {
			status = 'won';
			solvedLive = true;
		}
	}

	const { typeLetter, backspace, handleKeydown } = createKeyboardHandlers({
		isActive: () => status === 'playing' && revealedWords.length === 0,
		currentGuess: () => currentGuess,
		setCurrentGuess: (value) => (currentGuess = value),
		maxLength: () => puzzleLength,
		submit: submitGuess
	});

	function matchesTarget(word: string, pos: number): boolean {
		return word[pos] === end[pos];
	}

	// givenCount (start + any revealed rungs) never counts as a player
	// guess — see the same accounting in the won-state markup below.
	function guessesMade(): number {
		return rows.length - givenCount;
	}

	function bestPossibleRemaining(): number {
		return minStepsResolved - givenCount;
	}

	function shareText(): string {
		const lines = rows
			.slice(1)
			.map((word) =>
				Array.from({ length: puzzleLength }, (_, i) => (matchesTarget(word, i) ? '🟩' : '⬜')).join(
					''
				)
			);
		const header = puzzleNumber
			? `Ladder #${puzzleNumber} — ${guessesMade()}/${bestPossibleRemaining()} guesses`
			: `Ladder — ${guessesMade()}/${bestPossibleRemaining()} guesses`;
		return [header, ...lines].join('\n');
	}

	let copied = $state(false);
	const copyShare = createShareCopy(shareText, (value) => (copied = value));

	// Refs for keeping the live end of the ladder on screen: rows are added
	// one per guess with no cap, so it outgrows its space quickly. The
	// effect below reruns off `rows` and so always sees refs
	// the DOM has already updated.
	let scrollArea = $state<HTMLElement | undefined>(undefined);
	let boardEl = $state<HTMLElement | undefined>(undefined);
	let liveEnd = $state<HTMLElement | undefined>(undefined);

	$effect(() => {
		rows.length;
		// Which of the two actually scrolls depends on the breakpoint (the
		// board off phones, the whole area on one — see the CSS), and asking a
		// non-scrolling element to scroll is a no-op, so just ask both rather
		// than duplicating that media query in JS.
		scrollIntoViewWithin(boardEl, liveEnd);
		scrollIntoViewWithin(scrollArea, liveEnd);
	});

	loadPuzzle();
</script>

<svelte:window onkeydown={handleKeydown} />

<Palette />
<BoardStyles />

<div class="ladder">
	{#if status === 'loading'}
		<p>Loading puzzle…</p>
	{:else if status === 'error'}
		<p class="message">{message}</p>
	{:else}
		<div class="scroll-area" bind:this={scrollArea}>
			{#if gameName}
				<h2 class="game-name">{gameName}</h2>
			{/if}
			<div class="header">
				{#if puzzleNumber}
					<span class="puzzle-number">#{puzzleNumber}: {start.toUpperCase()}</span>
				{/if}
				<span class="target">Spell <strong>{end.toUpperCase()}</strong>!</span>
			</div>

			<!-- --tiles is the word's length, which the reveal circle's geometry
			     is written in terms of (see .sweep in BoardStyles.svelte); it's
			     inherited by every row here. -->
			<div
				class="board"
				class:revealed={revealedWords.length > 0}
				style="--tiles: {puzzleLength}"
				bind:this={boardEl}
			>
				{#each rows as word, rowIndex (rowIndex)}
					{@const opening = solvedLive && status === 'won' && rowIndex === rows.length - 1}
					<!-- The rung that reaches the target is the answer, climbed to
					     rather than handed over — so it opens the way a revealed
					     ladder's last rung does, and it's the one row that fills
					     with colour rather than being outlined in it. -->
					<div class="row" class:opening>
						{#each Array.from({ length: puzzleLength }) as _, i (i)}
							<div
								class="tile"
								class:matched={matchesTarget(word, i)}
								class:given={rowIndex < givenCount}
							>
								{word[i]?.toUpperCase() ?? ''}
							</div>
						{/each}
						{#if rowIndex > 0 && rowIndex < givenCount}
							<span class="given-label">given</span>
						{/if}
						{#if opening}<span class="sweep" aria-hidden="true"></span>{/if}
					</div>
				{/each}

				{#if revealedWords.length > 0}
					{@const answerPath = [start, ...answerRows]}
					<div class="answer">
						<!-- Counted the way the rest of the app counts a ladder: every
						     word from start to target, which is what "minimum steps"
						     on a game means (see the create form). So the number can
						     be one more than the rows drawn below it, since the start
						     is already up there. -->
						<span class="answer-label">Answer · {revealedWords.length} steps</span>
						{#each answerRows as word, wordIndex (wordIndex)}
							<div class="row opening">
								{#each Array.from({ length: puzzleLength }) as _, i (i)}
									<!-- The same tile a played rung uses, matched letters and
									     all: a revealed ladder should look like one somebody
									     climbed, not like a sketch of one. -->
									<div class="tile" class:matched={matchesTarget(word, i)}>
										{word[i]?.toUpperCase() ?? ''}
									</div>
								{/each}
								<!-- Each rung opens a beat after the one above it, so a
								     revealed ladder climbs the way a played one does. -->
								<span class="sweep" style="--delay: {wordIndex * 130}ms" aria-hidden="true"></span>
							</div>
						{/each}
					</div>
				{:else if status === 'playing'}
					<div class="row">
						{#each Array.from({ length: puzzleLength }) as _, i (i)}
							<div class="tile input">{currentGuess[i]?.toUpperCase() ?? ''}</div>
						{/each}
					</div>
					<p class="hint" bind:this={liveEnd}>
						Next: change one letter from {rows[rows.length - 1].toUpperCase()}.
					</p>
				{/if}
			</div>

			{#if status === 'won'}
				<p class="won">
					Solved in {guessesMade()}
					{guessesMade() === 1 ? 'guess' : 'guesses'} (best possible: {bestPossibleRemaining()})!
				</p>
				<button type="button" class="copy" onclick={copyShare}>
					{copied ? 'Copied!' : 'Copy result'}
				</button>
			{:else if message}
				<p class="message">{message}</p>
			{/if}
		</div>

		{#if status !== 'won'}
			<Keyboard onLetter={typeLetter} onEnter={submitGuess} onBackspace={backspace} />
		{/if}
	{/if}
</div>

<style>
	/* Custom elements default to display:inline, which can't resolve a
	   percentage width — without this, .ladder's width:100% below has
	   nothing concrete to size against. */
	:host {
		/* The ladder's hue, matched to --color-ladder in the site's app.css and
		   moved with it. It was a violet for a long time — first a deep one
		   picked for a warm paper background this palette no longer has, then
		   a vivid one carrying more saturation than a colour spread over a
		   whole board of tiles wants, then that one pulled back to about 60%
		   saturation — which, once it moved to blue, came out washed. Two
		   goes at "more saturated" still read as muted, because saturation
		   was being spent at a lightness that keeps a colour dull: a fully
		   saturated blue at 35% lightness is a navy, not a bright blue.
		   These are at full saturation AND high lightness, which is what
		   actually pops.

		   What pays for that is the label, not the fill. A vivid blue lands
		   where neither white nor near-black clears 4.5:1 by much, so each
		   fill takes whichever ink its own lightness allows: white on the
		   light accent (4.6:1, and the site's LADDER badge and the landing
		   page's .tile.changed lean on the same pairing), and a deep navy on
		   the three bright fills. That's why --accent-soft-ink-dark is dark
		   ink now — its fill went from a navy block to a bright blue one.

		   Note it now sits close to --color-quordle and to the wordle
		   family's --hit, so the four mode hues are no longer spread evenly
		   round the wheel — if that reads as a collision in a listing, the
		   fix is to move quordle, not to walk this back. It's the only colour
		   this game picks for itself; Palette.svelte builds the rest of both
		   themes around it. */
		--accent-light: #0071eb;
		--accent-hover-light: #0063cc;
		--accent-dark: #66b0ff;
		--accent-hover-dark: #85c0ff;
		/* The fill a settled rung wears, and the label each fill takes. It is
		   the colour most of a climbed board is made of, so it carries the
		   weight of whether the game looks alive — which is why it is a
		   bright blue in both themes now rather than the near-grey tint and
		   the deep block it used to be. Picked per theme rather than derived
		   from one another. It is every settled tile on the board, the last
		   row included — --accent is left for the things around the board
		   rather than a second shade inside it. */
		/* The one warm colour on this board: the target word in the header,
		   which says what you are aiming at. It is the complement of the
		   ladder's blue — about 180° round the wheel from it — so it reads as
		   the other thing rather than as another shade of the same thing.

		   Picked per theme. As text on paper an orange runs out of room at
		   about #c75000, which is 4.6:1 — a shade lighter drops under 4.5 and
		   the target word stops being readable for anyone who needs the
		   contrast. On the dark board the bright value clears 7:1. The Copy
		   button used to wear a brighter fill of this; it is the site's
		   primary button now, like the other three games' (see --primary in
		   Palette.svelte), so there is no fill to declare any more. */
		--goal-text-light: #c75000;
		--goal-text-dark: #ff8b3d;
		--accent-ink-light: #ffffff;
		--accent-soft-light: #42caff;
		--accent-soft-ink-light: #062441;
		--accent-ink-dark: #10161d;
		--accent-soft-dark: #1fbfff;
		--accent-soft-ink-dark: #062441;
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
	.ladder {
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
		/* The line that says which puzzle this is and what it wants — the
		   two facts you re-read every few rungs. It spent a long time at
		   0.85rem, smaller than the "given" labels beside the board. */
		font-size: 1.05rem;
		color: var(--ink-muted);
		margin-bottom: 1rem;
	}
	.header strong {
		color: var(--goal-text);
	}
	/* A given rung carries a small label beside its tiles, which is shorter
	   than they are — so this row centres its children rather than letting the
	   shared rule stretch them. */
	.row {
		align-items: center;
	}
	.tile.given {
		border-style: dashed;
		color: var(--ink-muted);
	}
	.given-label {
		font-size: 0.75rem;
		color: var(--ink-muted);
		font-style: italic;
		white-space: nowrap;
		flex-shrink: 0;
	}
	/* Filled, like the other three boards — a row is read as a pattern, and an
	   outline colours too little of a tile to carry one. One fill, not two:
	   the last row used to wear the accent at full strength as a flourish for
	   the win, and a rung that is settled is settled whether or not it is the
	   one that reached the target, so a board that shaded its last row was
	   showing the same state in two colours. The ending is announced by the
	   sweep, the "solved in N" line and the Copy button instead. */
	.tile.matched {
		background: var(--accent-soft);
		border-color: var(--accent-soft);
		color: var(--accent-soft-ink);
	}
	.hint {
		font-size: 0.85rem;
		color: var(--ink-muted);
	}
	/* The answer to a day that's already over: on the board, in the same
	   grid as everything else, but dashed and muted so it never reads as a
	   row someone actually played. */
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
	.tile.answer-tile {
		border-style: dashed;
		border-color: var(--ink-muted);
		background: none;
		color: var(--ink-muted);
	}
	.won {
		color: var(--accent);
		font-weight: 700;
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
			font-size: 0.95rem;
			margin-bottom: 0.6rem;
		}
	}
</style>

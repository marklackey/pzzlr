<svelte:options customElement="pzzlr-ladder" />

<script lang="ts">
	import { KEYBOARD_ROWS, createKeyboardHandlers } from './keyboard';
	import { authHeaders } from './http';
	import { createShareCopy } from './share';
	import { scrollIntoViewWithin } from './scroll';

	let { apibase = '', game = '', date = '', apikey = '' } = $props<{
		apibase?: string;
		/** Id of a stored game config. The only way to load a puzzle — there's
		 * one engine, and every game it serves is identified by config id. */
		game: string;
		/** Override the daily puzzle's date (YYYY-MM-DD); mainly for testing. */
		date?: string;
		/** Required for a private game — see the game's "Manage this game" panel. */
		apikey?: string;
	}>();

	type Status = 'loading' | 'playing' | 'won' | 'error';

	let status = $state<Status>('loading');
	let start = $state('');
	let end = $state('');
	let puzzleLength = $state(4);
	let minStepsResolved = $state(0);
	let puzzleNumber = $state<number | null>(null);
	let gameName = $state<string | null>(null);
	let rows = $state<string[]>([]);
	/** rows[0..givenCount) came free (start + any revealed rungs), not from a guess. */
	let givenCount = $state(1);
	let currentGuess = $state('');
	let message = $state('');

	async function loadPuzzle() {
		if (!game) {
			message = 'missing required "game" attribute (a stored game config id)';
			status = 'error';
			return;
		}

		status = 'loading';
		message = '';
		try {
			const params = date ? `?date=${date}` : '';
			const res = await fetch(`${apibase}/api/games/${game}/daily${params}`, {
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
			gameName = data.name ?? null;
			rows = [start, ...revealedRungs];
			givenCount = rows.length;
			currentGuess = '';
			status = 'playing';
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
			body: JSON.stringify({ current, guess })
		});
		const result = await res.json();

		if (!result.isNeighbor) {
			message = result.isWord
				? `"${guess}" isn't one letter away from "${current}"`
				: `"${guess}" isn't a word in this dictionary`;
			currentGuess = '';
			return;
		}

		message = '';
		rows = [...rows, guess];
		currentGuess = '';
		if (guess === end) status = 'won';
	}

	const { typeLetter, backspace, handleKeydown } = createKeyboardHandlers({
		isActive: () => status === 'playing',
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
				Array.from({ length: puzzleLength }, (_, i) => (matchesTarget(word, i) ? '🟩' : '⬜')).join('')
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
				<span class="target">Target <strong>{end.toUpperCase()}</strong></span>
			</div>

			<div class="board" bind:this={boardEl}>
				{#each rows as word, rowIndex (rowIndex)}
					<div class="row">
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
					</div>
				{/each}

				{#if status === 'playing'}
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
					Solved in {guessesMade()} guesses (best possible: {bestPossibleRemaining()})!
				</p>
				<button type="button" class="copy" onclick={copyShare}>
					{copied ? 'Copied!' : 'Copy result'}
				</button>
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
								<button type="button" onclick={() => typeLetter(key)}>{key}</button>
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
	   percentage width — without this, .ladder's width:100% below has
	   nothing concrete to size against. */
	:host {
		display: block;
		width: 100%;
		box-sizing: border-box;
	}
	.ladder {
		--accent: #7c3aed;
		--accent-hover: #6d28d9;
		--ink: #201d2b;
		--ink-muted: #6b6578;
		--line: #e4e1db;
		--key-bg: #edeaf7;
		--key-bg-hover: #ded7f5;
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
	.header strong {
		color: var(--accent);
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
		align-items: center;
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
		border-radius: 8px;
		font-weight: 700;
		font-size: 1.15rem;
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
	.tile.matched {
		background: var(--accent);
		border-color: var(--accent);
		color: white;
	}
	.tile.input {
		border-color: #b3aed6;
	}
	.hint {
		font-size: 0.85rem;
		color: var(--ink-muted);
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
		background: var(--accent);
		color: white;
	}
	button.enter:hover {
		background: var(--accent-hover);
	}
	.won {
		color: var(--accent);
		font-weight: 700;
	}
	button.copy {
		background: var(--accent);
		color: white;
	}
	button.copy:hover {
		background: var(--accent-hover);
	}
	.message {
		color: #b91c1c;
		font-size: 0.85rem;
	}
</style>

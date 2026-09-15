<script lang="ts">
	import GameForm from '$lib/components/GameForm.svelte';
	import InfoTooltip from '$lib/components/InfoTooltip.svelte';
	import FavoriteButton from '$lib/components/FavoriteButton.svelte';
	import { page } from '$app/state';
	import { theme } from '$lib/theme.svelte';
	import { resolve } from '$app/paths';
	import { DICTIONARY_LABELS, HARD_MODE_LABELS, MODE_LABELS, isDictionarySize } from '$lib/types';

	let { data, form } = $props();

	/** '' means today's board — the widgets read an empty date as "today". */
	const day = $derived(data.day ?? '');
	// Only the owner's manage panel sits beside the board. Past puzzles is a
	// link on the title row, so a player who can't manage the game gets the
	// board on its own, with nothing under it to push the keyboard away.
	const hasSidePanel = $derived(data.canManage);
	/** Width of the title row's link and star, handed to the widget as --pzzlr-title-inset. */
	let cornerWidth = $state(0);

	const tagName = $derived(
		data.config.mode === 'wordle'
			? 'pzzlr-wordle'
			: data.config.mode === 'quordle'
				? 'pzzlr-quordle'
				: data.config.mode === 'absurdle'
					? 'pzzlr-absurdle'
					: 'pzzlr-ladder'
	);

	function dictionaryLabel(size: number): string {
		return isDictionarySize(size) ? DICTIONARY_LABELS[size] : `size ${size}`;
	}

	const todayHref = $derived(resolve('/g/[id]', { id: data.config.id }));
	const archiveHref = $derived(resolve('/g/[id]/archive', { id: data.config.id }));

	// Plain calendar dates, formatted in UTC: rendering them in the reader's
	// zone would show the day before to anyone west of it, and the puzzle
	// number beside it would disagree.
	const dayFormat = new Intl.DateTimeFormat('en-US', {
		timeZone: 'UTC',
		weekday: 'short',
		month: 'short',
		day: 'numeric'
	});
	const dayLabel = $derived(day ? dayFormat.format(new Date(`${day}T00:00:00Z`)) : '');
	const dayNumber = $derived(
		data.archive.find((entry) => entry.date === day)?.puzzleNumber ?? null
	);

	interface RevealedDay {
		target?: string;
		targets?: string[];
		path?: string[];
	}
	// The answer to the day on screen, once asked for. Fetched rather than
	// shipped with the page: an answer that arrives unasked isn't a reveal.
	// It goes to the widget as an attribute, which draws it on the board.
	let revealedWords = $state<string[]>([]);
	let revealError = $state('');
	let revealing = $state(false);
	const revealedAttr = $derived(revealedWords.join(','));

	async function revealDay() {
		if (!day || revealing || revealedWords.length > 0) return;
		revealing = true;
		revealError = '';
		try {
			const res = await fetch(`/api/games/${data.config.id}/archive?date=${day}`);
			const body = (await res.json().catch(() => null)) as
				(RevealedDay & { message?: string }) | null;
			if (!res.ok) {
				revealError = body?.message ?? 'could not reveal that day';
				return;
			}
			// A ladder's answer is the chain that gets there, not its ends;
			// wordle has one word, quordle one per board.
			revealedWords = body?.path ?? body?.targets ?? (body?.target ? [body.target] : []);
		} catch {
			revealError = 'could not reach the server';
		} finally {
			revealing = false;
		}
	}

	// Defaults to the read-only summary; the edit form only takes over once
	// asked for, and hands back to the summary on a successful save.
	let editing = $state(false);
	$effect(() => {
		if (!form?.success) return;
		editing = false;
		resetOwnAttempt();
	});

	/**
	 * Drops this browser's attempt token for the game just edited, so the
	 * widget starts a fresh attempt on the edited version instead of resuming
	 * one played against the old settings.
	 *
	 * Only this browser: an attempt is keyed by a token in local storage
	 * rather than an account (see the widgets' attemptToken), so there's no
	 * server-side way to pick out "the owner's" attempt — and no reason to,
	 * since anyone else mid-puzzle is meant to keep the game they started
	 * (see attempt-continuity.ts). The person who just edited it is the one
	 * at this keyboard.
	 */
	function resetOwnAttempt() {
		for (const mode of ['ladder', 'wordle', 'quordle', 'absurdle']) {
			try {
				localStorage.removeItem(`pzzlr-${mode}-token:${data.config.id}`);
			} catch {
				// Storage unavailable (private browsing) means there was no
				// stored attempt to clear either.
			}
		}
		// The widget reads its token once on load, so it needs remounting.
		location.reload();
	}

	let copied = $state(false);
	async function copySnippet() {
		const origin = page.url.origin;
		// Built from pieces that never spell out "<script" or "</script" in
		// one contiguous literal — Svelte's parser scans .svelte source
		// text for those tags before it understands JS, so a literal
		// occurrence (even inside a string) breaks parsing of this file.
		const scriptTag =
			'<scr' + `ipt type="module" src="${origin}/sdk/pzzlr-sdk.js">` + '</scr' + 'ipt>';
		const snippet = [
			scriptTag,
			`<${tagName} apibase="${origin}" game="${data.config.id}" apikey="${data.config.embedKey}"></${tagName}>`
		].join('\n');
		await navigator.clipboard.writeText(snippet);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}
</script>

<svelte:head>
	<script type="module" src="/sdk/pzzlr-sdk.js"></script>
</svelte:head>

<div class="container" class:wide={hasSidePanel || data.config.mode === 'quordle'}>
	<!-- Kept for the document outline / screen readers, but not painted: the
	     widget renders this same name itself (see the game-name heading in
	     sdk/src/*.svelte), so showing it here too just repeats it. -->
	<h1 class="sr-only">{data.config.name ?? 'Pzzlr'}</h1>

	<!-- Only ever on a past day's page, so today's board keeps its full
	     height. Back, which day this is, and the answer — the three things
	     that only make sense once you've left today behind. -->
	{#if day}
		<div class="past-bar">
			<a href={todayHref}>← Today</a>
			<span class="past-day">
				{#if dayNumber}<strong>#{dayNumber}</strong>{/if}
				{dayLabel}
			</span>
			{#if revealError}
				<span class="past-error">{revealError}</span>
			{:else if revealedWords.length === 0}
				<button
					type="button"
					class="btn btn-secondary btn-sm"
					onclick={revealDay}
					disabled={revealing}
				>
					{revealing ? 'Revealing…' : 'Reveal answer'}
				</button>
			{:else}
				<span class="past-revealed">Answer shown</span>
			{/if}
		</div>
	{/if}

	<div class="play-area" class:solo={!hasSidePanel} class:multi={data.config.mode === 'quordle'}>
		<div
			class="board-card"
			class:multi={data.config.mode === 'quordle'}
			style:--pzzlr-title-inset={cornerWidth
				? `calc(${cornerWidth}px + var(--space-3))`
				: undefined}
		>
			<!-- Past puzzles and the star, at the right end of the line the widget
			     draws the game's name on: neither is worth a row of its own, and a
			     row under the board costs the play area height it can't spare on a
			     phone. Their width goes to the widget, so a long name wraps before
			     it reaches them. -->
			{#if data.user || data.archive.length > 0}
				<div class="board-corner" bind:clientWidth={cornerWidth}>
					{#if data.archive.length > 0}
						<a class="archive-link" href={archiveHref}>Past puzzles</a>
					{/if}
					{#if data.user}
						<FavoriteButton gameId={data.config.id} favorited={data.favorited} />
					{/if}
				</div>
			{/if}
			<!-- Keyed on the day so opening one from the archive builds a new
			     board rather than swapping a different puzzle into the one on
			     screen — a board finishes the puzzle it started (see
			     attempt-continuity.ts), and that goes for the markup too. -->
			{#key day}
				{#if data.config.mode === 'wordle'}
					<pzzlr-wordle
						apibase=""
						game={data.config.id}
						date={day}
						theme={theme.attr}
						revealed={revealedAttr}
						apikey={data.config.embedKey ?? undefined}
					></pzzlr-wordle>
				{:else if data.config.mode === 'quordle'}
					<pzzlr-quordle
						apibase=""
						game={data.config.id}
						date={day}
						theme={theme.attr}
						revealed={revealedAttr}
						apikey={data.config.embedKey ?? undefined}
					></pzzlr-quordle>
				{:else if data.config.mode === 'absurdle'}
					<pzzlr-absurdle
						apibase=""
						game={data.config.id}
						theme={theme.attr}
						apikey={data.config.embedKey ?? undefined}
					></pzzlr-absurdle>
				{:else}
					<pzzlr-ladder
						apibase=""
						game={data.config.id}
						date={day}
						theme={theme.attr}
						revealed={revealedAttr}
						apikey={data.config.embedKey ?? undefined}
					></pzzlr-ladder>
				{/if}
			{/key}
		</div>

		<!-- The owner's manage panel, in one column beside the board. -->
		{#if hasSidePanel}
			<div class="side">
				{#if data.canManage}
					<div class="manage card">
						{#if editing}
							<div class="manage-header">
								<h2>Edit game</h2>
								<button
									type="button"
									class="btn btn-secondary btn-sm"
									onclick={() => (editing = false)}
								>
									Cancel
								</button>
							</div>
							<form method="post" action="?/update">
								<GameForm
									graphStats={data.graphStats}
									submitLabel="Save changes"
									mode={data.config.mode}
									target={data.config.target}
									length={data.config.length}
									dictionarySize={data.config.dictionarySize}
									minSteps={data.config.minSteps}
									rungsGiven={data.config.rungsGiven}
									maxGuesses={data.config.maxGuesses}
									boardCount={data.config.boardCount}
									hardMode={data.config.hardMode}
									name={data.config.name}
									isPrivate={!data.config.public}
								/>
							</form>
						{:else}
							<div class="manage-header">
								<h2>{data.config.name ?? 'Untitled game'}</h2>
								<button
									type="button"
									class="btn btn-secondary btn-sm"
									onclick={() => (editing = true)}
								>
									Edit
								</button>
							</div>
							<dl class="summary">
								<div>
									<dt>Type</dt>
									<dd>{MODE_LABELS[data.config.mode]}</dd>
								</div>
								{#if data.config.mode === 'ladder' || data.config.mode === 'wordle'}
									<div>
										<dt>{data.config.mode === 'wordle' ? 'Secret' : 'Target'}</dt>
										<dd>
											{#if data.config.target === null}
												Daily (a new one every day)
											{:else if data.config.mode === 'wordle'}
												{data.config.target} (the same every day)
											{:else}
												{data.config.target}
											{/if}
										</dd>
									</div>
								{/if}
								<div>
									<dt>Dictionary</dt>
									<dd>{dictionaryLabel(data.config.dictionarySize)}</dd>
								</div>
								{#if data.config.mode === 'ladder'}
									<div>
										<dt>Minimum steps</dt>
										<dd>{data.config.minSteps}</dd>
									</div>
									<div>
										<dt>Rungs given away</dt>
										<dd>{data.config.rungsGiven}</dd>
									</div>
								{:else if data.config.mode === 'absurdle'}
									<div>
										<dt>Guesses allowed</dt>
										<dd>No limit</dd>
									</div>
								{:else}
									<div>
										<dt>Guesses allowed</dt>
										<dd>{data.config.maxGuesses}</dd>
									</div>
									{#if data.config.mode === 'quordle'}
										<div>
											<dt>Boards</dt>
											<dd>{data.config.boardCount}</dd>
										</div>
									{/if}
									{#if data.config.mode === 'wordle'}
										<div>
											<dt>Hard mode</dt>
											<dd>{HARD_MODE_LABELS[data.config.hardMode]}</dd>
										</div>
									{/if}
								{/if}
								<div>
									<dt>Visibility</dt>
									<dd>
										{data.config.public ? 'Public' : 'Private'}
										<InfoTooltip label="What does private mean?">
											A private game is only playable with its embed key — anyone without the key
											sees a missing game, and it's left out of Explore.
										</InfoTooltip>
									</dd>
								</div>
							</dl>
						{/if}
					</div>

					{#if !data.config.public}
						<div class="embed-key">
							<h3>Embed key</h3>
							<p>
								This game is private — the widget only loads for whoever has this key. Paste the
								snippet below into any site.
							</p>
							<pre>{`<${tagName} apibase="${page.url.origin}" game="${data.config.id}" apikey="${data.config.embedKey}"></${tagName}>`}</pre>
							<div class="key-actions">
								<button type="button" class="btn btn-secondary btn-sm" onclick={copySnippet}>
									{copied ? 'Copied!' : 'Copy embed snippet'}
								</button>
								<form method="post" action="?/regenerateKey">
									<button type="submit" class="btn btn-secondary btn-sm">
										Regenerate key (invalidates the old one)
									</button>
								</form>
							</div>
						</div>
					{/if}

					<form
						method="post"
						action="?/remove"
						onsubmit={(e) => {
							if (!confirm('Delete this game? This cannot be undone.')) e.preventDefault();
						}}
					>
						<button type="submit" class="btn btn-danger">Delete game</button>
					</form>

					{#if form?.message}
						<p class="error-text">{form.message}</p>
					{/if}
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.wide {
		max-width: 64rem;
	}
	.play-area {
		display: grid;
		grid-template-columns: 1fr;
		align-items: start;
		gap: var(--space-6);
	}
	@media (min-width: 860px) {
		.play-area:not(.solo):not(.multi) {
			grid-template-columns: minmax(20rem, 26rem) 1fr;
		}
	}
	/* Sits on the card's padding edge, level with the top of the widget's
	   game name, so it shares that line rather than floating in the corner. */
	.board-corner {
		position: absolute;
		top: var(--card-pad);
		right: var(--card-pad);
		z-index: 1;
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}
	.archive-link {
		font-size: 0.9rem;
		font-weight: 600;
		white-space: nowrap;
	}
	.board-card {
		position: relative;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-md);
		/* One value for the card's padding and the corner's inset, so the
		   corner stays on the widget's edge at every size below. */
		--card-pad: var(--space-3);
		padding: var(--card-pad);
		width: 100%;
		box-sizing: border-box;
	}
	/* The 26rem cap only makes sense once .play-area is actually two
	   columns (see the min-width: 860px rule above it) — below that it's a
	   single column already, and capping the widget's own width there just
	   wastes the screen a phone or narrow tablet needs for its keyboard. */
	@media (min-width: 860px) {
		.board-card:not(.multi) {
			width: min(100%, 26rem);
			--card-pad: var(--space-6);
		}
		/* Quordle's card stays wide for its four boards, but its keyboard is
		   held to the width the single-board card above leaves its widget —
		   26rem less that padding and the 1px border on each side — so every
		   game's keyboard is the same size here. It goes in as a custom
		   property because the keyboard is inside the widget's shadow root. */
		.board-card.multi {
			--pzzlr-keyboard-max: calc(26rem - 2 * var(--space-6) - 2px);
		}
	}
	/* A quordle widget's own board grid handles its responsive layout (see
	   Quordle.svelte) — it needs the full container width to do that,
	   unlike the single fixed-size board the wordle/ladder cap suits. */
	.board-card.multi {
		width: 100%;
		max-width: 64rem;
	}
	/* Phone layout: trims the side margins — the container's space-4 padding
	   plus this card's own was over an inch of combined dead horizontal
	   space on a typical phone, most of it coming out of the keyboard's
	   width.

	   `min-height`, not `height`, and that one word is the whole trick. At
	   least a screenful, so the widget's keyboard starts on the bottom edge
	   of the screen and the manage panel starts just below the fold — but
	   free to grow past it, so a board taller than the screen makes the
	   *page* longer instead of scrolling inside its own pane. A fixed height
	   gave the widget a box smaller than its content and put a second
	   scroller on the screen, and the thumb was always on the wrong one:
	   everything below the board sat behind a gesture that never reached it.

	   Growing past the fold moves the keyboard down with the board, which is
	   what `position: sticky` on .keyboard is for (see the max-width: 480px
	   rules in sdk/src/*.svelte) — it holds the keyboard on the bottom edge
	   for as long as any of the puzzle is on screen. The two together are
	   what keep it in view in both directions. */
	@media (max-width: 480px) {
		.container {
			padding: var(--space-3) var(--space-2);
		}
		.board-card {
			--card-pad: var(--space-2);
			min-height: calc(100dvh - var(--nav-h) - var(--space-3) * 2);
			display: flex;
			flex-direction: column;
		}
		/* Lets the widget fill that height when the board is short, so its
		   keyboard sits on the screen's bottom edge rather than partway up.
		   min-height:0 keeps the widget's own flex column from refusing to
		   shrink — it never has to here, since the card only ever grows. */
		.board-card > :global(*) {
			flex: 1 1 auto;
			min-height: 0;
		}
	}
	.side {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
		min-width: 0;
	}
	.manage {
		box-sizing: border-box;
	}
	/* Above the board, and only on a past day — see the markup. */
	.past-bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-3);
		margin-bottom: var(--space-4);
		font-size: 0.9rem;
	}
	.past-day {
		flex: 1;
		color: var(--color-text-muted);
	}
	.past-day strong {
		color: var(--color-text);
	}
	.past-revealed {
		color: var(--color-text-muted);
	}
	.past-error {
		color: var(--color-error);
	}
	.manage-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
	}
	.manage-header h2 {
		font-size: 1.1rem;
		margin: 0;
	}
	.manage form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		margin-top: var(--space-4);
	}
	.summary {
		margin: var(--space-4) 0 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	.summary > div {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-3);
		font-size: 0.9rem;
		padding: var(--space-2) 0;
		border-bottom: 1px solid var(--color-border);
	}
	.summary dt {
		color: var(--color-text-muted);
	}
	.summary dd {
		margin: 0;
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-weight: 600;
	}
	.embed-key {
		margin-top: var(--space-4);
		padding-top: var(--space-4);
		border-top: 1px solid var(--color-border);
	}
	.embed-key h3 {
		font-size: 0.95rem;
		margin: 0 0 var(--space-2);
	}
	.embed-key p {
		font-size: 0.85rem;
		color: var(--color-text-muted);
		margin: 0 0 var(--space-2);
	}
	.embed-key pre {
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		padding: var(--space-2);
		font-size: 0.75rem;
		overflow-x: auto;
		white-space: pre-wrap;
		word-break: break-all;
	}
	.key-actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		margin-top: var(--space-2);
	}
	.key-actions form {
		margin: 0;
	}
</style>

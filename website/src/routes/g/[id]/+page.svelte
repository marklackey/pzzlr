<script lang="ts">
	import FavoriteButton from '$lib/components/FavoriteButton.svelte';
	import { theme } from '$lib/theme.svelte';
	import { resolve } from '$app/paths';

	let { data } = $props();

	/** '' means today's board — the widgets read an empty date as "today". */
	const day = $derived(data.day ?? '');
	/** Width of the title row's links and star, handed to the widget as --pzzlr-title-inset. */
	let cornerWidth = $state(0);

	const todayHref = $derived(resolve('/g/[id]', { id: data.config.id }));
	const archiveHref = $derived(resolve('/g/[id]/archive', { id: data.config.id }));
	const editHref = $derived(resolve('/g/[id]/edit', { id: data.config.id }));

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
	//
	// Each piece is stamped with the day it belongs to. This component stays
	// mounted when the page moves between days (← Today, or another day from
	// the archive), so anything left unstamped would follow the visitor
	// there: a revealed answer drawn on today's board, or a request still in
	// flight landing on a day it wasn't made for.
	let revealed = $state<{ day: string; words: string[] } | null>(null);
	let revealFailure = $state<{ day: string; message: string } | null>(null);
	let revealingDay = $state<string | null>(null);
	const revealedWords = $derived(revealed?.day === day ? revealed.words : []);
	const revealError = $derived(revealFailure?.day === day ? revealFailure.message : '');
	const revealing = $derived(revealingDay === day);
	const revealedAttr = $derived(revealedWords.join(','));

	async function revealDay() {
		const forDay = day;
		if (!forDay || revealing || revealedWords.length > 0) return;
		revealingDay = forDay;
		revealFailure = null;
		try {
			const res = await fetch(`/api/games/${data.config.id}/archive?date=${forDay}`);
			const body = (await res.json().catch(() => null)) as
				(RevealedDay & { message?: string }) | null;
			if (!res.ok) {
				revealFailure = { day: forDay, message: body?.message ?? 'could not reveal that day' };
				return;
			}
			// A ladder's answer is the chain that gets there, not its ends;
			// wordle has one word, quordle one per board.
			const words = body?.path ?? body?.targets ?? (body?.target ? [body.target] : []);
			revealed = { day: forDay, words };
		} catch {
			revealFailure = { day: forDay, message: 'could not reach the server' };
		} finally {
			if (revealingDay === forDay) revealingDay = null;
		}
	}
</script>

<svelte:head>
	<script type="module" src="/sdk/pzzlr-sdk.js"></script>
</svelte:head>

<div class="container" class:wide={data.config.mode === 'quordle'}>
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

	<div class="play-area">
		<div
			class="board-card"
			class:multi={data.config.mode === 'quordle'}
			style:--pzzlr-title-inset={cornerWidth
				? `calc(${cornerWidth}px + var(--space-3))`
				: undefined}
		>
			<!-- Edit, past puzzles and the star, at the right end of the line the
			     widget draws the game's name on: none is worth a row of its own,
			     and anything under the board costs the play area height it can't
			     spare on a phone — which is why the owner's settings are a page of
			     their own rather than a panel down there. Their width goes to the
			     widget, so a long name wraps before it reaches them. -->
			{#if data.user || data.archive.length > 0}
				<div class="board-corner" bind:clientWidth={cornerWidth}>
					{#if data.canManage}
						<a class="corner-link" href={editHref}>Edit</a>
					{/if}
					{#if data.archive.length > 0}
						<a class="corner-link" href={archiveHref}>Past puzzles</a>
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
	.corner-link {
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
	/* The 26rem cap is for wide screens only — below 860px, capping the
	   widget's own width just wastes the screen a phone or narrow tablet
	   needs for its keyboard. */
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
	   of the screen — but free to grow past it, so a board taller than the
	   screen makes the *page* longer instead of scrolling inside its own
	   pane. A fixed height
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
</style>

<script lang="ts">
	import GameForm from '$lib/components/GameForm.svelte';
	import InfoTooltip from '$lib/components/InfoTooltip.svelte';
	import { page } from '$app/state';
	import { DICTIONARY_LABELS, isDictionarySize } from '$lib/types';

	let { data, form } = $props();

	const tagName = $derived(
		data.config.mode === 'wordle'
			? 'pzzlr-wordle'
			: data.config.mode === 'quordle'
				? 'pzzlr-quordle'
				: data.config.mode === 'absurdle'
					? 'pzzlr-absurdle'
					: 'pzzlr-ladder'
	);

	const MODE_LABEL = {
		ladder: 'Ladder',
		wordle: 'Wordle',
		quordle: 'Quordle',
		absurdle: 'Absurdle'
	} as const;

	function dictionaryLabel(size: number): string {
		return isDictionarySize(size) ? DICTIONARY_LABELS[size] : `size ${size}`;
	}

	// Defaults to the read-only summary; the edit form only takes over once
	// asked for, and hands back to the summary on a successful save.
	let editing = $state(false);
	$effect(() => {
		if (form?.success) editing = false;
	});

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

<div class="container" class:wide={data.canManage || data.config.mode === 'quordle'}>
	<!-- Kept for the document outline / screen readers, but not painted: the
	     widget renders this same name itself (see the game-name heading in
	     sdk/src/*.svelte), so showing it here too just repeats it. -->
	<h1 class="sr-only">{data.config.name ?? 'Pzzlr'}</h1>

	<div class="play-area" class:solo={!data.canManage} class:multi={data.config.mode === 'quordle'}>
		<div class="board-card" class:multi={data.config.mode === 'quordle'}>
			{#if data.config.mode === 'wordle'}
				<pzzlr-wordle apibase="" game={data.config.id} apikey={data.config.embedKey ?? undefined}
				></pzzlr-wordle>
			{:else if data.config.mode === 'quordle'}
				<pzzlr-quordle apibase="" game={data.config.id} apikey={data.config.embedKey ?? undefined}
				></pzzlr-quordle>
			{:else if data.config.mode === 'absurdle'}
				<pzzlr-absurdle apibase="" game={data.config.id} apikey={data.config.embedKey ?? undefined}
				></pzzlr-absurdle>
			{:else}
				<pzzlr-ladder apibase="" game={data.config.id} apikey={data.config.embedKey ?? undefined}
				></pzzlr-ladder>
			{/if}
		</div>

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
						<button type="button" class="btn btn-secondary btn-sm" onclick={() => (editing = true)}>
							Edit
						</button>
					</div>
					<dl class="summary">
						<div>
							<dt>Type</dt>
							<dd>{MODE_LABEL[data.config.mode]}</dd>
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
						{/if}
						<div>
							<dt>Visibility</dt>
							<dd>
								{data.config.public ? 'Public' : 'Private'}
								<InfoTooltip label="What does private mean?">
									A private game is only playable with its embed key — anyone without the key sees a
									missing game, and it's left out of Explore.
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
						This game is private — the widget only loads for whoever has this key. Paste the snippet
						below into any site.
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
	.board-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-md);
		padding: var(--space-3);
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
			padding: var(--space-6);
		}
	}
	/* A quordle widget's own board grid handles its responsive layout (see
	   Quordle.svelte) — it needs the full container width to do that,
	   unlike the single fixed-size board the wordle/ladder cap suits. */
	.board-card.multi {
		width: 100%;
		max-width: 64rem;
	}
	/* Phone layout: the board card fills whatever height the nav leaves (see
	   .shell in +layout.svelte for where that height comes from), so the
	   widget's keyboard lands on the bottom edge of the screen from first
	   paint rather than wherever the board happens to end. The board scrolls
	   inside the widget above it — see .scroll-area in sdk/src/*.svelte.
	   Also trims the side margins: the container's space-4 padding plus this
	   card's padding was over an inch of combined dead horizontal space on a
	   typical phone, most of it coming out of the keyboard's width. */
	@media (max-width: 480px) {
		.container {
			padding: var(--space-3) var(--space-2);
		}
		.board-card {
			padding: var(--space-2);
			/* Exactly the screen minus the nav and this container's own
			   padding, so the card's bottom edge is the viewport's bottom
			   edge — that's what puts the widget's keyboard there. An owner's
			   manage panel then starts just below the fold, which is the right
			   order for a page you mostly come to to play. */
			height: calc(100dvh - var(--nav-h) - var(--space-3) * 2);
			display: flex;
			flex-direction: column;
		}
		/* Hands that height down to the widget, which needs a definite one for
		   its own scrolling-board / fixed-keyboard split to resolve against. */
		.board-card > :global(*) {
			flex: 1 1 auto;
			min-height: 0;
		}
	}
	.manage {
		box-sizing: border-box;
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

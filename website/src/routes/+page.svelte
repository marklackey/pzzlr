<script lang="ts">
	import { resolve } from '$app/paths';
	import ExploreGames from '$lib/components/ExploreGames.svelte';
	import { theme } from '$lib/theme.svelte';

	let { data } = $props();

	const tagName = $derived(
		data.game?.mode === 'wordle'
			? 'pzzlr-wordle'
			: data.game?.mode === 'quordle'
				? 'pzzlr-quordle'
				: data.game?.mode === 'absurdle'
					? 'pzzlr-absurdle'
					: 'pzzlr-ladder'
	);

	const MODE_COPY = {
		ladder: 'Change one letter at a time to reach the target.',
		wordle: 'Guess the secret word — every guess shows how close each letter is.',
		quordle: 'Guess several secret words at once, all from one shared stream of guesses.',
		absurdle:
			'No secret is ever picked — the game narrows down the answer as you play, always keeping whichever word your guesses ruled out the least.'
	} as const;
</script>

<svelte:head>
	<script type="module" src="/sdk/pzzlr-sdk.js"></script>
</svelte:head>

{#if data.mode === 'explore'}
	<ExploreGames
		games={data.games}
		total={data.total}
		page={data.page}
		pageSize={data.pageSize}
		query={data.query}
		basePath={resolve('/')}
	/>
{:else}
	<div class="container" class:wide={data.game?.mode === 'quordle'}>
		<h1>Pzzlr</h1>
		{#if data.game}
			<p>
				{MODE_COPY[data.game.mode]} This board is our own
				<code>&lt;{tagName}&gt;</code> embed, loaded the same way a third-party site would load it — one
				script tag, then the tag below. Its config is stored server-side and loaded by id.
			</p>

			<div class="board-card" class:multi={data.game.mode === 'quordle'}>
				{#if data.game.mode === 'wordle'}
					<pzzlr-wordle apibase="" game={data.game.id} theme={theme.attr}></pzzlr-wordle>
				{:else if data.game.mode === 'quordle'}
					<pzzlr-quordle apibase="" game={data.game.id} theme={theme.attr}></pzzlr-quordle>
				{:else if data.game.mode === 'absurdle'}
					<pzzlr-absurdle apibase="" game={data.game.id} theme={theme.attr}></pzzlr-absurdle>
				{:else}
					<pzzlr-ladder apibase="" game={data.game.id} theme={theme.attr}></pzzlr-ladder>
				{/if}
			</div>
		{:else}
			<p>
				Change one letter at a time to reach the target. This board is our own
				<code>&lt;pzzlr-ladder&gt;</code> embed, loaded the same way a third-party site would load it
				— one script tag, then the tag below. Its config (target word, length, difficulty) is stored server-side
				and loaded by id.
			</p>
			<p><a href={resolve('/create')}>Create the first game</a> to see the board here.</p>
		{/if}
	</div>
{/if}

<style>
	.wide {
		max-width: 64rem;
	}
	.board-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-md);
		padding: var(--space-6);
		width: min(100%, 26rem);
		box-sizing: border-box;
	}
	/* A quordle widget's own board grid handles its responsive layout (see
	   Quordle.svelte) — it needs the full container width to do that,
	   unlike the single fixed-size board the wordle/ladder/absurdle cap
	   suits. */
	.board-card.multi {
		width: 100%;
		max-width: 64rem;
	}
</style>

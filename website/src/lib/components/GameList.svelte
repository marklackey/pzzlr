<script lang="ts">
	import { resolve } from '$app/paths';
	import { DEFAULT_DICTIONARY_SIZE, type GameRow } from '$lib/types';

	let { games, emptyMessage }: { games: GameRow[]; emptyMessage: string } = $props();

	const FALLBACK_TITLE: Record<Exclude<GameRow['mode'], 'ladder'>, string> = {
		wordle: 'Wordle game',
		quordle: 'Quordle game',
		absurdle: 'Absurdle game'
	};
	function gameTitle(game: GameRow): string {
		if (game.name) return game.name;
		return game.mode === 'ladder' ? (game.target ?? 'Random game') : FALLBACK_TITLE[game.mode];
	}
</script>

{#if games.length === 0}
	<p>{emptyMessage}</p>
{:else}
	<ul>
		{#each games as game (game.id)}
			<li class="card">
				<a class="title" href={resolve('/g/[id]', { id: game.id })}>
					{gameTitle(game)}
				</a>
				<div class="meta">
					{#if game.mode === 'absurdle'}
						<span class="badge">🌀 adversarial</span>
						<span>{game.length} letters</span>
						<span>no guess limit</span>
					{:else if game.mode === 'quordle'}
						<span class="badge">🤫 {game.boardCount} secret words</span>
						<span>{game.length} letters</span>
						<span>{game.maxGuesses} guesses</span>
					{:else if game.mode === 'wordle'}
						<span class="badge">🤫 secret word</span>
						<span>{game.length} letters</span>
						<span>{game.maxGuesses} guesses</span>
					{:else}
						<span class="badge">{game.target ?? '🎲 random target'}</span>
						<span>{game.length} letters</span>
						<span>min {game.minSteps} steps</span>
						{#if game.rungsGiven > 0}
							<span>{game.rungsGiven} rung{game.rungsGiven === 1 ? '' : 's'} given</span>
						{/if}
					{/if}
					{#if game.dictionarySize !== DEFAULT_DICTIONARY_SIZE}
						<span>dictionary size {game.dictionarySize}</span>
					{/if}
					{#if !game.public}
						<span>private</span>
					{/if}
				</div>
			</li>
		{/each}
	</ul>
{/if}

<style>
	ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}
	li {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	.title {
		font-weight: 700;
		font-size: 1.05rem;
		color: var(--color-text);
	}
	.title:hover {
		color: var(--color-primary);
	}
	.meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-3);
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}
</style>

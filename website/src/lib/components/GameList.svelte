<script lang="ts">
	import { resolve } from '$app/paths';
	import { MODE_LABELS, type GameRow } from '$lib/types';
	import FavoriteButton from './FavoriteButton.svelte';

	interface Props {
		games: GameRow[];
		emptyMessage: string;
		/**
		 * Which of these games the viewer has starred. Null means don't offer
		 * stars at all — nobody's signed in, so there's no shelf to put one
		 * on. An empty array is the other thing entirely: signed in, nothing
		 * starred yet.
		 */
		favoriteIds?: string[] | null;
	}

	let { games, emptyMessage, favoriteIds = null }: Props = $props();

	const favorites = $derived(new Set(favoriteIds ?? []));

	// Every game made since names became required has one; these are the
	// older ones, which still have to say something in the list.
	function gameTitle(game: GameRow): string {
		if (game.name) return game.name;
		return game.mode === 'ladder'
			? (game.target ?? 'Random game')
			: `${MODE_LABELS[game.mode]} game`;
	}
</script>

{#if games.length === 0}
	<p>{emptyMessage}</p>
{:else}
	<ul>
		{#each games as game (game.id)}
			<li class="card">
				<div class="row-head">
					<a class="title" href={resolve('/g/[id]', { id: game.id })}>
						{gameTitle(game)}
					</a>
					{#if favoriteIds}
						<FavoriteButton gameId={game.id} favorited={favorites.has(game.id)} />
					{/if}
				</div>
				<div class="meta">
					<span class="badge badge-{game.mode}">{MODE_LABELS[game.mode]}</span>
					<!-- A ladder's target is the player's visible goal — it's the
					     whole point of the row. Every other mode's is the secret
					     the game is built on, so it never appears in a listing
					     even for the owner (see withoutSecret in db/games.ts). -->
					{#if game.mode === 'ladder' && game.target}
						<span class="target">→ {game.target.toUpperCase()}</span>
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
	.row-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
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
	.target {
		font-weight: 700;
		letter-spacing: 0.06em;
		color: var(--color-text);
	}
	li {
		transition: border-color 0.15s;
	}
	li:hover {
		border-color: var(--color-border-strong);
	}
</style>

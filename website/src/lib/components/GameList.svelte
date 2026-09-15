<script lang="ts">
	import { resolve } from '$app/paths';
	import { MODE_LABELS, type GameRow } from '$lib/types';
	import type { Snippet } from 'svelte';
	import FavoriteButton from './FavoriteButton.svelte';

	interface Props {
		games: GameRow[];
		/** Shown instead of the list when it's empty: plain text, or a snippet when it needs a link. */
		emptyMessage: string | Snippet;
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
	<p>
		{#if typeof emptyMessage === 'string'}{emptyMessage}{:else}{@render emptyMessage()}{/if}
	</p>
{:else}
	<ul>
		{#each games as game (game.id)}
			<li class="card mode-{game.mode}">
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
	/* The game's own colour along the edge of its row — the same hairline the
	   landing page's four mode cards wear across the top. Without it a list
	   is a column of identical white rectangles, and the type is left to a
	   badge small enough to have to be read. */
	li {
		border-left: 3px solid var(--color-border-strong);
		/* The other three sides are a 1px (transparent, in light) card
		   border, so the extra 2px comes back out of the padding and the
		   text stays on the same line as everything else. */
		padding-left: calc(var(--space-5) - 2px);
		transition:
			border-color 0.15s,
			box-shadow 0.15s;
	}
	li.mode-ladder {
		border-left-color: var(--color-ladder);
	}
	li.mode-wordle {
		border-left-color: var(--color-wordle);
	}
	li.mode-quordle {
		border-left-color: var(--color-quordle);
	}
	li.mode-absurdle {
		border-left-color: var(--color-absurdle);
	}
	/* Light lifts the card, dark outlines it — see the card tokens in
	   app.css. The left edge keeps its colour either way. */
	li:hover {
		border-top-color: var(--card-border-hover);
		border-right-color: var(--card-border-hover);
		border-bottom-color: var(--card-border-hover);
		box-shadow: var(--shadow-card-hover);
	}
</style>

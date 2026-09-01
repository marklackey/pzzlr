<script lang="ts">
	import { resolve } from '$app/paths';
	import GameList from '$lib/components/GameList.svelte';

	let { data } = $props();

	// Everything on this page is, by definition, starred — so the stars in
	// the list are all on, and clicking one takes the game off the shelf.
	const favoriteIds = $derived(data.games.map((game) => game.id));
</script>

<div class="container">
	<div class="header">
		<h1>Favorites</h1>
		<a class="btn btn-secondary" href={resolve('/explore')}>Find more</a>
	</div>
	<GameList
		games={data.games}
		{favoriteIds}
		emptyMessage="Nothing starred yet — the ☆ on any game keeps it here."
	/>
</div>

<style>
	.header {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
	}
	.header h1 {
		margin: 0;
	}
</style>

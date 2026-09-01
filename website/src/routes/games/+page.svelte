<script lang="ts">
	import { resolve } from '$app/paths';
	import GameList from '$lib/components/GameList.svelte';

	let { data } = $props();
</script>

<div class="container">
	<div class="header">
		<h1>My games</h1>
		<a class="btn btn-primary" href={resolve('/create')}>
			{data.games.length === 0 ? 'Create a game' : 'Create another'}
		</a>
	</div>
	<GameList
		games={data.games}
		favoriteIds={data.favoriteIds}
		emptyMessage="You haven't created any games yet."
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

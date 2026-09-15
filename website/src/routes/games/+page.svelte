<script lang="ts">
	import { resolve } from '$app/paths';
	import GameList from '$lib/components/GameList.svelte';

	let { data } = $props();
</script>

<div class="container">
	<div class="header">
		<h1>My games</h1>
		<a class="create" href={resolve('/create')}> + </a>
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
		vertical-align: center;
		justify-content: space-between;
		gap: var(--space-3);
		/* The list starts here, and a link sitting right on top of the first
		   card reads as part of it. */
		margin-bottom: var(--space-6);
	}
	.header h1 {
		margin: 0;
	}
	/* A plain link rather than a button, set like Create on the nav bar. */
	.create {
		vertical-align: center;
		font-size: 3rem;
		/* font-weight: 700; */
	}
</style>

<script lang="ts">
	import { resolve } from '$app/paths';
	import GameList from '$lib/components/GameList.svelte';

	let { data } = $props();
</script>

<div class="container">
	{#if !data.signedIn}
		<h1>My games</h1>
		<div class="card signed-out">
			<p class="lead">Making your own games needs an account.</p>
			<p>
				With one you can create your own word games — pick the target word, the dictionary, and how
				hard it should be — then share them or embed them anywhere.
			</p>
			<div class="actions">
				<a class="btn btn-primary" href={resolve('/login')}>Sign in or create an account</a>
				<a class="btn btn-secondary" href={resolve('/explore')}>Browse games instead</a>
			</div>
		</div>
	{:else}
		<div class="header">
			<h1>My games</h1>
			<a class="btn btn-primary" href={resolve('/create')}>
				{data.games.length === 0 ? 'Create a game' : 'Create another'}
			</a>
		</div>
		<GameList games={data.games} emptyMessage="You haven't created any games yet." />
	{/if}
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
	.signed-out {
		margin-top: var(--space-4);
	}
	.signed-out p {
		margin: 0 0 var(--space-3);
	}
	.lead {
		font-weight: 600;
		font-size: 1.05rem;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		margin-top: var(--space-4);
	}
</style>

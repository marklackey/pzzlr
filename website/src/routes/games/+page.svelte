<script lang="ts">
	import { resolve } from '$app/paths';
	import GameList from '$lib/components/GameList.svelte';

	let { data } = $props();
</script>

<div class="container">
	<h1>My games</h1>
	<GameList games={data.games} favoriteIds={data.favoriteIds}>
		{#snippet emptyMessage()}
			<span class="first-game"><a href={resolve('/create')}>Create</a> your first game!</span>
		{/snippet}
	</GameList>
</div>

<style>
	h1 {
		margin: 0 0 var(--space-6);
	}
	/* A size under the page title, so an empty shelf reads as an invitation. */
	/* Bold rather than a darker colour: it's already in the darkest ink, and
	   Inter's regular weight reads grey at this size. */
	.first-game {
		font-size: 1.25rem;
		font-weight: 700;
	}
	/* Underlined at rest, like links in prose (app.css): the slate link colour
	   alone is too close to the ink around it to say "link". */
	.first-game a {
		text-decoration: underline;
		text-underline-offset: 0.15em;
	}
</style>

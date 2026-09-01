<script lang="ts">
	import { resolve } from '$app/paths';
	import ExploreGames from '$lib/components/ExploreGames.svelte';

	let { data } = $props();
</script>

<ExploreGames
	games={data.games}
	total={data.total}
	page={data.page}
	pageSize={data.pageSize}
	query={data.query}
	favoriteIds={data.favoriteIds}
	basePath={resolve('/explore')}
/>

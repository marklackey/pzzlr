<script lang="ts">
	import GameList from './GameList.svelte';
	import type { GameRow } from '$lib/types';
	import type { ResolvedPathname } from '$app/types';

	interface Props {
		games: GameRow[];
		total: number;
		page: number;
		pageSize: number;
		query: string;
		/** Path the search form and pagination links submit/point to — pass a resolve()d route. */
		basePath: ResolvedPathname;
	}

	let { games, total, page, pageSize, query, basePath }: Props = $props();

	const totalPages = $derived(Math.max(1, Math.ceil(total / pageSize)));

	// basePath already came from resolve() at the call site, so re-attaching
	// a query string here is safe — cast back to ResolvedPathname to satisfy
	// svelte/no-navigation-without-resolve, which checks the href's type.
	function pageHref(p: number): ResolvedPathname {
		const parts: string[] = [];
		if (query) parts.push(`q=${encodeURIComponent(query)}`);
		if (p > 1) parts.push(`page=${p}`);
		const qs = parts.join('&');
		return (qs ? `${basePath}?${qs}` : basePath) as ResolvedPathname;
	}
</script>

<div class="container">
	<h1>Explore games</h1>

	<form method="get" action={basePath} class="search">
		<input type="search" name="q" placeholder="Search by name or target word" value={query} />
		<button type="submit" class="btn btn-secondary">Search</button>
	</form>

	<GameList {games} emptyMessage={query ? `No games match "${query}".` : 'No games yet.'} />

	{#if totalPages > 1}
		<nav class="pagination">
			{#if page > 1}
				<a class="btn btn-secondary btn-sm" href={pageHref(page - 1)}>Previous</a>
			{:else}
				<span class="btn btn-secondary btn-sm disabled">Previous</span>
			{/if}
			<span class="page-count">Page {page} of {totalPages}</span>
			{#if page < totalPages}
				<a class="btn btn-secondary btn-sm" href={pageHref(page + 1)}>Next</a>
			{:else}
				<span class="btn btn-secondary btn-sm disabled">Next</span>
			{/if}
		</nav>
	{/if}
</div>

<style>
	.search {
		display: flex;
		gap: var(--space-2);
		margin: var(--space-4) 0;
	}
	.search input {
		flex: 1;
	}
	.pagination {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		margin-top: var(--space-6);
	}
	.page-count {
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}
	.disabled {
		opacity: 0.5;
	}
</style>

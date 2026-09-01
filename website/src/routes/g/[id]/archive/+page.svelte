<script lang="ts">
	import { resolve } from '$app/paths';
	import type { ResolvedPathname } from '$app/types';
	import { MODE_LABELS } from '$lib/types';

	let { data } = $props();

	const gameHref = $derived(resolve('/g/[id]', { id: data.config.id }));
	// Built from a resolve()d path, so it's still a real route — cast back to
	// satisfy svelte/no-navigation-without-resolve, same as ExploreGames.
	function dayHref(date: string): ResolvedPathname {
		return `${gameHref}?date=${date}` as ResolvedPathname;
	}

	// Plain calendar dates, formatted in UTC: rendering them in the reader's
	// zone would show the day before to anyone west of it, and the puzzle
	// number beside it would disagree.
	const dayFormat = new Intl.DateTimeFormat('en-US', {
		timeZone: 'UTC',
		weekday: 'long',
		month: 'long',
		day: 'numeric'
	});
	function dayLabel(date: string): string {
		return dayFormat.format(new Date(`${date}T00:00:00Z`));
	}
</script>

<svelte:head>
	<title>Past puzzles · {data.config.name ?? 'Pzzlr'}</title>
</svelte:head>

<div class="container">
	<nav class="crumb">
		<a href={gameHref}>← {data.config.name ?? 'Back to the game'}</a>
	</nav>

	<header class="head">
		<h1>Past puzzles</h1>
		<p class="lede">
			Every day this {MODE_LABELS[data.config.mode].toLowerCase()} has already played through. Open one
			to play it — the answer is a button away once you're there.
		</p>
	</header>

	<ul>
		{#each data.days as day (day.date)}
			<li>
				<a href={dayHref(day.date)}>
					<span class="number">#{day.puzzleNumber}</span>
					<span class="date">{dayLabel(day.date)}</span>
					<span class="go" aria-hidden="true">→</span>
				</a>
			</li>
		{/each}
	</ul>
</div>

<style>
	.crumb {
		font-size: 0.9rem;
		margin-bottom: var(--space-4);
	}
	.head h1 {
		margin: 0 0 var(--space-2);
	}
	.lede {
		margin: 0 0 var(--space-6);
		color: var(--color-text-muted);
		max-width: 34rem;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	li a {
		display: flex;
		align-items: baseline;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		color: var(--color-text);
		text-decoration: none;
	}
	li a:hover {
		border-color: var(--color-primary);
	}
	.number {
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: var(--color-primary);
	}
	.date {
		flex: 1;
	}
	.go {
		color: var(--color-text-muted);
	}
</style>

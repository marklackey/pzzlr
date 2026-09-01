<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { ResolvedPathname } from '$app/types';

	interface Props {
		gameId: string;
		favorited: boolean;
		/** 'icon' is the star alone, for a row in a list; 'labelled' pairs it with a word, for a page that has room. */
		variant?: 'icon' | 'labelled';
	}

	let { gameId, favorited, variant = 'icon' }: Props = $props();

	// Posting to the shared action means the browser lands back here
	// afterwards, so the page it started on has to travel with the form. Path
	// and query only — the action refuses anything that isn't a path on this
	// site (see safeReturnTo).
	const returnTo = $derived(page.url.pathname + page.url.search);

	const label = $derived(favorited ? 'Remove from favorites' : 'Add to favorites');

	/**
	 * The action sends the browser back where it came from, which is nearly
	 * always the page the star is already on — and a navigation to the URL
	 * you're on is otherwise a no-op, so the default handling would leave a
	 * star that had just been toggled still drawn the old way.
	 * `invalidateAll` is what re-runs the load that says which games are
	 * starred; `noScroll` keeps a star halfway down a list from throwing the
	 * page back to the top.
	 */
	const submit: SubmitFunction = () => {
		return async ({ result }) => {
			if (result.type === 'redirect') {
				// Only ever a path on this site — the action validates it before
				// redirecting (see safeReturnTo) — so cast back to
				// ResolvedPathname, which is what
				// svelte/no-navigation-without-resolve checks for.
				await goto(result.location as ResolvedPathname, {
					invalidateAll: true,
					noScroll: true
				});
			} else {
				await applyAction(result);
			}
		};
	};
</script>

<!-- A form rather than a fetch: this is a write, it works without
     JavaScript, and `enhance` keeps it from reloading the page — which on a
     game page would restart the board underneath it. -->
<form method="post" action={`${resolve('/favorites')}?/toggle`} use:enhance={submit}>
	<input type="hidden" name="gameId" value={gameId} />
	<input type="hidden" name="returnTo" value={returnTo} />
	<button
		type="submit"
		class="star"
		class:on={favorited}
		class:labelled={variant === 'labelled'}
		aria-pressed={favorited}
		aria-label={variant === 'icon' ? label : undefined}
		title={label}
	>
		<span aria-hidden="true">{favorited ? '★' : '☆'}</span>
		{#if variant === 'labelled'}
			{favorited ? 'Favorited' : 'Favorite'}
		{/if}
	</button>
</form>

<style>
	form {
		display: contents;
	}
	.star {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-1) var(--space-2);
		border: 1px solid transparent;
		border-radius: var(--radius-sm);
		background: none;
		color: var(--color-text-muted);
		font: inherit;
		font-size: 1.1rem;
		line-height: 1;
		cursor: pointer;
	}
	.star.labelled {
		font-size: 0.9rem;
		border-color: var(--color-border);
		background: var(--color-surface);
	}
	.star:hover {
		color: var(--color-primary);
		border-color: var(--color-border);
	}
	/* Gold once it's on, in both variants — the one place on the site where
	   colour carries a state rather than an action. */
	.star.on {
		color: #d09a1a;
	}
	.star:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 1px;
	}
</style>

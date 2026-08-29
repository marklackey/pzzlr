<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { authClient } from '$lib/auth-client';
	import { resolve } from '$app/paths';

	let { children, data } = $props();

	async function signOut() {
		await authClient.signOut();
		location.href = resolve('/');
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<nav>
	<div class="nav-inner">
		<a class="brand" href={resolve('/')}>🪜 Pzzlr</a>
		<div class="nav-links">
			<a href={resolve('/explore')}>Explore</a>
			{#if data.user}
				<a href={resolve('/games')}>My games</a>
				<button type="button" class="btn btn-secondary btn-sm" onclick={signOut}>Sign out</button>
			{:else}
				<a class="btn btn-primary btn-sm" href={resolve('/login')}>Sign in</a>
			{/if}
		</div>
	</div>
</nav>

{@render children()}

<style>
	nav {
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
	}
	.nav-inner {
		max-width: 40rem;
		margin: 0 auto;
		/* --nav-h (app.css) is the shared source of truth for how tall this
		   bar is, so a page can size itself against "the viewport minus the
		   nav" — the game page needs that to put its keyboard on the bottom
		   edge of the screen. min-height rather than height so an unusually
		   narrow screen can still wrap the links instead of clipping them;
		   the pages doing that math just end up a little taller than exact. */
		min-height: var(--nav-h);
		box-sizing: border-box;
		padding: var(--space-2) var(--space-4);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
		flex-wrap: wrap;
	}
	.brand {
		font-weight: 700;
		color: var(--color-text);
		font-size: 1.05rem;
	}
	.brand:hover {
		text-decoration: none;
		color: var(--color-primary);
	}
	.nav-links {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		font-size: 0.9rem;
	}
	.btn-sm {
		padding: 0.4rem 0.75rem;
		font-size: 0.85rem;
	}
</style>

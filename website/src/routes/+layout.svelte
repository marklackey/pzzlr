<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { authClient } from '$lib/auth-client';
	import { resolve } from '$app/paths';

	let { children, data } = $props();

	let menuOpen = $state(false);

	async function signOut() {
		await authClient.signOut();
		location.href = resolve('/');
	}

	// SvelteKit keeps this layout mounted across client-side navigation, so
	// the menu has to be closed explicitly — following a link inside it
	// wouldn't otherwise reset anything.
	function closeMenu() {
		menuOpen = false;
	}
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') closeMenu();
	}}
/>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<nav>
	<div class="nav-inner">
		<a class="brand" href={resolve('/')} onclick={closeMenu}>🪜 Pzzlr</a>

		<div class="nav-right">
			<!-- Primary destinations stay on the bar where there's room for
			     them; below that they live in the menu like everything else.
			     "My games" shows signed out too: /games explains that making
			     your own needs an account, which introduces the feature better
			     than hiding it until you already have one. -->
			<div class="nav-links">
				<a href={resolve('/explore')}>Explore</a>
				<a href={resolve('/games')}>My games</a>
			</div>

			{#if data.user}
				<button type="button" class="btn btn-secondary btn-sm" onclick={signOut}>Sign out</button>
			{:else}
				<a class="btn btn-primary btn-sm" href={resolve('/login')} onclick={closeMenu}>Sign in</a>
			{/if}

			<button
				type="button"
				class="menu-toggle"
				aria-label="Menu"
				aria-expanded={menuOpen}
				aria-controls="site-menu"
				onclick={() => (menuOpen = !menuOpen)}
			>
				<svg viewBox="0 0 24 24" aria-hidden="true">
					{#if menuOpen}
						<path d="M6 6l12 12M18 6L6 18" />
					{:else}
						<path d="M3 6h18M3 12h18M3 18h18" />
					{/if}
				</svg>
			</button>
		</div>

		{#if menuOpen}
			<!-- Sits under the bar rather than over the page: the game pages
			     size themselves against the viewport, and an overlay would
			     cover the board it's opened from. -->
			<div class="menu" id="site-menu">
				<a class="menu-link narrow-only" href={resolve('/explore')} onclick={closeMenu}>Explore</a>
				<a class="menu-link narrow-only" href={resolve('/games')} onclick={closeMenu}>My games</a>
				<a class="menu-link" href={resolve('/support')} onclick={closeMenu}>Support</a>
				<a class="menu-link" href={resolve('/privacy')} onclick={closeMenu}>Privacy</a>
				<a class="menu-link" href={resolve('/terms')} onclick={closeMenu}>Terms</a>
				<span class="menu-copyright">© {new Date().getFullYear()} Pzzlr</span>
			</div>
		{/if}
	</div>
</nav>

{#if menuOpen}
	<!-- Closes the menu on a click anywhere else, without stealing the click
	     from whatever was under it the way a full-screen overlay would. -->
	<button type="button" class="menu-scrim" tabindex="-1" aria-hidden="true" onclick={closeMenu}
	></button>
{/if}

{@render children()}

<style>
	nav {
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
	}
	.nav-inner {
		position: relative;
	}
	.nav-right {
		display: flex;
		align-items: center;
		gap: var(--space-4);
	}
	.menu-toggle {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		padding: 0;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		color: var(--color-text);
		cursor: pointer;
	}
	.menu-toggle:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}
	.menu-toggle svg {
		width: 1.1rem;
		height: 1.1rem;
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
	}
	.menu {
		position: absolute;
		top: 100%;
		right: var(--space-4);
		z-index: 20;
		min-width: 11rem;
		display: flex;
		flex-direction: column;
		padding: var(--space-2);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-md);
	}
	.menu-link {
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-sm);
		color: var(--color-text);
		font-size: 0.9rem;
	}
	.menu-link:hover {
		background: var(--color-bg);
		color: var(--color-primary);
		text-decoration: none;
	}
	.menu-copyright {
		margin-top: var(--space-2);
		padding: var(--space-2) var(--space-3) 0;
		border-top: 1px solid var(--color-border);
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}
	/* Catches an outside click. Transparent and behind the menu rather than
	   a dimming overlay — the menu is a small dropdown, not a modal. */
	.menu-scrim {
		position: fixed;
		inset: 0;
		z-index: 10;
		border: none;
		padding: 0;
		background: transparent;
		cursor: default;
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

	/* Duplicates of links that are already on the bar at this width — only
	   needed once the bar drops them below 640px. */
	@media (min-width: 640px) {
		.narrow-only {
			display: none;
		}
	}
	@media (max-width: 639px) {
		.nav-links {
			display: none;
		}
	}
	.btn-sm {
		padding: 0.4rem 0.75rem;
		font-size: 0.85rem;
	}
</style>

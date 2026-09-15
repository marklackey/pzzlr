<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import ladderLogo from '$lib/assets/ladder-logo.svg';
	import { authClient } from '$lib/auth-client';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { theme } from '$lib/theme.svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	let { children, data } = $props();

	let menuOpen = $state(false);

	// The pre-paint script in app.html has already applied whatever was
	// stored; this catches the control up with it. Nothing here has to track
	// the device — the stylesheet and the widgets each follow it themselves.
	$effect(() => {
		theme.init();
	});

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

<!-- The link preview is shared by every page: a page can name its own title
     and description, but none of them has an image of its own yet. og:image
     has to be an absolute URL — Facebook and most other scrapers won't
     resolve a relative one. The image and the icons are rendered by
     marketing/render.sh. The .ico is listed first, with a size, so any
     browser that can draw the SVG favicon prefers that one. -->
<svelte:head>
	<link rel="icon" href="/favicon.ico" sizes="32x32" />
	<link rel="icon" href={favicon} type="image/svg+xml" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
	<link rel="manifest" href="/manifest.webmanifest" />
	<link
		rel="preload"
		href="/fonts/Inter-Regular.woff2"
		as="font"
		type="font/woff2"
		crossorigin="anonymous"
	/>
	<link
		rel="preload"
		href="/fonts/Inter-Bold.woff2"
		as="font"
		type="font/woff2"
		crossorigin="anonymous"
	/>
	<meta property="og:site_name" content="Pzzlr" />
	<meta property="og:image" content="{page.url.origin}/og.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta
		property="og:image:alt"
		content="A word ladder climbing from COLD to WARM, one letter at a time."
	/>
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<nav>
	<div class="nav-inner">
		<a class="brand" href={resolve('/')} onclick={closeMenu}>
			<img class="brand-mark" src={ladderLogo} alt="" width="512" height="512" />Pzzlr
		</a>

		<div class="nav-right">
			<!-- Primary destinations stay on the bar where there's room for
			     them; below that they live in the menu like everything else. -->
			<div class="nav-links">
				<a href={resolve('/explore')}>Explore</a>
				{#if data.user}
					<a href={resolve('/favorites')}>Favorites</a>
				{/if}
			</div>

			<!-- A plain link, never dropped into the menu at narrow widths — but
			     what it is depends on who's looking. Signed out it's Create: see
			     /create, which makes the case for an account rather than demanding
			     one. Signed in it's My games, the shelf they came back for, and
			     making another game is a link away once they're on it (see
			     /games). -->
			{#if data.user}
				<a class="nav-link" href={resolve('/games')} onclick={closeMenu}>My games</a>
			{:else}
				<a class="nav-link" href={resolve('/create')} onclick={closeMenu}>Create</a>
			{/if}

			{#if data.user}
				<!-- Off the bar on a phone, where My games and the menu toggle are
				     already using the width — it's in the menu instead. Signing in
				     stays put: a signed-out bar has room, and it's the one thing
				     someone might be there to do. -->
				<button type="button" class="btn btn-secondary btn-sm wide-only" onclick={signOut}>
					Sign out
				</button>
			{:else}
				<a class="btn btn-secondary btn-sm" href={resolve('/login')} onclick={closeMenu}>Sign in</a>
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
				{#if data.user}
					<a class="menu-link narrow-only" href={resolve('/favorites')} onclick={closeMenu}>
						Favorites
					</a>
					<!-- Not narrow-only: the bar shows these players My games
					     instead, so this is where creating another one lives at
					     every width. -->
					<a class="menu-link" href={resolve('/create')} onclick={closeMenu}>Create a game</a>
					<a class="menu-link" href={resolve('/account')} onclick={closeMenu}>Account</a>
				{/if}
				<!-- Shown to everyone: the signed-in player already knows what Pzzlr
				     is, but this is also where someone sends a link to explain it. -->
				<a class="menu-link" href={resolve('/about')} onclick={closeMenu}>About</a>
				<!-- Off the landing page on purpose: someone here to play a game
				     doesn't need to be told they could host one. It's in the menu
				     for the people who came looking for it. -->
				<a class="menu-link" href={resolve('/embed')} onclick={closeMenu}>Embed</a>
				<a class="menu-link" href={resolve('/support')} onclick={closeMenu}>Support</a>
				<a class="menu-link" href={resolve('/privacy')} onclick={closeMenu}>Privacy</a>
				<a class="menu-link" href={resolve('/terms')} onclick={closeMenu}>Terms</a>
				{#if data.user}
					<button type="button" class="menu-link narrow-only" onclick={signOut}>Sign out</button>
				{/if}
				<!-- Below the destinations, above the fine print: a setting, not
				     a place to go. -->
				<div class="menu-divider"></div>
				<ThemeToggle />
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
	/* Sign out is the one menu item that acts rather than navigates, so it's
	   a button wearing a link's clothes. */
	button.menu-link {
		border: none;
		background: none;
		font: inherit;
		font-size: 0.9rem;
		text-align: left;
		cursor: pointer;
	}
	.menu-link:hover {
		background: var(--color-bg);
		color: var(--color-primary);
		text-decoration: none;
	}
	.menu-divider {
		height: 1px;
		margin: var(--space-2) var(--space-4);
		background: var(--color-border);
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
		/* Matched to the landing page's 62rem band, which is the widest column
		   on the site — so the bar lines up with the content there and every
		   narrower page (.container's 40rem, prose's 44rem, the forms) nests
		   inside it. It was 80rem, wider than anything it sat above, which
		   read as the chrome belonging to a different, larger page. Still
		   capped rather than full-bleed so the brand and the actions don't
		   drift to opposite ends of a wide desk. */
		width: 100%;
		max-width: 62rem;
		margin: 0 auto;
		/* --nav-h (app.css) is the shared source of truth for how tall this
		   bar is, so a page can size itself against "the viewport minus the
		   nav" — the game page needs that to put its keyboard on the bottom
		   edge of the screen. min-height rather than height so an unusually
		   narrow screen can still wrap the links instead of clipping them;
		   the pages doing that math just end up a little taller than exact. */
		min-height: var(--nav-h);
		box-sizing: border-box;
		padding: var(--space-3) var(--space-5);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-5);
		flex-wrap: wrap;
	}
	/* The wordmark is sized against the bar's height budget rather than
	   against the links beside it: --nav-h is 5rem and .nav-inner spends
	   var(--space-3) top and bottom, which leaves 56px of content box. At
	   1.95rem on a line-height of 1 the text draws 31px, so it can grow this
	   far without the bar following it — line-height: 1 is what keeps that
	   true, since the inherited 1.6 would put the line box at 50px and leave
	   almost nothing in hand. The ladder's box is set a size up again, at
	   1.15em (36px), the size the emoji it replaced was set at. The drawing
	   sits 4.5% of its box above centre, so it's moved down that much to
	   line up with the letters. It leaves a sixth of the width empty at each
	   side, so the gap is small: that margin already reads as space. */
	.brand {
		display: inline-flex;
		align-items: center;
		gap: 0.07em;
		font-size: 1.95rem;
		font-weight: 550;
		line-height: 1;
		color: var(--color-text);
	}
	.brand-mark {
		width: 1.15em;
		height: 1.15em;
		flex-shrink: 0;
		padding: 0px;
		translate: 0 4.5%;
	}
	.brand:hover {
		text-decoration: none;
		color: var(--color-primary);
	}
	.nav-links {
		display: flex;
		align-items: center;
		gap: var(--space-6);
	}
	/* Heavier than body text: on a bar this tall, links at the body's weight
	   read as a caption running along the top. .nav-link is Create or My
	   games, which sits outside .nav-links so it stays on the bar on phones. */
	.nav-links,
	.nav-link {
		font-size: 1.05rem;
		font-weight: 700;
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
		.wide-only {
			display: none;
		}
	}
	/* The bar's buttons, sized for the bar rather than for a dense form —
	   .btn-sm elsewhere on the site is unaffected, since this is scoped to
	   the layout. The pill itself comes from .btn in app.css: this bar is
	   where the shape started, and it is every button's shape now. The
	   widget's Copy result is sized to match these (see BoardStyles.svelte
	   in the SDK). */
	.btn-sm {
		padding: 0.65rem 1.25rem;
		font-size: 1rem;
	}
	.menu-toggle {
		width: 2.75rem;
		height: 2.75rem;
	}
	.menu-toggle svg {
		width: 1.3rem;
		height: 1.3rem;
	}
	/* Phones keep the compact bar: --nav-h drops back to 3.5rem there, and
	   these are the parts that have to come down with it. */
	@media (max-width: 639px) {
		.nav-inner {
			padding: var(--space-2) var(--space-4);
			gap: var(--space-3);
		}
		.brand {
			font-size: 1.3rem;
		}
		.btn-sm {
			padding: 0.45rem 0.9rem;
			font-size: 0.9rem;
		}
		.menu-toggle {
			width: 2.25rem;
			height: 2.25rem;
		}
		.menu-toggle svg {
			width: 1.1rem;
			height: 1.1rem;
		}
	}
</style>

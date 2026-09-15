<script lang="ts">
	import { resolve } from '$app/paths';

	// One row per game type, so the tag name someone needs is the one they
	// can see rather than something to infer from the list.
	const tags = [
		{ mode: 'ladder', tag: 'pzzlr-ladder' },
		{ mode: 'wordle', tag: 'pzzlr-wordle' },
		{ mode: 'quordle', tag: 'pzzlr-quordle' },
		{ mode: 'absurdle', tag: 'pzzlr-absurdle' }
	];
</script>

<svelte:head>
	<title>Embed a game — Pzzlr</title>
	<meta
		name="description"
		content="Put a Pzzlr game on your own site with a script tag and one element. No iframe, no account needed to play."
	/>
	<meta property="og:title" content="Embed a Pzzlr game" />
	<meta
		property="og:description"
		content="A script tag and one element puts your daily word game inside your own page."
	/>
</svelte:head>

<header>
	<div class="container prose reading page-head">
		<h1>Embed a game</h1>

		<p class="lead">
			A game you've made can run inside your own site — a script tag and one element, on any page
			you can edit.
		</p>
	</div>
</header>

<div class="container prose reading">
	<h2>The snippet</h2>
	<p>
		Open your game and choose <strong>Copy embed snippet</strong>. It gives you both lines, already
		filled in with that game's id:
	</p>

	<pre><code
			>&lt;script type="module"
  src="https://pzzlr.app/sdk/pzzlr-sdk.js"&gt;&lt;/script&gt;

&lt;pzzlr-ladder
  apibase="https://pzzlr.app"
  game="your-game-id"&gt;&lt;/pzzlr-ladder&gt;</code
		></pre>

	<p>
		The script goes in once per page, however many games are on it. The element goes wherever the
		game should appear, and its tag depends on the game's type:
	</p>

	<ul class="tags">
		{#each tags as t (t.tag)}
			<li>
				<span class="badge badge-{t.mode}">{t.mode}</span>
				<code>&lt;{t.tag}&gt;</code>
			</li>
		{/each}
	</ul>

	<h2>Private games</h2>
	<p>
		A private game's snippet carries an extra <code>apikey</code> attribute, which is what lets an unlisted
		game load. Treat it as "not listed" rather than "secret" — the key has to sit in a public page to
		work, so anyone reading your source can see it. Public games need no key.
	</p>

	<h2>What it does on your page</h2>
	<ul>
		<li>
			<strong>No iframe.</strong> It's a custom element, so it takes the width of whatever contains it
			instead of a box you have to size.
		</li>
		<li>
			<strong>It follows your reader.</strong> Light or dark comes from their system setting, not from
			ours, so it matches the page it's sitting in.
		</li>
		<li>
			<strong>No account, no sign-in prompt.</strong> Visitors play anonymously and their progress is
			kept on their own device. Nothing asks them to join Pzzlr.
		</li>
		<li>
			<strong>Just the game.</strong> No navigation, no branding bar, no ads — see
			<a href={resolve('/about')}>about</a>.
		</li>
	</ul>

	<h2>Keeping it fresh</h2>
	<p>
		Nothing to update. The game generates a new puzzle each day on its own, the same one for
		everyone playing it, so the page you embedded it in has something new on it every morning
		without you touching it.
	</p>

	<h2>Editing or removing it</h2>
	<p>
		The embed always plays the game as it stands, so editing the game on Pzzlr changes what your
		visitors see from the next puzzle on. Deleting the two lines removes it; nothing is left behind
		on your page.
	</p>

	<p>
		Stuck on something? <a href="mailto:support@pzzlr.app">support@pzzlr.app</a>, or the
		<a href={resolve('/support')}>support page</a>.
	</p>

	<div class="actions">
		<a class="btn btn-primary" href={resolve('/create')}>Create a game</a>
		<a class="btn btn-secondary" href={resolve('/explore')}>Browse public games</a>
	</div>
</div>

<style>
	.lead {
		font-size: 1.15rem;
		line-height: 1.55;
		color: var(--color-text);
	}
	pre {
		margin: 0 0 var(--space-4);
		padding: var(--space-4);
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border);
		background: var(--color-sunk);
		color: var(--color-text);
		font-size: 0.82rem;
		line-height: 1.6;
		overflow-x: auto;
	}
	code {
		font-size: 0.9em;
	}
	.tags {
		list-style: none;
		margin: 0 0 var(--space-4);
		padding: 0;
		display: grid;
		/* Two, not auto-fit: four packed by min-width land three-across in
		   this column and leave one stranded on its own row. */
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-3);
	}
	.tags li {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		margin: 0;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		margin-top: var(--space-10);
		padding-top: var(--space-8);
		border-top: 1px solid var(--color-border);
	}
</style>

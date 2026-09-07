<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>About — Pzzlr</title>
	<meta
		name="description"
		content="What Pzzlr is, why it exists, and how its daily word games work."
	/>
	<meta property="og:title" content="About Pzzlr" />
	<meta
		property="og:description"
		content="A small tool for making daily word games out of your own words, and putting them wherever you like."
	/>
</svelte:head>

<div class="container prose">
	<h1>About Pzzlr</h1>

	<p class="lead">
		Pzzlr is a small tool for making daily word games — and for putting them somewhere that isn't
		here.
	</p>

	<h2>What it does</h2>
	<p>
		You choose a game type and a word, and set how the puzzle should behave: how long the words are,
		how many guesses a player gets, how obscure the dictionary is allowed to be. From those rules
		Pzzlr generates a fresh puzzle every day at midnight Eastern — a
		<strong>Ladder</strong> that climbs one letter at a time, a <strong>Wordle</strong>, a
		<strong>Quordle</strong>
		of four boards at once, or an <strong>Absurdle</strong> that never picks a secret and dodges for as
		long as it can.
	</p>
	<p>
		Everyone playing a given game gets the same puzzle that day, progress is kept as you go, and
		older puzzles stay in the game's archive. Playing needs no account. Making a game does, so that
		it stays attached to you and editable later.
	</p>

	<h2>Why it exists</h2>
	<p>
		This started with poople.io. It was a good daily puzzle and a habit worth keeping — until the
		ads arrived, and kept arriving, until the game was the smallest thing on the page. The puzzle
		took two minutes; getting to it took longer than playing it.
	</p>
	<p>
		So the first idea was simply an ad-free one: the puzzle, and nothing selling at you around it.
		That still holds. Pzzlr has no advertising, no analytics, and no third-party trackers, and the
		<a href={resolve('/privacy')}>privacy page</a> spells out exactly what is and isn't stored.
	</p>
	<p>
		The second idea came after. If the daily puzzle is worth building, there's no reason it has to
		be one puzzle, of one kind, made by one person, living at one address. So a game here is
		something you make out of your own words, in whichever of the four shapes suits it, with a link
		of its own — and, if you want, a home on <a href={resolve('/embed')}>your own site</a> rather
		than this one. The
		<a href={resolve('/terms')}>terms</a> say the games you make stay yours, commercial use included.
	</p>

	<h2>Get in touch</h2>
	<p>
		Bugs, requests, and awkward questions all go to
		<a href="mailto:support@pzzlr.app">support@pzzlr.app</a>. The
		<a href={resolve('/support')}>support page</a> covers the things people ask most.
	</p>

	<div class="actions">
		<a class="btn btn-primary" href={resolve('/create')}>Create a game</a>
		<a class="btn btn-secondary" href={resolve('/explore')}>Explore games</a>
	</div>
</div>

<style>
	.lead {
		font-size: 1.15rem;
		line-height: 1.55;
		color: var(--color-text);
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

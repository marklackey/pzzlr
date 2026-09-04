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
		Pzzlr generates a fresh puzzle every day at midnight UTC — a
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
		A daily puzzle is one of the few honest reasons for someone to come back to a page tomorrow. The
		usual way to have one is to link away to somebody else's, which sends your reader somewhere else
		and gives you nothing to shape.
	</p>
	<p>
		So the point of Pzzlr is the second half: every game has a link of its own and an embed snippet
		— a script tag and one element — that runs the same game inside your site. No iframe. It takes
		the width of the page it lands in and follows your reader's light or dark mode, so it looks like
		part of what you built rather than a rented box. A private game stays off the Explore list and
		loads only through its own key, which makes it yours in practice as well as in name.
	</p>

	<h2>How it's made</h2>
	<p>
		Pzzlr is an independent project, not a company — built and run by one person, and free to use.
		The puzzle generation runs against real word graphs rather than a scraped list, which is why the
		create form can tell you, before you save, how many puzzles your settings can actually produce
		and warn you when a target word is a dead end.
	</p>
	<p>
		The <a href={resolve('/privacy')}>privacy page</a> says plainly what's stored, and the
		<a href={resolve('/terms')}>terms</a> say what you can do with the games you make: the short version
		is that they stay yours, commercial use included.
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

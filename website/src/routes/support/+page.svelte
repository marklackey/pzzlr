<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>Support — Pzzlr</title>
	<meta
		name="description"
		content="Help with Pzzlr: playing, making games, embedding, and accounts."
	/>
</svelte:head>

<header>
	<div class="container prose reading page-head">
		<h1>Support</h1>
	</div>
</header>

<div class="container prose reading">
	<p>
		Something broken, confusing, or missing? Email
		<a href="mailto:support@pzzlr.app">support@pzzlr.app</a>. Saying which game you were on (its
		link is enough) and what you expected to happen makes it much quicker to sort out.
	</p>

	<h2>Common questions</h2>

	<h3>Why can't I replay today's puzzle?</h3>
	<p>
		Each game has one puzzle a day, shared by everyone playing it, and your progress is saved as you
		go — so reloading picks up where you left off rather than dealing a new board. A new puzzle
		appears each day at midnight US Eastern time.
	</p>

	<h3>Do I need an account to play?</h3>
	<p>
		No. An account is only needed to make your own games, which is what keeps them attached to you
		and editable later.
	</p>

	<h3>How do I put a game on my own site?</h3>
	<p>
		Open the game you made and copy the embed snippet from its page. It's a script tag plus one
		element, and it works on any site. A private game's snippet includes its key, which is what lets
		the embed load an unlisted game.
	</p>

	<h3>What do the dictionary sizes mean?</h3>
	<p>
		They set how obscure a word can be, both for the puzzles a game generates and for the guesses it
		accepts. Common is the friendliest; Max includes the long tail. It's fixed per game, because
		changing it would change which words are valid mid-puzzle.
	</p>

	<h3>Can I change a game after making it?</h3>
	<p>
		Yes — open it and choose Edit. Note that difficulty settings feed the daily generator, so
		editing them changes which puzzle that game produces from then on.
	</p>

	<h3>I want my account or data deleted</h3>
	<p>
		Email <a href="mailto:support@pzzlr.app">support@pzzlr.app</a>. The
		<a href={resolve('/privacy')}>privacy page</a> covers what's stored and what you can ask for.
	</p>

	<h2>Reporting a game</h2>
	<p>
		Anyone can publish a game, and the names and words are theirs, not ours. If you find one being
		used to harass someone or to publish something unlawful, send its link to
		<a href="mailto:support@pzzlr.app">support@pzzlr.app</a> and it will be looked at.
	</p>
</div>

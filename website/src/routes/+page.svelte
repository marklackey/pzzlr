<script lang="ts">
	import { resolve } from '$app/paths';

	// user comes from the root layout's load, merged into this page's data.
	let { data } = $props();

	/**
	 * COLD to WARM, one letter at a time — the shortest possible explanation
	 * of what a ladder is, and it does the job before anyone reads a word of
	 * the copy. Each row names the index that changed so the tile can carry
	 * the ladder hue; -1 on the first, which changed from nothing.
	 */
	const rungs: { word: string; changed: number }[] = [
		{ word: 'COLD', changed: -1 },
		{ word: 'CORD', changed: 2 },
		{ word: 'WORD', changed: 0 },
		{ word: 'WARD', changed: 1 },
		{ word: 'WARM', changed: 3 }
	];

	const modes = [
		{
			key: 'ladder',
			name: 'Ladder',
			blurb: 'Climb from a start word to your target, changing one letter at a time.'
		},
		{
			key: 'wordle',
			name: 'Wordle',
			blurb: 'One secret word, six guesses, and a colour for every letter you place.'
		},
		{
			key: 'quordle',
			name: 'Quordle',
			blurb: 'Four secrets at once, solved from a single shared stream of guesses.'
		},
		{
			key: 'absurdle',
			name: 'Absurdle',
			blurb: 'No secret is ever chosen — the game squirms away and narrows only when cornered.'
		}
	];

	const faqs = [
		{
			q: 'Do players need an account?',
			a: 'No. Anyone with the link can play, and their progress is kept as they go. An account is only needed to make games of your own.'
		},
		{
			q: 'What does it cost?',
			a: 'Nothing. Making games, sharing them, and embedding them in your own site are all free.'
		},
		{
			q: 'Where do the puzzles come from?',
			a: 'You set the rules — word length, difficulty, and how obscure the dictionary gets — and Pzzlr generates a fresh puzzle inside them each day at midnight UTC. Everyone playing that game gets the same one.'
		},
		{
			q: 'Can I keep a game to myself?',
			a: 'Yes. A private game stays off the Explore list and loads through its own embed key, so it lives on your site and nowhere else.'
		},
		{
			q: 'Will it fit my site?',
			a: 'It follows the page it lands in — a script tag and one element, no iframe, and it takes its cue from your visitor’s light or dark mode.'
		}
	];
</script>

<svelte:head>
	<title>Pzzlr — make your own daily word game</title>
	<meta
		name="description"
		content="Pick a word, pick a game type, and Pzzlr builds a fresh puzzle from it every day — with a link to share and a snippet to embed it in your own site."
	/>
	<meta property="og:title" content="Pzzlr — make your own daily word game" />
	<meta
		property="og:description"
		content="Ladder, Wordle, Quordle, and Absurdle games you can build from your own words and put anywhere."
	/>
	<meta property="og:type" content="website" />
</svelte:head>

<!-- Hero. One idea, one sentence under it, and the two things a first-time
     visitor could plausibly want to do — make one, or try one. -->
<header class="hero">
	<div class="hero-inner">
		<div class="hero-copy">
			<p class="eyebrow">Daily word games, yours to build</p>
			<h1>Make a word game out of any word you like</h1>
			<p class="lead">
				Choose a game type and a word. Pzzlr generates a fresh puzzle from it every day, gives it a
				link anyone can play, and hands you a snippet to drop it into your own site.
			</p>
			<!-- Same split the nav bar makes: someone signed in came here by
			     the logo and wants their shelf, not an argument for an account
			     they already have. -->
			{#if data.user}
				<div class="hero-actions">
					<a class="btn btn-primary btn-lg" href={resolve('/games')}>My games</a>
					<a class="btn btn-secondary btn-lg" href={resolve('/create')}>Create a game</a>
				</div>
			{:else}
				<div class="hero-actions">
					<a class="btn btn-primary btn-lg" href={resolve('/create')}>Create a game</a>
					<a class="btn btn-secondary btn-lg" href={resolve('/explore')}>Play one first</a>
				</div>
				<p class="hero-note">Free. No account needed to play.</p>
			{/if}
		</div>

		<!-- Shows rather than tells: the ladder solving itself in five rows.
		     Decorative to a screen reader, which gets the sentence under it
		     instead — the tiles read as loose letters out of context. -->
		<figure class="hero-demo">
			<div class="rungs" aria-hidden="true">
				{#each rungs as rung (rung.word)}
					<div class="rung">
						{#each rung.word.split('') as letter, i (i)}
							<span class="tile" class:changed={i === rung.changed}>{letter}</span>
						{/each}
					</div>
				{/each}
			</div>
			<!-- The tiles are hidden from a screen reader — loose letters out of
			     context read as noise — so the caption carries their meaning. -->
			<figcaption>A ladder from COLD to WARM, one letter at a time.</figcaption>
		</figure>
	</div>
</header>

<main>
	<!-- Four types, four hues. The colour a game type wears here is the same
	     one it wears on its badge in a listing and inside the widget. -->
	<section class="section">
		<div class="section-inner">
			<h2>Four kinds of puzzle</h2>
			<p class="section-lead">
				Every game is built from words you choose, and plays the same way on a phone as on a desk.
			</p>
			<ul class="modes">
				{#each modes as mode (mode.key)}
					<li class="card mode mode-{mode.key}">
						<span class="badge badge-{mode.key}">{mode.name}</span>
						<p>{mode.blurb}</p>
					</li>
				{/each}
			</ul>
		</div>
	</section>

	<section class="section section-sunk">
		<div class="section-inner">
			<h2>How it works</h2>
			<ol class="steps">
				<li>
					<span class="step-n">1</span>
					<div>
						<h3>Set the rules</h3>
						<p>
							Pick the type, the word, how long it is, and how obscure the dictionary is allowed to
							get. Pzzlr tells you as you go how many puzzles your settings can actually produce.
						</p>
					</div>
				</li>
				<li>
					<span class="step-n">2</span>
					<div>
						<h3>A new puzzle every day</h3>
						<p>
							Your game deals one puzzle a day, the same for everyone playing it, and keeps each
							player's progress so a reload picks up where they left off. Yesterday's stay in the
							archive.
						</p>
					</div>
				</li>
				<li>
					<span class="step-n">3</span>
					<div>
						<h3>Share it or embed it</h3>
						<p>
							Every game has a link of its own. Copy its snippet and the same game runs inside your
							site — a script tag and one element, no iframe.
						</p>
					</div>
				</li>
			</ol>
		</div>
	</section>

	<section class="section">
		<div class="section-inner embed">
			<div>
				<h2>It goes on your own site</h2>
				<p class="section-lead">
					A daily puzzle is a reason to come back tomorrow. Put yours on a homepage, a newsletter
					archive, a docs page, or a class site — it inherits the page's width and follows your
					reader's light or dark mode.
				</p>
				<a class="btn btn-secondary" href={resolve('/explore')}>See one running</a>
			</div>
			<pre class="snippet"><code
					>&lt;script type="module"
  src="https://pzzlr.app/sdk/pzzlr-sdk.js"&gt;&lt;/script&gt;

&lt;pzzlr-ladder
  apibase="https://pzzlr.app"
  game="your-game-id"&gt;&lt;/pzzlr-ladder&gt;</code
				></pre>
		</div>
	</section>

	<section class="section section-sunk">
		<div class="section-inner faq">
			<h2>Questions</h2>
			<dl>
				{#each faqs as faq (faq.q)}
					<div class="faq-item">
						<dt>{faq.q}</dt>
						<dd>{faq.a}</dd>
					</div>
				{/each}
			</dl>
			<p class="faq-more">
				More in <a href={resolve('/support')}>support</a>, or read
				<a href={resolve('/about')}>what Pzzlr is</a>.
			</p>
		</div>
	</section>

	<!-- The last thing on the page is the first thing it asked for. No
	     heading or pitch above it: the page has just spent five sections
	     making the case, and the buttons say where each one goes. -->
	<section class="section closer">
		<div class="section-inner">
			<div class="hero-actions">
				<a class="btn btn-primary btn-lg" href={resolve('/create')}>Create a game</a>
				<a class="btn btn-secondary btn-lg" href={resolve('/explore')}>Browse public games</a>
			</div>
		</div>
	</section>
</main>

<style>
	/* Every band is full-bleed so backgrounds reach the edges, with the text
	   held to a readable column inside. .container is the app's 40rem column
	   and too narrow for a marketing row, so these pages set their own. */
	.section-inner,
	.hero-inner {
		width: 100%;
		max-width: 62rem;
		margin: 0 auto;
		padding: 0 var(--space-5);
		box-sizing: border-box;
	}

	.hero {
		padding: var(--space-12) 0 var(--space-10);
		border-bottom: 1px solid var(--color-border);
		background: linear-gradient(180deg, var(--color-primary-soft), var(--color-bg) 70%);
	}
	.hero-inner {
		display: grid;
		grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
		align-items: center;
		gap: var(--space-10);
	}
	.hero-copy {
		max-width: 34rem;
	}
	.eyebrow {
		margin: 0 0 var(--space-3);
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-accent);
	}
	.hero h1 {
		font-size: clamp(2rem, 5vw, 3rem);
		margin-bottom: var(--space-4);
	}
	.lead {
		font-size: 1.15rem;
		line-height: 1.55;
		margin: 0 0 var(--space-6);
	}
	.hero-actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
	}
	.btn-lg {
		padding: 0.75rem 1.4rem;
		font-size: 1rem;
	}
	.hero-note {
		margin: var(--space-4) 0 0;
		font-size: 0.9rem;
		color: var(--color-text-muted);
	}

	.hero-demo {
		margin: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-5);
	}
	.hero-demo figcaption {
		font-size: 0.9rem;
		color: var(--color-text-muted);
		text-align: center;
	}
	.rungs {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	.rung {
		display: flex;
		gap: var(--space-2);
	}
	.tile {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 3rem;
		height: 3rem;
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border-strong);
		background: var(--color-surface);
		box-shadow: var(--shadow-sm);
		font-size: 1.35rem;
		font-weight: 700;
		letter-spacing: 0.02em;
	}
	/* The one letter that moved on this rung — the whole rule, in colour. */
	.tile.changed {
		background: var(--color-ladder);
		border-color: var(--color-ladder);
		color: var(--color-primary-contrast);
	}
	.section {
		padding: var(--space-12) 0;
	}
	.section-sunk {
		background: var(--color-surface);
		border-block: 1px solid var(--color-border);
	}
	.section h2 {
		font-size: 1.6rem;
		margin-bottom: var(--space-3);
	}
	.section-lead {
		max-width: 42rem;
		font-size: 1.05rem;
		margin: 0 0 var(--space-8);
	}

	.modes {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		/* Counted rather than auto-fit: four cards packed by min-width land on
		   three-across at most desktop widths, which leaves one card sitting
		   alone under the row. */
		grid-template-columns: 1fr;
		gap: var(--space-4);
	}
	@media (min-width: 560px) {
		.modes {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (min-width: 1040px) {
		.modes {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}
	.mode {
		/* A hairline of the type's own colour, so the four cards are told
		   apart at a glance rather than only by their badges. */
		border-top: 3px solid var(--color-border);
	}
	.mode-ladder {
		border-top-color: var(--color-ladder);
	}
	.mode-wordle {
		border-top-color: var(--color-wordle);
	}
	.mode-quordle {
		border-top-color: var(--color-quordle);
	}
	.mode-absurdle {
		border-top-color: var(--color-absurdle);
	}
	.mode p {
		margin: var(--space-3) 0 0;
	}

	.steps {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-8);
	}
	@media (min-width: 900px) {
		.steps {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
	.steps li {
		display: flex;
		gap: var(--space-4);
		align-items: flex-start;
	}
	.step-n {
		flex: none;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border-radius: 999px;
		background: var(--color-accent-soft);
		color: var(--color-accent);
		font-weight: 700;
	}
	.steps h3 {
		font-size: 1.05rem;
		margin: 0 0 var(--space-2);
	}
	.steps p {
		margin: 0;
	}

	.embed {
		display: grid;
		/* Deliberately generous: the code block is only readable when it can
		   hold its longest line, so the pair stacks rather than squeezing it
		   into a horizontal scroll. */
		grid-template-columns: repeat(auto-fit, minmax(25rem, 1fr));
		gap: var(--space-8);
		align-items: center;
	}
	.snippet {
		margin: 0;
		padding: var(--space-4);
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border);
		background: var(--color-sunk);
		color: var(--color-text);
		font-size: 0.82rem;
		line-height: 1.6;
		overflow-x: auto;
	}

	.faq dl {
		margin: 0;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
		gap: var(--space-6);
	}
	.faq-item dt {
		font-weight: 700;
		margin-bottom: var(--space-2);
	}
	.faq-item dd {
		margin: 0;
		color: var(--color-text-muted);
		line-height: 1.6;
	}
	.faq-more {
		margin: var(--space-8) 0 0;
	}

	.closer .hero-actions {
		justify-content: center;
	}

	@media (max-width: 780px) {
		.hero {
			padding-top: var(--space-8);
		}
		.hero-inner {
			grid-template-columns: 1fr;
			gap: var(--space-8);
		}
		.section {
			padding: var(--space-10) 0;
		}
		.tile {
			width: 2.5rem;
			height: 2.5rem;
			font-size: 1.15rem;
		}
	}
</style>

<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>Terms — Pzzlr</title>
	<meta name="description" content="The terms for using Pzzlr and for embedding its games." />
</svelte:head>

<div class="container prose">
	<h1>Terms of use</h1>
	<p class="updated">Last updated 29 August 2026</p>

	<p>
		These terms cover using Pzzlr, making games with it, and embedding those games elsewhere. Using
		the site means accepting them.
	</p>

	<h2>Your account</h2>
	<p>
		Playing needs no account; making your own games does. Keep your sign-in details to yourself —
		anything done through your account is treated as done by you. Tell us if you think someone else
		has access to it.
	</p>
	<p>You need to be at least 13 to create an account.</p>

	<h2>Games you make</h2>
	<p>
		Games you create stay yours. By publishing one you allow Pzzlr to host it and show it to whoever
		opens its link or an embed of it, which is the whole point of publishing. A public game is
		listed on the Explore page and playable by anyone.
	</p>
	<p>
		A private game is unlisted and needs its embed key, which is a convenience rather than a
		security boundary: the key has to be pasted into a public page to work, so treat "private" as
		"not listed", not as "secret".
	</p>
	<p>
		Don't use game names or words to harass anyone, to impersonate anyone, or to publish anything
		unlawful. Games that do can be removed.
	</p>

	<h2>Embedding</h2>
	<p>
		You're welcome to embed your games in your own site, including a commercial one. Please don't
		present the game as though you built the engine, and don't try to work around the limits of a
		private game's key.
	</p>

	<h2>Fair use of the service</h2>
	<p>
		Don't attempt to break, overload, or probe the service, work around the guess rules, or extract
		answers by means other than playing. Automated access beyond ordinary play isn't permitted.
	</p>

	<h2>Availability</h2>
	<p>
		Pzzlr is provided as it is, without a guarantee that it will be available, uninterrupted, or
		error-free, and without warranties to the extent the law allows. It's a word game — please don't
		rely on it for anything that matters. Features may change or be withdrawn, and an account may be
		suspended for breaking these terms.
	</p>
	<p>
		To the extent the law allows, Pzzlr isn't liable for indirect or consequential loss arising from
		using it.
	</p>

	<h2>Ending it</h2>
	<p>
		You can stop using Pzzlr whenever you like, and ask for your account to be deleted — see the
		<a href={resolve('/privacy')}>privacy page</a> for how.
	</p>

	<h2>Changes</h2>
	<p>
		These terms may change; the date at the top will change with them. Continuing to use Pzzlr after
		that means accepting the revised version.
	</p>

	<h2>Contact</h2>
	<p>
		Questions about these terms: <a href="mailto:support@pzzlr.app">support@pzzlr.app</a>.
	</p>
</div>

<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>Privacy — Pzzlr</title>
	<meta name="description" content="What Pzzlr stores, why, and how to have it deleted." />
</svelte:head>

<header>
	<div class="container prose reading page-head">
		<h1>Privacy</h1>
		<p class="updated">Last updated 29 August 2026</p>
	</div>
</header>

<div class="container prose reading">
	<p>
		Pzzlr is a word game. It has no advertising, no analytics, and no third-party trackers, and it
		doesn't sell or share your information. This page describes everything it actually stores.
	</p>

	<h2>What's stored</h2>

	<h3>If you play, but don't sign in</h3>
	<p>
		Playing needs no account. To keep a day's puzzle from restarting every time you reload, your
		browser generates a random identifier and keeps it in local storage. The site stores that
		identifier alongside the words you've guessed and whether you finished.
	</p>
	<p>
		That identifier isn't linked to a name, an email, or an account, and it isn't used to track you
		between sites. Clearing your browser's site data removes it, which also means the next puzzle
		you open starts fresh.
	</p>

	<h3>If you create an account</h3>
	<ul>
		<li>Your email address and display name.</li>
		<li>
			A hashed version of your password, if you signed up with one. Passwords are never stored in a
			readable form.
		</li>
		<li>
			If you signed in with Google or Apple, the account identifier and access tokens they return,
			so the connection keeps working. Pzzlr only ever asks them for your name and email address.
		</li>
		<li>
			For each active sign-in: a session token, the IP address and browser user-agent it was created
			from, and when it expires.
		</li>
		<li>
			Any games you create, including their names and settings, and the keys that let a private game
			be embedded.
		</li>
	</ul>

	<h2>Cookies and local storage</h2>
	<p>
		One cookie, holding your sign-in session. It exists so you stay signed in, it's set only once
		you sign in, and there is nothing to opt into or out of, which is why the site has no cookie
		banner.
	</p>
	<p>
		Local storage holds the puzzle identifier described above, and small display preferences. None
		of it leaves your browser except the puzzle identifier, which is sent so your progress can be
		saved.
	</p>

	<h2>Who else is involved</h2>
	<ul>
		<li>
			<strong>Cloudflare</strong> hosts the site and its database, and so processes everything above on
			Pzzlr's behalf.
		</li>
		<li>
			<strong>Google</strong> and <strong>Apple</strong>, only if you choose to sign in with them,
			and only for that. Their own privacy policies cover what they do with a sign-in request.
		</li>
	</ul>
	<p>Nobody else receives your information, and it is not sold or used for advertising.</p>

	<h2>Deleting your information</h2>
	<p>
		You can delete any game you've made from its own page, at any time. To delete your whole
		account, email <a href="mailto:support@pzzlr.app">support@pzzlr.app</a> and we'll remove it, along
		with the games belonging to it. You can also ask for a copy of what's stored about you.
	</p>
	<p>
		Anonymous puzzle progress isn't tied to an account, so it can't be looked up by name — clear
		your browser's site data to remove it.
	</p>

	<h2>Children</h2>
	<p>
		Pzzlr isn't directed at children under 13, and accounts aren't knowingly created for them. If
		you believe a child has created one, email us and it will be removed.
	</p>

	<h2>Changes</h2>
	<p>
		If this page changes in a way that affects what's stored or who it's shared with, the date at
		the top will change with it.
	</p>

	<h2>Contact</h2>
	<p>
		Questions about any of this: <a href="mailto:support@pzzlr.app">support@pzzlr.app</a>, or see
		the
		<a href={resolve('/support')}>support page</a>.
	</p>
</div>

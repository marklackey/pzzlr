<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { resolve } from '$app/paths';

	let error = $state('');
	let loading = $state(false);
	let mode = $state<'signin' | 'signup'>('signin');

	let email = $state('');
	let password = $state('');
	let name = $state('');

	async function signIn(provider: 'google' | 'apple') {
		error = '';
		const { error: signInError } = await authClient.signIn.social({
			provider,
			callbackURL: '/create'
		});
		if (signInError) {
			error = `${provider} sign-in failed: ${signInError.message ?? 'not configured on this server'}`;
		}
	}

	async function submitEmail(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		loading = true;
		const { error: authError } =
			mode === 'signin'
				? await authClient.signIn.email({ email, password })
				: await authClient.signUp.email({ email, password, name });
		loading = false;
		if (authError) {
			error = authError.message ?? `${mode === 'signin' ? 'sign in' : 'sign up'} failed`;
			return;
		}
		location.href = resolve('/create');
	}
</script>

<div class="container narrow">
	<h1>Sign in</h1>
	<p>Sign in to create your own Pzzlr games.</p>

	<form class="card" onsubmit={submitEmail}>
		{#if mode === 'signup'}
			<label>
				Name
				<input bind:value={name} required placeholder="e.g. Ada" />
			</label>
		{/if}
		<label>
			Email
			<input type="email" bind:value={email} required />
		</label>
		<label>
			Password
			<input type="password" bind:value={password} required minlength="8" />
		</label>
		<button type="submit" class="btn btn-primary" disabled={loading}>
			{mode === 'signin' ? 'Sign in' : 'Create account'}
		</button>
		<button
			type="button"
			class="link-button"
			onclick={() => (mode = mode === 'signin' ? 'signup' : 'signin')}
		>
			{mode === 'signin' ? "Don't have an account? Create one" : 'Already have an account? Sign in'}
		</button>
	</form>

	<div class="divider">or</div>

	<!-- Both buttons follow the provider's own sign-in branding rules rather
	     than this site's button styles: Google's white/#747775-outlined button
	     with the four-colour mark, Apple's solid black one. Each provider
	     requires its own button to look like this, so they deliberately don't
	     match each other (or our .btn) — and the mark, label, and colours here
	     shouldn't be restyled to fit the page. -->
	<div class="providers">
		<button type="button" class="provider-btn google" onclick={() => signIn('google')}>
			<svg class="mark" viewBox="0 0 48 48" aria-hidden="true">
				<path
					fill="#EA4335"
					d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
				/>
				<path
					fill="#4285F4"
					d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
				/>
				<path
					fill="#FBBC05"
					d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
				/>
				<path
					fill="#34A853"
					d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
				/>
			</svg>
			<span>Sign in with Google</span>
		</button>
		<button type="button" class="provider-btn apple" onclick={() => signIn('apple')}>
			<svg class="mark" viewBox="0 0 384 512" aria-hidden="true">
				<path
					fill="currentColor"
					d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"
				/>
			</svg>
			<span>Sign in with Apple</span>
		</button>
	</div>

	{#if error}
		<p class="error-text">{error}</p>
	{/if}
</div>

<style>
	.narrow {
		max-width: 22rem;
	}
	form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		margin-top: var(--space-4);
	}
	.link-button {
		background: none;
		border: none;
		color: var(--color-primary);
		font-size: 0.85rem;
		cursor: pointer;
		padding: 0;
		text-align: left;
	}
	.link-button:hover {
		text-decoration: underline;
	}
	.divider {
		text-align: center;
		color: var(--color-text-muted);
		font-size: 0.85rem;
		margin: var(--space-4) 0;
	}
	.providers {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		margin-top: var(--space-4);
	}
	/* Shared shell only — the 40px height, mark size and label placement are
	   common to both providers' specs. Everything that differs (colour,
	   border, font) is set per provider below. */
	.provider-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		width: 100%;
		height: 2.5rem;
		padding: 0 0.75rem;
		border-radius: var(--radius-sm);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
	}
	.provider-btn .mark {
		width: 1.125rem;
		height: 1.125rem;
		flex-shrink: 0;
	}
	.google {
		background: #fff;
		color: #1f1f1f;
		border: 1px solid #747775;
		font-family:
			Roboto,
			-apple-system,
			BlinkMacSystemFont,
			sans-serif;
	}
	.google:hover {
		background: #f8faff;
		border-color: #1f1f1f;
	}
	.apple {
		background: #000;
		color: #fff;
		border: 1px solid #000;
		font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
	}
	.apple:hover {
		background: #1a1a1a;
	}
	/* Apple's mark sits optically low against a cap-height label unless it's
	   nudged up a touch. */
	.apple .mark {
		margin-top: -0.1rem;
	}
</style>

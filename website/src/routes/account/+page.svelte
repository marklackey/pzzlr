<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();

	let newEmail = $state('');
	let loading = $state(false);
	let error = $state('');
	/** Set once a confirmation link is on its way, and says where it went. */
	let sentTo = $state('');

	async function changeEmail(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		sentTo = '';
		loading = true;
		const { error: authError } = await authClient.changeEmail({
			newEmail,
			callbackURL: '/account'
		});
		loading = false;
		if (authError) {
			error = authError.message ?? 'could not change that email';
			return;
		}
		// The address on the account doesn't move until the link in that mail
		// is used, so nothing on this page changes yet — say so rather than
		// showing the new address as though it had taken.
		sentTo = data.email;
		newEmail = '';
		await invalidateAll();
	}

	async function resendVerification() {
		error = '';
		sentTo = '';
		loading = true;
		const { error: authError } = await authClient.sendVerificationEmail({
			email: data.email,
			callbackURL: '/account'
		});
		loading = false;
		if (authError) {
			error = authError.message ?? 'could not send that again';
			return;
		}
		sentTo = data.email;
	}
</script>

<div class="container narrow">
	<h1>Account</h1>

	<div class="card">
		<dl class="summary">
			{#if data.name}
				<div>
					<dt>Name</dt>
					<dd>{data.name}</dd>
				</div>
			{/if}
			<div>
				<dt>Email</dt>
				<dd>
					{data.email}
					{#if data.emailVerified}
						<span class="badge verified">Verified</span>
					{:else}
						<span class="badge">Unverified</span>
					{/if}
				</dd>
			</div>
		</dl>

		{#if !data.emailVerified}
			<!-- Reachable for a social sign-in that arrived unverified, or an
			     account made before verification was required. -->
			<p class="note">
				This address hasn't been confirmed yet.
				<button type="button" class="link-button" onclick={resendVerification} disabled={loading}>
					Send the link again
				</button>
			</p>
		{/if}
	</div>

	<h2>Change email</h2>
	<form class="card" onsubmit={changeEmail}>
		<p class="note">
			{#if data.emailVerified}
				We'll email <strong>{data.email}</strong> to approve the change, then email the new address to
				confirm it can be reached. Your address only moves once both links are used — so neither a borrowed
				session nor an address you mistyped can take the account away from you.
			{:else}
				We'll email the new address to confirm you can reach it, and your address only moves once
				you follow that link. There's no approval step at the old address, since nobody has shown
				they can read it.
			{/if}
		</p>
		<label>
			New email
			<input type="email" bind:value={newEmail} required />
		</label>
		<button type="submit" class="btn btn-primary" disabled={loading}>Send confirmation</button>
	</form>

	{#if sentTo}
		<p class="sent">Sent to {sentTo}. Check your inbox to carry on.</p>
	{/if}
	{#if error}
		<p class="error-text">{error}</p>
	{/if}
</div>

<style>
	.narrow {
		max-width: 26rem;
	}
	h2 {
		margin-top: var(--space-5);
	}
	.summary {
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}
	.summary div {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-2);
	}
	dt {
		color: var(--color-text-muted);
		font-size: 0.9rem;
	}
	dd {
		margin: 0;
		font-weight: 600;
	}
	.badge {
		margin-left: var(--space-2);
		padding: 0.1rem 0.45rem;
		border-radius: var(--radius-sm);
		background: var(--color-bg);
		color: var(--color-text-muted);
		font-size: 0.75rem;
		font-weight: 700;
	}
	.badge.verified {
		background: var(--color-success-bg);
		color: var(--color-success);
	}
	form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		margin-top: var(--space-4);
	}
	.note {
		margin: 0;
		color: var(--color-text-muted);
		font-size: 0.85rem;
	}
	.link-button {
		background: none;
		border: none;
		color: var(--color-primary);
		font-size: inherit;
		cursor: pointer;
		padding: 0;
	}
	.link-button:hover {
		text-decoration: underline;
	}
	.sent {
		color: var(--color-success);
		font-size: 0.9rem;
	}
</style>

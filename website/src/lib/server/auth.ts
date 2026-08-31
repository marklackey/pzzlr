import { env } from '$env/dynamic/private';
import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { apiKey } from '@better-auth/api-key';
import { getRequestEvent } from '$app/server';
import { getDb } from '$lib/server/db';
import { emailChangeEmail, sendEmail, verificationEmail } from '$lib/server/email';
import { importPKCS8, SignJWT } from 'jose';

// Apple doesn't take a static client secret — it takes a JWT you sign
// yourself with the private key from your Sign in with Apple key, valid for
// at most 6 months. Rather than making dev regenerate and redeploy that JWT
// by hand on a timer, we mint a fresh one (short-lived; well under the cap)
// from the raw key material every time the server starts.
async function appleClientSecret() {
	if (!env.APPLE_CLIENT_ID || !env.APPLE_TEAM_ID || !env.APPLE_KEY_ID || !env.APPLE_PRIVATE_KEY) {
		return undefined;
	}
	const privateKey = await importPKCS8(env.APPLE_PRIVATE_KEY.replace(/\\n/g, '\n'), 'ES256');
	return new SignJWT({})
		.setProtectedHeader({ alg: 'ES256', kid: env.APPLE_KEY_ID })
		.setIssuer(env.APPLE_TEAM_ID)
		.setIssuedAt()
		.setExpirationTime('30d')
		.setAudience('https://appleid.apple.com')
		.setSubject(env.APPLE_CLIENT_ID)
		.sign(privateKey);
}

// Only registers a provider once both its env vars are actually set, so
// local dev without any OAuth apps configured yet still boots cleanly —
// it just has zero working sign-in buttons until credentials are added.
async function configuredProviders() {
	const providers: Record<string, { clientId: string; clientSecret: string }> = {};

	if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
		providers.google = { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET };
	}
	const appleSecret = await appleClientSecret();
	if (env.APPLE_CLIENT_ID && appleSecret) {
		providers.apple = { clientId: env.APPLE_CLIENT_ID, clientSecret: appleSecret };
	}

	return providers;
}

async function buildAuth() {
	return betterAuth({
		baseURL: env.ORIGIN,
		secret: env.BETTER_AUTH_SECRET,
		database: drizzleAdapter(getDb(), { provider: 'sqlite' }),
		// Works with zero setup (no provider app / API keys needed), unlike the
		// social providers below — the fallback sign-in that's always available.
		emailAndPassword: {
			enabled: true,
			// No session until the address is confirmed. An address nobody has
			// proved they can read is worth very little — it can't be used to
			// recover the account, and it lets one person mint accounts under
			// other people's addresses. Only affects this sign-in method:
			// Google and Apple have already done this check, and better-auth
			// records their users as verified on the way in.
			requireEmailVerification: true
		},
		emailVerification: {
			sendOnSignUp: true,
			// A signed-up-but-never-verified account is otherwise a dead end:
			// the link expires, and signing in is exactly when someone notices
			// they never clicked it. This re-sends on that attempt, so the way
			// out is to try again rather than to guess.
			sendOnSignIn: true,
			// Clicking the link is proof enough — making them then type the
			// password they just set is friction with nothing behind it.
			autoSignInAfterVerification: true,
			sendVerificationEmail: async ({ user, url }) => {
				await sendEmail({ to: user.email, ...verificationEmail(url) });
			}
		},
		user: {
			changeEmail: {
				enabled: true,
				// Confirmation goes to the address currently on the account,
				// not the new one — better-auth's flow, and the right way
				// round: the person who can read the old address is the one
				// who has to agree to lose it, which is what stops someone
				// with a borrowed session from walking off with the account.
				// The new address only lands once that link is used.
				sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
					await sendEmail({ to: user.email, ...emailChangeEmail(url, newEmail) });
				}
			}
		},
		socialProviders: await configuredProviders(),
		// Apple posts the sign-in callback back to your redirect URI from its own
		// origin (response_mode=form_post), so that origin has to be trusted
		// explicitly or the callback gets rejected even with valid credentials.
		trustedOrigins: ['https://appleid.apple.com'],
		plugins: [
			// Backs private games: each one gets its own key (permissions scoped
			// to { game: [gameId] }), issued/revoked from src/lib/server/embed-key.ts
			// rather than left to expire naturally, so "make it public again"
			// reliably cuts off the old embed.
			apiKey({
				defaultKeyLength: 32,
				maximumNameLength: 64, // long enough for "game:<uuid>", our naming scheme
				rateLimit: { enabled: true, timeWindow: 60_000, maxRequests: 120 }
			}),
			sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
		]
	});
}

let cachedAuth: Awaited<ReturnType<typeof buildAuth>> | undefined;

// Same reasoning as getDb in $lib/server/db: the D1 binding buildAuth's
// drizzle adapter needs (via getDb) isn't available until a request has
// actually arrived at the Worker, so the whole betterAuth() instance is
// built lazily on first use rather than at module load, then reused for
// the life of the Worker instance. Only a successful build is cached, so a
// transient failure doesn't wedge every later request in the same instance.
export async function getAuth() {
	if (!cachedAuth) cachedAuth = await buildAuth();
	return cachedAuth;
}

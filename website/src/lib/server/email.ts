import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';

export interface OutgoingEmail {
	to: string;
	subject: string;
	text: string;
	html: string;
}

/**
 * Sends one transactional email through the Cloudflare Email Service
 * binding declared in wrangler.jsonc — no third-party mail provider and no
 * API key, since this app already runs on Workers behind Cloudflare DNS.
 *
 * Setup that isn't in this repo: pzzlr.app has to be onboarded as a sending
 * domain in the dashboard (Email Service → sending domains, which adds the
 * SPF/DKIM/DMARC records). Until that's done the binding will only deliver
 * to destination addresses verified by hand in the dashboard, which is no
 * use for verifying a stranger's sign-up — so onboard the domain before
 * deploying anything that gates on a verification email arriving.
 *
 * In local dev the message goes to the server console instead, which keeps
 * the whole verification flow clickable on localhost without credentials —
 * the link is right there in the terminal. That's keyed off `dev` rather
 * than off a missing binding, because `vite dev` does hand you an EMAIL
 * binding: miniflare provides one, there's no Email Service behind it, and
 * wrangler's vars (MAIL_FROM) aren't in scope for it either, so a send
 * there fails rather than doing nothing.
 *
 * A failure in production does throw. Note that better-auth calls this as a
 * background task on sign-up, so a throw is logged rather than failing the
 * request — someone can be told to check their email for a message that
 * never left. Worth watching the Worker's logs after any change to the
 * sending domain.
 */
export async function sendEmail(message: OutgoingEmail): Promise<void> {
	const binding = getRequestEvent().platform?.env.EMAIL;
	if (dev || !binding) {
		console.info(
			`[email] not sent (local dev) — would have gone to ${message.to}\n` +
				`  subject: ${message.subject}\n` +
				`  ${message.text.replace(/\n/g, '\n  ')}`
		);
		return;
	}

	// Loud rather than silent: a Worker with the binding but no from-address
	// is misconfigured, and quietly logging to the console there would look
	// exactly like a delivered email.
	if (!env.MAIL_FROM) {
		throw new Error('MAIL_FROM is not set — see the vars block in wrangler.jsonc');
	}

	await binding.send({
		from: { name: 'Pzzlr', email: env.MAIL_FROM },
		to: message.to,
		subject: message.subject,
		text: message.text,
		html: message.html
	});
}

/**
 * The two messages this app sends, kept together so their wording stays
 * consistent and neither drifts into looking less like the other.
 *
 * Both are a sentence and a link. No images, no tracking, no unsubscribe
 * footer: these are transactional, sent only in response to something the
 * recipient just did, and the more they look like marketing the more likely
 * they are to be treated as it.
 */
/**
 * Deliberately worded for any "prove you can read this address" moment, not
 * just sign-up: better-auth sends this same email again as the second step
 * of an email change, once the old address has approved it and the new one
 * has to confirm it can be reached.
 */
export function verificationEmail(url: string): Omit<OutgoingEmail, 'to'> {
	return {
		subject: 'Confirm your email for Pzzlr',
		text: `Confirm this address to use it on your Pzzlr account:\n\n${url}\n\nIf you weren't expecting this, you can ignore it — nothing changes until the link is used.`,
		html: layout(
			`<p>Confirm this address to use it on your Pzzlr account.</p>`,
			url,
			'Confirm email',
			`<p>If you weren't expecting this, you can ignore it — nothing changes until the link is used.</p>`
		)
	};
}

/**
 * The first of the two steps in an email change, sent to the address
 * currently on the account rather than the new one — that's better-auth's
 * flow and it's the right way round: whoever holds the old address is the
 * one who needs to approve losing it. Following this link sends
 * verificationEmail above to the new address, and only that second link
 * actually moves the account.
 */
export function emailChangeEmail(url: string, newEmail: string): Omit<OutgoingEmail, 'to'> {
	return {
		subject: 'Confirm your new email for Pzzlr',
		text: `Approve changing the email on your Pzzlr account to ${newEmail}:\n\n${url}\n\nWe'll then email ${newEmail} to confirm it can be reached. If you didn't ask for this, ignore it — your address stays as it is.`,
		html: layout(
			`<p>Approve changing the email on your Pzzlr account to <strong>${escapeHtml(newEmail)}</strong>.</p>`,
			url,
			'Approve change',
			`<p>We'll then email ${escapeHtml(newEmail)} to confirm it can be reached. If you didn't ask for this, ignore it — your address stays as it is.</p>`
		)
	};
}

/** Inline styles and a plain anchor: mail clients strip stylesheets, and several ignore <button> entirely. */
function layout(intro: string, url: string, action: string, outro: string): string {
	return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.5;color:#201d2b">
	<p style="font-weight:700;font-size:17px">🪜 Pzzlr</p>
	${intro}
	<p><a href="${url}" style="display:inline-block;padding:0.6rem 1rem;border-radius:8px;background:#7c3aed;color:#fff;text-decoration:none;font-weight:700">${action}</a></p>
	<p style="color:#6b6578;font-size:13px">Or paste this into your browser:<br />${url}</p>
	<div style="color:#6b6578;font-size:13px">${outro}</div>
</div>`;
}

function escapeHtml(value: string): string {
	return value.replace(
		/[&<>"']/g,
		(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string
	);
}

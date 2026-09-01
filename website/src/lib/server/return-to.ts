/**
 * Where to send a browser after a form action that can be submitted from
 * anywhere on the site — the favorites toggle is the one today (see
 * routes/favorites/+page.server.ts), which every star posts to along with
 * the page it was pressed on.
 *
 * That "where I came from" arrives as form data, so it's a request, not an
 * instruction: an absolute URL or a protocol-relative `//host` would turn
 * the action into an open redirect that any page could aim at any site.
 * Only a path on this origin survives; anything else falls back.
 */
export function safeReturnTo(value: FormDataEntryValue | null, fallback: string): string {
	if (typeof value !== 'string') return fallback;
	// A leading '/' rules out 'https://evil.example' and 'javascript:...';
	// rejecting a second one rules out '//evil.example', which a browser
	// reads as an absolute URL on that host rather than a path here.
	if (!value.startsWith('/') || value.startsWith('//')) return fallback;
	// A backslash is treated as a path separator by browsers when it follows
	// the leading slash, so '/\evil.example' is another way to spell '//'.
	if (value.startsWith('/\\')) return fallback;
	return value;
}

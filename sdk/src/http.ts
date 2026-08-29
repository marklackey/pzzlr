/** x-api-key header for a private game's embed key, or none for a public game. See the widgets' `apikey` prop. */
export function authHeaders(apikey: string): Record<string, string> {
	return apikey ? { 'x-api-key': apikey } : {};
}

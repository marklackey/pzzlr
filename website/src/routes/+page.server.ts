import type { PageServerLoad } from './$types';
import { listGames } from '$lib/server/db/games';

const PAGE_SIZE = 10;

// Logged-out visitors land on the game index (paginated/searchable) instead
// of a single hardcoded board — Explore *is* the anonymous homepage now.
// Signed-in users still get the "here's the embed" demo, since they're the
// ones who'd actually go create a game next.
export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		const query = url.searchParams.get('q')?.trim() || undefined;
		const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
		const { games, total } = await listGames({ query, page, pageSize: PAGE_SIZE });
		return {
			mode: 'explore' as const,
			games,
			total,
			page,
			pageSize: PAGE_SIZE,
			query: query ?? ''
		};
	}

	// +page.svelte renders whichever mode this game actually is, so any
	// public game works here — no mode filter needed.
	const { games } = await listGames({ pageSize: 1 });
	return { mode: 'demo' as const, game: games[0] ?? null };
};

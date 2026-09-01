import type { PageServerLoad } from './$types';
import { listGames } from '$lib/server/db/games';
import { favoriteIdsIn } from '$lib/server/db/favorites';

const PAGE_SIZE = 10;

export const load: PageServerLoad = async ({ locals, url }) => {
	const query = url.searchParams.get('q')?.trim() || undefined;
	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const { games, total } = await listGames({ query, page, pageSize: PAGE_SIZE });
	// One query for the whole page rather than a lookup per row; null for a
	// signed-out visitor, who has nowhere to put a star. See GameList.
	const favoriteIds = locals.user
		? [
				...(await favoriteIdsIn(
					locals.user.id,
					games.map((game) => game.id)
				))
			]
		: null;
	return { games, total, page, pageSize: PAGE_SIZE, query: query ?? '', favoriteIds };
};

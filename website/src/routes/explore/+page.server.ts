import type { PageServerLoad } from './$types';
import { listGames } from '$lib/server/db/games';

const PAGE_SIZE = 10;

export const load: PageServerLoad = async ({ url }) => {
	const query = url.searchParams.get('q')?.trim() || undefined;
	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const { games, total } = await listGames({ query, page, pageSize: PAGE_SIZE });
	return { games, total, page, pageSize: PAGE_SIZE, query: query ?? '' };
};

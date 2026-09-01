import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * The front door hands you whichever list is actually yours: the games
 * you've made when you're signed in, everyone's when you're not.
 *
 * It used to be a demo board with an explanation of the embed attached —
 * a page to read rather than a place to go, and for a signed-in player it
 * stood between them and their own games every time they clicked the logo.
 * A redirect rather than a copy of either list, so each of those pages
 * keeps one address.
 */
export const load: PageServerLoad = ({ locals }) => {
	redirect(302, locals.user ? '/games' : '/explore');
};

import type { PageServerLoad } from './$types';

/**
 * The front door is the landing page for everyone, signed in or not.
 *
 * It used to redirect a signed-in visitor to /games, on the reasoning that
 * the logo shouldn't stand between a player and their own shelf. That was
 * right when this page was a demo board with an embed explainer attached —
 * a page to read rather than a place to go — but the logo is the way home,
 * and home should be reachable. The shelf keeps its own address, its place
 * in the nav, and every route out of signing in.
 *
 * Nothing here needs the user: the layout already loads it, and the page
 * reads it from there to decide which pair of buttons the hero offers.
 */
export const load: PageServerLoad = () => {
	return {};
};

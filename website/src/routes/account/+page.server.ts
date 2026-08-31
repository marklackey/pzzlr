import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Everything on this page is about the signed-in account, so there's
// nothing to show a visitor without one — and unlike /games there's no
// version of it worth explaining to someone who hasn't signed in yet.
export const load: PageServerLoad = ({ locals }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}
	return {
		email: locals.user.email,
		emailVerified: locals.user.emailVerified,
		name: locals.user.name
	};
};

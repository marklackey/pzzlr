import { fail, isHttpError, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { gameFormToBody } from '$lib/server/game-input';
import { createGame } from '$lib/server/game-mutations';

export const load: PageServerLoad = ({ locals }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const formData = await request.formData();
		const body = gameFormToBody(formData);

		let game;
		try {
			game = await createGame(body, locals.user);
		} catch (e) {
			if (isHttpError(e)) {
				return fail(e.status, { message: e.body.message });
			}
			throw e;
		}

		redirect(303, `/g/${game.id}`);
	}
};

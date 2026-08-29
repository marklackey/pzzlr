import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { error } from '@sveltejs/kit';
import { getPlatformProxy, type PlatformProxy } from 'wrangler';

// listAllGames (exercised below) goes through getDb(), which reads the D1
// binding off getRequestEvent() — real only inside SvelteKit's own request
// handling, not when a test calls a route's exported GET/POST directly. This
// stands in a real local D1 binding (same Miniflare-backed one `vite dev`
// uses, from wrangler.jsonc) so that call resolves the same way it does at
// runtime, instead of mocking away the thing under test.
let platform: PlatformProxy<App.Platform['env']>;

vi.mock('$app/server', () => ({
	getRequestEvent: () => ({ platform })
}));

beforeAll(async () => {
	platform = await getPlatformProxy<App.Platform['env']>();
});

afterAll(() => platform.dispose());

const { GET, POST } = await import('./+server');
const mineServer = await import('./mine/+server');
const GET_MINE = mineServer.GET;

// Minimal fake event — these handlers only ever touch .request and .locals.
// Typed loosely per call site since each route's generated RequestEvent is
// parameterized by its own route id and this same fake shape fits all of them.
function fakeEvent<T>(body: unknown, locals: App.Locals = {}): T {
	return {
		request: { json: async () => body } as unknown as Request,
		locals
	} as T;
}

describe('POST /api/games (create)', () => {
	it('rejects an unauthenticated request before touching the body', async () => {
		await expect(
			POST(fakeEvent<Parameters<typeof POST>[0]>({ target: 'poop', length: 4 }))
		).rejects.toMatchObject({ status: 401 });
	});

	it('rejects even a well-formed body without a session', async () => {
		try {
			await POST(
				fakeEvent<Parameters<typeof POST>[0]>({
					target: 'poop',
					length: 4,
					minSteps: 4,
					rungsGiven: 0
				})
			);
			expect.unreachable('should have thrown a 401');
		} catch (e) {
			expect(e).toMatchObject({ status: 401 });
		}
	});
});

describe('GET /api/games (public index)', () => {
	it('does not require a session', async () => {
		const res = await GET(fakeEvent<Parameters<typeof GET>[0]>(undefined));
		expect(res.status).toBe(200);
	});
});

describe('GET /api/games/mine', () => {
	it('rejects an unauthenticated request', async () => {
		await expect(
			GET_MINE(fakeEvent<Parameters<typeof GET_MINE>[0]>(undefined))
		).rejects.toMatchObject({ status: 401 });
	});
});

// Sanity check that our fake-event shape actually exercises SvelteKit's
// real error() control flow, not something the mock papered over.
describe('error() sanity', () => {
	it('throws an object with a status property', () => {
		try {
			error(401, 'nope');
			expect.unreachable();
		} catch (e) {
			expect(e).toMatchObject({ status: 401 });
		}
	});
});

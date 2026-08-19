import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { availableLengths } from '$lib/server/graphs';

export const GET: RequestHandler = () => json({ lengths: availableLengths() });

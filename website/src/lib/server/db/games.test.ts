import { describe, expect, it } from 'vitest';
import { canManageGame } from './games';

describe('canManageGame', () => {
	it('denies a signed-out visitor', () => {
		expect(canManageGame(null, { ownerId: 'alice' })).toBe(false);
		expect(canManageGame(undefined, { ownerId: null })).toBe(false);
	});

	it('allows the owner', () => {
		expect(canManageGame({ id: 'alice' }, { ownerId: 'alice' })).toBe(true);
	});

	it('denies a signed-in user who is not the owner', () => {
		expect(canManageGame({ id: 'bob' }, { ownerId: 'alice' })).toBe(false);
	});

	it('allows any signed-in user to manage an ownerless (legacy/seed) game', () => {
		expect(canManageGame({ id: 'bob' }, { ownerId: null })).toBe(true);
	});
});

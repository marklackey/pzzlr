-- Run via `npm run db:seed` (local) or `npm run db:seed:remote` (D1) —
-- these go through `wrangler d1 execute`, not a JS script, since D1 is
-- only reachable through the Workers runtime/wrangler, not a connection
-- string a plain Node script can open directly.
INSERT INTO game_config (id, name, target, length, min_steps, created_at)
VALUES ('demo', 'Pzzlr', 'poop', 4, 4, unixepoch())
ON CONFLICT(id) DO UPDATE SET
	name = excluded.name,
	target = excluded.target,
	length = excluded.length,
	min_steps = excluded.min_steps;

import type { User, Session } from 'better-auth';
import type { D1Database, SendEmail } from '@cloudflare/workers-types';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			user?: User;
			session?: Session;
		}

		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env: {
				DB: D1Database;
				// Optional because local dev has no Email Service to bind to —
				// see the console fallback in $lib/server/email.ts.
				EMAIL?: SendEmail;
			};
		}
	}
}

export {};

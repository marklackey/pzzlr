export const THEMES = ['light', 'dark', 'system'] as const;
export type Theme = (typeof THEMES)[number];

/** Where the choice is kept. Read by the pre-paint script in app.html too — keep the two in step. */
export const THEME_KEY = 'pzzlr-theme';

export function isTheme(value: unknown): value is Theme {
	return THEMES.includes(value as Theme);
}

/**
 * The reader's choice of light, dark, or whatever their device says.
 *
 * 'system' is the default and is stored as the absence of an override: the
 * root element carries `data-theme` only when someone has actually chosen,
 * which is what lets the stylesheet treat "no attribute" as "follow
 * prefers-color-scheme" instead of having to know the resolved answer. See
 * app.css, and the matching rules inside each widget.
 *
 * Kept per browser rather than per account: a choice about this screen
 * shouldn't follow someone onto a different one, and it has to be readable
 * before the first paint (see app.html) — which rules out anything that
 * needs a request.
 */
class ThemeSetting {
	current = $state<Theme>('system');
	/** What the device is asking for, kept current so 'system' can resolve without asking again. */
	systemDark = $state(false);

	/**
	 * The scheme actually in force. The stylesheet doesn't need this — it
	 * handles 'system' with a media query — but the widgets do: they live in
	 * shadow roots and are told which scheme to paint (see their `theme`
	 * attribute), and "whatever the device says" isn't something an
	 * attribute can carry.
	 */
	get resolved(): 'light' | 'dark' {
		if (this.current === 'system') return this.systemDark ? 'dark' : 'light';
		return this.current;
	}

	/** Reads what the pre-paint script already applied, so the control starts on the right option. */
	init() {
		try {
			const stored = localStorage.getItem(THEME_KEY);
			if (isTheme(stored)) this.current = stored;
		} catch {
			// Storage blocked (private browsing) — 'system' is a fine answer.
		}
	}

	/** Follows the device's own setting while the app is open. Returns its own teardown. */
	watchSystem(): () => void {
		const query = window.matchMedia('(prefers-color-scheme: dark)');
		this.systemDark = query.matches;
		const onChange = (event: MediaQueryListEvent) => (this.systemDark = event.matches);
		query.addEventListener('change', onChange);
		return () => query.removeEventListener('change', onChange);
	}

	set(theme: Theme) {
		this.current = theme;
		apply(theme);
		try {
			if (theme === 'system') localStorage.removeItem(THEME_KEY);
			else localStorage.setItem(THEME_KEY, theme);
		} catch {
			// The choice still holds for this page load.
		}
	}
}

export const theme = new ThemeSetting();

/** Puts the choice on the root element — or takes it off, which is what 'system' means. */
export function apply(value: Theme) {
	const root = document.documentElement;
	if (value === 'system') root.removeAttribute('data-theme');
	else root.setAttribute('data-theme', value);
}

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

	/**
	 * What to put on a widget's `theme` attribute — and for 'system',
	 * nothing at all.
	 *
	 * The widgets live in shadow roots and can't read the page's theme, so an
	 * explicit choice has to be handed to them. But resolving 'system' to a
	 * scheme here would mean answering "what does this device prefer?" on the
	 * server, where there is no device: every server-rendered page would say
	 * light, and a dark-mode reader would watch the board flash white before
	 * hydration corrected it. Sending nothing leaves the widget's own
	 * prefers-color-scheme rule in charge, which is right from the first
	 * paint.
	 */
	get attr(): 'light' | 'dark' | undefined {
		return this.current === 'system' ? undefined : this.current;
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

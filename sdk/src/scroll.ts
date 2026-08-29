/**
 * Scrolls `area` by the minimum amount that brings `target` fully into view.
 *
 * Deliberately not Element.scrollIntoView(): that walks every scrollable
 * ancestor, so on a phone it drags the whole page around too, and the widget
 * has no business moving the host page's scroll position — only its own board.
 * No-ops when either element is missing (refs aren't bound yet) or when the
 * target already fits.
 */
export function scrollIntoViewWithin(
	area: HTMLElement | null | undefined,
	target: HTMLElement | null | undefined
): void {
	if (!area || !target) return;

	const areaBox = area.getBoundingClientRect();
	const targetBox = target.getBoundingClientRect();

	if (targetBox.bottom > areaBox.bottom) {
		area.scrollTop += targetBox.bottom - areaBox.bottom;
	} else if (targetBox.top < areaBox.top) {
		area.scrollTop -= areaBox.top - targetBox.top;
	}
}

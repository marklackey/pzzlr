/**
 * "Pz" in Inter Bold, as outlines: the letters of Pzzlr's mark drawn as
 * shapes, so the mark looks the same on every device rather than borrowing
 * whatever system font the viewer has. Inter is under the SIL Open Font
 * License, which allows its outlines in a logo; the Mac's SF Pro, which the
 * site's own text uses, is not licensed for that.
 *
 * Exported from Inkscape at a 1000-unit font size with the baseline at
 * y = 1000. PZ_BOX is the bounding box of the ink, which pzTransform uses to
 * centre the letters. marketing/marks.mjs imports it, so every mark and icon
 * it draws comes from this one outline.
 */
export const PZ_PATH =
	'M 165.92,1000 V 272.46 h 283.69 q 83.01,0 141.11,31.74 58.11,31.25 88.38,86.91 30.76,55.18 30.76,126.95 0,72.27 -31.25,127.44 -30.76,54.69 -89.84,85.94 -58.59,30.76 -142.58,30.76 H 263.57 V 642.09 h 158.69 q 45.9,0 75.2,-15.62 29.79,-16.11 43.95,-43.95 14.65,-27.83 14.65,-64.45 0,-36.62 -14.65,-63.96 -14.16,-27.83 -43.95,-42.97 -29.79,-15.62 -75.68,-15.62 H 314.84 V 1000 Z m 640.63,0 V 911.13 L 1075.59,576.17 v -3.91 H 814.84 V 454.1 H 1252.83 v 97.17 L 998.93,877.93 v 3.91 H 1262.11 V 1000 Z';

export const PZ_BOX = { x: 165.918, y: 272.461, width: 1096.19, height: 727.539 };

/**
 * Cap heights in a 64-unit box. The tile figure matches the Pz that was
 * approved in the system font (0.54 of the tile's size, at SF Pro's 0.705 cap
 * height). The full-bleed icon's letters are smaller so they sit inside a
 * circular crop and inside Android's maskable safe zone.
 */
export const PZ_CAP = { tile: 24.4, fullBleed: 19.9 };

/** The transform that centres the letters in a square box at the given cap height. */
export function pzTransform(capHeight: number, box = 64): string {
	const scale = capHeight / PZ_BOX.height;
	const tx = box / 2 - (PZ_BOX.x + PZ_BOX.width / 2) * scale;
	const ty = box / 2 - (PZ_BOX.y + PZ_BOX.height / 2) * scale;
	return `translate(${tx.toFixed(3)} ${ty.toFixed(3)}) scale(${scale.toFixed(5)})`;
}

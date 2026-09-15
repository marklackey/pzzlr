// Draws every Pz mark as SVG from one outline and four colour sets, into
// out/marks/, and writes the site's favicon.svg. render.sh rasterises these
// into the icons, so a colour or a proportion changes here and nowhere else.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PZ_CAP, PZ_PATH, pzTransform } from '../website/src/lib/pz-glyph.ts';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, 'out/marks');
mkdirSync(out, { recursive: true });

// The four approved versions. Neutral is the hero's resting tile and its dark
// counterpart; blue is the settled blue each theme uses, with a near-black
// edge on light and a white one on dark.
const VERSIONS = {
	'neutral-light': { fill: '#ffffff', edge: '#858e9c', ink: '#14161c' },
	'neutral-dark': { fill: '#171a21', edge: '#cdd8ea', ink: '#e8eaee' },
	'blue-light': { fill: '#42caff', edge: '#14161c', ink: '#062441' },
	'blue-dark': { fill: '#1fbfff', edge: '#ffffff', ink: '#062441' }
};

// The hero tile's proportions in a 64-unit box: an edge of 1/48 of the tile,
// and a 7/48 radius measured to the outside of that edge.
const TILE = 'x="0.667" y="0.667" width="62.667" height="62.667" rx="8.667" stroke-width="1.333"';
const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${body}</svg>\n`;
const letters = (attrs, cap) => `<path ${attrs} transform="${pzTransform(cap)}" d="${PZ_PATH}"/>`;

for (const [name, { fill, edge, ink }] of Object.entries(VERSIONS)) {
	const body = `<rect ${TILE} fill="${fill}" stroke="${edge}"/>${letters(`fill="${ink}"`, PZ_CAP.tile)}`;
	writeFileSync(join(out, `pz-${name}.svg`), svg(body));
}

// For everything a platform crops: iOS and Android home screens and profile
// pictures. The whole icon is the tile, so the crop is its edge; the letters
// are smaller, to stay inside a circle and Android's maskable safe zone.
const dark = VERSIONS['blue-dark'];
writeFileSync(
	join(out, 'pz-blue-full-bleed.svg'),
	svg(
		`<rect width="64" height="64" fill="${dark.fill}"/>${letters(`fill="${dark.ink}"`, PZ_CAP.fullBleed)}`
	)
);

// The favicon follows the browser's theme: blue light, or blue dark.
const light = VERSIONS['blue-light'];
const favicon = svg(
	`<style>.t{fill:${light.fill};stroke:${light.edge}}.i{fill:${light.ink}}` +
		`@media (prefers-color-scheme:dark){.t{fill:${dark.fill};stroke:${dark.edge}}.i{fill:${dark.ink}}}</style>` +
		`<rect class="t" ${TILE}/>${letters('class="i"', PZ_CAP.tile)}`
);
writeFileSync(join(out, 'favicon.svg'), favicon);
writeFileSync(join(here, '../website/src/lib/assets/favicon.svg'), favicon);

console.log(`marks written to ${out}`);

#!/usr/bin/env bash
# Builds Pzzlr's marks, icons, link preview and ad images, and copies the ones
# the website serves into it.
#
# Needs Node, Google Chrome, rsvg-convert and ImageMagick
# (brew install librsvg imagemagick). The ads and the link preview also need
# Inter (SIL Open Font License) as Inter-Bold.woff2 and Inter-Regular.woff2. They
# are read from the website's static/fonts, which serves the same files, or
# from $INTER_DIR if that is set. Without both, those images are skipped and
# everything else still builds.
set -euo pipefail
cd "$(dirname "$0")"

CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
SITE=../website
INTER_DIR="${INTER_DIR:-$SITE/static/fonts}"

node marks.mjs

# Icons. The cropped ones — home screens and profile pictures — use the
# full-bleed blue; the email uses the neutral light tile; the .ico is for
# browsers that can't draw favicon.svg.
mkdir -p out/icon
rsvg-convert -w 180 -h 180 out/marks/pz-blue-full-bleed.svg -o out/icon/apple-touch-icon.png
rsvg-convert -w 192 -h 192 out/marks/pz-blue-full-bleed.svg -o out/icon/icon-192.png
rsvg-convert -w 512 -h 512 out/marks/pz-blue-full-bleed.svg -o out/icon/icon-512.png
cp out/icon/icon-512.png out/icon/avatar-512.png
rsvg-convert -w 96 -h 96 out/marks/pz-neutral-light.svg -o out/icon/email-mark.png
for size in 16 32 48; do
	rsvg-convert -w "$size" -h "$size" out/marks/pz-blue-light.svg -o "out/icon/favicon-$size.png"
done
magick out/icon/favicon-16.png out/icon/favicon-32.png out/icon/favicon-48.png out/icon/favicon.ico
for file in apple-touch-icon.png icon-192.png icon-512.png email-mark.png favicon.ico; do
	cp "out/icon/$file" "$SITE/static/$file"
done
echo "icons copied into $SITE/static"

if [ ! -f "$INTER_DIR/Inter-Bold.woff2" ] || [ ! -f "$INTER_DIR/Inter-Regular.woff2" ]; then
	echo "skipping the ads and og.png: set INTER_DIR to a folder holding Inter-Bold.woff2 and Inter-Regular.woff2"
	exit 0
fi

# The pages, the marks and the fonts go into one scratch folder, so the pages
# find the marks and fonts beside them. Chrome treats every file:// page as
# its own origin and refuses the fonts without --allow-file-access-from-files.
build=$(mktemp -d)
trap 'rm -rf "$build"' EXIT
cp src/* out/marks/*.svg "$INTER_DIR/Inter-Bold.woff2" "$INTER_DIR/Inter-Regular.woff2" "$build/"

# shot <page> <width> <height> <output>
shot() {
	mkdir -p "$(dirname "$4")"
	"$CHROME" --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files \
		--force-device-scale-factor=1 --window-size="$2,$3" --screenshot="$PWD/$4" \
		"file://$build/$1" >/dev/null 2>&1
	echo "$4"
}

# Reddit and Instagram share the square and 4:5 sizes, so those are rendered
# once and copied; each platform's folder is complete on its own for upload.
for ad in no-ads group-chat; do
	shot "$ad.html" 1080 1080 "out/reddit/$ad-square-1080x1080.png"
	shot "$ad.html" 1080 1350 "out/reddit/$ad-portrait-1080x1350.png"
	shot "$ad.html" 1200 628 "out/reddit/$ad-landscape-1200x628.png"
	mkdir -p out/instagram
	cp "out/reddit/$ad-square-1080x1080.png" "out/instagram/$ad-square-1080x1080.png"
	cp "out/reddit/$ad-portrait-1080x1350.png" "out/instagram/$ad-portrait-1080x1350.png"
	shot "$ad.html" 1080 1920 "out/instagram/$ad-story-1080x1920.png"
done

shot link-preview.html 1200 630 out/link-preview-1200x630.png
cp out/link-preview-1200x630.png "$SITE/static/og.png"
echo "copied og.png into $SITE/static"

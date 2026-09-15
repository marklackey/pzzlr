# Marketing images and marks

Pzzlr's mark, its icons, the link preview, and the ad images, all built from
the sources in this folder. Run:

```bash
./render.sh
```

It needs Node, Google Chrome, `rsvg-convert` and ImageMagick
(`brew install librsvg imagemagick`). The ads and the link preview also need
Inter — `Inter-Bold.woff2` and `Inter-Regular.woff2`, converted from the TTFs
[Google Fonts](https://fonts.google.com/specimen/Inter) serves, under the SIL
Open Font License (`OFL.txt` sits beside them). It reads them from
`website/static/fonts`, where the site serves the same two files, or from the
folder `INTER_DIR` names if that is set.

It copies the files the website serves into `../website`: `favicon.ico`,
`apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `email-mark.png` and
`og.png` into `static/`, and `favicon.svg` into `src/lib/assets/`.

## The mark

Pz on a tile, as if it were an element on the periodic table. The letters are
Inter Bold as outlines, kept in `website/src/lib/pz-glyph.ts`, so every file here
draws from the same shapes. Inter is
used rather than the system font because Apple's SF Pro isn't licensed for
logos or ads. `marks.mjs` draws the versions below into `out/marks/`.

| Version       | Tile      | Edge      | Letters   | File                     |
| ------------- | --------- | --------- | --------- | ------------------------ |
| Neutral light | `#ffffff` | `#858e9c` | `#14161c` | `pz-neutral-light.svg`   |
| Neutral dark  | `#171a21` | `#cdd8ea` | `#e8eaee` | `pz-neutral-dark.svg`    |
| Blue light    | `#42caff` | `#14161c` | `#062441` | `pz-blue-light.svg`      |
| Blue dark     | `#1fbfff` | `#ffffff` | `#062441` | `pz-blue-dark.svg`       |
| Full bleed    | `#1fbfff` | none      | `#062441` | `pz-blue-full-bleed.svg` |

The edge is 1/48 of the tile and the corner radius 7/48, the proportions of the
resting tiles in the landing page's hero. It always stands alone, never beside
the "Pzzlr" wordmark.

## Where each one goes

| File                               | Version                                               | Used for                                                  |
| ---------------------------------- | ----------------------------------------------------- | --------------------------------------------------------- |
| `favicon.svg`                      | Blue light, or blue dark in a dark browser            | Browser tabs, bookmarks, link cards that show a site icon |
| `favicon.ico` (16, 32, 48)         | Blue light                                            | Browsers that can't draw the SVG                          |
| `apple-touch-icon.png` (180)       | Full bleed                                            | iPhone and iPad home screen                               |
| `icon-192.png`, `icon-512.png`     | Full bleed                                            | Android home screen, through `manifest.webmanifest`       |
| `out/icon/avatar-512.png`          | Full bleed                                            | Reddit and Instagram profile pictures                     |
| `email-mark.png` (96, shown at 48) | Neutral light                                         | Top of the verification and change-of-email emails        |
| `og.png` (1200 × 630)              | Blue dark, inside the image                           | Link previews on Facebook, iMessage, Slack and the rest   |
| Ad images                          | Blue dark on the dark ad, blue light on the light one | Reddit and Instagram ads                                  |

The full-bleed icon has no edge because the platform crops it: the phone's
rounded square or the profile picture's circle becomes the tile's edge. Its
letters are smaller so they stay inside a circle and Android's safe zone.

## Ad sizes

| File                                     | Use                                                                     |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| `out/reddit/*-portrait-1080x1350.png`    | Reddit image ad, 4:5. Best for the mobile feed                          |
| `out/reddit/*-square-1080x1080.png`      | Reddit image ad, 1:1. The safe all-placements choice                    |
| `out/reddit/*-landscape-1200x628.png`    | Reddit image ad, 1.91:1. Desktop feed and conversation page             |
| `out/instagram/*-portrait-1080x1350.png` | Instagram feed ad, 4:5 (the default)                                    |
| `out/instagram/*-square-1080x1080.png`   | Instagram feed or carousel card, 1:1                                    |
| `out/instagram/*-story-1080x1920.png`    | Stories and Reels, 9:16. Text avoids the top 250px and the bottom 340px |

Reddit takes JPG or PNG up to 3 MB; every file here is well under that.

## The two ads

**no-ads** (dark): leads with the reason Pzzlr exists.

- Reddit headline: _A daily word game with no ads, no pop-ups, and no trackers. Just the puzzle._
- Instagram caption: _A daily word game without the ads. No banners, no pop-ups, no trackers, just
  today's puzzle. Free at pzzlr.app._

**group-chat** (light): making a game of your own.

- Reddit headline: _Make a daily word game for your group chat. Everyone gets the same new puzzle
  each day, free, with no ads._
- Instagram caption: _Your group chat, your word game. Set the rules, share one link, and everyone
  plays the same new puzzle each day. Free, with no ads._

Neither ad names a game mode. "Wordle" belongs to the New York Times, and
"Quordle" and "Absurdle" also belong to other people. Ad review applies
trademark rules more strictly than the site does.

Every claim in the copy has to stay true on the site. The ads say "no
trackers" because the privacy page does. If a Reddit or Meta conversion
pixel is ever added to the site, both claims become false.

# Brief

A news reader over a fixed set of RSS feeds. Two layouts, chosen in Settings: **List** (cards with
image, headline, source and age) and **Shorts** (one story per page, swipe up for the next). A tap
on a card, or "Tap to know more" in Shorts, opens the article in the system browser (`https:`
links only). Search looks through the stories already loaded; Saved keeps stories for later;
Sources switches each feed on or off.

## Feeds

Fixed in `src/feeds/defaults.ts`; there is no way to add one. Each was checked live on 2026-10-27:
valid RSS 2.0 over HTTPS, the item count, how many items carry an image, and the exact image
hosts.

| Source       | Topic   | Feed                                              | Items | With image | Image hosts                                                         |
| ------------ | ------- | ------------------------------------------------- | ----- | ---------- | ------------------------------------------------------------------- |
| BBC World    | News    | `https://feeds.bbci.co.uk/news/world/rss.xml`     | 26    | 26         | `ichef.bbci.co.uk`                                                  |
| BBC Business | News    | `https://feeds.bbci.co.uk/news/business/rss.xml`  | 48    | 48         | `ichef.bbci.co.uk`                                                  |
| NPR News     | News    | `https://feeds.npr.org/1001/rss.xml`              | 10    | 9          | `npr.brightspotcdn.com`                                             |
| Ars Technica | Tech    | `https://feeds.arstechnica.com/arstechnica/index` | 20    | 20         | `cdn.arstechnica.net`                                               |
| BBC Sport    | Sport   | `https://feeds.bbci.co.uk/sport/rss.xml`          | 73    | 73         | `ichef.bbci.co.uk`                                                  |
| Science News | Science | `https://www.sciencenews.org/feed`                | 20    | 19         | `www.sciencenews.org`                                               |
| NASA         | Science | `https://www.nasa.gov/feed/`                      | 10    | 10         | `www.nasa.gov`, `assets.science.nasa.gov`, `images-assets.nasa.gov` |

`allowedHosts` is exactly the feed hosts plus these image hosts, by name, with no wildcard. An
image anywhere else (NPR's tracking pixel on `media.npr.org`, for one) is never requested, and its
story shows as a text card. Some NPR images are full-size originals over the size cap; those
stories show as text cards too.

## Images

The image comes from the feed item only: `media:content` (an image), `media:thumbnail`, an image
`enclosure`, else the first `<img>` in `content:encoded` or `description`. Brief never requests
the article page. The bytes come through the host's fetch, become a `data:` URI for React Native's
`Image`, and live in a small in-memory cache (24 images, 1.5 MB each at most). They are never
written to storage or to a file.

## Icons

`assets/icon/*.png` are 1024 px renders of the Brief icon in the design source: four bars (24%,
7%, 7% and 7% of the box, spaced evenly, the last 58% wide) in a box inset 22% top and bottom and
20% at the sides on iOS, 32% and 30% on the Android foreground (inside the 66 dp safe zone). iOS
light: the Brief accent ground with a `#f3f2f2` mark; dark: `#151413` ground with the dark accent;
tinted: black ground with a `#d7d3d3` mark. Android: accent background; foreground and monochrome
are the mark on transparent. They were drawn as plain rectangles with `pngjs`.

# Architecture

ZettaLive is one web app. React draws the interface, TypeScript is the
language, and Vite builds it. GitHub Pages serves the built app over HTTPS.

## Folders

```
src/
  App.tsx        the root of the interface: the navigation and the open screen
  main.tsx       the start of the app
  theme/         the colours, the font, and the base styles
  iptv/          playlists and channels: the M3U reader, the loader, the stores
  library/       profiles, and the favourites, recents, settings, and backup
  player/        the player, its engines, and the channel keys
  guide/         the XMLTV reader, the guide store, and the match to channels
  ui/            the navigation and the shared parts of the interface
  screens/       one file for each screen
public/
  fonts/         the Karla font
  icons/         the app icons
assets/brand/    the source SVG of the icon
```

## State

Each part of the state is a small zustand store. `ui/route.ts` keeps the open
screen. `iptv/playlists.ts` keeps the playlists.

## Playlists

The user adds a playlist from a URL or from a file. `idb-keyval` keeps the
list of playlists in IndexedDB, and also the last text of each playlist.

At each start, the app reads each URL again. When a URL fails, the app shows
the saved copy and the reason. A playlist from a file always uses its saved
text.

`iptv/fetchText.ts` reads a URL. It refuses a cleartext `http://` URL on an
HTTPS page, because the browser blocks it. It unzips a gzip file.

`iptv/m3u.ts` reads the playlist. It keeps the `#EXTINF` attributes, the
`#EXTGRP` group, the `#EXTVLCOPT` user agent and referrer, and the guide URLs
of the header. Each channel gets a key from its URL and its name, so the key
stays the same when the playlist loads again.

## Channels

`iptv/useChannels.ts` joins the channels of all playlists in the order of
the playlists. `iptv/channels.ts` gives each channel a number: the
`tvg-chno` attribute, or else the next free number. It also groups, searches,
and filters the channels. A search ignores case and accents.

`library/library.ts` keeps the favourites, the recent channels, the hidden
channels, and the hidden groups in IndexedDB, under one key for each profile.

`ui/VirtualList.tsx` draws only the rows near the visible part of the list,
so a playlist with thousands of channels stays fast on a phone.

## The player

`player/stream.ts` finds the kind of a stream from its URL: HLS, MPEG-TS, or
a plain file. A URL that does not tell is HLS first. It also finds the
reasons that are known before the stream starts: a cleartext `http://` URL on
an HTTPS page, or a channel that needs a user agent or a referrer.

`player/engine.ts` starts the stream. hls.js plays HLS, and mpegts.js plays
MPEG-TS. Both load only when the first stream of their kind starts. When the
browser has no Media Source Extensions but plays HLS itself, as Safari on an
iPhone does, the video element plays the URL directly.

When HLS cannot read the playlist of a URL that does not tell its kind, the
player tries MPEG-TS. A stream that fails before it plays gets a mark in
`player/health.ts`, and the channel list shows the mark. A stream that stops
after it played starts again up to three times, and also after 20 seconds
with no data.

`player/PlayerView.tsx` draws one session for each channel, so each channel
starts with a clean state.

## The guide

The guide URLs come from the `url-tvg` attribute of each playlist, and from
the guides that the user adds on the Playlists screen.

`guide/xmltv.ts` reads a guide with regular expressions, not with a DOM, so a
large guide does not use too much memory. It keeps only the programmes from
3 hours before now to 36 hours after now. `guide/guides.ts` keeps the result
of each guide in IndexedDB, and loads a guide again only when its copy is
older than 6 hours.

`guide/match.ts` finds the programmes of a channel: by its `tvg-id`, then by
its `tvg-name`, then by its name. A name compares with no case, no accents,
no text in brackets, and no HD or 4K mark.

`screens/GuideScreen.tsx` draws 24 hours from the half hour before now. It
draws only the rows and the programmes near the visible part of the grid.

## Profiles and backup

`library/profiles.ts` keeps the list of profiles and the active profile. When
there is more than one profile, the app asks "Who is watching?" at the start.
A change of profile loads its library and its settings
(`library/settings.ts`).

`library/backup.ts` writes the stored values to a JSON file: the playlists,
the guide URLs, the profiles, and the data of each profile. It keeps the text
of a playlist from a file, but not the saved copies of URLs and guides,
because the app loads them again. A restore replaces all stored values, then
the page loads again.

## The installable app

`vite-plugin-pwa` makes the web manifest and a service worker. The service
worker keeps only the files of the app in its cache. Playlists, guides, and
streams always come from the network.

## Releases

A tag such as `v0.1.0` starts `.github/workflows/release.yml`. The workflow
checks the code, builds the app, puts it on GitHub Pages, and makes a release
with the notes of that version from `CHANGELOG.md`.

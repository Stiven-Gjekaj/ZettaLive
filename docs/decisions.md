# Decisions

This file records each choice that the owner makes for ZettaLive. The
project started as ZettaWeb.
Add a new choice at the end. Do not remove an old choice. Mark it as replaced.

## 2026-10-16: Scope (replaced on 2026-10-17, see "A web IPTV player")

- ZettaWeb is a web app in the Zetta family. ZettaStream is the Android app.
- It operates on a desktop browser and on a phone browser.
- It plays Stremio addons, other HTTP sources, and IPTV playlists in the
  browser.
- Reason: ZettaStream is Android only. An iPhone and a PC have no Zetta app.

## 2026-10-16: A relay for streams (replaced on 2026-10-17, see "A web IPTV player")

- A small relay server sends the stream requests for the browser.
- The relay adds the headers that an addon asks for, such as `Referer` and
  `User-Agent`. A browser cannot set these headers.
- The relay serves each stream over HTTPS and adds CORS headers. It changes
  the links in an HLS playlist so that each request goes through the relay.
- The user runs their own relay. The owner does not run a public relay.
- Reason: on 2026-10-16, a test of the ZettaStream source list found that
  48 of 105 HTTP addon streams need a header that a browser cannot set, and
  14 of 105 use cleartext HTTP. An HTTPS page cannot load a cleartext stream.

## 2026-10-17: No torrents (replaced on 2026-10-17, see "A web IPTV player")

- ZettaWeb plays no torrents.
- ZettaWeb and its relay contain no torrent engine.
- The app does not show a stream that has only a torrent `infoHash` and no
  HTTP URL.
- A stream with an HTTP URL plays, also when a debrid service makes that URL
  from a torrent.

## 2026-10-17: Stack

- The app is React with TypeScript. Vite builds it.
- Reason: React has the largest set of libraries for a video app, such as
  hls.js, dash.js, and a PWA plugin. TypeScript lets other parts of the
  project share the parsers of addons, M3U playlists, and XMLTV guides.

## 2026-10-17: The library stays in the browser

- The watchlist, the history, the profiles, and the settings stay in the
  browser of each device.
- There is no sync between devices. A backup file moves the library to a
  different device.
- Reason: this is the simplest choice. It needs no server and no account.

## 2026-10-17: A web IPTV player

- This choice replaces "Scope", "A relay for streams", and "No torrents".
- The project is ZettaLive. It was ZettaWeb.
- ZettaLive is a web IPTV player in the Zetta family. It plays M3U playlists
  with an XMLTV guide.
- It operates on a desktop browser and on a phone browser.
- It does not read Stremio addons. It plays no torrents.
- The app comes with no channels. Each user adds their own playlists.
- How the app plays a cleartext `http://` stream, or a stream that needs a
  header, is an open choice.
- Reason: Stremio Web already covers the addons in a browser. Most addon
  streams need a relay, and a browser cannot set their headers. In a test on
  2026-10-16, 33 of 47 live IPTV channels played in a browser with no help.

## 2026-10-17: HTTPS only, with no relay

- This choice closes the open choice in "A web IPTV player".
- The app is served over HTTPS only.
- The app plays HLS with hls.js and a raw MPEG-TS stream with mpegts.js.
- There is no relay and no browser extension.
- The app does not play a cleartext `http://` stream, a stream that sends no
  CORS headers, or a stream that needs a header that a browser cannot set.
  It shows that such a channel cannot play in a browser.
- Reason: HTTPS keeps the installable PWA and needs no server. In a test on
  2026-10-16, 33 of 47 live IPTV channels played this way.

## 2026-10-17: GitHub Pages and version numbers

- GitHub Pages serves the app at `https://stiven-gjekaj.github.io/ZettaLive/`.
- A tag such as `v0.1.0` builds the app, puts it on Pages, and makes a
  release on GitHub.
- Each phase of the roadmap gives one release. The phases give 0.1.0 to
  0.6.0. The last phase gives 1.0.0.
- Reason: Pages is free, it serves over HTTPS, and it needs no server.

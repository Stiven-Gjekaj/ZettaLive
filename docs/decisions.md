# Decisions

This file records each choice that the owner makes for ZettaWeb.
Add a new choice at the end. Do not remove an old choice. Mark it as replaced.

## 2026-10-16: Scope

- ZettaWeb is a web app in the Zetta family. ZettaStream is the Android app.
- It operates on a desktop browser and on a phone browser.
- It plays Stremio addons, other HTTP sources, and IPTV playlists in the
  browser.
- Reason: ZettaStream is Android only. An iPhone and a PC have no Zetta app.

## 2026-10-16: A relay for streams

- A small relay server sends the stream requests for the browser.
- The relay adds the headers that an addon asks for, such as `Referer` and
  `User-Agent`. A browser cannot set these headers.
- The relay serves each stream over HTTPS and adds CORS headers. It changes
  the links in an HLS playlist so that each request goes through the relay.
- The user runs their own relay. The owner does not run a public relay.
- Reason: on 2026-10-16, a test of the ZettaStream source list found that
  48 of 105 HTTP addon streams need a header that a browser cannot set, and
  14 of 105 use cleartext HTTP. An HTTPS page cannot load a cleartext stream.

## 2026-10-17: No torrents

- ZettaWeb plays no torrents.
- ZettaWeb and its relay contain no torrent engine.
- The app does not show a stream that has only a torrent `infoHash` and no
  HTTP URL.
- A stream with an HTTP URL plays, also when a debrid service makes that URL
  from a torrent.

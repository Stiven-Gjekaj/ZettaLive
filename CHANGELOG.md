# Changelog

Every release is written here, newest first. A version is `MAJOR.MINOR.PATCH`.
Before 1.0.0, each phase of the roadmap raises the minor number. From 1.0.0,
a fix raises the patch number, a new function raises the minor number, and a
change that breaks the backup raises the major number.

A tag such as `v0.1.0` builds the app, puts it on GitHub Pages, and makes a
release on GitHub with the built app as a zip file.

## 0.5.0 (2026-10-17)

- The guide: the app reads the XMLTV guide that a playlist names, and the
  guides that you add on the Playlists screen. A gzip guide also works.
- The Guide screen shows 24 hours of programmes. Tap a programme to read its
  details and watch its channel.
- The channel list and the player show the programme that is on now, and the
  player also shows the next one.
- The app finds the programmes of a channel by its `tvg-id`, and else by its
  name.
- A guide loads again after six hours. When it fails, the app uses its saved
  copy.

## 0.4.0 (2026-10-17)

- The player: tap a channel to watch it. HLS plays with hls.js, MPEG-TS with
  mpegts.js, and Safari on an iPhone plays HLS itself.
- Change the audio track and the quality, when the stream has more than one.
- When a stream stops, the player connects again up to three times.
- Go to the next or the previous channel with the arrow keys or a swipe.
  Type a number to go to a channel.
- A channel that a browser cannot play shows the reason, and the list marks
  it with "Cannot play here".

## 0.3.0 (2026-10-17)

- Live TV: the channels of all your playlists, with their logos, numbers,
  and groups.
- Search the channels by name or by number. A search ignores case and
  accents.
- Favourite channels, with their own filter.
- Hide a channel or a whole group. The Hidden filter shows them again.
- A long playlist stays fast: the list draws only the rows that you see.

## 0.2.0 (2026-10-17)

- Playlists: add an M3U playlist from a URL or from a file. A gzip file
  also works.
- The app keeps your playlists in the browser and reads each URL again at
  each start. When a URL fails, it shows the saved copy and the reason.
- Load a playlist again, rename it, or remove it.
- The app refuses an `http://` playlist URL, because a browser cannot load
  it from an HTTPS page.

## 0.1.0 (2026-10-17)

- The first version: the base of the app, with no playlists yet.
- A black and white theme with the Karla font.
- A slim icon bar on a desktop and a tab bar on a phone.
- An installable app (PWA) with the ZettaLive icon.

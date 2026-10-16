# Roadmap

Each phase gives a version that operates. Do the phases in this order.
A task leaves this list when its release is out. The reason for each choice
is in [docs/decisions.md](docs/decisions.md).

## Choices to make first

- The front-end stack and the build tool.
- The runtime of the relay, and how a user runs it (a container, a Worker,
  or a program on a home computer).
- Where the library lives: in the browser only, or also on the relay so that
  a phone and a PC share it.

## 1. The base

- The project skeleton, the linter, the tests, and CI on GitHub Actions.
- The theme from ZettaStream: black and white, with the Karla font.
- A layout for each device: a slim icon bar on a desktop, a tab bar on a
  phone.
- An installable PWA with a manifest and an icon.

## 2. Sources

- A Sources screen. The user pastes URLs, one on each line.
- Find the kind of each line from its shape: an addon manifest, an M3U
  playlist, or an XMLTV guide.
- Keep the list in the browser.
- Read each manifest. Show each source that fails.

## 3. Browse

- Home rows from the catalogs of each addon, with a banner of featured
  titles.
- A title page: the art, the facts, the seasons, and the episodes.
- Search in all addons at the same time.
- "Explore more" opens all titles of a row in a grid.

## 4. The relay

- A small server that the user runs.
- It adds the headers that an addon asks for, such as `Referer` and
  `User-Agent`.
- It serves each stream over HTTPS with CORS headers.
- It changes the links in an HLS playlist so that each request goes through
  the relay.
- A token in the app setting. The relay refuses a request without the token.
- The app uses the relay only for a stream that needs it.

## 5. The player

- Play MP4 and WebM directly, HLS with hls.js, and DASH with dash.js.
  Safari on an iPhone plays HLS natively.
- The stream list, with badges for quality, HDR, and dual audio.
- Hide a stream that the browser cannot decode, such as HEVC or DTS.
- Hide a stream that has only a torrent `infoHash`.
- Play starts the best 1080p stream. When a stream fails, the next best
  stream starts.
- Subtitles from the stream and from subtitle addons. Change SRT to WebVTT.
- Change the subtitle track and the audio track.
- Keyboard keys on a desktop, and touch controls on a phone.

## 6. Live TV

- Channels from M3U playlists, with groups.
- Now and next from an XMLTV guide.
- Favourite channels.
- A guide grid.

## 7. The library

- Continue watching, a watchlist, and watched marks.
- The next episode to watch, and a "New episodes" row.
- Profiles: each person has a picture, a history, a watchlist, and
  settings.
- Back up the library and the settings to a file, and restore them.

## 8. Extras

- Skip the intro of an anime episode, from AniSkip.
- Picture in picture.
- Media Session controls on the lock screen of a phone.
- The video filters of ZettaStream: CRT, VHS, vintage film, and black and
  white.

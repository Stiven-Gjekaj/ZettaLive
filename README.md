<div align="center">

<img src="assets/brand/icon.svg" alt="ZettaLive" width="120">

# ZettaLive

Live TV from your IPTV playlists, in the browser, on desktop and phone.

**[Open ZettaLive](https://stiven-gjekaj.github.io/ZettaLive/)**

</div>

## Overview

ZettaLive plays M3U playlists with an XMLTV guide. It is the web IPTV player
of the Zetta family. ZettaStream is the Android app.

The app comes with no channels. You add your own playlists.

ZettaLive operates on HTTPS only. A browser cannot play some streams from an
HTTPS page: a cleartext `http://` stream, a stream with no CORS headers, or a
stream that needs a special header. The app marks these channels.

## Features

- Playlists from a URL, a file, or an Xtream Codes account. A gzip file also
  works.
- Live TV with logos, numbers, groups, search, favourites, recent channels,
  and hidden channels and groups.
- A player for HLS and MPEG-TS, with the audio track, the quality, and a new
  connection when a stream stops.
- The XMLTV guide: now and next, a 24 hour guide grid, and catch-up TV.
- Profiles, each with a picture, favourites, recent channels, and settings.
- Picture in picture, lock screen controls, and video filters: CRT, VHS,
  vintage film, and black and white.
- A backup file to move everything to a different device.

## Install

Open the link above. To install it as an app:

- On a desktop, click the install button in the address bar.
- On an iPhone, tap Share, then "Add to Home Screen".
- On Android, open the browser menu, then tap "Install app".

## Keys and gestures

| Key or gesture | Action |
|---|---|
| Down or Page Down, swipe up | Next channel |
| Up or Page Up, swipe down | Previous channel |
| `0` to `9`, then wait or press Enter | Go to the channel number |
| Space or `K` | Play or pause |
| `M` | Mute |
| `F` | Full screen |
| `P` | Picture in picture |
| Escape | Back to the list |

## Build it yourself

You need Node.js 24 or newer.

    npm install
    npm run dev       # a local server with fast reload
    npm test          # the tests
    npm run lint      # the linter
    npm run build     # the built app in dist/

## Documentation

- [TODO.md](TODO.md): the roadmap.
- [CHANGELOG.md](CHANGELOG.md): each release.
- [docs/architecture.md](docs/architecture.md): how the code is built.
- [docs/decisions.md](docs/decisions.md): each choice and its reason.

## License

MIT. See [LICENSE](LICENSE). The Karla font has the SIL Open Font License,
see [licenses/Karla-OFL.txt](licenses/Karla-OFL.txt).

## Repository description

Live TV from your IPTV playlists in the browser. Plays M3U playlists with an
XMLTV guide, on desktop and phone.

## Repository topics

`iptv`, `iptv-player`, `live-tv`, `m3u`, `m3u8`, `xmltv`, `epg`, `hls`,
`video-player`, `pwa`, `web-app`, `react`, `typescript`, `vite`

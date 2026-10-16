# Changelog

Every release is written here, newest first. A version is `MAJOR.MINOR.PATCH`.
Before 1.0.0, each phase of the roadmap raises the minor number. From 1.0.0,
a fix raises the patch number, a new function raises the minor number, and a
change that breaks the backup raises the major number.

A tag such as `v0.1.0` builds the app, puts it on GitHub Pages, and makes a
release on GitHub with the built app as a zip file.

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

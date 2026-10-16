# Architecture

ZettaLive is one web app. React draws the interface, TypeScript is the
language, and Vite builds it. GitHub Pages serves the built app over HTTPS.

## Folders

```
src/
  App.tsx        the root of the interface: the navigation and the open screen
  main.tsx       the start of the app
  theme/         the colours, the font, and the base styles
  ui/            the navigation and the shared parts of the interface
  screens/       one file for each screen
public/
  fonts/         the Karla font
  icons/         the app icons
assets/brand/    the source SVG of the icon
```

## State

Each part of the state is a small zustand store. `ui/route.ts` keeps the open
screen.

## The installable app

`vite-plugin-pwa` makes the web manifest and a service worker. The service
worker keeps only the files of the app in its cache. Playlists, guides, and
streams always come from the network.

## Releases

A tag such as `v0.1.0` starts `.github/workflows/release.yml`. The workflow
checks the code, builds the app, puts it on GitHub Pages, and makes a release
with the notes of that version from `CHANGELOG.md`.

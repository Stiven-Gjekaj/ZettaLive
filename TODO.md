# Roadmap

Each phase gives a version that operates. Do the phases in this order.
A task leaves this list when its release is out. The reason for each choice
is in [docs/decisions.md](docs/decisions.md).

## 3. Channels

- The channel list, with groups, logos, and numbers.
- Search the channels by name.
- Favourite channels.
- Hide a group or a channel.

## 4. The player

- Play HLS with hls.js. Safari on an iPhone plays HLS natively.
- Play a raw MPEG-TS stream with mpegts.js.
- Change the audio track and the quality.
- Start the stream again when it stops.
- Mark a channel that a browser cannot play: a cleartext `http://` stream,
  a stream with no CORS headers, or a stream that needs a header.
- Go to the next or the previous channel. Type a number to go to a channel.
- Keyboard keys on a desktop, and swipes on a phone.

## 5. The guide

- Read XMLTV guides, also when they are compressed with gzip.
- Match each channel to the guide by `tvg-id`, then by name.
- Now and next on each channel.
- A guide grid.

## 6. The library

- Recent channels.
- Profiles: each person has a picture, favourites, and settings.
- Back up the playlists, the favourites, and the settings to a file, and
  restore them.

## 7. Extras

- Picture in picture.
- Media Session controls on the lock screen of a phone.
- Catch-up TV for a channel that has a `catchup` attribute.
- Xtream Codes accounts as a second kind of playlist.
- The video filters of ZettaStream: CRT, VHS, vintage film, and black and
  white.

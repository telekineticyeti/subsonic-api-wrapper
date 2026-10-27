# Subsonic API wrapper for Node

This library is an API wrapper for the Subsonic API. It is a work in progress so documentation will follow soon.

For an example of how this library can be used, check the projects below:

- [Subsonic/LastFM Now Playing RGB Display](https://github.com/telekineticyeti/subsonic-nowplaying-rgb-display)

# Install

```bash
npm i github:telekineticyeti/subsonic-api-wrapper#v0.1.0
```

# Usage

```ts
import SubsonicApiWrapper from 'subsonic-api-wrapper';

const api = new SubsonicApiWrapper({
  server: 'https://music.example.com',
  username: 'me',
  password: 'secret',
  appName: 'my-app', // optional, sent as the client name
});

const nowPlaying = await api.getNowPlaying();
```

Requests use token authentication (a salted MD5 of the password), so the password itself is never sent.

## Methods

| Method                           | Returns                    | Notes                                                                                                                                                                                                          |
| -------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getNowPlaying()`                | `Subsonic.NowPlaying[]`    | On servers with the OpenSubsonic `playbackReport` extension (Navidrome 0.62+), entries also have `state`, `positionMs` and `playbackRate`. `starred` and `userRating` are included when the server sends them. |
| `getOpenSubsonicExtensions()`    | `{name, versions}[]`       | Empty on servers without OpenSubsonic. Check for `playbackReport` before relying on `state`/`positionMs`.                                                                                                      |
| `search3(query, options?)`       | `{artist, album, song}`    | Options: `artistCount`, `albumCount`, `songCount`, their `…Offset`s and `musicFolderId`. Missing lists are `[]`.                                                                                               |
| `getSong(id)`                    | `Subsonic.Child`           |                                                                                                                                                                                                                |
| `getPlaylists()`                 | `Subsonic.Playlist[]`      |                                                                                                                                                                                                                |
| `getPlaylist(id)`                | `Subsonic.PlaylistDetails` |                                                                                                                                                                                                                |
| `getCoverArt(id, size = 150)`    | `Subsonic.BinaryResponse`  | `{buffer, length, type, ext}`                                                                                                                                                                                  |
| `stream(id, options?)`           | `Subsonic.BinaryResponse`  | Uses `/stream` with options, `/download` without.                                                                                                                                                              |
| `callApi(endpoint, params?)`     | parsed XML                 | Low-level.                                                                                                                                                                                                     |
| `callApiJson(endpoint, params?)` | `subsonic-response` object | Low-level, JSON.                                                                                                                                                                                               |

## Errors

`getOpenSubsonicExtensions()`, `search3()`, `getSong()` and `callApiJson()` throw typed errors. They're attached to the class (so the CommonJS build still exports only the class) and all extend `Error`:

| Class                                     | When                                                                           | Extra fields |
| ----------------------------------------- | ------------------------------------------------------------------------------ | ------------ |
| `SubsonicApiWrapper.SubsonicApiError`     | The server answered with an error, e.g. 40 = wrong credentials, 70 = not found | `code`       |
| `SubsonicApiWrapper.SubsonicHttpError`    | Non-2xx HTTP status                                                            | `status`     |
| `SubsonicApiWrapper.SubsonicNetworkError` | The server couldn't be reached, or the response wasn't valid JSON              |              |
| `SubsonicApiWrapper.SubsonicError`        | Base class of all of the above                                                 |              |

```ts
try {
  await api.getSong(id);
} catch (error) {
  if (error instanceof SubsonicApiWrapper.SubsonicApiError && error.code === 70) {
    // not found
  }
}
```

The older XML methods (`getNowPlaying()`, `getPlaylists()` and so on) haven't changed. They don't check the response status, so a server error such as wrong credentials gives an empty result rather than an exception.

# Development

```bash
npm install
npm test        # vitest, against a local mock server
npm run build   # unbuild: ESM + CJS + types in dist/
```

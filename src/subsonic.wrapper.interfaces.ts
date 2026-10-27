export declare namespace Subsonic {
  interface Playlist {
    changed: string;
    comment: string;
    coverArt: string;
    created: string;
    duration: string;
    id: string;
    owner: string;
    name: string;
    public: string;
    songCount: string;
  }

  interface Song {
    album: string;
    albumId?: string;
    artistId?: string;
    artist: string;
    discNumber?: string;
    bitRate: string;
    contentType: string;
    coverArt?: string;
    created: string;
    duration: string;
    genre?: string;
    id: string;
    isDir: string;
    isVideo: string;
    parent: string;
    path: string;
    playCount?: string;
    size: string;
    starred?: string;
    suffix: string;
    title: string;
    track?: string;
    transcodedContentType?: string;
    transcodedSuffix?: string;
    type?: string;
    year?: string;
    selected?: boolean;
    previousClicked?: boolean;
  }

  interface Album {
    artist: string;
    artistId: string;
    coverArt?: string;
    created: string;
    duration: string;
    genre?: string;
    id: string;
    name: string;
    songCount: string;
  }

  interface PlaylistDetails {
    playlist: Playlist;
    songs: Song[];
  }

  interface NowPlaying {
    username: string;
    minutesAgo: number;
    playerId: number;
    id: string;
    parent?: string;
    playerName?: string;
    title: string;
    isDir: boolean;
    album: string;
    artist: string;
    track: number;
    genre: string;
    coverArt: string;
    size: number;
    contentType: string;
    suffix: string;
    transcodedContentType: string;
    transcodedSuffix: string;
    path: string;
    type: string;
    artistId?: string;
    bitRate: number;
    discNumber?: number;
    isVideo?: boolean;
    year: number;
    duration: number;
    playCount?: number;
    created: Date;
    albumId: string;
    /** OpenSubsonic `playbackReport` only. */
    state?: PlaybackState;
    /** OpenSubsonic `playbackReport` only. Position when the server last heard from the player. */
    positionMs?: number;
    /** OpenSubsonic `playbackReport` only. 1 is normal speed. */
    playbackRate?: number;
    starred?: Date;
    userRating?: number;
  }

  /** `string & {}` keeps autocomplete for the known states while allowing new ones. */
  type PlaybackState = 'starting' | 'playing' | 'paused' | 'stopped' | (string & {});

  interface OpenSubsonicExtension {
    name: string;
    versions: number[];
  }

  /*
   * The types below come from the JSON API (`callApiJson()`), so numbers and booleans are real
   * numbers and booleans. Field names follow the Subsonic/OpenSubsonic docs.
   */

  /** A song. https://opensubsonic.netlify.app/docs/responses/child/ */
  interface Child {
    id: string;
    parent?: string;
    isDir: boolean;
    title: string;
    album?: string;
    artist?: string;
    track?: number;
    year?: number;
    genre?: string;
    coverArt?: string;
    size?: number;
    contentType?: string;
    suffix?: string;
    duration?: number;
    bitRate?: number;
    path?: string;
    playCount?: number;
    discNumber?: number;
    created?: string;
    albumId?: string;
    artistId?: string;
    type?: string;
    starred?: string;
    userRating?: number;
    // OpenSubsonic
    mediaType?: string;
    played?: string;
    bpm?: number;
    comment?: string;
    musicBrainzId?: string;
    genres?: {name: string}[];
    artists?: ArtistID3[];
    displayArtist?: string;
    albumArtists?: ArtistID3[];
    displayAlbumArtist?: string;
  }

  /** A `getNowPlaying` entry from the JSON API. https://opensubsonic.netlify.app/docs/endpoints/getnowplaying/ */
  interface NowPlayingEntry extends Child {
    username: string;
    minutesAgo: number;
    playerId: number;
    playerName?: string;
    /** OpenSubsonic `playbackReport` only. */
    state?: PlaybackState;
    /** OpenSubsonic `playbackReport` only. Position when the server last heard from the player. */
    positionMs?: number;
    /** OpenSubsonic `playbackReport` only. 1 is normal speed. */
    playbackRate?: number;
  }

  interface ArtistID3 {
    id: string;
    name: string;
    coverArt?: string;
    artistImageUrl?: string;
    albumCount?: number;
    starred?: string;
  }

  interface AlbumID3 {
    id: string;
    name: string;
    artist?: string;
    artistId?: string;
    coverArt?: string;
    songCount: number;
    duration: number;
    playCount?: number;
    created: string;
    starred?: string;
    year?: number;
    genre?: string;
  }

  interface SearchResult3 {
    artist: ArtistID3[];
    album: AlbumID3[];
    song: Child[];
  }

  interface Search3Options {
    artistCount?: number;
    artistOffset?: number;
    albumCount?: number;
    albumOffset?: number;
    songCount?: number;
    songOffset?: number;
    musicFolderId?: string;
  }

  interface StreamOptions {
    maxBitRate: number;
    format?: StreamDownloadFormats;
  }

  type StreamDownloadFormats = 'raw' | 'mp3' | 'opus';

  interface BinaryResponse {
    buffer: Buffer;
    length: string | null;
    type: string | null;
    ext: string | null;
  }
}

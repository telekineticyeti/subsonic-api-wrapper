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
  }
}

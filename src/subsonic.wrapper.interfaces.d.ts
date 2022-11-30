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
    id: number;
    parent?: string;
    playerName?: string;
    title: string;
    isDir: boolean;
    album: string;
    artist: string;
    track: number;
    genre: string;
    coverArt: number;
    size: number;
    contentType: string;
    suffix: string;
    transcodedContentType: string;
    transcodedSuffix: string;
    path: string;
  }
}

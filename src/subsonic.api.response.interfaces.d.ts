export declare namespace SubsonicApi {
  interface response {
    'subsonic-response': {
      $: {
        status: StatusTypes;
        version: string;
        xmlns: string;
      };
      error?: {};
      albumList2?: [
        {
          album: getAlbumList[];
        },
      ];
      getAlbum?: [
        {
          $: getAlbumEntity;
          song: getSongList[];
        },
      ];
      playlists?: [
        {
          playlist?: playlistList[];
        },
      ];
      playlist?: [
        {
          $: playlist;
          entry: getSongList[];
        },
      ];
      searchResult3?: [
        {
          artist?: getArtistList[];
          album?: getAlbumList[];
          song?: getSongList[];
        },
      ];
      artist?: [
        {
          $: getArtistEntity;
          album?: getAlbumList[];
        },
      ];
      artistInfo2?: [
        {
          biography?: string;
          musicBrainzId?: string;
          lastFmUrl?: string;
          smallImageUrl?: string;
          mediumImageUrl?: string;
          largeImageUrl?: string;
        },
      ];
      album?: {};
      nowPlaying?: {
        entry: getNowPlaying[];
      };
    };
  }

  interface error {
    code: string;
    message: string;
  }

  interface artist {
    id: string;
    name: string;
    coverArt: string;
    albumCount: string;
  }

  interface playlist {
    id: string;
    name: string;
    comment: string;
    owner: string;
    public: string;
    songCount: string;
    duration: string;
    created: string;
    changed: string;
    coverArt: string;
  }

  interface nowPlayingEntry {
    username: string;
    minutesAgo: string;
    playerId: string;
    id: string;
    parent?: string;
    playerName?: string;
    title: string;
    isDir: string;
    album: string;
    artist: string;
    track: string;
    genre: string;
    coverArt: string;
    size: string;
    contentType: string;
    suffix: string;
    transcodedContentType: string;
    transcodedSuffix: string;
    path: string;
  }

  interface playlistList {
    $: playlist;
  }

  interface song {
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
  }

  // http://www.subsonic.org/pages/api.jsp#getAlbumList2
  interface albumListEntity {
    artist: string;
    artistId: string;
    coverArt: string;
    created: string;
    duration: string;
    genre?: string;
    id: string;
    name: string;
    songCount: string;
    year?: string;
  }

  // http://www.subsonic.org/pages/api.jsp#getAlbum
  interface getAlbumEntity {
    artist: string;
    artistId: string;
    coverArt: string;
    created: string;
    duration: string;
    genre?: string;
    id: string;
    name: string;
    songCount: string;
  }

  // http://www.subsonic.org/pages/api.jsp#getArtistInfo2
  // http://www.subsonic.org/pages/api.jsp#getArtist
  interface getArtistEntity {
    id: string;
    name: string;
    coverArt: string;
    albumCount: string;
  }

  interface getArtistList {
    $: artist;
  }

  interface getSongList {
    $: song;
  }

  interface getAlbumList {
    $: albumListEntity;
  }

  interface getAlbum {
    $: getAlbumEntity;
  }

  interface getArtist {
    $: getArtistEntity;
  }

  // http://www.subsonic.org/pages/api.jsp#getNowPlaying
  interface getNowPlaying {
    $: nowPlayingEntry;
  }

  type StatusTypes = 'ok' | 'error';
}

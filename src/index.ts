import type {SubsonicApi} from './subsonic.api.response.interfaces';
import type {Subsonic} from './subsonic.wrapper.interfaces';
import {convertableToString, ParserOptions, parseString} from 'xml2js';
import * as crypto from 'crypto';
import fetch, {type Response} from 'node-fetch';
import {extension} from 'mime-types';
import Utilities from './utilities.helper';
import {SubsonicApiError, SubsonicError, SubsonicHttpError, SubsonicNetworkError} from './errors';

const util = new Utilities();

const AUTH_ERROR_CODES = [40, 41, 42, 43, 44, 50];

class SubsonicApiWrapper {
  /*
   * The error classes hang off the class rather than being named exports, so the CommonJS build
   * keeps `module.exports = SubsonicApiWrapper`. Example: `err instanceof SubsonicApiWrapper.SubsonicApiError`.
   */
  static readonly SubsonicError = SubsonicError;
  static readonly SubsonicNetworkError = SubsonicNetworkError;
  static readonly SubsonicHttpError = SubsonicHttpError;
  static readonly SubsonicApiError = SubsonicApiError;

  constructor(
    private config: {
      server: string;
      username: string;
      password: string;
      appName?: string;
      appVersion?: string;
      /**
       * Gives up on a request (including reading its body) after this many milliseconds and throws a
       * `SubsonicNetworkError`. Default: no timeout.
       */
      timeoutMs?: number;
    },
  ) {
    this.appName = this.config.appName || 'Subsonic API Wrapper for Node.js';
    this.appVersion = this.config.appVersion || '1';
  }
  private appName: string;
  private appVersion: string;

  /**
   * Performs a GET call on the specified API endpoint
   * @param endpoint Target endpoint
   * @param params list of optional parameters for this endpoint
   * @returns Observable of parsed XML to JSON object
   */
  public async callApi(endpoint: string, params?: {[key: string]: string | number}[]): Promise<SubsonicApi.response> {
    const url = this.constructEndpointUrl(endpoint, params);
    const body = await this.request(endpoint, url, response => response.text());

    try {
      return await this.asyncXmlParse<SubsonicApi.response>(body, {explicitArray: true});
    } catch (error) {
      throw new Error(error as any);
    }
  }

  /**
   * Fetches `url` and reads its body with `read`. Network failures (including timeouts) become a
   * `SubsonicNetworkError` that names only the endpoint and error code: node-fetch's messages include
   * the URL, which carries credentials.
   */
  private async request<T>(endpoint: string, url: string, read: (response: Response) => Promise<T>): Promise<T> {
    try {
      const response = await fetch(url, this.config.timeoutMs ? {timeout: this.config.timeoutMs} : undefined);
      return await read(response);
    } catch (error) {
      if (error instanceof SubsonicError) throw error;
      const {code, type} = error as {code?: string; type?: string};
      const reason = type === 'request-timeout' || type === 'body-timeout' ? 'timeout' : code;
      throw new SubsonicNetworkError(`${endpoint}: request failed${reason ? ` (${reason})` : ''}`);
    }
  }

  /**
   * Performs a GET call on the specified API endpoint, asking for JSON.
   * Unlike `callApi()`, failures throw typed errors (see `errors.ts`), including a
   * `SubsonicApiError` when the server answers with an error status.
   * @param endpoint Target endpoint
   * @param params list of optional parameters for this endpoint
   * @returns The contents of `subsonic-response`
   */
  public async callApiJson<T extends SubsonicApi.jsonResponse = SubsonicApi.jsonResponse>(
    endpoint: string,
    params?: {[key: string]: string | number}[],
  ): Promise<T> {
    const url = this.constructEndpointUrl(endpoint, [...(params ?? []), {f: 'json'}]);

    const text = await this.request(endpoint, url, async response => {
      if (!response.ok) throw new SubsonicHttpError(response.status, response.statusText);
      return response.text();
    });

    let body: {'subsonic-response'?: T};
    try {
      body = JSON.parse(text) as {'subsonic-response'?: T};
    } catch (error) {
      throw new SubsonicNetworkError(`${endpoint}: response is not JSON`, error);
    }

    const payload = body['subsonic-response'];
    if (!payload) throw new SubsonicNetworkError(`${endpoint}: response has no subsonic-response`);
    if (payload.status !== 'ok') {
      throw new SubsonicApiError(payload.error?.code ?? 0, payload.error?.message ?? `${endpoint} failed`);
    }
    return payload;
  }

  public async callApiBinary(
    endpoint: string,
    params?: {[key: string]: string | number}[],
  ): Promise<Subsonic.BinaryResponse> {
    const url = this.constructEndpointUrl(endpoint, params);
    return this.request(endpoint, url, async response => {
      const buffer = await response.buffer();
      const length = response.headers.get('content-length');
      const type = response.headers.get('content-type');
      const ext = type ? extension(type) || null : null;
      return {buffer, length, type, ext};
    });
  }

  /**
   * Get an array of Playlists.
   * @returns An array containing playlists.
   */
  public async getPlaylists(): Promise<Subsonic.Playlist[]> {
    try {
      const apiResponse = await this.callApi('getPlaylists');
      if (!apiResponse['subsonic-response'].playlists) {
        return [];
      }
      const payload = apiResponse['subsonic-response'].playlists[0];
      const playlists: Subsonic.Playlist[] = payload.playlist!.map(playlist => playlist.$);
      return playlists;
    } catch (error) {
      throw new Error(error as any);
    }
  }

  /**
   * Get a single playlist by ID.
   * @param id Playlist target ID
   * @returns PlaylistDetails
   */
  public async getPlaylist(id: string): Promise<Subsonic.PlaylistDetails> {
    try {
      const apiResponse = await this.callApi('getPlaylist', [{id}]);
      if (!apiResponse['subsonic-response'].playlist) {
        throw new Error(`Playlist ID ${id} not found`);
      }
      const payload = apiResponse['subsonic-response'].playlist[0];
      const playlist: Subsonic.PlaylistDetails = {
        playlist: payload.$,
        songs: payload.entry ? payload.entry.map(s => s.$) : [],
      };
      return playlist;
    } catch (error) {
      throw new Error(error as any);
    }
  }

  public async getNowPlaying(): Promise<Subsonic.NowPlaying[]> {
    const apiResponse = await this.callApi('getNowPlaying');
    try {
      // For some reason, airsonmic returns an empty string as first item in
      // array if nothing is playing.
      if (
        !apiResponse['subsonic-response'].nowPlaying ||
        typeof apiResponse['subsonic-response'].nowPlaying[0] === 'string'
      ) {
        return [];
      }
      const payload = apiResponse['subsonic-response'].nowPlaying[0];
      const nowPlaying: Subsonic.NowPlaying[] = payload.entry.map(entry => ({
        ...entry.$,
        ...{
          minutesAgo: util.safeNumber(entry.$.minutesAgo),
          playerId: util.safeNumber(entry.$.playerId),
          id: entry.$.id,
          track: util.safeNumber(entry.$.track),
          coverArt: entry.$.coverArt,
          size: util.safeNumber(entry.$.size),
          isDir: entry.$.isDir === 'true',
          artistId: entry.$.artistId,
          bitRate: util.safeNumber(entry.$.bitRate),
          discNumber: util.safeNumber(entry.$.discNumber),
          isVideo: entry.$.isVideo === 'true',
          year: util.safeNumber(entry.$.year),
          duration: util.safeNumber(entry.$.duration),
          // playCount supported by Airsonic but not Navidrome.
          playCount: util.safeNumber(entry.$.playCount),
          albumId: entry.$.albumId,
          parent: entry.$.parent,
          created: new Date(Date.parse(entry.$.created)),
          // OpenSubsonic playbackReport; absent on other servers.
          state: entry.$.state,
          positionMs: util.optionalNumber(entry.$.positionMs),
          playbackRate: util.optionalNumber(entry.$.playbackRate, true),
          starred: entry.$.starred ? new Date(Date.parse(entry.$.starred)) : undefined,
          userRating: util.optionalNumber(entry.$.userRating),
        },
      }));
      return nowPlaying;
    } catch (error) {
      throw new Error(error as any);
    }
  }

  /**
   * JSON version of `getNowPlaying()`. Unlike that method, failures throw typed errors, so wrong
   * credentials can be told apart from nothing playing. Values come typed from the server rather
   * than parsed, and missing fields stay `undefined` (no -1 placeholders).
   */
  public async getNowPlayingJson(): Promise<Subsonic.NowPlayingEntry[]> {
    const response = await this.callApiJson<
      SubsonicApi.jsonResponse & {nowPlaying?: {entry?: Subsonic.NowPlayingEntry[]}}
    >('getNowPlaying');
    return response.nowPlaying?.entry ?? [];
  }

  /**
   * Lists the OpenSubsonic extensions the server supports, such as `playbackReport`.
   * Servers without OpenSubsonic support return an empty array. Rejected credentials still throw.
   */
  public async getOpenSubsonicExtensions(): Promise<Subsonic.OpenSubsonicExtension[]> {
    try {
      const response = await this.callApiJson<
        SubsonicApi.jsonResponse & {openSubsonicExtensions?: Subsonic.OpenSubsonicExtension[]}
      >('getOpenSubsonicExtensions');
      return response.openSubsonicExtensions ?? [];
    } catch (error) {
      if (error instanceof SubsonicApiError && !AUTH_ERROR_CODES.includes(error.code)) return [];
      if (error instanceof SubsonicHttpError && error.status === 404) return [];
      throw error;
    }
  }

  /**
   * Searches artists, albums and songs (ID3 tags). Missing result lists come back as empty arrays.
   * @param query Search text. Some servers (Navidrome) accept `""` to list everything.
   */
  public async search3(query: string, options: Subsonic.Search3Options = {}): Promise<Subsonic.SearchResult3> {
    const params = Object.entries(options)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => ({[key]: value as string | number}));
    const response = await this.callApiJson<
      SubsonicApi.jsonResponse & {searchResult3?: Partial<Subsonic.SearchResult3>}
    >('search3', [{query}, ...params]);
    const result = response.searchResult3 ?? {};
    return {artist: result.artist ?? [], album: result.album ?? [], song: result.song ?? []};
  }

  /**
   * Gets one song by ID. Throws a `SubsonicApiError` with code 70 if it doesn't exist.
   */
  public async getSong(id: string): Promise<Subsonic.Child> {
    const response = await this.callApiJson<SubsonicApi.jsonResponse & {song?: Subsonic.Child}>('getSong', [{id}]);
    if (!response.song) throw new SubsonicApiError(70, `Song ${id} not found`);
    return response.song;
  }

  /**
   * Network failures throw a `SubsonicNetworkError`. Error responses from the server are returned as
   * is, so check `type` before treating `buffer` as an image.
   */
  public async getCoverArt(id: string, size = 150): Promise<Subsonic.BinaryResponse> {
    return this.callApiBinary('getCoverArt', [{id}, {size}]);
  }

  /**
   * @param id The ID of the song file to download.
   * @param options IF provided, this method will use the /stream endpoint, otherwise the /download endpoint is used.
   * @param options.maxBitRate Maximum bitrate of the transcoded file.
   * @param options.format Audio format to transcode to. If set `raw` then `maxBitRate` is ignored. Default: mp3
   * @returns BinaryResponse Object
   */
  public async stream(id: string, transcodeOptions?: Subsonic.StreamOptions): Promise<Subsonic.BinaryResponse> {
    const optionsDefaults: Subsonic.StreamOptions = {maxBitRate: 0, format: 'mp3'};

    if (transcodeOptions) {
      transcodeOptions = {...optionsDefaults, ...transcodeOptions};
    }

    try {
      const apiResponse =
        transcodeOptions && transcodeOptions.format !== 'raw'
          ? await this.callApiBinary('stream', [
              {id},
              {maxBitRate: transcodeOptions.maxBitRate},
              {format: transcodeOptions.format!},
            ])
          : await this.callApiBinary('download', [{id}]);
      return apiResponse;
    } catch (error) {
      if (error instanceof SubsonicError) throw error;
      throw new Error(error as any);
    }
  }

  /**
   * Asynchronous version of xml2js `parseString()` method, to make it simler to integrate
   * into observable streams.
   * @param input  XML string input
   * @param options xml2js options
   * @returns Promise of xml2js result
   */
  private asyncXmlParse<T>(input: convertableToString, options: ParserOptions): Promise<T> {
    return new Promise((resolve, reject) => {
      parseString(input, options, (error, result: T) => {
        if (error) return reject(error);
        return resolve(result);
      });
    });
  }

  /**
   * Creates endpoint url string, including authentication and client parameters,
   * in addition to arguement provided parameters
   * @param endpoint The target endpoint, example `getPlaylists`
   * @param params Array of key-value pair parameters
   * @returns URL string
   */
  private constructEndpointUrl(
    endpoint: string,
    params?: {
      [key: string]: string | number;
    }[],
  ): URL['href'] {
    const url = new URL(`${this.config.server}/rest/${endpoint}${this.apiAuthStr()}`);

    if (params) {
      params.forEach(p => Object.entries(p).forEach(o => url.searchParams.append(o[0], o[1].toString())));
    }

    return url.href;
  }

  /**
   * Constructs authentication parameters to append to enpoint URLs.
   * Password is salted, hashed and passed as parameter.
   */
  private apiAuthStr(): string {
    const salt = this.createSaltStr(6);
    const hash = crypto
      .createHash('md5')
      .update(this.config.password + salt)
      .digest('hex');

    return `?u=${this.config.username}&t=${hash}&s=${salt}&c=${this.appName}&v=${this.appVersion}`;
  }

  /**
   * Randomised string of characters for use as a salt
   */
  private createSaltStr(length: number = 6): string {
    let result = '';
    const characterSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const characterSetLength = characterSet.length;
    for (let i = 0; i < length; i++) {
      result += characterSet.charAt(Math.floor(Math.random() * characterSetLength));
    }
    return result;
  }
}

// Type-only, so the CommonJS build still exports just the class.
export type {SubsonicError, SubsonicNetworkError, SubsonicHttpError, SubsonicApiError};
export {SubsonicApi, Subsonic, SubsonicApiWrapper as default};

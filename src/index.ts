import type {SubsonicApi} from './subsonic.api.response.interfaces';
import type {Subsonic} from './subsonic.wrapper.interfaces';
import {convertableToString, ParserOptions, parseString} from 'xml2js';
import * as crypto from 'crypto';
import fetch from 'node-fetch';
import {extension} from 'mime-types';
import Utilities from './utilities.helper';

const util = new Utilities();

class SubsonicApiWrapper {
  constructor(
    private config: {
      server: string;
      username: string;
      password: string;
      appName?: string;
      appVersion?: string;
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

    try {
      const response = await fetch(url);
      const body = await response.text();
      return await this.asyncXmlParse<SubsonicApi.response>(body, {explicitArray: true});
    } catch (error) {
      throw new Error(error as any);
    }
  }

  public async callApiBinary(
    endpoint: string,
    params?: {[key: string]: string | number}[],
  ): Promise<Subsonic.BinaryResponse> {
    const url = this.constructEndpointUrl(endpoint, params);
    try {
      const response = await fetch(url);
      const buffer = await response.buffer();
      const length = response.headers.get('content-length');
      const type = response.headers.get('content-type');
      const ext = type ? extension(type) || null : null;

      return {buffer, length, type, ext};
    } catch (error) {
      throw new Error(error as any);
    }
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
        },
      }));
      return nowPlaying;
    } catch (error) {
      throw new Error(error as any);
    }
  }

  public async getCoverArt(id: string, size = 150): Promise<Subsonic.BinaryResponse> {
    try {
      const apiResponse = await this.callApiBinary('getCoverArt', [{id}, {size}]);
      return apiResponse;
    } catch (error) {
      throw new Error(error as any);
    }
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
          : this.callApiBinary('download', [{id}]);
      return apiResponse;
    } catch (error) {
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

export {SubsonicApi, Subsonic, SubsonicApiWrapper as default};

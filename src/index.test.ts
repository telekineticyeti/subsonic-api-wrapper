import {createServer, type IncomingMessage, type Server, type ServerResponse} from 'http';
import type {AddressInfo} from 'net';
import {afterAll, beforeAll, beforeEach, describe, expect, it} from 'vitest';
import SubsonicApiWrapper from './index';

type Handler = (url: URL, res: ServerResponse) => void;

const xml = (inner: string, status = 'ok') =>
  `<?xml version="1.0" encoding="UTF-8"?><subsonic-response xmlns="http://subsonic.org/restapi" status="${status}" version="1.16.1">${inner}</subsonic-response>`;

const json = (res: ServerResponse, body: object, status = 'ok') => {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({'subsonic-response': {status, version: '1.16.1', ...body}}));
};

describe('SubsonicApiWrapper', () => {
  let server: Server;
  let base: string;
  let handlers: Record<string, Handler>;
  let requests: URL[];

  const api = () => new SubsonicApiWrapper({server: base, username: 'testuser', password: 'secret', appName: 'test'});

  beforeAll(async () => {
    server = createServer((req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url!, base);
      requests.push(url);
      const handler = handlers[url.pathname.replace('/rest/', '')];
      if (!handler) {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }
      handler(url, res);
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  beforeEach(() => {
    handlers = {};
    requests = [];
  });

  afterAll(() => server.close());

  describe('getNowPlaying', () => {
    const entry = `<entry id="s1" title="Windowlicker" artist="Aphex Twin" album="Windowlicker" username="testuser" minutesAgo="0" playerId="3" playerName="Living Room" duration="367" year="1999" genre="Electronic" coverArt="al-1" created="2024-01-01T00:00:00Z" track="1" size="1" bitRate="320" isDir="false"`;

    it('parses OpenSubsonic playbackReport fields', async () => {
      handlers.getNowPlaying = (_url, res) =>
        res.end(
          xml(
            `<nowPlaying>${entry} state="paused" positionMs="91500" playbackRate="1.25" starred="2025-03-01T10:00:00Z" userRating="5"></entry></nowPlaying>`,
          ),
        );
      const [song] = await api().getNowPlaying();
      expect(song).toMatchObject({
        id: 's1',
        title: 'Windowlicker',
        playerName: 'Living Room',
        duration: 367,
        state: 'paused',
        positionMs: 91500,
        playbackRate: 1.25,
        userRating: 5,
      });
      expect(song.starred).toEqual(new Date('2025-03-01T10:00:00Z'));
    });

    it('leaves the OpenSubsonic fields undefined on other servers', async () => {
      handlers.getNowPlaying = (_url, res) => res.end(xml(`<nowPlaying>${entry}></entry></nowPlaying>`));
      const [song] = await api().getNowPlaying();
      expect(song.state).toBeUndefined();
      expect(song.positionMs).toBeUndefined();
      expect(song.playbackRate).toBeUndefined();
      expect(song.starred).toBeUndefined();
      expect(song.userRating).toBeUndefined();
      expect(song.minutesAgo).toBe(0);
    });

    it('returns an empty array when nothing is playing', async () => {
      handlers.getNowPlaying = (_url, res) => res.end(xml('<nowPlaying></nowPlaying>'));
      expect(await api().getNowPlaying()).toEqual([]);
    });
  });

  describe('callApiJson', () => {
    it('asks for JSON and sends credentials', async () => {
      handlers.ping = (_url, res) => json(res, {});
      const response = await api().callApiJson('ping', [{a: 1}]);
      expect(response.status).toBe('ok');
      const params = requests[0].searchParams;
      expect(params.get('f')).toBe('json');
      expect(params.get('a')).toBe('1');
      expect(params.get('u')).toBe('testuser');
      expect(params.get('t')).toMatch(/^[0-9a-f]{32}$/);
    });

    it('throws a SubsonicApiError for a failed status', async () => {
      handlers.ping = (_url, res) => json(res, {error: {code: 40, message: 'Wrong username or password'}}, 'failed');
      const error = await api()
        .callApiJson('ping')
        .catch(e => e);
      expect(error).toBeInstanceOf(SubsonicApiWrapper.SubsonicApiError);
      expect(error).toBeInstanceOf(SubsonicApiWrapper.SubsonicError);
      expect(error).toBeInstanceOf(Error);
      expect(error).toMatchObject({code: 40, message: 'Wrong username or password', name: 'SubsonicApiError'});
    });

    it('throws a SubsonicHttpError for a non-2xx status', async () => {
      handlers.ping = (_url, res) => {
        res.statusCode = 502;
        res.end();
      };
      const error = await api()
        .callApiJson('ping')
        .catch(e => e);
      expect(error).toBeInstanceOf(SubsonicApiWrapper.SubsonicHttpError);
      expect(error.status).toBe(502);
    });

    it('throws a SubsonicNetworkError for a body that is not JSON', async () => {
      handlers.ping = (_url, res) => res.end('<html>');
      await expect(api().callApiJson('ping')).rejects.toBeInstanceOf(SubsonicApiWrapper.SubsonicNetworkError);
    });

    it('throws a SubsonicNetworkError without leaking credentials when unreachable', async () => {
      const unreachable = new SubsonicApiWrapper({
        server: 'http://127.0.0.1:1',
        username: 'testuser',
        password: 'secret',
      });
      const error = await unreachable.callApiJson('ping').catch(e => e);
      expect(error).toBeInstanceOf(SubsonicApiWrapper.SubsonicNetworkError);
      expect(error.message).toBe('ping: request failed (ECONNREFUSED)');
      expect(JSON.stringify(error)).not.toContain('t=');
      expect(error.cause).toBeUndefined();
    });
  });

  describe('getOpenSubsonicExtensions', () => {
    it('lists extensions', async () => {
      handlers.getOpenSubsonicExtensions = (_url, res) =>
        json(res, {openSubsonic: true, openSubsonicExtensions: [{name: 'playbackReport', versions: [1]}]});
      expect(await api().getOpenSubsonicExtensions()).toEqual([{name: 'playbackReport', versions: [1]}]);
    });

    it('returns [] when the server does not know the endpoint', async () => {
      handlers.getOpenSubsonicExtensions = (_url, res) =>
        json(res, {error: {code: 0, message: 'Unknown method'}}, 'failed');
      expect(await api().getOpenSubsonicExtensions()).toEqual([]);
    });

    it('returns [] for a 404', async () => {
      expect(await api().getOpenSubsonicExtensions()).toEqual([]);
    });

    it('still throws when the credentials are rejected', async () => {
      handlers.getOpenSubsonicExtensions = (_url, res) =>
        json(res, {error: {code: 40, message: 'Wrong username or password'}}, 'failed');
      await expect(api().getOpenSubsonicExtensions()).rejects.toMatchObject({code: 40});
    });
  });

  describe('search3', () => {
    it('passes options and fills missing lists', async () => {
      handlers.search3 = (_url, res) =>
        json(res, {searchResult3: {song: [{id: 's1', title: 'Windowlicker', isDir: false, duration: 367}]}});
      const result = await api().search3('window', {songCount: 5, albumCount: 0, artistOffset: undefined});
      expect(result).toEqual({
        artist: [],
        album: [],
        song: [{id: 's1', title: 'Windowlicker', isDir: false, duration: 367}],
      });
      const params = requests[0].searchParams;
      expect(params.get('query')).toBe('window');
      expect(params.get('songCount')).toBe('5');
      expect(params.get('albumCount')).toBe('0');
      expect(params.has('artistOffset')).toBe(false);
    });

    it('handles an empty result', async () => {
      handlers.search3 = (_url, res) => json(res, {searchResult3: {}});
      expect(await api().search3('nothing')).toEqual({artist: [], album: [], song: []});
    });
  });

  describe('getSong', () => {
    it('returns the song', async () => {
      handlers.getSong = (url, res) => json(res, {song: {id: url.searchParams.get('id'), title: 'X', isDir: false}});
      expect(await api().getSong('s9')).toEqual({id: 's9', title: 'X', isDir: false});
    });

    it('throws code 70 for a missing song', async () => {
      handlers.getSong = (_url, res) => json(res, {error: {code: 70, message: 'Song not found'}}, 'failed');
      await expect(api().getSong('nope')).rejects.toMatchObject({code: 70});
    });
  });

  describe('existing XML methods', () => {
    it('getPlaylists is unchanged', async () => {
      handlers.getPlaylists = (_url, res) =>
        res.end(xml('<playlists><playlist id="1" name="Mix" songCount="2"></playlist></playlists>'));
      const playlists = await api().getPlaylists();
      expect(playlists[0]).toMatchObject({id: '1', name: 'Mix', songCount: '2'});
      expect(requests[0].searchParams.has('f')).toBe(false);
    });
  });
});

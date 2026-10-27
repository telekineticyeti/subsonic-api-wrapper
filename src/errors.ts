/**
 * Base class for errors thrown by the JSON API methods.
 */
export class SubsonicError extends Error {
  public readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'SubsonicError';
    this.cause = cause;
  }
}

/**
 * The server couldn't be reached, or its response couldn't be read.
 */
export class SubsonicNetworkError extends SubsonicError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'SubsonicNetworkError';
  }
}

/**
 * The server answered with a non-2xx HTTP status.
 */
export class SubsonicHttpError extends SubsonicError {
  constructor(
    public readonly status: number,
    statusText: string,
  ) {
    super(`HTTP ${status} ${statusText}`.trim());
    this.name = 'SubsonicHttpError';
  }
}

/**
 * The server answered with `status: "failed"` and a Subsonic error code.
 * Codes: http://www.subsonic.org/pages/api.jsp#errorHandling (e.g. 40 = wrong username or password,
 * 70 = data not found).
 */
export class SubsonicApiError extends SubsonicError {
  constructor(
    public readonly code: number,
    message: string,
  ) {
    super(message);
    this.name = 'SubsonicApiError';
  }
}

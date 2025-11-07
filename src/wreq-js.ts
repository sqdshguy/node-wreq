import type {
  RequestOptions,
  Response,
  BrowserProfile,
  WebSocketOptions,
  NativeWebSocketConnection,
} from './types';
import { RequestError } from './types';

interface NativeWebSocketOptions {
  url: string;
  browser: BrowserProfile;
  headers: Record<string, string>;
  proxy?: string;
  onMessage: (data: string | Buffer) => void;
  onClose?: () => void;
  onError?: (error: string) => void;
}

let nativeBinding: {
  request: (options: RequestOptions) => Promise<Response>;
  getProfiles: () => string[];
  websocketConnect: (options: NativeWebSocketOptions) => Promise<NativeWebSocketConnection>;
  websocketSend: (ws: NativeWebSocketConnection, data: string | Buffer) => Promise<void>;
  websocketClose: (ws: NativeWebSocketConnection) => Promise<void>;
};

function loadNativeBinding() {
  const platform = process.platform;
  const arch = process.arch;

  // Map Node.js platform/arch to Rust target triple suffixes
  // napi-rs creates files like: wreq-js.linux-x64-gnu.node
  const platformArchMap: Record<string, Record<string, string>> = {
    darwin: {
      x64: 'darwin-x64',
      arm64: 'darwin-arm64',
    },
    linux: {
      x64: 'linux-x64-gnu',
      arm64: 'linux-arm64-gnu',
    },
    win32: {
      x64: 'win32-x64-msvc',
    },
  };

  const platformArch = platformArchMap[platform]?.[arch];

  if (!platformArch) {
    throw new Error(
      `Unsupported platform: ${platform}-${arch}. ` +
        `Supported platforms: darwin-x64, darwin-arm64, linux-x64, linux-arm64, win32-x64`
    );
  }

  // Try to load platform-specific binary
  const binaryName = `wreq-js.${platformArch}.node`;

  try {
    return require(`../rust/${binaryName}`);
  } catch (e1) {
    // Fallback to wreq-js.node (for local development)
    try {
      return require('../rust/wreq-js.node');
    } catch (e2) {
      throw new Error(
        `Failed to load native module for ${platform}-${arch}. ` +
          `Tried: ../rust/${binaryName} and ../rust/wreq-js.node. ` +
          `Make sure the package is installed correctly and the native module is built for your platform.`
      );
    }
  }
}

try {
  nativeBinding = loadNativeBinding();
} catch (error) {
  throw error;
}

/**
 * Make an HTTP request with browser impersonation
 *
 * @param options - Request options
 * @returns Promise that resolves to the response
 *
 * @example
 * ```typescript
 * import { request } from 'wreq-js';
 *
 * const response = await request({
 *   url: 'https://example.com/api',
 *   browser: 'chrome_137',
 *   headers: {
 *     'Custom-Header': 'value'
 *   }
 * });
 *
 * console.log(response.status); // 200
 * console.log(response.body);   // Response body
 * ```
 */
export async function request(options: RequestOptions): Promise<Response> {
  if (!options.url) {
    throw new RequestError('URL is required');
  }

  if (options.browser) {
    const profiles = getProfiles();

    if (!profiles.includes(options.browser)) {
      throw new RequestError(
        `Invalid browser profile: ${options.browser}. Available profiles: ${profiles.join(', ')}`
      );
    }
  }

  try {
    return await nativeBinding.request(options);
  } catch (error) {
    throw new RequestError(String(error));
  }
}

/**
 * Get list of available browser profiles
 *
 * @returns Array of browser profile names
 *
 * @example
 * ```typescript
 * import { getProfiles } from 'wreq-js';
 *
 * const profiles = getProfiles();
 * console.log(profiles); // ['chrome_120', 'chrome_131', 'firefox', ...]
 * ```
 */
export function getProfiles(): BrowserProfile[] {
  return nativeBinding.getProfiles() as BrowserProfile[];
}

/**
 * Convenience function for GET requests
 *
 * @param url - URL to request
 * @param options - Additional request options
 * @returns Promise that resolves to the response
 *
 * @example
 * ```typescript
 * import { get } from 'wreq-js';
 *
 * const response = await get('https://example.com/api');
 * ```
 */
export async function get(
  url: string,
  options?: Omit<RequestOptions, 'url' | 'method'>
): Promise<Response> {
  return request({ ...options, url, method: 'GET' });
}

/**
 * Convenience function for POST requests
 *
 * @param url - URL to request
 * @param body - Request body
 * @param options - Additional request options
 * @returns Promise that resolves to the response
 *
 * @example
 * ```typescript
 * import { post } from 'wreq-js';
 *
 * const response = await post(
 *   'https://example.com/api',
 *   JSON.stringify({ foo: 'bar' }),
 *   { headers: { 'Content-Type': 'application/json' } }
 * );
 * ```
 */
export async function post(
  url: string,
  body?: string,
  options?: Omit<RequestOptions, 'url' | 'method' | 'body'>
): Promise<Response> {
  return request({ ...options, url, method: 'POST', body });
}

/**
 * WebSocket connection class
 *
 * @example
 * ```typescript
 * import { websocket } from 'wreq-js';
 *
 * const ws = await websocket({
 *   url: 'wss://echo.websocket.org',
 *   browser: 'chrome_137',
 *   onMessage: (data) => {
 *     console.log('Received:', data);
 *   },
 *   onClose: () => {
 *     console.log('Connection closed');
 *   },
 *   onError: (error) => {
 *     console.error('Error:', error);
 *   }
 * });
 *
 * // Send text message
 * await ws.send('Hello World');
 *
 * // Send binary message
 * await ws.send(Buffer.from([1, 2, 3]));
 *
 * // Close connection
 * await ws.close();
 * ```
 */
export class WebSocket {
  private _connection: NativeWebSocketConnection;

  constructor(connection: NativeWebSocketConnection) {
    this._connection = connection;
  }

  /**
   * Send a message (text or binary)
   */
  async send(data: string | Buffer): Promise<void> {
    try {
      await nativeBinding.websocketSend(this._connection, data);
    } catch (error) {
      throw new RequestError(String(error));
    }
  }

  /**
   * Close the WebSocket connection
   */
  async close(): Promise<void> {
    try {
      await nativeBinding.websocketClose(this._connection);
    } catch (error) {
      throw new RequestError(String(error));
    }
  }
}

/**
 * Create a WebSocket connection with browser impersonation
 *
 * @param options - WebSocket options
 * @returns Promise that resolves to the WebSocket instance
 */
export async function websocket(options: WebSocketOptions): Promise<WebSocket> {
  if (!options.url) {
    throw new RequestError('URL is required');
  }

  if (!options.onMessage) {
    throw new RequestError('onMessage callback is required');
  }

  if (options.browser) {
    const profiles = getProfiles();

    if (!profiles.includes(options.browser)) {
      throw new RequestError(
        `Invalid browser profile: ${options.browser}. Available profiles: ${profiles.join(', ')}`
      );
    }
  }

  try {
    const connection = await nativeBinding.websocketConnect({
      url: options.url,
      browser: options.browser || 'chrome_137',
      headers: options.headers || {},
      proxy: options.proxy,
      onMessage: options.onMessage,
      onClose: options.onClose,
      onError: options.onError,
    });

    return new WebSocket(connection);
  } catch (error) {
    throw new RequestError(String(error));
  }
}

export type {
  RequestOptions,
  Response,
  BrowserProfile,
  HttpMethod,
  WebSocketOptions,
} from './types';

export type { RequestError };

export default {
  request,
  get,
  post,
  getProfiles,
  websocket,
  WebSocket,
};

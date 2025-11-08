// Import and re-export the auto-generated BrowserProfile type
import type { BrowserProfile } from "./generated-types";
export type { BrowserProfile };

/**
 * A tuple of [name, value] pairs used for initializing headers.
 * Both name and value must be strings.
 *
 * @example
 * ```typescript
 * const headers: HeaderTuple = ['Content-Type', 'application/json'];
 * ```
 */
export type HeaderTuple = [string, string];

/**
 * Represents various input types accepted when creating or initializing headers.
 * Can be an iterable of header tuples, an array of tuples, or a plain object.
 *
 * @example
 * ```typescript
 * // As an object
 * const headers: HeadersInit = { 'Content-Type': 'application/json' };
 *
 * // As an array of tuples
 * const headers: HeadersInit = [['Content-Type', 'application/json']];
 *
 * // As an iterable
 * const headers: HeadersInit = new Map([['Content-Type', 'application/json']]);
 * ```
 */
export type HeadersInit =
  | Iterable<HeaderTuple>
  | Array<HeaderTuple>
  | Record<string, string | number | boolean | null | undefined>;

/**
 * Represents the various types of data that can be used as a request body.
 * Supports string, binary data (ArrayBuffer, ArrayBufferView), URL-encoded parameters, and Node.js Buffer.
 *
 * @example
 * ```typescript
 * // String body
 * const body: BodyInit = JSON.stringify({ key: 'value' });
 *
 * // URLSearchParams
 * const body: BodyInit = new URLSearchParams({ key: 'value' });
 *
 * // Buffer
 * const body: BodyInit = Buffer.from('data');
 * ```
 */
export type BodyInit = string | ArrayBuffer | ArrayBufferView | URLSearchParams | Buffer;

/**
 * Options for configuring a fetch request. Compatible with the standard Fetch API
 * with additional wreq-specific extensions for browser impersonation, proxies, and timeouts.
 *
 * @example
 * ```typescript
 * const options: RequestInit = {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ key: 'value' }),
 *   browser: 'chrome_142',
 *   proxy: 'http://proxy.example.com:8080',
 *   timeout: 5000
 * };
 * ```
 */
export interface RequestInit {
  /**
   * A string to set request's method.
   * @default 'GET'
   */
  method?: string;

  /**
   * A Headers object, an object literal, or an array of two-item arrays to set request's headers.
   */
  headers?: HeadersInit;

  /**
   * A BodyInit object or null to set request's body.
   */
  body?: BodyInit | null;

  /**
   * An AbortSignal to set request's signal.
   */
  signal?: AbortSignal | null;

  /**
   * A string indicating whether request follows redirects, results in an error upon
   * encountering a redirect, or returns the redirect (in an opaque fashion).
   * @default 'follow'
   */
  redirect?: "follow" | "manual" | "error";

  /**
   * Browser profile to impersonate for this request.
   * Automatically applies browser-specific headers, TLS fingerprints, and HTTP/2 settings.
   * @default 'chrome_142'
   */
  browser?: BrowserProfile;

  /**
   * Proxy URL to route the request through (e.g., 'http://proxy.example.com:8080').
   * Supports HTTP and SOCKS5 proxies.
   */
  proxy?: string;

  /**
   * Request timeout in milliseconds. If the request takes longer than this value,
   * it will be aborted.
   * @default 30000
   */
  timeout?: number;
}

/**
 * Standard HTTP request methods supported by wreq.
 * Represents the most commonly used HTTP verbs for RESTful operations.
 */
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD";

/**
 * Legacy request options interface. This interface is deprecated and will be removed in a future version.
 *
 * @deprecated Use {@link RequestInit} with the standard `fetch()` API instead.
 *
 * @example
 * ```typescript
 * // Old (deprecated):
 * const options: RequestOptions = {
 *   url: 'https://api.example.com',
 *   method: 'POST',
 *   body: JSON.stringify({ data: 'value' })
 * };
 *
 * // New (recommended):
 * const response = await fetch('https://api.example.com', {
 *   method: 'POST',
 *   body: JSON.stringify({ data: 'value' })
 * });
 * ```
 */
export interface RequestOptions {
  /**
   * The URL to request.
   */
  url: string;

  /**
   * Browser profile to impersonate.
   * Automatically applies browser-specific headers, TLS fingerprints, and HTTP/2 settings.
   * @default 'chrome_142'
   */
  browser?: BrowserProfile;

  /**
   * HTTP method to use for the request.
   * @default 'GET'
   */
  method?: HttpMethod;

  /**
   * Additional headers to send with the request.
   * Browser-specific headers will be automatically added based on the selected browser profile.
   */
  headers?: Record<string, string>;

  /**
   * Request body data (for POST, PUT, PATCH requests).
   */
  body?: string;

  /**
   * Proxy URL to route the request through (e.g., 'http://proxy.example.com:8080').
   * Supports HTTP and SOCKS5 proxies.
   */
  proxy?: string;

  /**
   * Request timeout in milliseconds. If the request takes longer than this value,
   * it will be aborted.
   * @default 30000
   */
  timeout?: number;
}

/**
 * Internal response payload returned from the native Rust binding.
 * This interface represents the raw response data before it's converted
 * to a standard Response object.
 *
 * @internal
 */
export interface NativeResponse {
  /**
   * HTTP status code (e.g., 200, 404, 500).
   */
  status: number;

  /**
   * Response headers as key-value pairs.
   * Header names are normalized to lowercase.
   */
  headers: Record<string, string>;

  /**
   * Response body as a UTF-8 encoded string.
   */
  body: string;

  /**
   * Cookies set by the server as key-value pairs.
   */
  cookies: Record<string, string>;

  /**
   * Final URL after following any redirects.
   * If no redirects occurred, this will match the original request URL.
   */
  url: string;
}

/**
 * Configuration options for creating a WebSocket connection.
 * Supports browser impersonation and proxies, similar to HTTP requests.
 *
 * @example
 * ```typescript
 * const ws = await createWebSocket({
 *   url: 'wss://echo.websocket.org',
 *   browser: 'chrome_142',
 *   headers: { 'Authorization': 'Bearer token' },
 *   onMessage: (data) => {
 *     console.log('Received:', data);
 *   },
 *   onClose: () => {
 *     console.log('Connection closed');
 *   },
 *   onError: (error) => {
 *     console.error('WebSocket error:', error);
 *   }
 * });
 * ```
 */
export interface WebSocketOptions {
  /**
   * The WebSocket URL to connect to. Must use wss:// (secure) or ws:// (insecure) protocol.
   */
  url: string;

  /**
   * Browser profile to impersonate for the WebSocket upgrade request.
   * Automatically applies browser-specific headers and TLS fingerprints.
   * @default 'chrome_142'
   */
  browser?: BrowserProfile;

  /**
   * Additional headers to send with the WebSocket upgrade request.
   * Common headers include Authorization, Origin, or custom application headers.
   */
  headers?: Record<string, string>;

  /**
   * Proxy URL to route the connection through (e.g., 'http://proxy.example.com:8080').
   * Supports HTTP and SOCKS5 proxies.
   */
  proxy?: string;

  /**
   * Callback function invoked when a message is received from the server.
   * The data parameter will be a string for text frames or a Buffer for binary frames.
   *
   * @param data - The received message as a string or Buffer
   */
  onMessage: (data: string | Buffer) => void;

  /**
   * Callback function invoked when the WebSocket connection is closed.
   * This is called for both clean closes and connection errors.
   */
  onClose?: () => void;

  /**
   * Callback function invoked when a connection or protocol error occurs.
   *
   * @param error - A string describing the error that occurred
   */
  onError?: (error: string) => void;
}

/**
 * Internal WebSocket connection object returned from the native Rust binding.
 * This interface contains the connection ID used to reference the WebSocket
 * in subsequent operations like sending messages or closing the connection.
 *
 * @internal
 */
export interface NativeWebSocketConnection {
  /**
   * Unique identifier for this WebSocket connection.
   * Used internally to track and manage the connection.
   * @internal
   */
  _id: number;
}

/**
 * Error thrown when a request fails. This can occur due to network errors,
 * timeouts, invalid URLs, or other request-related issues.
 *
 * @example
 * ```typescript
 * try {
 *   const response = await fetch('https://api.example.com');
 * } catch (error) {
 *   if (error instanceof RequestError) {
 *     console.error('Request failed:', error.message);
 *   }
 * }
 * ```
 */
export class RequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RequestError";
  }
}

// Import and re-export the auto-generated BrowserProfile type
import type { BrowserProfile } from "./generated-types";
export type { BrowserProfile };

/**
 * HTTP method types
 */
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD";

/**
 * Request options for making HTTP requests with browser impersonation
 */
export interface RequestOptions {
  /**
   * The URL to request
   */
  url: string;

  /**
   * Browser profile to impersonate
   * @default 'chrome_137'
   */
  browser?: BrowserProfile;

  /**
   * HTTP method
   * @default 'GET'
   */
  method?: HttpMethod;

  /**
   * Additional headers to send with the request
   * Browser-specific headers will be automatically added
   */
  headers?: Record<string, string>;

  /**
   * Request body (for POST, PUT, PATCH requests)
   */
  body?: string;

  /**
   * Proxy URL (e.g., 'http://proxy.example.com:8080')
   */
  proxy?: string;

  /**
   * Request timeout in milliseconds
   * @default 30000
   */
  timeout?: number;
}

/**
 * Response object returned from HTTP requests
 */
export interface Response {
  /**
   * HTTP status code
   */
  status: number;

  /**
   * Response headers
   */
  headers: Record<string, string>;

  /**
   * Response body as string
   */
  body: string;

  /**
   * Cookies set by the server
   */
  cookies: Record<string, string>;

  /**
   * Final URL after redirects
   */
  url: string;
}

/**
 * WebSocket options for creating a connection
 */
export interface WebSocketOptions {
  /**
   * The WebSocket URL to connect to (wss:// or ws://)
   */
  url: string;

  /**
   * Browser profile to impersonate
   * @default 'chrome_137'
   */
  browser?: BrowserProfile;

  /**
   * Additional headers to send with the WebSocket upgrade request
   */
  headers?: Record<string, string>;

  /**
   * Proxy URL (e.g., 'http://proxy.example.com:8080')
   */
  proxy?: string;

  /**
   * Callback for incoming messages (required)
   */
  onMessage: (data: string | Buffer) => void;

  /**
   * Callback for connection close event
   */
  onClose?: () => void;

  /**
   * Callback for error events
   */
  onError?: (error: string) => void;
}

/**
 * Internal WebSocket connection object returned from native binding
 */
export interface NativeWebSocketConnection {
  _id: number;
}

export class RequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RequestError";
  }
}

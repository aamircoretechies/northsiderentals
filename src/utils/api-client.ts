import { getAuth, removeAuth } from '@/auth/lib/helpers';
import { getFriendlyErrorMessage } from '@/utils/api-error-handler';

export class ApiClientError extends Error {
  status?: number;
  responseData?: unknown;
  friendlyMessage: string;

  constructor(input: {
    message?: string;
    status?: number;
    responseData?: unknown;
    friendlyMessage: string;
  }) {
    super(input.message || input.friendlyMessage);
    this.name = 'ApiClientError';
    this.status = input.status;
    this.responseData = input.responseData;
    this.friendlyMessage = input.friendlyMessage;
  }
}

type RequestOptions = Omit<RequestInit, 'headers' | 'body'> & {
  headers?: Record<string, string>;
  body?: BodyInit | Record<string, unknown> | null;
  auth?: 'required' | 'optional' | 'none';
  fallbackError?: string;
};

function maybeJsonBody(body: RequestOptions['body']): BodyInit | undefined {
  if (body == null) return undefined;
  if (typeof body === 'string' || body instanceof FormData || body instanceof Blob) {
    return body;
  }
  return JSON.stringify(body);
}

function shouldSetJsonContentType(body: RequestOptions['body']): boolean {
  return !!body && !(body instanceof FormData) && !(body instanceof Blob);
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function authHeader(): Record<string, string> {
  const token = getAuth()?.access_token?.trim();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function handleAuthFailure(status: number): void {
  if (status !== 401) return;
  try {
    removeAuth();
    window.dispatchEvent(new CustomEvent('app:auth-expired'));
  } catch {
    // no-op in non-browser contexts
  }
}

export async function apiRequest(
  input: string | URL,
  options: RequestOptions = {},
): Promise<Response> {
  const authMode = options.auth ?? 'optional';
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers || {}),
  };

  if (authMode !== 'none') {
    Object.assign(headers, authHeader());
  }
  if (authMode === 'required' && !headers.Authorization) {
    const friendly = getFriendlyErrorMessage({
      status: 401,
      fallback: 'Please sign in to continue.',
    });
    throw new ApiClientError({ status: 401, friendlyMessage: friendly });
  }

  if (shouldSetJsonContentType(options.body) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(input, {
    ...options,
    headers,
    body: maybeJsonBody(options.body),
  });

  if (response.ok) return response;

  const parsedBody = await parseResponseBody(response);
  const apiMessage =
    parsedBody && typeof parsedBody === 'object'
      ? ((parsedBody as Record<string, unknown>).message ??
          (parsedBody as Record<string, unknown>).error)
      : parsedBody;
  const friendlyMessage = getFriendlyErrorMessage({
    status: response.status,
    message: apiMessage,
    fallback: options.fallbackError,
  });

  handleAuthFailure(response.status);
  console.error('[API Error]', {
    status: response.status,
    input: String(input),
    response: parsedBody,
  });
  throw new ApiClientError({
    message: typeof apiMessage === 'string' ? apiMessage : undefined,
    status: response.status,
    responseData: parsedBody,
    friendlyMessage,
  });
}

export async function apiJson<T>(
  input: string | URL,
  options: RequestOptions = {},
): Promise<T> {
  const response = await apiRequest(input, options);
  const parsed = await parseResponseBody(response);
  return (parsed ?? {}) as T;
}

export async function apiText(
  input: string | URL,
  options: RequestOptions = {},
): Promise<string> {
  const response = await apiRequest(input, options);
  return response.text();
}

export async function apiBlob(
  input: string | URL,
  options: RequestOptions = {},
): Promise<Blob> {
  const response = await apiRequest(input, options);
  return response.blob();
}


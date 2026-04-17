import { apiJson } from '@/utils/api-client';
import { getFriendlyErrorMessage } from '@/utils/api-error-handler';

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  '';

function assertOk(json: Record<string, unknown>): void {
  if (
    json.status !== undefined &&
    json.status !== 1 &&
    json.status !== '1'
  ) {
    throw new Error(
      getFriendlyErrorMessage({
        message: json.message,
        fallback: 'Could not send support request',
      }),
    );
  }
}

export type SupportIssuePayload = {
  title: string;
  description: string;
  reservation_ref?: string;
};

export async function submitSupportIssue(
  payload: SupportIssuePayload,
): Promise<void> {
  if (!API_BASE) throw new Error('VITE_API_BASE_URL is not configured');

  const body: Record<string, string> = {
    title: payload.title.trim(),
    description: payload.description.trim(),
  };
  const ref = payload.reservation_ref?.trim();
  if (ref) {
    body.reservation_ref = ref;
  }

  const attempts: Array<{ endpoint: string; payload: Record<string, string> }> = [
    { endpoint: `${API_BASE}/support/issue`, payload: body },
    {
      endpoint: `${API_BASE}/support/issues`,
      payload: {
        subject: body.title,
        message: body.description,
        ...(body.reservation_ref ? { reservation_ref: body.reservation_ref } : {}),
      },
    },
    {
      endpoint: `${API_BASE}/support`,
      payload: {
        title: body.title,
        message: body.description,
        ...(body.reservation_ref ? { reservation_ref: body.reservation_ref } : {}),
      },
    },
  ];

  let lastError = 'Could not send support request';
  for (const attempt of attempts) {
    try {
      const parsed = await apiJson<Record<string, unknown>>(attempt.endpoint, {
        method: 'POST',
        auth: 'optional',
        body: attempt.payload,
        fallbackError: 'Could not send support request',
      });
      if (parsed) assertOk(parsed);
      return;
    } catch (error) {
      lastError = getFriendlyErrorMessage({
        message: error instanceof Error ? error.message : '',
        fallback: 'Could not send support request',
      });
    }
  }

  throw new Error(lastError);
}

/**
 * Production guardrails — call at app bootstrap or in dev-only checks.
 * Ensures required env vars are set before checkout / API calls run.
 */

const REQUIRED_ENV = ['VITE_API_BASE_URL', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] as const;

const FORBIDDEN_API_FALLBACKS = ['api.example.com'] as const;

export function assertProductionEnv(): void {
  const missing = REQUIRED_ENV.filter((key) => {
    const v = (import.meta.env as Record<string, string | undefined>)[key];
    return !String(v ?? '').trim();
  });
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  const apiBase = String(import.meta.env.VITE_API_BASE_URL ?? '').trim();
  for (const forbidden of FORBIDDEN_API_FALLBACKS) {
    if (apiBase.includes(forbidden)) {
      throw new Error(
        `VITE_API_BASE_URL must not use placeholder host "${forbidden}" in production.`,
      );
    }
  }
}

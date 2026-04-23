/**
 * Turn API-provided HTML snippets into plain text for safe UI display.
 * Uses the DOM in the browser so entities and nested tags (e.g. ul/li) decode correctly.
 */
export function sanitizeApiText(value: unknown): string {
  if (value == null) return '';
  const raw = String(value).trim();
  if (!raw) return '';

  if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
    const el = window.document.createElement('div');
    el.innerHTML = raw;
    const text = (el.textContent ?? el.innerText ?? '').replace(/\s+/g, ' ').trim();
    if (text) return text;
  }

  return raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

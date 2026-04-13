import { getAuth } from '@/auth/lib/helpers';
import { createApiUrl } from '@/lib/api-url';

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  '';

function buildHeaders(): Record<string, string> {
  const auth = getAuth();
  const h: Record<string, string> = {
    Accept: 'application/json',
  };
  if (auth?.access_token) {
    h.Authorization = `Bearer ${auth.access_token}`;
  }
  return h;
}

function assertOk(json: Record<string, unknown>): void {
  if (
    json.status !== undefined &&
    json.status !== 1 &&
    json.status !== '1'
  ) {
    const msg =
      typeof json.message === 'string' ? json.message : 'Document request failed';
    throw new Error(msg);
  }
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export interface RcmSignatureListItem {
  signaturetemplateid: number;
  signaturetemplatetitle: string | null;
  signaturetemplatetext: string | null;
  issigned: boolean;
  signingorder: string;
  linktoagreement: string | null;
  isccauth: boolean;
  isinsurance: boolean;
  overcounteronly: boolean;
}

function normalizeListItem(raw: Record<string, unknown>): RcmSignatureListItem {
  const r = raw;
  const id =
    num(
      r.signaturetemplateid ??
        r.signatureTemplateId ??
        r.signature_template_id,
    );
  return {
    signaturetemplateid: id,
    signaturetemplatetitle:
      (r.signaturetemplatetitle as string) ??
      (r.signatureTemplateTitle as string) ??
      null,
    signaturetemplatetext:
      (r.signaturetemplatetext as string) ??
      (r.signatureTemplateText as string) ??
      null,
    issigned: Boolean(r.issigned ?? r.isSigned),
    signingorder: String(r.signingorder ?? r.signingOrder ?? ''),
    linktoagreement:
      (r.linktoagreement as string) ??
      (r.linkToAgreement as string) ??
      null,
    isccauth: Boolean(r.isccauth ?? r.isCcAuth),
    isinsurance: Boolean(r.isinsurance ?? r.isInsurance),
    overcounteronly: Boolean(r.overcounteronly ?? r.overCounterOnly),
  };
}

export interface RcmSignatureListResponse {
  items: RcmSignatureListItem[];
  agreement_signed: boolean;
}

export async function fetchRcmSignatureList(
  reservationRef: string,
): Promise<RcmSignatureListResponse> {
  if (!API_BASE) throw new Error('VITE_API_BASE_URL is not configured');
  const ref = reservationRef.trim();
  if (!ref) throw new Error('Missing reservation reference');

  const url = createApiUrl('documents/rcm/signature-list');
  url.searchParams.set('reservation_ref', ref);

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: buildHeaders(),
  });

  const text = await res.text();
  let json: Record<string, unknown> | null = null;
  if (text.trim()) {
    try {
      json = JSON.parse(text) as Record<string, unknown>;
    } catch {
      json = null;
    }
  }

  if (!res.ok) {
    const msg =
      (json?.message as string) ||
      (json?.error as string) ||
      `Request failed: ${res.status}`;
    throw new Error(msg);
  }

  if (!json) {
    return { items: [], agreement_signed: false };
  }

  assertOk(json);

  const rawList = json.data;
  const items: RcmSignatureListItem[] = Array.isArray(rawList)
    ? (rawList as unknown[])
        .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
        .map((x) => normalizeListItem(x))
    : [];

  items.sort((a, b) => compareSigningOrder(a.signingorder, b.signingorder));

  return {
    items,
    agreement_signed: Boolean(json.agreement_signed ?? json.agreementSigned),
  };
}

function compareSigningOrder(a: string, b: string): number {
  const ta = a.trim();
  const tb = b.trim();
  const da = /^\d+$/.test(ta) ? parseInt(ta, 10) : NaN;
  const db = /^\d+$/.test(tb) ? parseInt(tb, 10) : NaN;
  if (!Number.isNaN(da) && !Number.isNaN(db)) return da - db;
  if (!Number.isNaN(da)) return -1;
  if (!Number.isNaN(db)) return 1;
  return ta.localeCompare(tb, undefined, { numeric: true });
}

export type SaveRcmSignaturePayload = {
  reservation_ref: string;
  signature_template_id: number;
  /** Raw base64 PNG bytes (no data: URL prefix). */
  signature_png: string;
};

export async function saveRcmDocumentSignature(
  payload: SaveRcmSignaturePayload,
): Promise<void> {
  if (!API_BASE) throw new Error('VITE_API_BASE_URL is not configured');

  const headers = buildHeaders();
  headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_BASE}/documents/rcm/signature`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      reservation_ref: payload.reservation_ref.trim(),
      signature_template_id: payload.signature_template_id,
      signature_png: payload.signature_png,
    }),
  });

  const text = await res.text();
  let json: Record<string, unknown> | null = null;
  if (text.trim()) {
    try {
      json = JSON.parse(text) as Record<string, unknown>;
    } catch {
      json = null;
    }
  }

  if (!res.ok) {
    const msg =
      (json?.message as string) ||
      (json?.error as string) ||
      `Request failed: ${res.status}`;
    throw new Error(msg);
  }

  if (json) assertOk(json);
}

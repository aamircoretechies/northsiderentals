import { createApiUrl } from '@/lib/api-url';
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
        fallback: 'Document request failed.',
      }),
    );
  }
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export interface RcmSignatureListItem {
  customerid: number;
  customerfirstname: string | null;
  customerlastname: string | null;
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
    customerid: num(r.customerid ?? r.customerId ?? r.customer_id),
    customerfirstname:
      (r.customerfirstname as string) ??
      (r.customerFirstName as string) ??
      null,
    customerlastname:
      (r.customerlastname as string) ??
      (r.customerLastName as string) ??
      null,
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

  const json = await apiJson<Record<string, unknown> | null>(url.toString(), {
    method: 'GET',
    auth: 'optional',
    fallbackError: 'Could not load agreements.',
  });

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

  const json = await apiJson<Record<string, unknown> | null>(`${API_BASE}/documents/rcm/signature`, {
    method: 'POST',
    auth: 'optional',
    body: {
      reservation_ref: payload.reservation_ref.trim(),
      signature_template_id: payload.signature_template_id,
      signature_png: payload.signature_png,
    },
    fallbackError: 'Could not save signature.',
  });

  if (json) assertOk(json);
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parse, format, isValid } from 'date-fns';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { useLocation, useNavigate } from 'react-router';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { CollapsibleCard } from './components/collapsible-card';
import { ReservationDetails } from './components/reservation-details';
import { RentalFeeSummaryBottomSheet } from './components/rental-fee-summary-bottom-sheet';
import { RentalFeeSummary } from '@/pages/cars/checkout/options/components/rental-fee-summary';
import { CustomerDetailsCard, type CustomerDetailsForm } from './components/customer-details-card';
import { BookingDetailsCard, type BookingDetailsForm } from './components/booking-details-card';
import { ExtraDriversCard, type ExtraDriversForm } from './components/extra-drivers-card';
import { UploadImagesCard, type UploadImagesForm } from './components/upload-images-card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { carsService } from '@/services/cars';
import {
  addExtraDriver,
  deleteRcmDocument,
  editBookingBasics,
  extractWorkflowChecklistArrays,
  fetchBookingByReference,
  fetchWorkflowChecklist,
  getCachedBookingByReference,
  getCachedWorkflowChecklist,
  invalidateBookingsCache,
  listRcmDocuments,
  mapBookingDetailToView,
  storeRcmDocument,
  updateBooking,
  uploadRcmDocumentFile,
  type WorkflowChecklistStep,
} from '@/services/bookings';
import { getFriendlyError } from '@/utils/api-error-handler';

interface ExpressCheckinRouteState {
  mode?: 'update' | 'update-pay' | 'checkin';
  reservationRef?: string;
  customerSnapshot?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    dateOfBirth?: string;
    licenseNo?: string;
    licenseIssued?: string;
    licenseExpires?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
    numberTravelling?: string;
  } | null;
  bookingSnapshot?: {
    bookingId?: string;
    reservationNumber?: string;
    carImage?: string;
    carTitle?: string;
    carSubtitle?: string;
    pickupDate?: string;
    pickupLocation?: string;
    returnDate?: string;
    returnLocation?: string;
    pickupLocationId?: number;
    bookingType?: number;
    transmission?: number;
    customerId?: number;
  } | null;
  workflowChecklist?: {
    list?: WorkflowChecklistStep[];
    bookinginfo?: Array<Record<string, unknown>>;
    customerinfo?: Array<Record<string, unknown>>;
    optionalfees?: Array<Record<string, unknown>>;
    insuranceoptions?: Array<Record<string, unknown>>;
    extradrivers?: Array<Record<string, unknown>>;
    documentlinkdata?: Array<Record<string, unknown>>;
  } | null;
}

function stepName(
  list: WorkflowChecklistStep[] | undefined,
  method: string,
  fallback: string,
) {
  const hit = list?.find((x) => (x.method || '').toLowerCase() === method.toLowerCase());
  return hit?.name?.trim() || fallback;
}

function firstText(...vals: Array<unknown>): string {
  for (const v of vals) {
    const s = String(v ?? '').trim();
    if (s) return s;
  }
  return '';
}

function stripHtmlTags(input: string): string {
  const stripped = input
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{2,}/g, ' ')
    .trim();
  // Decode common entities returned by backend content snippets.
  return stripped
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function toHtmlDate(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = parse(raw, 'dd/MMM/yyyy', new Date());
  if (isValid(parsed)) return format(parsed, 'yyyy-MM-dd');
  return '';
}

function normalizeDateForApi(value: string): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (/^\d{2}\/[A-Za-z]{3}\/\d{4}$/.test(raw)) return raw;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const parsed = parse(raw, 'yyyy-MM-dd', new Date());
    if (isValid(parsed)) return format(parsed, 'dd/MMM/yyyy');
  }
  return raw;
}

function isRecognizedDate(value: string): boolean {
  const raw = String(value ?? '').trim();
  if (!raw) return false;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return isValid(parse(raw, 'yyyy-MM-dd', new Date()));
  }
  if (/^\d{2}\/[A-Za-z]{3}\/\d{4}$/.test(raw)) {
    return isValid(parse(raw, 'dd/MMM/yyyy', new Date()));
  }
  return false;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_ALLOWED_CHARS = /^[+()\-\s\d]+$/;
const NAME_PATTERN = /^[a-zA-Z\s'-]+$/;
const ADDRESS_ALLOWED_PATTERN = /^[a-zA-Z0-9\s,.'/#-]*$/;
const LOCATION_ALLOWED_PATTERN = /^[a-zA-Z0-9\s,.'-]*$/;
const POSTCODE_PATTERN = /^[a-zA-Z0-9\s-]{3,10}$/;

function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}

function isValidPhone(phone: string): boolean {
  const raw = phone.trim();
  if (!raw || !PHONE_ALLOWED_CHARS.test(raw)) return false;
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15;
}

function validateCustomerDetailsForm(form: CustomerDetailsForm): string | null {
  const firstName = form.firstName.trim();
  const lastName = form.lastName.trim();
  const email = form.email.trim();
  const phone = form.phone.trim();
  const travellers = Number(form.numberTravelling || 0);
  const dob = form.dateOfBirth.trim();
  const licenseNo = form.licenseNo.trim();
  const address = form.address.trim();
  const city = form.city.trim();
  const state = form.state.trim();
  const country = form.country.trim();
  const postcode = form.postcode.trim();

  if (!firstName || !lastName) return 'First name and last name are required.';
  if (!NAME_PATTERN.test(firstName) || !NAME_PATTERN.test(lastName)) {
    return 'Name can only contain letters, spaces, hyphens, and apostrophes.';
  }
  if (!isValidEmail(email)) return 'Please enter a valid email address.';
  if (!isValidPhone(phone)) return 'Please enter a valid phone number.';
  if (!Number.isFinite(travellers) || travellers <= 0) {
    return 'Number of people traveling must be at least 1.';
  }
  if (!dob) return 'Date of birth is required.';
  if (!isRecognizedDate(dob)) {
    return 'Please enter a valid date of birth.';
  }
  if (!licenseNo) return 'Licence number is required.';
  if (form.licenseExpires.trim() && !isRecognizedDate(form.licenseExpires.trim())) {
    return 'Please enter a valid driver licence expiry date.';
  }
  if (address && !ADDRESS_ALLOWED_PATTERN.test(address)) return 'Address contains invalid characters.';
  if ((city && !LOCATION_ALLOWED_PATTERN.test(city)) || (state && !LOCATION_ALLOWED_PATTERN.test(state))) {
    return 'City and state contain invalid characters.';
  }
  if (country && !LOCATION_ALLOWED_PATTERN.test(country)) {
    return 'Country contains invalid characters.';
  }
  if (postcode && !POSTCODE_PATTERN.test(postcode)) return 'Please enter a valid post code.';
  return null;
}

function friendlyBookingErrorMessage(error: unknown, fallback: string): string {
  const raw = getFriendlyError(error, fallback);
  const msg = raw.toLowerCase();
  if (msg.includes('number') && (msg.includes('travelling') || msg.includes('passenger'))) {
    return 'Please enter a valid number of passengers (at least 1).';
  }
  if (msg.includes('email')) return 'Please enter a valid email address.';
  if (msg.includes('phone') || msg.includes('mobile')) {
    return 'Please enter a valid phone number (8 to 15 digits).';
  }
  if (msg.includes('postcode') || msg.includes('postal')) {
    return 'Please enter a valid post code.';
  }
  if (msg.includes('date of birth') || msg.includes('dob')) {
    return 'Please enter a valid date of birth.';
  }
  if (msg.includes('license') || msg.includes('licence')) {
    return 'Please enter a valid licence number.';
  }
  if (msg.includes('first name') || msg.includes('last name')) {
    return 'Please enter both first name and last name.';
  }
  return raw;
}

function validateExtraDriverInput(
  d: ExtraDriversForm['drivers'][number],
  index: number,
  ownerEmail: string,
): string | null {
  const label = `Driver ${index + 1}`;
  const first = d.firstname.trim();
  const last = d.lastname.trim();
  const dob = d.dateofbirth.trim();
  const lic = d.licenseno.trim();
  const email = d.email.trim() || ownerEmail.trim();
  const state = d.state.trim();
  const city = d.city.trim();
  const postcode = d.postcode.trim();
  const address = d.address.trim();

  if (!first || !last) return `${label}: first name and last name are required.`;
  if (!NAME_PATTERN.test(first) || !NAME_PATTERN.test(last)) {
    return `${label}: name contains invalid characters.`;
  }
  if (!dob) return `${label}: date of birth is required.`;
  if (!lic) return `${label}: licence number is required.`;
  if (!email || !isValidEmail(email)) return `${label}: please enter a valid email address.`;
  if (state && !LOCATION_ALLOWED_PATTERN.test(state)) return `${label}: state contains invalid characters.`;
  if (city && !LOCATION_ALLOWED_PATTERN.test(city)) return `${label}: city contains invalid characters.`;
  if (postcode && !POSTCODE_PATTERN.test(postcode)) return `${label}: please enter a valid post code.`;
  if (address && !ADDRESS_ALLOWED_PATTERN.test(address)) return `${label}: address contains invalid characters.`;
  return null;
}

function workflowOptionalExtraId(f: Record<string, unknown>, i: number): string {
  const v =
    f.id ??
    f.optionalfeeid ??
    f.optional_fee_id ??
    f.extrafeeid ??
    f.extra_fee_id ??
    f.fee_id;
  return v != null && String(v).trim() !== '' ? String(v) : `extra-${i}`;
}

function workflowOptionalExtraLabel(f: Record<string, unknown>): string {
  const name = String(f.name ?? 'Optional extra');
  const typ = String(f.type ?? '').trim();
  const fees = f.fees ?? f.fee;
  if (fees != null && String(fees).trim() !== '' && Number.isFinite(Number(fees))) {
    const sym = String(f.currencysymbol ?? f.currency_symbol ?? '$');
    const suffix = ` · ${sym}${Number(fees).toFixed(2)}`;
    return typ ? `${name} (${typ})${suffix}` : `${name}${suffix}`;
  }
  return typ ? `${name} (${typ})` : name;
}

function workflowInsuranceOptionId(f: Record<string, unknown>, i: number): string {
  const v =
    f.id ??
    f.extrafeeid ??
    f.extra_fee_id ??
    f.insuranceid ??
    f.insurance_id ??
    f.insuranceoptionid ??
    f.insurance_option_id;
  return v != null && String(v).trim() !== '' ? String(v) : `ins-${i}`;
}

/** Same id space as radio options (insuranceoptions + extrafees insurance rows use extrafeeid). */
function insuranceSelectionId(row: Record<string, unknown> | undefined): string {
  if (!row) return '';
  const v =
    row.id ??
    row.extrafeeid ??
    row.extra_fee_id ??
    row.insuranceid ??
    row.insurance_id ??
    row.insuranceoptionid;
  return v != null && String(v).trim() !== '' ? String(v) : '';
}

function documentUploadRowId(
  d: Record<string, unknown>,
  index: number,
): string {
  const setup = Number(d.documentlinksetupid ?? 0);
  const cust = Number(d.customerid ?? 0);
  return `${setup}-${cust}-${index}`;
}

function documentLinkIdFromRow(row: Record<string, unknown>): number {
  const candidates = [
    row.documentlinkid,
    row.document_link_id,
    row.documentLinkId,
    row.document_linkid,
    row.documentid,
    row.document_id,
    row.id,
  ];
  for (const candidate of candidates) {
    const n = Number(candidate ?? 0);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function normalizeDocumentRows(rows: unknown[]): Record<string, unknown>[] {
  const byKey = new Map<string, Record<string, unknown>>();
  rows.forEach((rowUnknown, index) => {
    const row = (rowUnknown ?? {}) as Record<string, unknown>;
    const setupId = Number(row.documentlinksetupid ?? 0);
    const customerId = Number(row.customerid ?? 0);
    const key = `${setupId}:${customerId}`;
    const previous = byKey.get(key);
    if (!previous) {
      byKey.set(key, row);
      return;
    }
    // Keep a deterministic "latest" row when API returns duplicates.
    const prevLinkId = documentLinkIdFromRow(previous);
    const nextLinkId = documentLinkIdFromRow(row);
    const prevUploaded = Number(previous.isuploaded ?? 0) > 0;
    const nextUploaded = Number(row.isuploaded ?? 0) > 0;
    if (
      (nextUploaded && !prevUploaded) ||
      nextLinkId > prevLinkId ||
      (nextLinkId === prevLinkId && index % 2 === 1)
    ) {
      byKey.set(key, row);
    }
  });
  return Array.from(byKey.values());
}

function mapUploadDocuments(rows: unknown[]): UploadImagesForm['docs'] {
  return normalizeDocumentRows(rows).map((d, i) => {
    const row = d as Record<string, unknown>;
    const who = [row.customerfirstname, row.customerlastname]
      .map((x) => String(x ?? '').trim())
      .filter(Boolean)
      .join(' ');
    const baseTitle = String(row.title ?? 'Document');
    return {
      id: documentUploadRowId(row, i),
      customerId: Number(row.customerid ?? 0),
      documentLinkSetupId: Number(row.documentlinksetupid ?? 0),
      documentLinkId: documentLinkIdFromRow(row),
      seqno: Number(row.seqno ?? 0),
      doctype: String(row.doctype ?? 'other').trim() || 'other',
      storageprovider:
        String(row.storageprovider ?? 'cloudinary').trim() || 'cloudinary',
      description: String(row.text ?? '').trim(),
      title: who ? `${baseTitle} (${who})` : baseTitle,
      uploaded: Number(row.isuploaded ?? 0) > 0,
      pendingStore: null,
      notes: String(row.notes ?? '').trim(),
    };
  });
}

function uploadDocKey(
  d: Pick<UploadImagesForm['docs'][number], 'documentLinkSetupId' | 'customerId' | 'seqno'>,
): string {
  return `${Number(d.documentLinkSetupId || 0)}:${Number(d.customerId || 0)}:${Number(d.seqno || 0)}`;
}

/** Match a catalogue `optionalfees` row to a line on `extrafees` (same fee on the booking). */
function findExtraFeeRowForOptional(
  opt: Record<string, unknown>,
  extras: Array<Record<string, unknown>>,
): Record<string, unknown> | undefined {
  const optId = opt.id ?? opt.optionalfeeid ?? opt.optional_fee_id;
  return extras.find((ex) => {
    if (Boolean(ex.isinsurancefee)) return false;
    const exId = ex.id ?? ex.extrafeeid ?? ex.optionalfeeid ?? ex.optional_fee_id;
    if (optId != null && exId != null && String(optId) === String(exId)) return true;
    const n1 = String(opt.name ?? '').trim().toLowerCase();
    const n2 = String(ex.name ?? '').trim().toLowerCase();
    return n1.length > 0 && n1 === n2;
  });
}

function pickRowString(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function pickRowNumber(row: Record<string, unknown>, ...keys: string[]): number {
  for (const k of keys) {
    const v = row[k];
    if (v === '' || v === null || v === undefined) continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

type LegacyEditFields = {
  pickuplocationid: number;
  bookingtype: number;
  transmission: number;
  id: number;
};

function fileNameToDocType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'jpg' || ext === 'jpeg') return 'jpg';
  if (ext === 'png') return 'png';
  if (ext === 'webp') return 'webp';
  return 'other';
}

function workflowInsuranceOptionLabel(f: Record<string, unknown>): string {
  const name = String(f.name ?? 'Damage cover');
  const typ = String(f.type ?? '').trim();
  const excess = f.insuranceexcessamount ?? f.excess ?? f.excessamount;
  if (
    excess != null &&
    String(excess).trim() !== '' &&
    Number.isFinite(Number(excess)) &&
    Number(excess) > 0
  ) {
    const sym = String(f.currencysymbol ?? f.currency_symbol ?? '$');
    const ex = ` · excess ${sym}${Number(excess).toFixed(2)}`;
    return typ ? `${name} (${typ})${ex}` : `${name}${ex}`;
  }
  return typ ? `${name} (${typ})` : name;
}

function workflowFeeDescription(row: Record<string, unknown>): string {
  const fields = [
    row.feedescription,
    row.feedescription1,
    row.feedescription2,
    row.feedescription3,
  ]
    .map((x) => String(x ?? '').trim())
    .filter(Boolean);
  // Keep all feedescription variants in order, even if repeated,
  // so the tooltip reflects the backend-provided text exactly.
  return fields.join('\n\n');
}

export function ExpressCheckinContent() {
  const MAX_EXTRA_DRIVERS = 5;
  const MAX_OPTIONAL_EXTRA_QTY = 10;
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const routeState = (location.state as ExpressCheckinRouteState | null) ?? null;
  const snapshot = routeState?.bookingSnapshot ?? null;
  const modeFromRoute = routeState?.mode;
  const modeFromQuery = searchParams.get('mode');
  const isUpdatePayMode = modeFromRoute === 'update-pay' || modeFromQuery === 'update-pay';
  const isUpdateMode =
    modeFromRoute === 'update' ||
    modeFromQuery === 'update' ||
    isUpdatePayMode ||
    location.pathname === '/bookings/modify';
  const customerSnapshot = routeState?.customerSnapshot ?? null;
  const reservationRefFromQuery = searchParams.get('reservation_ref') ?? '';
  const reservationRef = firstText(routeState?.reservationRef, reservationRefFromQuery);
  const [workflow, setWorkflow] = useState<Record<string, unknown> | null>(
    (routeState?.workflowChecklist as Record<string, unknown> | null) ?? null,
  );
  const [loadingWorkflow, setLoadingWorkflow] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [launchingPayment, setLaunchingPayment] = useState(false);
  const [bookingLockedReason, setBookingLockedReason] = useState<string | null>(null);
  const [bookingSaveError, setBookingSaveError] = useState<string | null>(null);
  const [showUpdateSuccessDialog, setShowUpdateSuccessDialog] = useState(false);
  const { rcmProfile } = useDashboardData();

  useEffect(() => {
    const st = (location.state as ExpressCheckinRouteState | null) ?? null;
    setWorkflow((st?.workflowChecklist as Record<string, unknown> | null) ?? null);
    // Stable dependency length: never pass a variable-length deps array (avoids React warning).
  }, [location.key, location.pathname, location.search]);

  // Always refetch checklist when we have a reservation ref so `extradrivers` and other
  // arrays are never missing due to stale/partial `location.state` payloads.
  useEffect(() => {
    if (!reservationRef) return;
    const cachedWorkflow = getCachedWorkflowChecklist(reservationRef, 'checkin');
    if (cachedWorkflow?.data && typeof cachedWorkflow.data === 'object') {
      setWorkflow(cachedWorkflow.data as Record<string, unknown>);
    }
    let cancelled = false;
    setLoadingWorkflow(true);
    void fetchWorkflowChecklist(reservationRef, 'checkin')
      .then((res) => {
        if (cancelled) return;
        const data = res?.data;
        if (data && typeof data === 'object') {
          setWorkflow(data as Record<string, unknown>);
          setBookingLockedReason(null);
        }
      })
      .catch((e) => {
        if (cancelled) return;
        const msg =
          e instanceof Error ? e.message : 'Could not load workflow checklist';
        setWorkflow(null);
        setBookingLockedReason(msg);
        toast.error(msg);
      })
      .finally(() => {
        if (!cancelled) setLoadingWorkflow(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reservationRef]);

  useEffect(() => {
    if (!isUpdateMode) return;
    if (!reservationRef) return;
    const cachedDetail = getCachedBookingByReference(reservationRef);
    const raw = cachedDetail?.data;
    if (!raw || typeof raw !== 'object') return;
    setWorkflow((prev) => {
      if (prev && Object.keys(prev).length > 0) return prev;
      const rcm = (raw as Record<string, unknown>).rcm_booking_info;
      if (rcm && typeof rcm === 'object') {
        return rcm as Record<string, unknown>;
      }
      return prev;
    });
  }, [isUpdateMode, reservationRef]);

  useEffect(() => {
    if (isUpdateMode) return;
    if (!reservationRef) return;
    let cancelled = false;
    setLoadingDocuments(true);
    void listRcmDocuments(reservationRef, 'checkin')
      .then((res) => {
        if (cancelled) return;
        const rows = Array.isArray(res?.data) ? res.data : [];
        setUploadForm({ docs: mapUploadDocuments(rows) });
      })
      .catch((e) => {
        if (cancelled) return;
        toast.error(getFriendlyError(e, 'Could not load document list'));
      })
      .finally(() => {
        if (!cancelled) setLoadingDocuments(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isUpdateMode, reservationRef]);
  const normalizedWorkflow = useMemo(
    () => extractWorkflowChecklistArrays(workflow as Record<string, unknown> | undefined),
    [workflow],
  );
  const steps = normalizedWorkflow.list;
  const bookingInfo = normalizedWorkflow.bookinginfo[0];
  const customerInfo = normalizedWorkflow.customerinfo[0];
  const optionalFeesRaw = normalizedWorkflow.optionalfees;
  const extraFeesRaw = normalizedWorkflow.extrafees;
  const insuranceOptionsRaw = normalizedWorkflow.insuranceoptions;
  const extraDrivers = normalizedWorkflow.extradrivers;
  const documentLinkData = normalizedWorkflow.documentlinkdata;

  const extraDriversHydrationKey = useMemo(
    () =>
      extraDrivers
        .map((d) => {
          const row = d as Record<string, unknown>;
          return [
            pickRowNumber(row, 'customerid', 'customerId', 'customer_id'),
            pickRowString(row, 'firstname', 'firstName'),
            pickRowString(row, 'lastname', 'lastName'),
            pickRowString(row, 'licenseno', 'licenseNo'),
          ].join(':');
        })
        .join('|'),
    [extraDrivers],
  );

  const optionalFeesUi = useMemo(
    () =>
      optionalFeesRaw.map((f, i) => ({
        id: workflowOptionalExtraId(f, i),
        label: workflowOptionalExtraLabel(f),
        qtyEnabled: Boolean(f.qtyapply),
        maxQty: Math.min(
          MAX_OPTIONAL_EXTRA_QTY,
          Math.max(1, Number(f.maxqty ?? MAX_OPTIONAL_EXTRA_QTY) || MAX_OPTIONAL_EXTRA_QTY),
        ),
        description: workflowFeeDescription(f as Record<string, unknown>),
      })),
    [optionalFeesRaw],
  );

  const insuranceOptionsUi = useMemo(
    () =>
      insuranceOptionsRaw.map((f, i) => ({
        id: workflowInsuranceOptionId(f, i),
        label: workflowInsuranceOptionLabel(f),
        description: workflowFeeDescription(f as Record<string, unknown>),
      })),
    [insuranceOptionsRaw],
  );

  type StepId = 'customer' | 'booking' | 'drivers' | 'images' | 'creditcard';
  const [openCard, setOpenCard] = useState<string | null>('reservation');
  const stepOrder: StepId[] = isUpdateMode
    ? ['customer', 'booking']
    : ['customer', 'booking', 'drivers', 'images', 'creditcard'];
  const [savingStep, setSavingStep] = useState<string | null>(null);

  // Refresh documents whenever Upload Images card opens so driver/document data stays in sync.
  useEffect(() => {
    if (isUpdateMode) return;
    if (openCard !== 'images') return;
    if (!reservationRef) return;
    let cancelled = false;
    setLoadingDocuments(true);
    void listRcmDocuments(reservationRef, 'checkin')
      .then((res) => {
        if (cancelled) return;
        const rows = Array.isArray(res?.data) ? res.data : [];
        hydrateUploadDocsFromApi(rows);
      })
      .catch((e) => {
        if (cancelled) return;
        toast.error(getFriendlyError(e, 'Could not refresh document list'));
      })
      .finally(() => {
        if (!cancelled) setLoadingDocuments(false);
      });
    return () => {
      cancelled = true;
    };
  }, [openCard, isUpdateMode, reservationRef]);

  const toggleCard = (id: string) => {
    if (bookingLockedReason && id !== 'reservation') return;
    setOpenCard(openCard === id ? null : id);
  };

  const saveCustomerStep = () => {
    if (bookingLockedReason) {
      toast.error(bookingLockedReason);
      return;
    }
    const formError = validateCustomerDetailsForm(customerForm);
    if (formError) {
      toast.error(formError);
      return;
    }

    markSaved('customer');
    toast.success('Customer details saved');
  };

  const initialCustomerForm = useMemo<CustomerDetailsForm>(
    () => ({
      firstName: firstText(customerInfo?.firstname, customerSnapshot?.firstName),
      lastName: firstText(customerInfo?.lastname, customerSnapshot?.lastName),
      email: firstText(customerInfo?.email, customerSnapshot?.email),
      phone: firstText(
        customerInfo?.mobile,
        customerInfo?.phone,
        customerSnapshot?.phone,
      ),
      numberTravelling: firstText(
        bookingInfo?.numbertravelling,
        customerSnapshot?.numberTravelling,
      ),
      dateOfBirth: toHtmlDate(firstText(customerInfo?.dateofbirth, customerSnapshot?.dateOfBirth)),
      licenseNo: firstText(customerInfo?.licenseno, customerSnapshot?.licenseNo),
      licenseIssued: firstText(customerInfo?.licenseissued, customerSnapshot?.licenseIssued),
      licenseExpires: toHtmlDate(
        firstText(customerInfo?.licenseexpires, customerSnapshot?.licenseExpires),
      ),
      address: firstText(customerInfo?.address, customerSnapshot?.address),
      city: firstText(customerInfo?.city, customerSnapshot?.city),
      state: firstText(customerInfo?.state, customerSnapshot?.state),
      country: firstText(customerInfo?.country, customerSnapshot?.country),
      postcode: firstText(customerInfo?.postcode, customerSnapshot?.postcode),
    }),
    [bookingInfo, customerInfo, customerSnapshot],
  );
  const [customerForm, setCustomerForm] = useState<CustomerDetailsForm>(initialCustomerForm);

  const initialBookingForm = useMemo<BookingDetailsForm>(() => {
    const selectedInsuranceFromExtraFees = extraFeesRaw.find(
      (f) =>
        Boolean(f.isinsurancefee) ||
        String(f.name ?? '').toLowerCase().includes('damage waiver'),
    );
    const def =
      selectedInsuranceFromExtraFees ??
      insuranceOptionsRaw.find((x) => Boolean(x.isdefault)) ??
      insuranceOptionsRaw[0];
    const selectedInsurance = insuranceSelectionId(def as Record<string, unknown> | undefined);
    const selectedOptionalFees: string[] = [];
    const optionalFeeQuantities: Record<string, number> = {};
    optionalFeesRaw.forEach((raw, i) => {
      const row = raw as Record<string, unknown>;
      const id = workflowOptionalExtraId(row, i);
      const match = findExtraFeeRowForOptional(row, extraFeesRaw);
      const qtyApply = Boolean(row.qtyapply);
      if (qtyApply) {
        const rawQ = match ? Math.max(0, Number(match.qty ?? 0)) : 0;
        const q = Number.isFinite(rawQ)
          ? Math.min(MAX_OPTIONAL_EXTRA_QTY, rawQ)
          : 0;
        optionalFeeQuantities[id] = q;
        if (q > 0) selectedOptionalFees.push(id);
      } else if (match && Boolean(match.isoptionalfee) && !Boolean(match.isinsurancefee)) {
        selectedOptionalFees.push(id);
        optionalFeeQuantities[id] = Math.max(1, Number(match.qty ?? 1));
      }
    });
    return {
      selectedInsurance,
      selectedOptionalFees,
      optionalFeeQuantities,
      notes: String(bookingInfo?.customerremark ?? '').trim(),
    };
  }, [insuranceOptionsRaw, extraFeesRaw, optionalFeesRaw, bookingInfo]);
  const [bookingForm, setBookingForm] = useState<BookingDetailsForm>(initialBookingForm);

  const initialDriversForm = useMemo<ExtraDriversForm>(() => {
    const drivers = extraDrivers.map((d, i) => {
      const row = d as Record<string, unknown>;
      const cid = pickRowNumber(
        row,
        'customerid',
        'customerId',
        'customer_id',
        'extradriverid',
        'extraDriverId',
        'driverid',
        'driverId',
      );
      const rowId =
        cid > 0
          ? `customer-${cid}-${i}`
          : `driver-${i}-${pickRowString(row, 'firstname', 'firstName')}-${pickRowString(row, 'lastname', 'lastName')}`;
      return {
        id: rowId,
        customerid: cid,
        firstname: pickRowString(row, 'firstname', 'firstName', 'first_name'),
        lastname: pickRowString(row, 'lastname', 'lastName', 'last_name'),
        dateofbirth: pickRowString(
          row,
          'dateofbirth',
          'dateOfBirth',
          'date_of_birth',
        )
          ? toHtmlDate(
            pickRowString(
              row,
              'dateofbirth',
              'dateOfBirth',
              'date_of_birth',
            ),
          )
          : '',
        licenseno: pickRowString(
          row,
          'licenseno',
          'licenseNo',
          'license_no',
          'licensenumber',
        ),
        email: pickRowString(row, 'email', 'emailaddress', 'email_address'),
        state: pickRowString(row, 'state', 'State'),
        city: pickRowString(row, 'city', 'City'),
        postcode: pickRowString(row, 'postcode', 'postCode', 'post_code', 'zip'),
        address: pickRowString(row, 'address', 'Address', 'street'),
      };
    });
    return { drivers, removedCustomerIds: [] };
  }, [extraDrivers]);
  const [driversForm, setDriversForm] = useState<ExtraDriversForm>(initialDriversForm);

  const initialUploadForm = useMemo<UploadImagesForm>(() => {
    return { docs: mapUploadDocuments(documentLinkData) };
  }, [documentLinkData]);
  const [uploadForm, setUploadForm] = useState<UploadImagesForm>(initialUploadForm);
  const hydrateUploadDocsFromApi = (rows: unknown[]) => {
    setUploadForm((prev) => {
      const fromApi = mapUploadDocuments(rows);
      const merged = [...fromApi];

      const byKey = new Map<string, number>();
      merged.forEach((d, idx) => {
        byKey.set(uploadDocKey(d), idx);
      });

      // Preserve local staged uploads (pendingStore) that are not yet saved on backend.
      // `listRcmDocuments` can omit these rows, so we must not lose them on refresh.
      for (const local of prev.docs) {
        if (!local.pendingStore?.url) continue;
        const key = uploadDocKey(local);
        const existingIdx = byKey.get(key);
        if (existingIdx == null) {
          merged.push(local);
          byKey.set(key, merged.length - 1);
          continue;
        }
        merged[existingIdx] = {
          ...merged[existingIdx],
          pendingStore: local.pendingStore,
          isUploading: local.isUploading,
        };
      }

      return { docs: merged };
    });
  };

  const refreshUploadDocuments = useCallback(async () => {
    const reservationRefValue = firstText(reservationRef, bookingInfo?.reservationref);
    if (!reservationRefValue) return;
    const latest = await listRcmDocuments(reservationRefValue, 'checkin');
    const rows = Array.isArray(latest?.data) ? latest.data : [];
    hydrateUploadDocsFromApi(rows);
  }, [bookingInfo?.reservationref, reservationRef]);

  const initialFormsRef = useRef({
    customer: initialCustomerForm,
    booking: initialBookingForm,
    drivers: initialDriversForm,
    upload: initialUploadForm,
  });
  initialFormsRef.current = {
    customer: initialCustomerForm,
    booking: initialBookingForm,
    drivers: initialDriversForm,
    upload: initialUploadForm,
  };
  const legacyEditFieldsRef = useRef<LegacyEditFields | null>(null);

  // Re-hydrate when booking context OR fetched workflow payload changes.
  const customerHydrationSnapshot = [
    firstText(customerInfo?.firstname),
    firstText(customerInfo?.lastname),
    firstText(customerInfo?.email),
    firstText(customerInfo?.mobile, customerInfo?.phone),
    firstText(customerInfo?.dateofbirth),
    firstText(customerInfo?.licenseno),
    firstText(customerInfo?.licenseissued),
    firstText(customerInfo?.licenseexpires),
    firstText(customerInfo?.address),
    firstText(customerInfo?.city),
    firstText(customerInfo?.state),
    firstText(customerInfo?.postcode),
    firstText(customerInfo?.country),
  ].join('|');
  const bookingHydrationSnapshot = [
    firstText(bookingInfo?.reservationref),
    firstText(bookingInfo?.numbertravelling),
    firstText(bookingInfo?.pickuplocationid),
    firstText(bookingInfo?.dropofflocationid),
    firstText(bookingInfo?.pickupdate),
    firstText(bookingInfo?.dropoffdate),
    firstText(bookingInfo?.vehiclecategoryid),
    firstText(bookingInfo?.customerid),
    firstText(bookingInfo?.transmission),
    firstText(bookingInfo?.customerremark),
  ].join('|');
  const hydrationKey = [
    firstText(reservationRef, bookingInfo?.reservationref),
    firstText(snapshot?.bookingId),
    String(normalizedWorkflow.list.length),
    String(normalizedWorkflow.bookinginfo.length),
    String(normalizedWorkflow.customerinfo.length),
    String(normalizedWorkflow.optionalfees.length),
    String(normalizedWorkflow.insuranceoptions.length),
    String(extraFeesRaw.length),
    customerHydrationSnapshot,
    bookingHydrationSnapshot,
    String(normalizedWorkflow.extradrivers.length),
    extraDriversHydrationKey,
    String(normalizedWorkflow.documentlinkdata.length),
  ].join('|');
  useEffect(() => {
    const f = initialFormsRef.current;
    setCustomerForm(f.customer);
    setBookingForm(f.booking);
    setDriversForm(f.drivers);
    setUploadForm(f.upload);
    setOpenCard('reservation');
  }, [hydrationKey]);

  const markSaved = (id: StepId) => {
    if (isUpdateMode) return;
    const idx = stepOrder.indexOf(id);
    const next = stepOrder[idx + 1];
    if (next) setOpenCard(next);
  };

  const selectedExtraKmsId = useMemo(() => {
    for (const selectedId of bookingForm.selectedOptionalFees) {
      const row = optionalFeesRaw.find(
        (f, i) => workflowOptionalExtraId(f as Record<string, unknown>, i) === selectedId,
      ) as Record<string, unknown> | undefined;
      if (!row) continue;
      const label = String(row.name ?? '').toLowerCase();
      const isKms = label.includes('km') || label.includes('kilomet');
      if (!isKms) continue;
      const id = toFiniteNumber(
        row.extrakms_id ?? row.extrakmsid ?? row.id ?? row.optionalfeeid,
        0,
      );
      if (id > 0) return id;
    }
    return undefined;
  }, [bookingForm.selectedOptionalFees, optionalFeesRaw]);

  const resolveLegacyEditFieldsFromCurrent = (): LegacyEditFields | null => {
    const pickupLocationId =
      pickRowNumber(
        bookingInfo ?? {},
        'pickuplocationid',
        'pickup_location_id',
        'pickuplocation',
        'pickupLocationId',
        'locationid',
        'location_id',
      ) || toFiniteNumber(snapshot?.pickupLocationId, 0);
    const bookingType =
      pickRowNumber(
        bookingInfo ?? {},
        'bookingtype',
        'booking_type',
        'reservationtype',
        'reservation_type',
      ) || toFiniteNumber(snapshot?.bookingType, 2);
    const transmission =
      pickRowNumber(
        bookingInfo ?? {},
        'transmission',
        'transmissionid',
        'transmission_id',
        'transmissionpreference',
        'transmission_preference',
      ) || toFiniteNumber(snapshot?.transmission, 0);
    const customerId =
      pickRowNumber(
        customerInfo ?? {},
        'id',
        'customerid',
        'customer_id',
        'userid',
        'user_id',
      ) ||
      pickRowNumber(
        bookingInfo ?? {},
        'customerid',
        'customer_id',
        'primarycustomerid',
        'primary_customer_id',
      ) ||
      toFiniteNumber(snapshot?.customerId, 0);
    if (pickupLocationId <= 0 || customerId <= 0 || transmission < 0) return null;
    return {
      pickuplocationid: pickupLocationId,
      bookingtype: bookingType > 0 ? bookingType : 2,
      transmission,
      id: customerId,
    };
  };

  const ensureLegacyEditFields = async (): Promise<LegacyEditFields> => {
    if (legacyEditFieldsRef.current) return legacyEditFieldsRef.current;
    const current = resolveLegacyEditFieldsFromCurrent();
    if (current) {
      legacyEditFieldsRef.current = current;
      return current;
    }
    const ref = firstText(reservationRef, bookingInfo?.reservationref);
    if (!ref) {
      throw new Error('Missing reservation reference for booking update.');
    }
    const detail = await fetchBookingByReference(ref);
    const raw = detail?.data;
    if (!raw || typeof raw !== 'object') {
      throw new Error('Could not resolve booking details for update.');
    }
    const view = mapBookingDetailToView(raw as Record<string, unknown>);
    const fallback = {
      pickuplocationid: toFiniteNumber(view.pickupLocationId, 0),
      bookingtype: toFiniteNumber(view.bookingType, 2),
      transmission: toFiniteNumber(view.transmission, 0),
      id: toFiniteNumber(view.customerId, 0),
    };
    if (fallback.pickuplocationid <= 0 || fallback.id <= 0 || fallback.transmission < 0) {
      throw new Error('Could not resolve required booking fields. Please reopen this booking.');
    }
    legacyEditFieldsRef.current = fallback;
    return fallback;
  };

  const saveBookingStep = async () => {
    if (bookingLockedReason) {
      toast.error(bookingLockedReason);
      return;
    }
    setSavingStep('booking');
    try {
      setBookingSaveError(null);
      const legacyEditFields = await ensureLegacyEditFields();
      const optionalfees = bookingForm.selectedOptionalFees
        .map((selectedId) => {
          const idx = optionalFeesRaw.findIndex(
            (f, i) => workflowOptionalExtraId(f as Record<string, unknown>, i) === selectedId,
          );
          if (idx < 0) return null;
          const row = optionalFeesRaw[idx] as Record<string, unknown>;
          const id = toFiniteNumber(row.id ?? row.optionalfeeid ?? row.extrafeeid, 0);
          if (id <= 0) return null;
          const qty = Math.min(
            MAX_OPTIONAL_EXTRA_QTY,
            Math.max(1, toFiniteNumber(bookingForm.optionalFeeQuantities[selectedId], 1)),
          );
          return { id, qty };
        })
        .filter((x): x is { id: number; qty: number } => Boolean(x));

      const pickupDatetime = firstText(
        [firstText(bookingInfo?.pickupdate), firstText(bookingInfo?.pickuptime)]
          .filter(Boolean)
          .join(' ')
          .trim(),
        firstText(bookingInfo?.pickupdatetime),
      );
      const dropoffDatetime = firstText(
        [firstText(bookingInfo?.dropoffdate), firstText(bookingInfo?.dropofftime)]
          .filter(Boolean)
          .join(' ')
          .trim(),
        firstText(bookingInfo?.dropoffdatetime),
      );

      const customerPayload = {
        customerid: toFiniteNumber(
          customerInfo?.customerid ??
            customerInfo?.id ??
            bookingInfo?.customerid ??
            legacyEditFields.id,
          0,
        ),
        firstname: customerForm.firstName,
        lastname: customerForm.lastName,
        dateofbirth: normalizeDateForApi(customerForm.dateOfBirth),
        licenseno: customerForm.licenseNo,
        licenseissued: firstText(
          customerForm.licenseIssued,
          customerInfo?.licenseissued,
        ),
        licenseexpires: firstText(
          normalizeDateForApi(customerForm.licenseExpires),
          customerInfo?.licenseexpires,
        ),
        email: customerForm.email,
        phone: firstText(customerInfo?.phone),
        mobile: firstText(customerForm.phone, customerInfo?.mobile),
        fulladdress: firstText(customerInfo?.fulladdress),
        address: customerForm.address,
        city: customerForm.city,
        state: customerForm.state,
        postcode: customerForm.postcode,
        country: firstText(customerForm.country, customerInfo?.country),
        countryid: toFiniteNumber(customerInfo?.countryid ?? customerInfo?.country_id, 0),
        localaddress: firstText(customerInfo?.localaddress),
        passport: firstText(customerInfo?.passport),
        mailinglist: Boolean(customerInfo?.mailinglist),
        loyaltycardno: firstText(customerInfo?.loyaltycardno),
      };
      const formError = validateCustomerDetailsForm(customerForm);
      if (formError) {
        throw new Error(formError);
      }
      const travellerCount = toFiniteNumber(customerForm.numberTravelling, 0);
      if (travellerCount <= 0) {
        throw new Error('Number of people traveling must be at least 1.');
      }

      const reservationRefValue = firstText(reservationRef, bookingInfo?.reservationref);
      const editPayload = {
        booking_id: firstText(snapshot?.bookingId, bookingInfo?.booking_id, bookingInfo?.bookingid),
        reservation_ref: reservationRefValue,
        reservationref: reservationRefValue,
        customer_details: {
          id: customerPayload.customerid,
          customerid: customerPayload.customerid,
          first_name: customerPayload.firstname,
          last_name: customerPayload.lastname,
          firstname: customerPayload.firstname,
          lastname: customerPayload.lastname,
          email: customerPayload.email,
          phone: customerPayload.phone || '',
          mobile: customerPayload.mobile || '',
          date_of_birth: customerPayload.dateofbirth,
          dateofbirth: customerPayload.dateofbirth,
          address: customerPayload.address,
          city: customerPayload.city,
          state: customerPayload.state,
          postcode: customerPayload.postcode,
          country_id: customerPayload.countryid || 0,
          driver_license_number: customerPayload.licenseno,
          licenseno: customerPayload.licenseno,
        },
        customer: {
          id: customerPayload.customerid,
          customerid: customerPayload.customerid,
          firstname: customerPayload.firstname,
          lastname: customerPayload.lastname,
          dateofbirth: customerPayload.dateofbirth,
          licenseno: customerPayload.licenseno,
          email: customerPayload.email,
          phone: customerPayload.phone || '',
          mobile: customerPayload.mobile || '',
          address: customerPayload.address,
          city: customerPayload.city,
          state: customerPayload.state,
          postcode: customerPayload.postcode,
          countryid: customerPayload.countryid || 0,
        },
        bookingtype: legacyEditFields.bookingtype,
        booking_type: legacyEditFields.bookingtype,
        insuranceid: toFiniteNumber(bookingForm.selectedInsurance, 0),
        insurance_id: toFiniteNumber(bookingForm.selectedInsurance, 0),
        extrakmsid: toFiniteNumber(selectedExtraKmsId, 0),
        extrakms_id: toFiniteNumber(selectedExtraKmsId, 0),
        pickuplocationid: legacyEditFields.pickuplocationid,
        transmission: legacyEditFields.transmission,
        numbertravelling: travellerCount,
        number_of_persons: travellerCount,
        referralid: toFiniteNumber(bookingInfo?.referralid, 1),
        remark: firstText(bookingForm.notes, bookingInfo?.customerremark),
        flightin: firstText(bookingInfo?.flightin),
        flightout: firstText(bookingInfo?.flightout),
        arrivalpoint: firstText(bookingInfo?.arrivalpoint),
        departurepoint: firstText(bookingInfo?.departurepoint),
        areaofuseid: toFiniteNumber(bookingInfo?.areaofuseid, 0),
        newsletter: Boolean((customerInfo as Record<string, unknown> | undefined)?.mailinglist),
        agentcode: firstText(bookingInfo?.agentcode),
        agentname: firstText(bookingInfo?.agentname),
        agentemail: firstText(bookingInfo?.agentemail),
        agentrefno: firstText(bookingInfo?.agentrefno),
        agentcollectedrecalcmode: firstText(bookingInfo?.agentcollectedrecalcmode),
        optionalfees,
      };

      if (isUpdateMode) {
        await updateBooking({
          reservation_ref: reservationRefValue,
          bookingtype: legacyEditFields.bookingtype,
          pickuplocationid: legacyEditFields.pickuplocationid,
          pickupdatetime: pickupDatetime,
          dropofflocationid: toFiniteNumber(
            bookingInfo?.dropofflocationid ?? bookingInfo?.dropoff_location_id,
            0,
          ),
          dropoffdatetime: dropoffDatetime,
          vehiclecategoryid: toFiniteNumber(
            bookingInfo?.vehiclecategoryid ?? bookingInfo?.vehicle_category_id,
            0,
          ),
          driverageid: toFiniteNumber(bookingInfo?.driverageid ?? bookingInfo?.age_id, 0),
          insuranceid: toFiniteNumber(bookingForm.selectedInsurance, 0),
          extrakmsid: toFiniteNumber(selectedExtraKmsId, 0),
          transmission: legacyEditFields.transmission,
          customer: customerPayload,
          referralid: toFiniteNumber(bookingInfo?.referralid, 1),
          remark: firstText(bookingForm.notes, bookingInfo?.customerremark),
          numbertravelling: travellerCount,
          flightin: firstText(bookingInfo?.flightin),
          flightout: firstText(bookingInfo?.flightout),
          arrivalpoint: firstText(bookingInfo?.arrivalpoint),
          departurepoint: firstText(bookingInfo?.departurepoint),
          areaofuseid: toFiniteNumber(bookingInfo?.areaofuseid, 0),
          newsletter: Boolean((customerInfo as Record<string, unknown> | undefined)?.mailinglist),
          agentcode: firstText(bookingInfo?.agentcode),
          agentname: firstText(bookingInfo?.agentname),
          agentemail: firstText(bookingInfo?.agentemail),
          agentrefno: firstText(bookingInfo?.agentrefno),
          agentcollectedrecalcmode: firstText(bookingInfo?.agentcollectedrecalcmode),
          optionalfees,
        });
      } else {
        await editBookingBasics(editPayload);
      }
      invalidateBookingsCache(firstText(reservationRef, bookingInfo?.reservationref));
      if (isUpdatePayMode) {
        toast.success('Booking details saved');
        await startSecurePaymentStep();
      } else if (isUpdateMode) {
        setShowUpdateSuccessDialog(true);
      } else {
        toast.success('Booking details saved');
        markSaved('booking');
      }
    } catch (e) {
      const msg = friendlyBookingErrorMessage(e, 'Could not save booking details');
      setBookingSaveError(msg);
      toast.error(msg);
    } finally {
      setSavingStep(null);
    }
  };

  const saveExtraDriversStep = async () => {
    if (bookingLockedReason) {
      toast.error(bookingLockedReason);
      return;
    }
    setSavingStep('drivers');
    try {
      const reservationRefValue = firstText(
        reservationRef,
        bookingInfo?.reservationref,
      );
      if (!reservationRefValue) throw new Error('Missing reservation reference');

      const ownerEmail = firstText(customerForm.email, customerSnapshot?.email);
      const ownerState = firstText(customerForm.state, customerSnapshot?.state);
      const ownerCity = firstText(customerForm.city, customerSnapshot?.city);
      const ownerPostcode = firstText(
        customerForm.postcode,
        customerSnapshot?.postcode,
      );
      const ownerAddress = firstText(
        customerForm.address,
        customerSnapshot?.address,
      );

      const driversToSave = driversForm.drivers.filter(
        (d) =>
          d.firstname.trim() ||
          d.lastname.trim() ||
          d.dateofbirth.trim() ||
          d.licenseno.trim() ||
          d.email.trim() ||
          d.state.trim() ||
          d.city.trim() ||
          d.postcode.trim() ||
          d.address.trim(),
      );
      if (driversToSave.length > MAX_EXTRA_DRIVERS) {
        toast.error(`You can add up to ${MAX_EXTRA_DRIVERS} additional drivers only.`);
        return;
      }
      const hasRemovalChanges = driversForm.removedCustomerIds.length > 0;
      if (driversToSave.length === 0 && !hasRemovalChanges) {
        markSaved('drivers');
        return;
      }
      for (let i = 0; i < driversToSave.length; i += 1) {
        const err = validateExtraDriverInput(driversToSave[i], i, ownerEmail);
        if (err) {
          toast.error(err);
          return;
        }
      }

      const failedDrivers: number[] = [];
      for (let i = 0; i < driversToSave.length; i += 1) {
        const d = driversToSave[i];
        try {
          await addExtraDriver({
            reservation_ref: reservationRefValue,
            customerid: Number(d.customerid || 0),
            customer: {
              firstname: d.firstname.trim() || 'Driver',
              lastname: d.lastname.trim() || 'User',
              dateofbirth: normalizeDateForApi(d.dateofbirth.trim()) || '01/Jan/1980',
              licenseno: d.licenseno.trim(),
              email: d.email.trim() || ownerEmail,
              state: d.state.trim() || ownerState,
              city: d.city.trim() || ownerCity,
              postcode: d.postcode.trim() || ownerPostcode,
              address: d.address.trim() || ownerAddress,
            },
          });
        } catch {
          failedDrivers.push(i + 1);
        }
      }

      for (const removedId of driversForm.removedCustomerIds) {
        const parsedRemovedId = Number(removedId);
        if (!Number.isFinite(parsedRemovedId) || parsedRemovedId <= 0) continue;
        await addExtraDriver({
          reservation_ref: reservationRefValue,
          customerid: -Math.abs(parsedRemovedId),
          customer: {
            firstname: 'Delete',
            lastname: 'Driver',
            dateofbirth: '01/Jan/1980',
            licenseno: '',
            email: ownerEmail,
            state: ownerState,
            city: ownerCity,
            postcode: ownerPostcode,
            address: ownerAddress,
          },
        });
      }

      if (driversToSave.length > 0 || hasRemovalChanges) {
        if (failedDrivers.length === 0) {
          toast.success('Extra drivers saved');
        } else {
          toast.error(
            `Some drivers could not be saved (Driver ${failedDrivers.join(', Driver ')}).`,
          );
        }
      }
      invalidateBookingsCache(reservationRefValue);
      // Reload workflow so newly added drivers receive real backend customer ids.
      // Without this, local rows can keep customerid=0 and later "Remove" only
      // updates UI (no API delete payload can be built).
      try {
        const latestWorkflow = await fetchWorkflowChecklist(reservationRefValue, 'checkin');
        const latestData = latestWorkflow?.data;
        if (latestData && typeof latestData === 'object') {
          setWorkflow(latestData as Record<string, unknown>);
        }
      } catch {
        // Non-fatal: keep saved state and let user continue.
      }
      await refreshUploadDocuments();
      markSaved('drivers');
    } catch (e) {
      toast.error(friendlyBookingErrorMessage(e, 'Could not save extra drivers'));
    } finally {
      setSavingStep(null);
    }
  };

  const removeExtraDriverNow = async (driver: ExtraDriversForm['drivers'][number]) => {
    if (bookingLockedReason) {
      toast.error(bookingLockedReason);
      return;
    }
    if (!(Number(driver.customerid) > 0)) return;

    const reservationRefValue = firstText(reservationRef, bookingInfo?.reservationref);
    if (!reservationRefValue) {
      toast.error('Missing reservation reference');
      return;
    }

    const ownerEmail = firstText(customerForm.email, customerSnapshot?.email);
    const ownerState = firstText(customerForm.state, customerSnapshot?.state) || 'NA';
    const ownerCity = firstText(customerForm.city, customerSnapshot?.city) || 'NA';
    const ownerPostcode = firstText(
      customerForm.postcode,
      customerSnapshot?.postcode,
    ) || '0000';
    const ownerAddress = firstText(
      customerForm.address,
      customerSnapshot?.address,
    ) || 'NA';

    await addExtraDriver({
      reservation_ref: reservationRefValue,
      customerid: -Math.abs(Number(driver.customerid)),
      customer: {
        firstname: 'Delete',
        lastname: 'Driver',
        dateofbirth: '01/Jan/1980',
        licenseno: '',
        email: ownerEmail || 'no-reply@northsiderentals.local',
        state: ownerState,
        city: ownerCity,
        postcode: ownerPostcode,
        address: ownerAddress,
      },
    });
    toast.success('Extra driver removed');
    invalidateBookingsCache(reservationRefValue);
      await refreshUploadDocuments();
  };

  /** Binary upload only; `POST /documents/rcm/store` runs on Save. */
  const stageDocumentFile = async (id: string, file: File) => {
    setUploadForm((prev) => ({
      docs: prev.docs.map((d) => (d.id === id ? { ...d, isUploading: true } : d)),
    }));
    try {
      const uploadRes = await uploadRcmDocumentFile(file);
      const uploadObj =
        uploadRes && typeof uploadRes === 'object'
          ? (uploadRes as Record<string, unknown>)
          : {};
      const uploadData =
        uploadObj.data && typeof uploadObj.data === 'object'
          ? (uploadObj.data as Record<string, unknown>)
          : {};
      const url = firstText(uploadObj.url, uploadData.url, uploadData.file_url, uploadData.path);
      if (!url) throw new Error('Upload API did not return a file URL');

      const resultsprovider =
        uploadData && typeof uploadData === 'object' && !Array.isArray(uploadData)
          ? (uploadData as Record<string, unknown>)
          : ({} as Record<string, unknown>);

      setUploadForm((prev) => ({
        docs: prev.docs.map((d) =>
          d.id === id
            ? {
                ...d,
                isUploading: false,
                pendingStore: {
                  url,
                  originalname: file.name,
                  resultsprovider,
                },
              }
            : d,
        ),
      }));
      toast.success('File uploaded — press Save to attach to booking');
    } catch (e) {
      setUploadForm((prev) => ({
        docs: prev.docs.map((d) => (d.id === id ? { ...d, isUploading: false } : d)),
      }));
      toast.error(getFriendlyError(e, 'Could not upload file'));
    }
  };

  const saveUploadImagesStep = async () => {
    if (bookingLockedReason) {
      toast.error(bookingLockedReason);
      return;
    }
    const reservationRefValue = firstText(reservationRef, bookingInfo?.reservationref);
    if (!reservationRefValue) {
      toast.error('Missing reservation reference');
      return;
    }
    const pending = uploadForm.docs.filter((d) => d.pendingStore?.url);
    if (pending.length === 0) {
      markSaved('images');
      return;
    }
    setSavingStep('images');
    try {
      for (const doc of pending) {
        const p = doc.pendingStore;
        if (!p?.url) continue;
        const resultObj =
          p.resultsprovider && typeof p.resultsprovider === 'object'
            ? (p.resultsprovider as Record<string, unknown>)
            : {};
        const resolvedDocType =
          firstText(
            doc.doctype,
            resultObj.doctype,
            resultObj.document_type,
            fileNameToDocType(p.originalname),
          ) || 'other';
        const resolvedStorageProvider =
          firstText(
            doc.storageprovider,
            resultObj.storageprovider,
            resultObj.storage_provider,
            resultObj.provider,
            'cloudinary',
          ) || 'cloudinary';
        const storeRes = await storeRcmDocument({
          reservation_ref: reservationRefValue,
          url: p.url,
          documentlinksetupid: doc.documentLinkSetupId,
          customer_id: doc.customerId,
          vehicle_id: 0,
          description: doc.description,
          doctype: resolvedDocType,
          source: 'web',
          originalname: p.originalname,
          storageprovider: resolvedStorageProvider,
          resultsprovider: p.resultsprovider,
          workflow_code: 'checkin',
          sequencenumber: doc.seqno,
          istaggedincloudinary: true,
        });
        const storeObj =
          storeRes && typeof storeRes === 'object'
            ? (storeRes as Record<string, unknown>)
            : {};
        const storeData =
          storeObj.data && typeof storeObj.data === 'object'
            ? (storeObj.data as Record<string, unknown>)
            : {};
        const nextLinkId = Number(
          storeData.document_link_id ?? storeData.documentlinkid ?? 0,
        );
        const docId = doc.id;
        setUploadForm((prev) => ({
          docs: prev.docs.map((d) =>
            d.id === docId
              ? {
                  ...d,
                  pendingStore: null,
                  uploaded: true,
                  documentLinkId: nextLinkId || d.documentLinkId,
                }
              : d,
          ),
        }));
      }
      toast.success('Documents saved');
      invalidateBookingsCache(reservationRefValue);
      await refreshUploadDocuments();
      markSaved('images');
    } catch (e) {
      toast.error(getFriendlyError(e, 'Could not save documents'));
    } finally {
      setSavingStep(null);
    }
  };

  const startSecurePaymentStep = async () => {
    if (bookingLockedReason) {
      toast.error(bookingLockedReason);
      return;
    }
    const bookingId = firstText(
      snapshot?.bookingId,
      bookingInfo?.booking_id,
      bookingInfo?.bookingid,
    );
    const reservationRefValue = firstText(
      reservationRef,
      bookingInfo?.reservationref,
      routeState?.reservationRef,
    );
    if (!bookingId && !reservationRefValue) {
      toast.error('Reservation reference is missing. Please save booking details first.');
      return;
    }

    try {
      setLaunchingPayment(true);
      const session = await carsService.createPaymentSession({
        reservationref: reservationRefValue || undefined,
      });
      const url = String(
        (session?.data as Record<string, unknown> | undefined)?.payment_url ?? '',
      ).trim();
      if (!/^https?:\/\//i.test(url)) {
        throw new Error('Payment URL is missing. Please try again.');
      }
      markSaved('creditcard');
      window.location.assign(url);
    } catch (e) {
      toast.error(getFriendlyError(e, 'Could not start payment'));
    } finally {
      setLaunchingPayment(false);
    }
  };

  const deleteOneDocument = async (id: string) => {
    const reservationRefValue = firstText(reservationRef, bookingInfo?.reservationref);
    if (!reservationRefValue) {
      toast.error('Missing reservation reference');
      return;
    }
    const doc = uploadForm.docs.find((d) => d.id === id);
    if (!doc) return;
    if (doc.pendingStore?.url) {
      setUploadForm((prev) => ({
        docs: prev.docs.map((d) =>
          d.id === id ? { ...d, pendingStore: null, isUploading: false } : d,
        ),
      }));
      return;
    }
    let linkId = Number(doc.documentLinkId || doc.documentLinkSetupId || 0);
    if (linkId <= 0) {
      try {
        const latest = await listRcmDocuments(reservationRefValue, 'checkin');
        const rows = Array.isArray(latest?.data) ? latest.data : [];
        const matched = rows.find((row) => {
          const r = row as Record<string, unknown>;
          const setupId = Number(r.documentlinksetupid ?? 0);
          const customerId = Number(r.customerid ?? 0);
          return (
            setupId === Number(doc.documentLinkSetupId ?? 0) &&
            customerId === Number(doc.customerId ?? 0)
          );
        }) as Record<string, unknown> | undefined;
        if (matched) {
          linkId = documentLinkIdFromRow(matched);
          if (linkId > 0) {
            setUploadForm((prev) => ({
              docs: prev.docs.map((d) =>
                d.id === id ? { ...d, documentLinkId: linkId } : d,
              ),
            }));
          }
        }
      } catch {
        // Ignore lookup error and keep friendly fallback below.
      }
    }
    if (linkId <= 0) {
      toast.error('Document link id missing for delete');
      return;
    }
    setUploadForm((prev) => ({
      docs: prev.docs.map((d) => (d.id === id ? { ...d, isUploading: true } : d)),
    }));
    try {
      await deleteRcmDocument({
        reservation_ref: reservationRefValue,
        // API expects real document link id for delete (positive identifier).
        document_link_id: Math.abs(linkId),
      });
      setUploadForm((prev) => ({
        docs: prev.docs.map((d) =>
          d.id === id
            ? { ...d, uploaded: false, isUploading: false, documentLinkId: 0 }
            : d,
        ),
      }));
      toast.success('Document deleted');
      invalidateBookingsCache(reservationRefValue);
      await refreshUploadDocuments();
    } catch (e) {
      setUploadForm((prev) => ({
        docs: prev.docs.map((d) => (d.id === id ? { ...d, isUploading: false } : d)),
      }));
      toast.error(getFriendlyError(e, 'Could not delete document'));
    }
  };

  const reservationData = useMemo(() => {
    const reservationNumber =
      String(
        bookingInfo?.reservationdocumentno ??
          snapshot?.reservationNumber ??
          routeState?.reservationRef ??
          '',
      ).trim() || '—';
    const carImagePath = String(bookingInfo?.vehicleimage ?? '').trim();
    const workflowCarImage = carImagePath
      ? `${String(bookingInfo?.urlpathfordocuments ?? '').replace(/\/$/, '')}/${carImagePath.replace(/^\//, '')}`
      : '';
    const carImage =
      workflowCarImage ||
      String(snapshot?.carImage ?? '').trim();
    const pickupLocation = [
      String(bookingInfo?.pickuplocationname ?? '').trim(),
      String(bookingInfo?.pickuplocationaddress ?? '').trim(),
    ]
      .filter(Boolean)
      .join(' ');
    const returnLocation = [
      String(bookingInfo?.dropofflocationname ?? '').trim(),
      String(bookingInfo?.dropofflocationaddress ?? '').trim(),
    ]
      .filter(Boolean)
      .join(' ');

    return {
      reservationNumber,
      carImage,
      carTitle:
        String(bookingInfo?.vehiclecategory ?? snapshot?.carTitle ?? '').trim() ||
        'Vehicle',
      carSubtitle:
        stripHtmlTags(
          String(bookingInfo?.vehicledescription1 ?? snapshot?.carSubtitle ?? '').trim(),
        ) || '—',
      pickupDate:
        [bookingInfo?.pickupdate, bookingInfo?.pickuptime].filter(Boolean).join(' ').trim() ||
        String(snapshot?.pickupDate ?? '').trim() ||
        '—',
      pickupLocation:
        pickupLocation ||
        String(snapshot?.pickupLocation ?? '').trim() ||
        '—',
      returnDate:
        [bookingInfo?.dropoffdate, bookingInfo?.dropofftime].filter(Boolean).join(' ').trim() ||
        String(snapshot?.returnDate ?? '').trim() ||
        '—',
      returnLocation:
        returnLocation ||
        String(snapshot?.returnLocation ?? '').trim() ||
        '—',
    };
  }, [bookingInfo, reservationRef, routeState?.reservationRef, snapshot]);

  const rentalFeeSummary = useMemo(() => {
    const parseDateValue = (value: unknown): Date | null => {
      const text = String(value ?? '').trim();
      if (!text) return null;
      const native = new Date(text);
      if (!Number.isNaN(native.getTime())) return native;
      const ddMmm = text.match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{4})$/);
      if (ddMmm) {
        const parsed = new Date(`${ddMmm[1]} ${ddMmm[2]} ${ddMmm[3]}`);
        if (!Number.isNaN(parsed.getTime())) return parsed;
      }
      const ddMmYyyy = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (ddMmYyyy) {
        const parsed = new Date(
          Number(ddMmYyyy[3]),
          Number(ddMmYyyy[2]) - 1,
          Number(ddMmYyyy[1]),
        );
        if (!Number.isNaN(parsed.getTime())) return parsed;
      }
      return null;
    };

    const dayCandidates = [bookingInfo?.numberofdays];
    let days = 0;
    for (const candidate of dayCandidates) {
      const n = Number(candidate ?? 0);
      if (Number.isFinite(n) && n > 0) {
        days = n;
        break;
      }
    }
    if (days <= 0) {
      const pickup = parseDateValue(bookingInfo?.pickupdate);
      const dropoff = parseDateValue(bookingInfo?.dropoffdate);
      if (pickup && dropoff) {
        const diff = Math.ceil(
          (dropoff.getTime() - pickup.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (Number.isFinite(diff) && diff > 0) days = diff;
      }
    }

    const dailyRateCandidates = [bookingInfo?.dailyrate];
    const dailyRate =
      dailyRateCandidates
        .map((v) => Number(v ?? 0))
        .find((n) => Number.isFinite(n) && n >= 0) ?? 0;

    const totalCostCandidates = [bookingInfo?.totalcost];
    const totalCost =
      totalCostCandidates
        .map((v) => Number(v ?? 0))
        .find((n) => Number.isFinite(n) && n >= 0) ?? 0;

    const gstAmount = Number(bookingInfo?.gst ?? 0);
    const computedExtras = Math.max(0, totalCost - days * dailyRate);
    const totalExtras = Number.isFinite(computedExtras) ? computedExtras : 0;

    return {
      days,
      dailyRate,
      totalExtras,
      totalCost,
      gstAmount: Number.isFinite(gstAmount) && gstAmount >= 0 ? gstAmount : 0,
    };
  }, [bookingInfo]);

  return (
    <div className="flex flex-col h-full min-h-screen pb-[300px] lg:pb-10 relative px-4 pt-0 lg:px-0">
      <Dialog open={showUpdateSuccessDialog} onOpenChange={setShowUpdateSuccessDialog}>
        <DialogContent className="max-w-md text-center">
          <div className="mx-auto mt-2 flex size-16 items-center justify-center rounded-full bg-[#0061e0]">
            <Check className="size-9 text-white" strokeWidth={3} />
          </div>
          <DialogTitle className="text-xl font-bold text-[#0061e0]">
            Booking Updated
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Booking details were updated successfully.
          </DialogDescription>
          <Button
            className="w-full bg-[#ffc107] hover:bg-[#ffb000] text-black font-bold"
            onClick={() => {
              setShowUpdateSuccessDialog(false);
              navigate('/bookings');
            }}
          >
            Back to Bookings
          </Button>
        </DialogContent>
      </Dialog>

      <div className="mb-4 pt-2">
        <h1 className="font-extrabold text-[18px] sm:text-[20px] text-black">
          {isUpdateMode ? 'Modify Booking' : 'Express Check-in'}
        </h1>
      </div>

      <div className="flex-1 w-full mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 ">
        {bookingLockedReason ? (
          <div className="lg:col-span-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            <p className="font-semibold">This booking cannot be updated</p>
            <p className="mt-1 text-destructive/90">{bookingLockedReason}</p>
          </div>
        ) : null}
        {bookingSaveError ? (
          <div className="lg:col-span-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            <p className="font-semibold">Unable to save booking details</p>
            <p className="mt-1 text-destructive/90">{bookingSaveError}</p>
          </div>
        ) : null}

        {/* Small Grid: Reservation Details & Fee Summary (Right side on desktop, top on mobile) */}
        <div className="col-span-1 flex flex-col lg:order-last">

          {/* Mapped to BookingOverview's place */}
          {isUpdateMode ? (
            <div className="bg-white rounded-[16px] border border-gray-100 shadow-sm">
              <div className="px-4 py-3 border-b border-gray-100 text-sm font-semibold text-gray-700">
                RESERVATION DETAILS
              </div>
              <div className="p-4">
                <ReservationDetails
                  reservationNumber={reservationData.reservationNumber}
                  carImage={reservationData.carImage}
                  carTitle={reservationData.carTitle}
                  carSubtitle={reservationData.carSubtitle}
                  pickupDate={reservationData.pickupDate}
                  pickupLocation={reservationData.pickupLocation}
                  returnDate={reservationData.returnDate}
                  returnLocation={reservationData.returnLocation}
                />
              </div>
            </div>
          ) : (
            <CollapsibleCard
              title="RESERVATION DETAILS"
              isOpen={openCard === 'reservation'}
              onToggle={() => toggleCard('reservation')}
            >
              <ReservationDetails
                reservationNumber={reservationData.reservationNumber}
                carImage={reservationData.carImage}
                carTitle={reservationData.carTitle}
                carSubtitle={reservationData.carSubtitle}
                pickupDate={reservationData.pickupDate}
                pickupLocation={reservationData.pickupLocation}
                returnDate={reservationData.returnDate}
                returnLocation={reservationData.returnLocation}
              />
            </CollapsibleCard>
          )}

          {/* Desktop Summary Placeholder (matches options layout) */}
          <div className="bg-white rounded-[16px] border border-gray-100 shadow-sm p-4 hidden lg:flex flex-col mt-2">
            <RentalFeeSummary
              days={rentalFeeSummary.days}
              dailyRate={rentalFeeSummary.dailyRate}
              totalExtras={rentalFeeSummary.totalExtras}
              gstAmount={rentalFeeSummary.gstAmount}
            />
          </div>
        </div>

        {/* Large Grid: The rest of the collapsible cards (Left side on desktop, below on mobile) */}
        <div className="col-span-1 lg:col-span-2 flex flex-col h-full">

          {isUpdateMode ? (
            <div className="bg-white rounded-[16px] border border-gray-100 shadow-sm p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">MODIFY BOOKING</h3>
              <div className="mb-5">
                <CustomerDetailsCard
                  value={customerForm}
                  onChange={(patch) => setCustomerForm((prev) => ({ ...prev, ...patch }))}
                  countries={rcmProfile?.countries ?? []}
                />
              </div>
              {loadingWorkflow ? (
                <p className="text-[13px] text-gray-500 mb-3">Loading booking options…</p>
              ) : null}
              <BookingDetailsCard
                value={bookingForm}
                onChange={(patch) => setBookingForm((prev) => ({ ...prev, ...patch }))}
                optionalFees={optionalFeesUi}
                insuranceOptions={insuranceOptionsUi}
              />
              <div className="flex gap-2 mt-4">
                <Button
                  type="button"
                  onClick={() => void saveBookingStep()}
                  disabled={savingStep === 'booking' || Boolean(bookingLockedReason)}
                  className="bg-[#ffc107] text-black"
                >
                  {savingStep === 'booking' ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <CollapsibleCard
                title={stepName(steps, 'customerdetails', 'CUSTOMER DETAILS')}
                isOpen={openCard === 'customer'}
                onToggle={() => toggleCard('customer')}
              >
                <CustomerDetailsCard
                  value={customerForm}
                  onChange={(patch) => setCustomerForm((prev) => ({ ...prev, ...patch }))}
                  countries={rcmProfile?.countries ?? []}
                />
                <div className="flex gap-2 mt-4">
                  <Button
                    type="button"
                    onClick={saveCustomerStep}
                    disabled={Boolean(bookingLockedReason)}
                    className="bg-[#ffc107] text-black"
                  >
                    Save
                  </Button>
                  <Button variant="outline" onClick={() => setCustomerForm(initialCustomerForm)}>
                    Cancel
                  </Button>
                </div>
              </CollapsibleCard>

              <CollapsibleCard
                title={stepName(steps, 'bookingextras', 'BOOKING DETAILS')}
                isOpen={openCard === 'booking'}
                onToggle={() => toggleCard('booking')}
              >
                {loadingWorkflow ? (
                  <p className="text-[13px] text-gray-500 mb-3">Loading booking options…</p>
                ) : null}
                <BookingDetailsCard
                  value={bookingForm}
                  onChange={(patch) => setBookingForm((prev) => ({ ...prev, ...patch }))}
                  optionalFees={optionalFeesUi}
                  insuranceOptions={insuranceOptionsUi}
                />
                <div className="flex gap-2 mt-4">
                  <Button
                    type="button"
                    onClick={() => void saveBookingStep()}
                    disabled={savingStep === 'booking' || Boolean(bookingLockedReason)}
                    className="bg-[#ffc107] text-black"
                  >
                    {savingStep === 'booking'
                      ? 'Saving…'
                      : isUpdateMode
                        ? 'Save Changes'
                        : 'Save'}
                  </Button>
                  {!isUpdateMode ? (
                    <Button variant="outline" onClick={() => setBookingForm(initialBookingForm)}>
                      Cancel
                    </Button>
                  ) : null}
                </div>
              </CollapsibleCard>
            </>
          )}

          {!isUpdateMode ? (
            <CollapsibleCard
              title={stepName(steps, 'extradrivers', 'EXTRA DRIVERS')}
              isOpen={openCard === 'drivers'}
              onToggle={() => toggleCard('drivers')}
            >
              <ExtraDriversCard
                value={driversForm}
                onChange={setDriversForm}
                maxDrivers={MAX_EXTRA_DRIVERS}
                onRemoveDriver={removeExtraDriverNow}
              />
              <div className="flex gap-2 mt-4">
                <Button
                  type="button"
                  onClick={() => void saveExtraDriversStep()}
                  disabled={savingStep === 'drivers' || Boolean(bookingLockedReason)}
                  className="bg-[#ffc107] text-black"
                >
                  {savingStep === 'drivers' ? 'Saving…' : 'Save & Continue'}
                </Button>
                <Button variant="outline" onClick={() => setDriversForm(initialDriversForm)}>
                  Cancel
                </Button>
              </div>
            </CollapsibleCard>
          ) : null}

          {!isUpdateMode ? (
            <CollapsibleCard
              title={stepName(steps, 'storeupload', 'UPLOAD IMAGES')}
              isOpen={openCard === 'images'}
              onToggle={() => toggleCard('images')}
            >
              {loadingDocuments ? (
                <p className="text-[13px] text-gray-500 mb-3">Loading required documents…</p>
              ) : null}
              <UploadImagesCard
                value={uploadForm}
                onUpload={(id, file) => void stageDocumentFile(id, file)}
                onDelete={(id) => void deleteOneDocument(id)}
              />
              <div className="flex gap-2 mt-4">
                <Button
                  type="button"
                  onClick={() => void saveUploadImagesStep()}
                  disabled={savingStep === 'images' || Boolean(bookingLockedReason)}
                  className="bg-[#ffc107] text-black"
                >
                  {savingStep === 'images' ? 'Saving…' : 'Save'}
                </Button>
                <Button variant="outline" onClick={() => setUploadForm(initialUploadForm)}>
                  Cancel
                </Button>
              </div>
            </CollapsibleCard>
          ) : null}

          {!isUpdateMode ? (
            <CollapsibleCard
              title={stepName(steps, 'createdpspaymentmethod', 'COLLECT CARD DETAIL')}
              isOpen={openCard === 'creditcard'}
              onToggle={() => toggleCard('creditcard')}
            >
              <div className="rounded-xl border border-gray-100 bg-[#f8f9fa] p-4 text-[14px] text-[#4b5563]">
                Card details are collected securely on Windcave. Click below to
                continue to the hosted payment page.
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  type="button"
                  onClick={() => void startSecurePaymentStep()}
                  disabled={launchingPayment || Boolean(bookingLockedReason)}
                  className="bg-[#ffc107] text-black"
                >
                  {launchingPayment ? 'Redirecting…' : 'Pay securely with Windcave'}
                </Button>
              </div>
            </CollapsibleCard>
          ) : null}

        </div>
      </div>

      {/* Mobile Sticky Bottom Sheet */}
      {!isUpdateMode ? (
        <div className="lg:hidden">
          <RentalFeeSummaryBottomSheet
            days={rentalFeeSummary.days}
            dailyRate={rentalFeeSummary.dailyRate}
            totalExtras={rentalFeeSummary.totalExtras}
            totalCost={rentalFeeSummary.totalCost}
            gstAmount={rentalFeeSummary.gstAmount}
          />
        </div>
      ) : null}
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { toast } from 'sonner';
import { CollapsibleCard } from './components/collapsible-card';
import { ReservationDetails } from './components/reservation-details';
import { RentalFeeSummaryBottomSheet } from './components/rental-fee-summary-bottom-sheet';
import { RentalFeeSummary } from '@/pages/cars/checkout/options/components/rental-fee-summary';
import { CustomerDetailsCard, type CustomerDetailsForm } from './components/customer-details-card';
import { BookingDetailsCard, type BookingDetailsForm } from './components/booking-details-card';
import { ExtraDriversCard, type ExtraDriversForm } from './components/extra-drivers-card';
import { UploadImagesCard, type UploadImagesForm } from './components/upload-images-card';
import { CollectCardDetailCard, type CollectCardForm } from './components/collect-card-detail-card';
import { Button } from '@/components/ui/button';
import {
  addExtraDriver,
  deleteRcmDocument,
  editBookingBasics,
  extractWorkflowChecklistArrays,
  fetchWorkflowChecklist,
  listRcmDocuments,
  storeRcmDocument,
  uploadRcmDocumentFile,
  type WorkflowChecklistStep,
} from '@/services/bookings';

interface ExpressCheckinRouteState {
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

export function ExpressCheckinContent() {
  const location = useLocation();
  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const routeState = (location.state as ExpressCheckinRouteState | null) ?? null;
  const snapshot = routeState?.bookingSnapshot ?? null;
  const customerSnapshot = routeState?.customerSnapshot ?? null;
  const reservationRefFromQuery = searchParams.get('reservation_ref') ?? '';
  const reservationRef = firstText(routeState?.reservationRef, reservationRefFromQuery);
  const [workflow, setWorkflow] = useState<Record<string, unknown> | null>(
    (routeState?.workflowChecklist as Record<string, unknown> | null) ?? null,
  );
  const [loadingWorkflow, setLoadingWorkflow] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  useEffect(() => {
    const st = (location.state as ExpressCheckinRouteState | null) ?? null;
    setWorkflow((st?.workflowChecklist as Record<string, unknown> | null) ?? null);
    // Stable dependency length: never pass a variable-length deps array (avoids React warning).
  }, [location.key, location.pathname, location.search]);

  // Always refetch checklist when we have a reservation ref so `extradrivers` and other
  // arrays are never missing due to stale/partial `location.state` payloads.
  useEffect(() => {
    if (!reservationRef) return;
    let cancelled = false;
    setLoadingWorkflow(true);
    void fetchWorkflowChecklist(reservationRef, 'checkin')
      .then((res) => {
        if (cancelled) return;
        const data = res?.data;
        if (data && typeof data === 'object') {
          setWorkflow(data as Record<string, unknown>);
        }
      })
      .catch((e) => {
        if (cancelled) return;
        toast.error(e instanceof Error ? e.message : 'Could not load workflow checklist');
      })
      .finally(() => {
        if (!cancelled) setLoadingWorkflow(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reservationRef]);

  useEffect(() => {
    if (!reservationRef) return;
    let cancelled = false;
    setLoadingDocuments(true);
    void listRcmDocuments(reservationRef, 'checkin')
      .then((res) => {
        if (cancelled) return;
        const rows = Array.isArray(res?.data) ? res.data : [];
        setUploadForm({
          docs: rows.map((d, i) => {
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
              documentLinkId: Number(row.documentlinkid ?? 0),
              seqno: Number(row.seqno ?? 0),
              doctype: String(row.doctype ?? ''),
              storageprovider: String(row.storageprovider ?? ''),
              description: String(row.text ?? '').trim(),
              title: who ? `${baseTitle} (${who})` : baseTitle,
              uploaded: Number(row.isuploaded ?? 0) > 0,
              pendingStore: null,
              notes: String(row.notes ?? '').trim(),
            };
          }),
        });
      })
      .catch((e) => {
        if (cancelled) return;
        toast.error(e instanceof Error ? e.message : 'Could not load document list');
      })
      .finally(() => {
        if (!cancelled) setLoadingDocuments(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reservationRef]);
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
        maxQty: Number(f.maxqty ?? 10) || 10,
      })),
    [optionalFeesRaw],
  );

  const insuranceOptionsUi = useMemo(
    () =>
      insuranceOptionsRaw.map((f, i) => ({
        id: workflowInsuranceOptionId(f, i),
        label: workflowInsuranceOptionLabel(f),
      })),
    [insuranceOptionsRaw],
  );

  const [openCard, setOpenCard] = useState<string | null>('reservation');
  const stepOrder = ['customer', 'booking', 'drivers', 'images', 'creditcard'] as const;
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});
  const [savingStep, setSavingStep] = useState<string | null>(null);

  const isStepLocked = (id: (typeof stepOrder)[number]) => {
    const idx = stepOrder.indexOf(id);
    if (idx <= 0) return false;
    return !completedSteps[stepOrder[idx - 1]];
  };

  const toggleCard = (id: string) => {
    if (stepOrder.includes(id as (typeof stepOrder)[number]) && isStepLocked(id as (typeof stepOrder)[number])) {
      return;
    }
    setOpenCard(openCard === id ? null : id);
  };

  const handleSave = () => {
    // Save action logic here
    console.log('Saved');
  };

  const actionButtons = (
    <Button
      className="w-full bg-[#ffc107] hover:bg-[#ffb000] text-black font-bold text-[16px] py-4 sm:py-6 rounded-full shadow-md mt-4"
      onClick={handleSave}
    >
      Save
    </Button>
  );

  const initialCustomerForm = useMemo<CustomerDetailsForm>(
    () => ({
      firstName: firstText(customerInfo?.firstname, customerSnapshot?.firstName),
      lastName: firstText(customerInfo?.lastname, customerSnapshot?.lastName),
      email: firstText(customerInfo?.email, customerSnapshot?.email),
      phone: firstText(customerInfo?.mobile, customerInfo?.phone, customerSnapshot?.phone),
      numberTravelling: firstText(
        bookingInfo?.numbertravelling,
        customerSnapshot?.numberTravelling,
      ),
      dateOfBirth: firstText(customerInfo?.dateofbirth, customerSnapshot?.dateOfBirth),
      licenseNo: firstText(customerInfo?.licenseno, customerSnapshot?.licenseNo),
      licenseIssued: firstText(customerInfo?.licenseissued, customerSnapshot?.licenseIssued),
      licenseExpires: firstText(customerInfo?.licenseexpires, customerSnapshot?.licenseExpires),
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
        const q = match ? Math.max(0, Number(match.qty ?? 0)) : 0;
        optionalFeeQuantities[id] = Number.isFinite(q) ? q : 0;
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
      return {
        id: String(cid || `driver-${i}`),
        customerid: cid,
        firstname: pickRowString(row, 'firstname', 'firstName', 'first_name'),
        lastname: pickRowString(row, 'lastname', 'lastName', 'last_name'),
        dateofbirth: pickRowString(
          row,
          'dateofbirth',
          'dateOfBirth',
          'date_of_birth',
        ),
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
    return {
      docs: documentLinkData.map((d, i) => {
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
          documentLinkId: Number(row.documentlinkid ?? 0),
          seqno: Number(row.seqno ?? 0),
          doctype: String(row.doctype ?? ''),
          storageprovider: String(row.storageprovider ?? ''),
          description: String(row.text ?? '').trim(),
          title: who ? `${baseTitle} (${who})` : baseTitle,
          uploaded: Number(row.isuploaded ?? 0) > 0,
          pendingStore: null,
          notes: String(row.notes ?? '').trim(),
        };
      }),
    };
  }, [documentLinkData]);
  const [uploadForm, setUploadForm] = useState<UploadImagesForm>(initialUploadForm);

  const initialCardForm = useMemo<CollectCardForm>(
    () => ({
      cardNumber: '',
      cardName: `${String(customerInfo?.firstname ?? customerSnapshot?.firstName ?? '').trim()} ${String(customerInfo?.lastname ?? customerSnapshot?.lastName ?? '').trim()}`.trim(),
      expiryMonth: '',
      expiryYear: '',
      cvc: '',
      email: String(customerInfo?.email ?? customerSnapshot?.email ?? '').trim(),
      acceptedTerms: false,
    }),
    [customerInfo, customerSnapshot],
  );
  const [cardForm, setCardForm] = useState<CollectCardForm>(initialCardForm);

  const initialFormsRef = useRef({
    customer: initialCustomerForm,
    booking: initialBookingForm,
    drivers: initialDriversForm,
    upload: initialUploadForm,
    card: initialCardForm,
  });
  initialFormsRef.current = {
    customer: initialCustomerForm,
    booking: initialBookingForm,
    drivers: initialDriversForm,
    upload: initialUploadForm,
    card: initialCardForm,
  };

  // Re-hydrate when booking context OR fetched workflow payload changes.
  const hydrationKey = [
    firstText(reservationRef, bookingInfo?.reservationref),
    firstText(snapshot?.bookingId),
    String(normalizedWorkflow.list.length),
    String(normalizedWorkflow.bookinginfo.length),
    String(normalizedWorkflow.customerinfo.length),
    String(normalizedWorkflow.optionalfees.length),
    String(normalizedWorkflow.insuranceoptions.length),
    String(extraFeesRaw.length),
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
    setCardForm(f.card);
    setCompletedSteps({});
    setOpenCard('reservation');
  }, [hydrationKey]);

  const markSaved = (id: (typeof stepOrder)[number]) => {
    setCompletedSteps((prev) => ({ ...prev, [id]: true }));
    const idx = stepOrder.indexOf(id);
    const next = stepOrder[idx + 1];
    if (next) setOpenCard(next);
  };

  const saveBookingStep = async () => {
    setSavingStep('booking');
    try {
      await editBookingBasics({
        booking_id: firstText(snapshot?.bookingId, bookingInfo?.booking_id),
        reservation_ref: firstText(
          reservationRef,
          bookingInfo?.reservationref,
        ),
        customer_details: {},
        insurance_id: Number(bookingForm.selectedInsurance) || 0,
        number_of_persons: Number(customerForm.numberTravelling) || 0,
      });
      toast.success('Booking details saved');
      markSaved('booking');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save booking details');
    } finally {
      setSavingStep(null);
    }
  };

  const saveCustomerStep = async () => {
    setSavingStep('customer');
    try {
      await editBookingBasics({
        booking_id: firstText(snapshot?.bookingId, bookingInfo?.booking_id),
        reservation_ref: firstText(reservationRef, bookingInfo?.reservationref),
        customer_details: {
          first_name: customerForm.firstName,
          last_name: customerForm.lastName,
          email: customerForm.email,
          phone: customerForm.phone,
          address: customerForm.address,
          city: customerForm.city,
          state: customerForm.state,
          postcode: customerForm.postcode,
          dateofbirth: customerForm.dateOfBirth,
          licenseno: customerForm.licenseNo,
          licenseissued: customerForm.licenseIssued,
          licenseexpires: customerForm.licenseExpires,
          country: customerForm.country,
        },
        insurance_id: Number(bookingForm.selectedInsurance || 0),
        number_of_persons: Number(customerForm.numberTravelling || 0),
      });
      markSaved('customer');
    } finally {
      setSavingStep(null);
    }
  };

  const saveExtraDriversStep = async () => {
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
          d.email.trim(),
      );

      for (const d of driversToSave) {
        await addExtraDriver({
          reservation_ref: reservationRefValue,
          customerid: Number(d.customerid || 0),
          customer: {
            firstname: d.firstname.trim() || 'Driver',
            lastname: d.lastname.trim() || 'User',
            dateofbirth: d.dateofbirth.trim() || '01/Jan/1980',
            licenseno: d.licenseno.trim(),
            email: d.email.trim() || ownerEmail,
            state: d.state.trim() || ownerState,
            city: d.city.trim() || ownerCity,
            postcode: d.postcode.trim() || ownerPostcode,
            address: d.address.trim() || ownerAddress,
          },
        });
      }

      for (const removedId of driversForm.removedCustomerIds) {
        await addExtraDriver({
          reservation_ref: reservationRefValue,
          customerid: -Math.abs(Number(removedId)),
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

      toast.success('Extra drivers saved');
      markSaved('drivers');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save extra drivers');
    } finally {
      setSavingStep(null);
    }
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
      toast.error(e instanceof Error ? e.message : 'Could not upload file');
    }
  };

  const saveUploadImagesStep = async () => {
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
        const storeRes = await storeRcmDocument({
          reservation_ref: reservationRefValue,
          url: p.url,
          documentlinksetupid: doc.documentLinkSetupId,
          customer_id: doc.customerId,
          vehicle_id: 0,
          description: doc.description,
          doctype: doc.doctype || '',
          source: 'web',
          originalname: p.originalname,
          storageprovider: doc.storageprovider || '',
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
      markSaved('images');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save documents');
    } finally {
      setSavingStep(null);
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
    const linkId = Number(doc.documentLinkId ?? 0);
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
        document_link_id: -Math.abs(linkId),
      });
      setUploadForm((prev) => ({
        docs: prev.docs.map((d) =>
          d.id === id
            ? { ...d, uploaded: false, isUploading: false, documentLinkId: 0 }
            : d,
        ),
      }));
      toast.success('Document deleted');
    } catch (e) {
      setUploadForm((prev) => ({
        docs: prev.docs.map((d) => (d.id === id ? { ...d, isUploading: false } : d)),
      }));
      toast.error(e instanceof Error ? e.message : 'Could not delete document');
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
    const carImage = workflowCarImage || String(snapshot?.carImage ?? '').trim();
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
        String(bookingInfo?.vehicledescription1 ?? snapshot?.carSubtitle ?? '').trim() || '—',
      pickupDate:
        [bookingInfo?.pickupdate, bookingInfo?.pickuptime].filter(Boolean).join(' ').trim() ||
        String(snapshot?.pickupDate ?? '').trim() ||
        '—',
      pickupLocation: pickupLocation || String(snapshot?.pickupLocation ?? '').trim() || '—',
      returnDate:
        [bookingInfo?.dropoffdate, bookingInfo?.dropofftime].filter(Boolean).join(' ').trim() ||
        String(snapshot?.returnDate ?? '').trim() ||
        '—',
      returnLocation: returnLocation || String(snapshot?.returnLocation ?? '').trim() || '—',
    };
  }, [bookingInfo, reservationRef, snapshot]);

  return (
    <div className="flex flex-col h-full min-h-screen pb-[300px] lg:pb-10 relative px-4 pt-0 lg:px-0">
      {/* Header */}
      {/*  <div className="flex items-center mb-6 pt-2">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 -ml-2 text-black hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="flex-1 text-center font-extrabold text-[18px] sm:text-[20px] text-black pr-8">
          Express Check-in
        </h1>
      </div> */}

      <div className="flex-1 w-full mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 ">

        {/* Small Grid: Reservation Details & Fee Summary (Right side on desktop, top on mobile) */}
        <div className="col-span-1 flex flex-col lg:order-last">

          {/* Mapped to BookingOverview's place */}
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

          {/* Desktop Summary Placeholder (matches options layout) */}
          <div className="bg-white rounded-[16px] border border-gray-100 shadow-sm p-4 hidden lg:flex flex-col mt-2">
            <RentalFeeSummary
              days={6}
              dailyRate={43.0}
              totalExtras={10.0}
              gstAmount={12.0}
            >
              {actionButtons}
            </RentalFeeSummary>
          </div>
        </div>

        {/* Large Grid: The rest of the collapsible cards (Left side on desktop, below on mobile) */}
        <div className="col-span-1 lg:col-span-2 flex flex-col h-full">

          <CollapsibleCard
            title={stepName(steps, 'customerdetails', 'CUSTOMER DETAILS')}
            isOpen={openCard === 'customer'}
            onToggle={() => toggleCard('customer')}
          >
            <CustomerDetailsCard
              value={customerForm}
              onChange={(patch) => setCustomerForm((prev) => ({ ...prev, ...patch }))}
            />
            <div className="flex gap-2 mt-4">
              <Button
                onClick={() => void saveCustomerStep()}
                disabled={savingStep === 'customer'}
                className="bg-[#ffc107] text-black"
              >
                {savingStep === 'customer' ? 'Saving...' : 'Save'}
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
                disabled={savingStep === 'booking'}
                className="bg-[#ffc107] text-black"
              >
                {savingStep === 'booking' ? 'Saving…' : 'Save'}
              </Button>
              <Button variant="outline" onClick={() => setBookingForm(initialBookingForm)}>
                Cancel
              </Button>
            </div>
          </CollapsibleCard>

          <CollapsibleCard
            title={stepName(steps, 'extradrivers', 'EXTRA DRIVERS')}
            isOpen={openCard === 'drivers'}
            onToggle={() => toggleCard('drivers')}
          >
            <ExtraDriversCard value={driversForm} onChange={setDriversForm} />
            <div className="flex gap-2 mt-4">
              <Button
                onClick={() => void saveExtraDriversStep()}
                disabled={savingStep === 'drivers'}
                className="bg-[#ffc107] text-black"
              >
                {savingStep === 'drivers' ? 'Saving...' : 'Save'}
              </Button>
              <Button variant="outline" onClick={() => setDriversForm(initialDriversForm)}>
                Cancel
              </Button>
            </div>
          </CollapsibleCard>

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
                disabled={savingStep === 'images'}
                className="bg-[#ffc107] text-black"
              >
                {savingStep === 'images' ? 'Saving…' : 'Save'}
              </Button>
              <Button variant="outline" onClick={() => setUploadForm(initialUploadForm)}>
                Cancel
              </Button>
            </div>
          </CollapsibleCard>

          <CollapsibleCard
            title={stepName(steps, 'createdpspaymentmethod', 'COLLECT CARD DETAIL')}
            isOpen={openCard === 'creditcard'}
            onToggle={() => toggleCard('creditcard')}
          >
            <CollectCardDetailCard
              value={cardForm}
              onChange={(patch) => setCardForm((prev) => ({ ...prev, ...patch }))}
            />
            <div className="flex gap-2 mt-4">
              <Button onClick={() => markSaved('creditcard')} className="bg-[#ffc107] text-black">
                Save
              </Button>
              <Button variant="outline" onClick={() => setCardForm(initialCardForm)}>
                Cancel
              </Button>
            </div>
          </CollapsibleCard>

        </div>
      </div>

      {/* Mobile Sticky Bottom Sheet */}
      <div className="lg:hidden">
        <RentalFeeSummaryBottomSheet
          days={6}
          dailyRate={43.0}
          totalExtras={10.0}
          totalCost={280.0}
          gstAmount={12.0}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}

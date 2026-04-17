import { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { updateBooking, type BookingDetailView } from '@/services/bookings';
import { getFriendlyError } from '@/utils/api-error-handler';

type GenericRecord = Record<string, unknown>;

interface RequestExtensionContext {
  view: BookingDetailView | null;
  detailData?: GenericRecord | null;
}

interface RequestExtensionModalProps {
  trigger: React.ReactNode;
  context: RequestExtensionContext;
  onUpdated?: () => Promise<void> | void;
}

function asRecord(v: unknown): GenericRecord | null {
  return v && typeof v === 'object' ? (v as GenericRecord) : null;
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function pickFirst(...vals: unknown[]): string {
  for (const v of vals) {
    const s = String(v ?? '').trim();
    if (s) return s;
  }
  return '';
}

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function toDateAndTime(value: unknown): { date: string; time: string } {
  const raw = String(value ?? '').trim();
  if (!raw) return { date: '', time: '' };

  const normalized = raw.replace('T', ' ');
  const match = normalized.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/);
  if (match) {
    return { date: match[1], time: match[2] };
  }

  const parsed = new Date(raw);
  if (Number.isFinite(parsed.getTime())) {
    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const dd = String(parsed.getDate()).padStart(2, '0');
    const hh = String(parsed.getHours()).padStart(2, '0');
    const min = String(parsed.getMinutes()).padStart(2, '0');
    return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${min}` };
  }

  return { date: '', time: '' };
}

function toApiDateTime(date: string, time: string): string {
  return `${date} ${time}`;
}

export function RequestExtensionModal({
  trigger,
  context,
  onUpdated,
}: RequestExtensionModalProps) {
  const [open, setOpen] = useState(false);
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const detailData = context.detailData ?? null;
  const bookingInfo = useMemo(() => {
    const rcm = asRecord(detailData?.rcm_booking_info);
    return asRecord(asArray(rcm?.bookinginfo)[0]);
  }, [detailData]);

  const customerInfo = useMemo(() => {
    const rcm = asRecord(detailData?.rcm_booking_info);
    return asRecord(asArray(rcm?.customerinfo)[0]);
  }, [detailData]);

  const customerDetails = useMemo(() => asRecord(detailData?.customer_details), [detailData]);
  const optionalFees = useMemo(() => {
    const rcm = asRecord(detailData?.rcm_booking_info);
    const rows = asArray(rcm?.optionalfees);
    return rows
      .map((row) => asRecord(row))
      .filter((row): row is GenericRecord => Boolean(row))
      .map((row) => ({
        id: num(row.id ?? row.optionalfeeid),
        qty: num(row.qty ?? row.quantity ?? 1, 1),
      }))
      .filter((row) => row.id > 0);
  }, [detailData]);

  const pickupDateTime = useMemo(
    () =>
      pickFirst(
        bookingInfo?.pickupdatetime,
        detailData?.pickup_datetime,
        detailData?.pickupdatetime,
      ),
    [bookingInfo, detailData],
  );
  const dropoffDateTime = useMemo(
    () =>
      pickFirst(
        bookingInfo?.dropoffdatetime,
        detailData?.dropoff_datetime,
        detailData?.dropoffdatetime,
      ),
    [bookingInfo, detailData],
  );

  const pickupDateTimeInput = useMemo(
    () => toDateAndTime(pickupDateTime),
    [pickupDateTime],
  );
  const dropoffDateTimeInput = useMemo(
    () => toDateAndTime(dropoffDateTime),
    [dropoffDateTime],
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          const parsedPickup = pickupDateTimeInput;
          const parsed = dropoffDateTimeInput;
          setPickupDate(parsedPickup.date);
          setPickupTime(parsedPickup.time);
          setNewDate(parsed.date);
          setNewTime(parsed.time);
          setSubmitError(null);
          setValidationErrors([]);
          setSuccessMessage(null);
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent 
        showCloseButton={false}
        className="max-w-md p-0 flex flex-col gap-0 border-0 bg-[#f8f9fc] sm:rounded-[24px] overflow-hidden sm:max-h-[85vh] h-[100dvh] sm:h-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-center p-4 sm:p-5 relative bg-white sticky top-0 z-10">
          <button 
            className="absolute left-4 p-2 cursor-pointer hover:bg-gray-50 rounded-full"
            onClick={() => setOpen(false)}
          >
            <ArrowLeft size={24} className="text-black" />
          </button>
          <DialogTitle className="text-[18px] font-extrabold text-black tracking-tight">
            Request Extension
          </DialogTitle>
        </div>
        <DialogDescription className="sr-only">
          Request a booking extension. Review the details and submit your request.
        </DialogDescription>

        {/* Scrollable Content Range */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col items-center">
          
          {/* Main Card */}
          <div className="bg-white rounded-[16px] w-full border border-gray-100 shadow-sm flex flex-col overflow-hidden mb-8">
            
            {/* Top Car Info */}
            <div className="p-4 sm:p-5 flex gap-4 border-b border-gray-50">
              <div className="w-[110px] h-[75px] shrink-0 bg-[#f8f9fc] rounded-[10px] flex items-center justify-center p-1.5">
                <img 
                  src={context.view?.carImage || 'https://cdn.pixabay.com/photo/2012/05/29/00/43/car-49278_1280.jpg'}
                  alt={context.view?.carName || 'Vehicle'} 
                  className="w-full h-full object-contain mix-blend-multiply" 
                />
              </div>
              <div className="flex flex-col justify-center gap-0.5">
                <span className="text-[#6b7280] text-[13px]">Reservation Number:</span>
                <span className="font-bold text-[#0061e0] text-[15px]">
                  {context.view?.referenceKey || '—'}
                </span>
                <h3 className="text-black font-extrabold text-[14px] mt-1">
                  {context.view?.carName || 'Vehicle'}
                </h3>
                <p className="text-[#6b7280] text-[12px]">{context.view?.carSpecs || '—'}</p>
              </div>
            </div>

            {/* Middle Grid Pick/Return */}
            <div className="grid grid-cols-2 border-b border-gray-50">
              <div className="p-4 sm:p-5 flex flex-col gap-1 border-r border-gray-50">
                <span className="text-[#6b7280] text-[13px]">Pickup:</span>
                <span className="text-black font-extrabold text-[13px]">
                  {context.view?.pickupWhen || '—'}
                </span>
                <span className="text-[#6b7280] text-[13px] leading-tight mt-0.5">
                  {context.view?.pickupWhereName || '—'}
                  {context.view?.pickupWhereAddress ? <><br />{context.view.pickupWhereAddress}</> : null}
                </span>
              </div>
              <div className="p-4 sm:p-5 flex flex-col gap-1">
                <span className="text-[#6b7280] text-[13px]">Return:</span>
                <span className="text-black font-extrabold text-[13px]">
                  {context.view?.returnWhen || '—'}
                </span>
                <span className="text-[#6b7280] text-[13px] leading-tight mt-0.5">
                  {context.view?.returnWhereName || '—'}
                  {context.view?.returnWhereAddress ? <><br />{context.view.returnWhereAddress}</> : null}
                </span>
              </div>
            </div>

            {/* Bottom Form Fields */}
            <div className="p-4 sm:p-5 flex flex-col gap-3 pb-6">
              <span className="text-[12px] font-bold text-black tracking-wide uppercase">PICKUP DATE & TIME</span>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className="h-[48px] bg-[#f8f9fc] rounded-[10px] px-4 text-[14px] font-semibold text-black outline-none border border-transparent focus:border-[#0061e0]"
                />
                <input
                  type="time"
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  className="h-[48px] bg-[#f8f9fc] rounded-[10px] px-4 text-[14px] font-semibold text-black outline-none border border-transparent focus:border-[#0061e0]"
                />
              </div>
              <span className="text-[12px] font-bold text-black tracking-wide uppercase mt-2">RETURN DATE & TIME</span>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="h-[48px] bg-[#f8f9fc] rounded-[10px] px-4 text-[14px] font-semibold text-black outline-none border border-transparent focus:border-[#0061e0]"
                />
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="h-[48px] bg-[#f8f9fc] rounded-[10px] px-4 text-[14px] font-semibold text-black outline-none border border-transparent focus:border-[#0061e0]"
                />
              </div>
              {submitError ? (
                <p className="text-[12px] text-destructive mt-1">{submitError}</p>
              ) : null}
              {validationErrors.length ? (
                <div className="rounded-md border border-destructive/20 bg-destructive/5 p-2">
                  {validationErrors.map((msg, idx) => (
                    <p key={`${msg}-${idx}`} className="text-[12px] text-destructive">
                      {msg}
                    </p>
                  ))}
                </div>
              ) : null}
              {successMessage ? (
                <p className="text-[12px] text-emerald-600 mt-1">{successMessage}</p>
              ) : null}
            </div>
            
          </div>

          {/* Action Buttons */}
          <div className="w-full flex flex-col items-center gap-4 mt-auto sm:mt-0">
            <Button 
              className="w-full bg-[#ffb700] hover:bg-[#e5a400] text-black font-bold h-[52px] rounded-[26px] text-[16px]"
              disabled={submitting}
              onClick={async () => {
                setSubmitError(null);
                setValidationErrors([]);
                setSuccessMessage(null);

                if (!context.view?.referenceKey?.trim()) {
                  setSubmitError('Reservation reference is required.');
                  return;
                }
                if (!pickupDate || !pickupTime || !newDate || !newTime) {
                  setSubmitError('Please select pickup and return date/time.');
                  return;
                }
                const newDropoff = toApiDateTime(newDate, newTime);
                const newPickup = toApiDateTime(pickupDate, pickupTime);
                const requestedDropoffDate = new Date(`${newDate}T${newTime}`);
                const requestedPickupDate = new Date(`${pickupDate}T${pickupTime}`);
                if (requestedDropoffDate <= requestedPickupDate) {
                  setSubmitError('Return time must be later than pickup time.');
                  return;
                }

                const customerFirstName = pickFirst(
                  customerInfo?.firstname,
                  customerDetails?.first_name,
                  context.view.customerFirstName,
                );
                const customerLastName = pickFirst(
                  customerInfo?.lastname,
                  customerDetails?.last_name,
                  context.view.customerLastName,
                );
                const customerEmail = pickFirst(
                  customerInfo?.email,
                  customerDetails?.email,
                  context.view.customerEmail,
                );
                const customerState = pickFirst(customerInfo?.state, context.view.customerState);
                const customerCity = pickFirst(customerInfo?.city, context.view.customerCity);
                const customerPostcode = pickFirst(
                  customerInfo?.postcode,
                  customerDetails?.postcode,
                  context.view.customerPostcode,
                );
                const customerAddress = pickFirst(
                  customerInfo?.address,
                  customerInfo?.fulladdress,
                  customerDetails?.address,
                  context.view.customerAddress,
                );
                const payload = {
                  reservation_ref: context.view.referenceKey.trim(),
                  bookingtype: num(bookingInfo?.bookingtype ?? context.view.bookingType, 2),
                  pickuplocationid: num(
                    bookingInfo?.pickuplocationid ??
                      bookingInfo?.pickup_location_id ??
                      context.view.pickupLocationId,
                    0,
                  ),
                  pickupdatetime: newPickup,
                  dropofflocationid: num(
                    bookingInfo?.dropofflocationid ?? bookingInfo?.dropoff_location_id,
                    0,
                  ),
                  dropoffdatetime: newDropoff,
                  vehiclecategoryid: num(
                    bookingInfo?.vehiclecategoryid ??
                      detailData?.category_id ??
                      detailData?.vehicle_id,
                    0,
                  ),
                  driverageid: num(bookingInfo?.driverageid ?? bookingInfo?.driver_age_id, 0),
                  insuranceid: num(bookingInfo?.insuranceid ?? bookingInfo?.insurance_id, 0),
                  extrakmsid: num(bookingInfo?.extrakmsid ?? bookingInfo?.extrakms_id, 0),
                  transmission: num(
                    bookingInfo?.transmission ??
                      bookingInfo?.transmissionid ??
                      context.view.transmission,
                    0,
                  ),
                  customer: {
                    customerid: num(
                      customerInfo?.customerid ?? customerInfo?.id ?? context.view.customerId,
                      0,
                    ),
                    firstname: customerFirstName,
                    lastname: customerLastName,
                    dateofbirth: pickFirst(customerInfo?.dateofbirth, context.view.customerDateOfBirth),
                    licenseno: pickFirst(
                      customerInfo?.licenseno,
                      context.view.customerLicenseNo,
                    ),
                    email: customerEmail,
                    state: customerState,
                    city: customerCity,
                    postcode: customerPostcode,
                    address: customerAddress,
                  },
                  referralid: num(bookingInfo?.referralid, 0),
                  remark: pickFirst(bookingInfo?.remark),
                  numbertravelling: num(bookingInfo?.numbertravelling ?? context.view.numberTravelling, 0),
                  flightin: pickFirst(bookingInfo?.flightin),
                  flightout: pickFirst(bookingInfo?.flightout),
                  arrivalpoint: pickFirst(bookingInfo?.arrivalpoint),
                  departurepoint: pickFirst(bookingInfo?.departurepoint),
                  areaofuseid: num(bookingInfo?.areaofuseid, 0),
                  newsletter: Boolean(bookingInfo?.newsletter),
                  agentcode: pickFirst(bookingInfo?.agentcode),
                  agentname: pickFirst(bookingInfo?.agentname),
                  agentemail: pickFirst(bookingInfo?.agentemail),
                  agentrefno: pickFirst(bookingInfo?.agentrefno),
                  agentcollectedrecalcmode: pickFirst(bookingInfo?.agentcollectedrecalcmode),
                  optionalfees: optionalFees,
                };

                try {
                  setSubmitting(true);
                  const result = await updateBooking(payload);
                  const resultData = asRecord(result.data);
                  const validationErrorDetails = asArray(resultData?.validation_error_details)
                    .map((item) => String(item ?? '').trim())
                    .filter(Boolean);
                  if (validationErrorDetails.length) {
                    setValidationErrors(validationErrorDetails);
                    setSubmitError('Please fix the validation errors to continue.');
                    return;
                  }

                  setSuccessMessage(
                    pickFirst(result.message, 'Extension request updated successfully.'),
                  );
                  if (onUpdated) {
                    await onUpdated();
                  }
                  setTimeout(() => setOpen(false), 1000);
                } catch (e) {
                  setSubmitError(getFriendlyError(e, 'Could not submit extension request.'));
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {submitting ? 'Submitting...' : 'Submit Extend Request'}
            </Button>
            
            <button 
              className="text-[#6b7280] font-medium text-[15px] p-2 hover:text-black transition-colors"
              onClick={() => setOpen(false)}
            >
              Go Back
            </button>
          </div>
          
        </div>
      </DialogContent>
    </Dialog>
  );
}

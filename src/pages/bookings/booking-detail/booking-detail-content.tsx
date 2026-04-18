import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { RequestExtensionModal } from './components/request-extension-modal';
import { SupportIssueModal } from '@/partials/topbar/support-issue-modal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  fetchBookingByReference,
  fetchWorkflowChecklist,
  mapBookingDetailToView,
  openBookingReceipt,
  type BookingDetailView,
} from '@/services/bookings';
import { getFriendlyError } from '@/utils/api-error-handler';
import { normalizeMediaUrl } from '@/lib/helpers';
import { queryKeys } from '@/lib/query-keys';

function statusStyle(label: string): { dot: string; text: string } {
  const s = label.toLowerCase();
  if (s.includes('cancel')) {
    return { dot: 'bg-red-500', text: 'text-red-600' };
  }
  if (s.includes('complete') || s.includes('closed')) {
    return { dot: 'bg-emerald-500', text: 'text-emerald-600' };
  }
  if (s.includes('allocat')) {
    return { dot: 'bg-[#00a651]', text: 'text-[#00a651]' };
  }
  return { dot: 'bg-amber-500', text: 'text-amber-600' };
}

function formatMoney(sym: string, n: number) {
  return `${sym}${n.toFixed(2)}`;
}

function BookingReceiptButton({
  receiptApiUrl,
  documentsBaseUrl,
}: {
  receiptApiUrl: string;
  documentsBaseUrl: string;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="mt-2">
      <button
        type="button"
        disabled={loading}
        onClick={() => {
          setErr(null);
          setLoading(true);
          void openBookingReceipt(receiptApiUrl, {
            documentsBaseUrl: documentsBaseUrl || undefined,
          })
            .catch((e) => {
              setErr(e instanceof Error ? e.message : 'Could not open receipt');
            })
            .finally(() => setLoading(false));
        }}
        className="text-[14px] font-medium text-[#0061e0] hover:underline disabled:opacity-60 disabled:pointer-events-none bg-transparent border-0 p-0 cursor-pointer text-start"
      >
        {loading ? 'Opening receipt…' : 'View receipt / invoice'}
      </button>
      {err ? (
        <p className="text-[12px] text-destructive mt-1">{err}</p>
      ) : null}
    </div>
  );
}

function RentalFeeSummaryBlock({
  view,
  compact,
  onExpressCheckin,
  onSignAgreement,
  isLaunchingCheckin,
  isExpanded,
  isMobile,
}: {
  view: BookingDetailView;
  compact?: boolean;
  onExpressCheckin: () => void;
  onSignAgreement: () => void;
  isLaunchingCheckin?: boolean;
  isExpanded?: boolean;
  isMobile?: boolean;
}) {
  const textSize = compact ? 'text-[14px]' : 'text-[15px]';
  const titleSize = compact ? 'text-[14px]' : 'text-[15px]';
  const sym = view.currencySymbol;

  return (
    <>
      <div className={`${isMobile && !isExpanded ? 'hidden' : 'flex flex-col'} ${compact ? 'gap-2' : 'gap-3'}`}>
        <h3
          className={`${titleSize} font-bold text-[#6b7280] tracking-wide ${compact ? 'mb-3' : 'mb-4'}`}
        >
          RENTAL FEE SUMMARY
        </h3>

        {view.summaryLines.length ? (
          view.summaryLines.map((line, i) => (
            <div
              key={`${line.label}-${i}`}
              className="flex justify-between items-start gap-3"
            >
              <span className={`${textSize} text-black`}>
                {line.label}
                {line.sublabel ? (
                  <span className="block text-[12px] text-[#6b7280] font-normal mt-0.5">
                    {line.sublabel}
                  </span>
                ) : null}
              </span>
              <span className={`${textSize} font-bold text-black shrink-0`}>
                {formatMoney(sym, line.amount)}
              </span>
            </div>
          ))
        ) : (
          <p className={`${textSize} text-[#6b7280]`}>No line items returned.</p>
        )}
      </div>

      <div
        className={`${compact ? 'mt-3 pt-3' : 'mt-4 pt-4'} border-t border-gray-100 flex flex-col gap-1`}
      >
        <div className="flex justify-between items-center">
          <span className={`${textSize} font-medium text-[#0061e0]`}>
            Total cost
          </span>
          <span
            className={`${compact ? 'text-[15px]' : 'text-[16px]'} font-bold text-[#0061e0]`}
          >
            {formatMoney(sym, view.totalCost)}
          </span>
        </div>
        {view.balanceDue !== view.totalCost ? (
          <div className="flex justify-between items-center">
            <span className={`${textSize} text-[#6b7280]`}>Balance due</span>
            <span className={`${textSize} font-semibold text-black`}>
              {formatMoney(sym, view.balanceDue)}
            </span>
          </div>
        ) : null}
        {view.gstAmount != null && view.gstAmount > 0 ? (
          <div className="flex justify-end">
            <span className="text-[13px] text-[#6b7280]">
              {view.gstInclusive
                ? `(Inc. GST: ${formatMoney(sym, view.gstAmount)})`
                : `(GST: ${formatMoney(sym, view.gstAmount)})`}
            </span>
          </div>
        ) : null}
        {view.receiptUrl ? (
          <BookingReceiptButton
            receiptApiUrl={view.receiptUrl}
            documentsBaseUrl={view.documentsBaseUrl}
          />
        ) : null}
      </div>

      <div className="flex flex-row gap-2">
        <Button
          onClick={onExpressCheckin}
          disabled={view.expressCheckinCompleted || isLaunchingCheckin}
          className="w-full mt-5 bg-[#ffb700] hover:bg-[#e5a400] text-black font-extrabold h-[48px] rounded-[8px] text-[16px] disabled:opacity-60"
        >
          {view.expressCheckinCompleted
            ? 'Express check-in done'
            : isLaunchingCheckin
              ? 'Opening...'
              : 'Express Check-in'}
        </Button>
        <Button
          onClick={onSignAgreement}
          disabled={view.agreementSigned}
          className="w-full mt-5 bg-[#0061e0] hover:bg-[#0052cc] text-white font-extrabold h-[48px] rounded-[8px] text-[16px] disabled:opacity-60"
        >
          {view.agreementSigned ? 'Agreement signed' : 'Sign Agreement'}
        </Button>
      </div>
    </>
  );
}

function PricingRowsSection({
  title,
  rows,
  sym,
  emptyText,
}: {
  title: string;
  rows: { label: string; sublabel?: string; amount: number }[];
  sym: string;
  emptyText: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[14px] font-bold text-[#6b7280] tracking-wide px-1">
        {title}
      </span>
      {rows.length ? (
        rows.map((row, i) => (
          <div
            key={`${row.label}-${i}`}
            className="bg-white rounded-[12px] border border-gray-100 shadow-sm p-4 sm:p-5 flex justify-between items-start gap-3"
          >
            <span className="text-black text-[15px]">
              {row.label}
              {row.sublabel ? (
                <span className="block text-[13px] text-[#6b7280] font-normal mt-1">
                  {row.sublabel}
                </span>
              ) : null}
            </span>
            <span className="font-bold text-black text-[15px] shrink-0">
              {formatMoney(sym, row.amount)}
            </span>
          </div>
        ))
      ) : (
        <div className="bg-white rounded-[12px] border border-gray-100 shadow-sm p-4 sm:p-5 text-[15px] text-[#6b7280]">
          {emptyText}
        </div>
      )}
    </div>
  );
}

export function BookingDetailContent() {
  const navigate = useNavigate();
  const { id: referenceParam } = useParams<{ id: string }>();
  const reference = referenceParam ? decodeURIComponent(referenceParam) : '';

  const [view, setView] = useState<BookingDetailView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [launchingCheckin, setLaunchingCheckin] = useState(false);
  const [checkinError, setCheckinError] = useState<string | null>(null);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);

  const queryClient = useQueryClient();
  const cachedData = queryClient.getQueryData(
    queryKeys.bookingsDetail(reference),
  ) as { data?: unknown } | undefined;

  useEffect(() => {
    if (!reference.trim()) {
      setError('Missing booking reference.');
      setView(null);
      return;
    }
    if (cachedData?.data && typeof cachedData.data === 'object') {
      setView(mapBookingDetailToView(cachedData.data as Record<string, unknown>));
    }
  }, [reference, cachedData]);

  const bookingQuery = useQuery({
    queryKey: queryKeys.bookingsDetail(reference),
    enabled: Boolean(reference.trim()),
    queryFn: () => fetchBookingByReference(reference),
  });

  useEffect(() => {
    if (!bookingQuery.error) return;
    setView(null);
    setError(getFriendlyError(bookingQuery.error, 'Could not load booking details.'));
  }, [bookingQuery.error]);

  useEffect(() => {
    const data = bookingQuery.data?.data;
    if (!data || typeof data !== 'object') return;
    setError(null);
    setView(mapBookingDetailToView(data as Record<string, unknown>));
  }, [bookingQuery.data]);

  const loading = bookingQuery.isLoading && !view;

  const { dot, text } = view ? statusStyle(view.bookingStatus) : statusStyle('');

  const handleExpressCheckin = async () => {
    if (!view?.referenceKey?.trim()) {
      setCheckinError('Booking reference is missing for express check-in.');
      return;
    }
    setCheckinError(null);
    setLaunchingCheckin(true);
    try {
      const workflow = await fetchWorkflowChecklist(view.referenceKey, 'checkin');
      navigate(`/express-checkin?reservation_ref=${encodeURIComponent(view.referenceKey)}`, {
        state: {
          reservationRef: view.referenceKey,
          workflowChecklist: workflow.data ?? null,
          bookingSnapshot: {
            bookingId: view.bookingId,
            reservationNumber: view.confirmationLabel,
            carImage: view.carImage,
            carTitle: view.carName,
            carSubtitle: view.carSpecs,
            pickupDate: view.pickupWhen,
            pickupLocation: [view.pickupWhereName, view.pickupWhereAddress]
              .filter(Boolean)
              .join(' '),
            returnDate: view.returnWhen,
            returnLocation: [view.returnWhereName, view.returnWhereAddress]
              .filter(Boolean)
              .join(' '),
            pickupLocationId: view.pickupLocationId,
            bookingType: view.bookingType,
            transmission: view.transmission,
            customerId: view.customerId,
          },
          customerSnapshot: {
            firstName: view.customerFirstName,
            lastName: view.customerLastName,
            email: view.customerEmail,
            phone: view.customerPhone,
            dateOfBirth: view.customerDateOfBirth,
            licenseNo: view.customerLicenseNo,
            licenseIssued: view.customerLicenseIssued,
            licenseExpires: view.customerLicenseExpires,
            address: view.customerAddress,
            city: view.customerCity,
            state: view.customerState,
            country: view.customerCountry,
            postcode: view.customerPostcode,
            numberTravelling: view.numberTravelling,
          },
        },
      });
    } catch (e) {
      setCheckinError(
        e instanceof Error
          ? e.message
          : 'Could not start express check-in at the moment.',
      );
    } finally {
      setLaunchingCheckin(false);
    }
  };

  return (
    <div className="flex flex-col h-full pb-[250px] relative lg:pb-12">
      <div className="flex items-center justify-between px-6 py-4 bg-white sticky top-0 z-10 ">
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="p-2 cursor-pointer hover:bg-gray-50 rounded-full -ml-2"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={24} className="text-black" />
          </button>
        </div>
        <h1 className="text-[18px] font-extrabold text-black">Booking Details</h1>
        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="font-semibold text-[#0061e0] text-[15px] hover:underline cursor-pointer bg-transparent border-0 p-0"
              >
                Self Service
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[260px] p-2 rounded-[16px]">
              <DropdownMenuItem
                className="py-4 px-4 focus:bg-gray-50 cursor-pointer rounded-[8px]"
                onSelect={() => window.open('https://shuttle.northsiderentals.com.au/', '_blank')}
              >
                <span
                  className="text-[18px] text-black tracking-tight"
                  style={{
                    textDecoration: 'underline',
                    textDecorationThickness: '1.5px',
                    textUnderlineOffset: '4px',
                  }}
                >
                  Book Airport Shuttle
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="py-4 px-4 focus:bg-gray-50 cursor-pointer rounded-[8px]"
                onSelect={() => window.open('https://ptv.northsiderentals.com.au/', '_blank')}
              >
                <span className="text-[18px] text-black tracking-tight">
                  Book PTV Inspection
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="py-4 px-4 focus:bg-gray-50 cursor-pointer rounded-[8px]"
                onSelect={() => window.open('https://servicing.northsiderentals.com.au/', '_blank')}
              >
                <span
                  className="text-[18px] text-black tracking-tight"
                  style={{
                    textDecoration: 'underline',
                    textDecorationThickness: '1.5px',
                    textUnderlineOffset: '4px',
                  }}
                >
                  Book A Service
                </span>
              </DropdownMenuItem>
              <RequestExtensionModal
                context={{
                  view,
                  detailData:
                    bookingQuery.data?.data && typeof bookingQuery.data.data === 'object'
                      ? (bookingQuery.data.data as Record<string, unknown>)
                      : null,
                }}
                onUpdated={async () => {
                  await Promise.all([
                    bookingQuery.refetch(),
                    queryClient.invalidateQueries({ queryKey: ['bookings', 'list'] }),
                  ]);
                }}
                trigger={
                  <DropdownMenuItem
                    className="py-4 px-4 focus:bg-gray-50 cursor-pointer rounded-[8px]"
                    onSelect={(e) => e.preventDefault()}
                  >
                    <span className="text-[18px] text-black tracking-tight">
                      Request Extension
                    </span>
                  </DropdownMenuItem>
                }
              />
              <SupportIssueModal
                defaultReservationRef={view?.referenceKey?.trim() || ''}
              >
                <DropdownMenuItem
                  className="py-4 px-4 focus:bg-gray-50 cursor-pointer rounded-[8px]"
                  onSelect={(e) => e.preventDefault()}
                >
                  <span className="text-[18px] text-black tracking-tight">
                    Contact support
                  </span>
                </DropdownMenuItem>
              </SupportIssueModal>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
          <Loader2 className="size-10 animate-spin text-[#0061e0]" />
          <p className="text-sm">Loading booking…</p>
        </div>
      ) : null}

      {error && !loading ? (
        <div className="mx-6 mt-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="size-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Could not load this booking</p>
            <p className="text-destructive/90 mt-1">{error}</p>
          </div>
        </div>
      ) : null}

      {checkinError && !loading ? (
        <div className="mx-6 mt-4 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="size-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Express check-in unavailable</p>
            <p className="text-destructive/90 mt-1">{checkinError}</p>
          </div>
        </div>
      ) : null}

      {!loading && !error && view ? (
        <div className="flex-1 w-full mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6 px-4 sm:px-6">
          <div className="lg:hidden col-span-1 -mb-2">
            <span className="text-[#6b7280] text-[15px]">Confirmation # </span>
            <span className="font-bold text-[#0061e0] text-[15px]">
              {view.confirmationLabel}
            </span>
            {view.referenceKey ? (
              <p className="text-[12px] text-[#6b7280] mt-1">
                Ref. {view.referenceKey}
              </p>
            ) : null}
          </div>

          <div className="col-span-1 flex flex-col gap-6 lg:order-last">
            <div className="hidden lg:block -mb-2">
              <span className="text-[#6b7280] text-[15px]">Confirmation # </span>
              <span className="font-bold text-[#0061e0] text-[15px]">
                {view.confirmationLabel}
              </span>
              {view.referenceKey ? (
                <p className="text-[12px] text-[#6b7280] mt-1">
                  Ref. {view.referenceKey}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-2 px-1">
                <span className="text-[14px] font-bold text-[#6b7280] tracking-wide">
                  BOOKING OVERVIEW
                </span>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${dot}`} />
                  <span className={`${text} text-[14px] font-bold`}>
                    {view.bookingStatus}
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-[12px] border border-gray-100 shadow-sm flex flex-col">
                <div className="p-4 sm:p-5 flex flex-row sm:flex-row gap-4">
                  <div className="w-[120px] h-[80px] sm:w-[140px] sm:h-[90px] shrink-0 bg-[#f8f9fc] rounded-[10px] flex items-center justify-center p-2">
                    {normalizeMediaUrl(view.carImage) ? (
                      <img
                        src={normalizeMediaUrl(view.carImage)}
                        alt={view.carName}
                        className="w-full h-full object-contain mix-blend-multiply"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">No image</span>
                    )}
                  </div>
                  <div className="flex flex-col justify-center gap-0.5 min-w-0">
                    <h3 className="text-black font-extrabold text-[16px]">
                      {view.carName}
                    </h3>
                    <p className="text-[#6b7280] text-[13px]">{view.carSpecs}</p>
                    <p className="text-[#6b7280] text-[13px] mt-1">
                      Booked on: {view.bookedOnLabel}
                    </p>
                    {view.reservationType ? (
                      <p className="text-[#6b7280] text-[13px]">
                        {view.reservationType}
                        {view.isQuote ? ' · Quote' : ''}
                      </p>
                    ) : null}
                    {view.paymentStatus ? (
                      <p className="text-[13px] font-medium text-foreground mt-1">
                        Payment: {view.paymentStatus}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-2 border-t border-gray-100">
                  <div className="p-4 sm:p-5 flex flex-col gap-1 border-r border-gray-100">
                    <span className="text-[13px] text-[#6b7280]">Pickup:</span>
                    <p className="font-extrabold text-[14px] text-black">
                      {view.pickupWhen}
                    </p>
                    <p className="text-[13px] text-[#6b7280]">
                      {view.pickupWhereName}
                    </p>
                    {view.pickupWhereAddress ? (
                      <p className="text-[13px] text-[#6b7280]">
                        {view.pickupWhereAddress}
                      </p>
                    ) : null}
                  </div>
                  <div className="p-4 sm:p-5 flex flex-col gap-1">
                    <span className="text-[13px] text-[#6b7280]">Return:</span>
                    <p className="font-extrabold text-[14px] text-black">
                      {view.returnWhen}
                    </p>
                    <p className="text-[13px] text-[#6b7280]">
                      {view.returnWhereName}
                    </p>
                    {view.returnWhereAddress ? (
                      <p className="text-[13px] text-[#6b7280]">
                        {view.returnWhereAddress}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="border-t border-gray-100 p-4 flex justify-center items-center">
                  {view.rentalAgreementUrl ? (
                    <a
                      href={view.rentalAgreementUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-[#0061e0] text-[14px] hover:underline"
                    >
                      View Agreement
                    </a>
                  ) : (
                    <span className="text-[14px] text-[#6b7280]">
                      Agreement link not available
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="hidden lg:flex flex-col">
              <div className="bg-white rounded-[16px] border border-gray-100 shadow-sm p-5 flex flex-col">
                <RentalFeeSummaryBlock
                  view={view}
                  onExpressCheckin={handleExpressCheckin}
                  onSignAgreement={() =>
                    navigate(
                      `/sign-agreements?reservation_ref=${encodeURIComponent(view.referenceKey)}`,
                    )
                  }
                  isLaunchingCheckin={launchingCheckin}
                />
              </div>
            </div>
          </div>

          <div className="col-span-1 lg:col-span-2 flex flex-col gap-6">
            <PricingRowsSection
              title="EXTRAS"
              rows={view.extrasRows}
              sym={view.currencySymbol}
              emptyText="No extras on this booking."
            />
            <PricingRowsSection
              title="DAMAGE COVER OPTIONS"
              rows={view.damageCoverRows}
              sym={view.currencySymbol}
              emptyText="No damage cover add-ons listed."
            />
          </div>
        </div>
      ) : null}

      {!loading && !error && view ? (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.05)] rounded-t-[24px] z-20 transition-all duration-300 ease-in-out">
          <div
            className="flex justify-center pt-3 pb-2 cursor-pointer active:opacity-70 transition-opacity"
            onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
            role="button"
            aria-expanded={isSummaryExpanded}
          >
            <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
          </div>
          <div className="p-5 pt-2 flex flex-col">
            <RentalFeeSummaryBlock
              view={view}
              compact
              isExpanded={isSummaryExpanded}
              isMobile={true}
              onExpressCheckin={handleExpressCheckin}
              onSignAgreement={() =>
                navigate(
                  `/sign-agreements?reservation_ref=${encodeURIComponent(view.referenceKey)}`,
                )
              }
              isLaunchingCheckin={launchingCheckin}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

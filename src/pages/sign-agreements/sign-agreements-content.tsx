import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { ScreenLoader } from '@/components/common/screen-loader';
import { useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { CollapsibleCard } from '@/pages/express-checkin/components/collapsible-card';
import { ReservationDetails } from '@/pages/express-checkin/components/reservation-details';
import {
  fetchBookingByReference,
  mapBookingDetailToView,
  type BookingDetailView,
} from '@/services/bookings';
import {
  fetchRcmSignatureList,
  saveRcmDocumentSignature,
  type RcmSignatureListItem,
} from '@/services/rcm-documents';
import { Button } from '@/components/ui/button';
import {
  SignatureAgreementSection,
  displayCustomerNameForSignatureItem,
  displayTitleForSignatureItem,
  signatureRowKey,
} from './components/signature-agreement-section';
import { getFriendlyError } from '@/utils/api-error-handler';

function isMeaningfulPngBase64(s: string | null | undefined): boolean {
  if (!s || !s.trim()) return false;
  return s.trim().length > 80;
}

function toSentenceCase(message: string): string {
  const text = message.trim();
  if (!text) return '';
  const normalized = text.toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function SignAgreementsContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reservationRef = (searchParams.get('reservation_ref') || '').trim();

  const [openCard, setOpenCard] = useState<string | null>('booking');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingView, setBookingView] = useState<BookingDetailView | null>(null);
  const [signatureItems, setSignatureItems] = useState<RcmSignatureListItem[]>(
    [],
  );
  const [agreementSigned, setAgreementSigned] = useState(false);
  const [signatures, setSignatures] = useState<Record<string, string | null>>({});
  const [signatureErrors, setSignatureErrors] = useState<Record<string, string | null>>({});
  const [saving, setSaving] = useState(false);
  const [signingOneKey, setSigningOneKey] = useState<string | null>(null);

  const toggleCard = (id: string) => {
    setOpenCard(openCard === id ? null : id);
  };

  const handleSignatureChange = useCallback(
    (rowKey: string, png: string | null) => {
      setSignatures((prev) => ({ ...prev, [rowKey]: png }));
      setSignatureErrors((prev) => ({ ...prev, [rowKey]: null }));
    },
    [],
  );

  useEffect(() => {
    if (!reservationRef) {
      setLoading(false);
      setError(toSentenceCase('Missing reservation reference. Open this page from your booking.'));
      setBookingView(null);
      setSignatureItems([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const [bookingRes, sigList] = await Promise.all([
          fetchBookingByReference(reservationRef),
          fetchRcmSignatureList(reservationRef),
        ]);

        if (cancelled) return;

        const data = bookingRes.data;
        if (!data || typeof data !== 'object') {
          throw new Error(bookingRes.message || 'No booking data');
        }
        setBookingView(mapBookingDetailToView(data as Record<string, unknown>));

        setSignatureItems(sigList.items);
        setAgreementSigned(sigList.agreement_signed);

        const firstUnsigned = sigList.items.find(
          (i) => !i.issigned && !i.overcounteronly,
        );
        setOpenCard(firstUnsigned ? signatureRowKey(firstUnsigned) : 'booking');
      } catch (e) {
        if (cancelled) return;
        setBookingView(null);
        setSignatureItems([]);
        setError(toSentenceCase(getFriendlyError(e, 'Could not load agreements.')));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reservationRef]);

  const handleSave = async () => {
    if (!reservationRef) return;

    const pending = signatureItems.filter((i) => !i.issigned && !i.overcounteronly);
    if (pending.length === 0) {
      toast.info(toSentenceCase('Nothing to sign here.'));
      return;
    }

    for (const item of pending) {
      const key = signatureRowKey(item);
      if (!isMeaningfulPngBase64(signatures[key])) {
        const msg = toSentenceCase(
          `Please add your signature for ${displayTitleForSignatureItem(item)}.`,
        );
        setSignatureErrors((prev) => ({ ...prev, [key]: msg }));
        toast.error(msg);
        setOpenCard(key);
        return;
      }
    }

    try {
      setSaving(true);
      for (const item of pending) {
        const key = signatureRowKey(item);
        const png = signatures[key];
        if (!png) continue;
        await saveRcmDocumentSignature({
          reservation_ref: reservationRef,
          signature_template_id: item.signaturetemplateid,
          signature_png: png,
        });
      }
      toast.success(toSentenceCase('Signatures saved.'));
      navigate(-1);
    } catch (e) {
      toast.error(toSentenceCase(getFriendlyError(e, 'Could not save signatures.')));
    } finally {
      setSaving(false);
    }
  };

  const handleSignSingle = async (item: RcmSignatureListItem) => {
    if (!reservationRef) return;
    const key = signatureRowKey(item);
    const png = signatures[key];
    if (!isMeaningfulPngBase64(png)) {
      const msg = toSentenceCase(
        `Please add your signature for ${displayTitleForSignatureItem(item)}.`,
      );
      setSignatureErrors((prev) => ({ ...prev, [key]: msg }));
      toast.error(msg);
      setOpenCard(key);
      return;
    }

    try {
      setSigningOneKey(key);
      await saveRcmDocumentSignature({
        reservation_ref: reservationRef,
        signature_template_id: item.signaturetemplateid,
        signature_png: png!,
      });
      setSignatureItems((prev) => {
        const next = prev.map((x) =>
          signatureRowKey(x) === key ? { ...x, issigned: true } : x,
        );
        const allDone = next.every((x) => x.issigned || x.overcounteronly);
        if (allDone) setAgreementSigned(true);
        return next;
      });
      setSignatures((prev) => ({ ...prev, [key]: null }));
      toast.success(toSentenceCase(`${displayTitleForSignatureItem(item)} signed.`));

      const nextUnsigned = signatureItems.find(
        (x) => !x.issigned && !x.overcounteronly && signatureRowKey(x) !== key,
      );
      if (nextUnsigned) {
        setOpenCard(signatureRowKey(nextUnsigned));
      }
    } catch (e) {
      toast.error(toSentenceCase(getFriendlyError(e, 'Could not save signature.')));
    } finally {
      setSigningOneKey(null);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-screen lg:pb-10 relative px-4 pt-0 lg:px-0 bg-[#f8f9fa]">
      {/* <div className="flex items-center mb-6 pt-2"> */}
      {/* <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-black hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button> */}
      {/* <h1 className="flex-1 text-left font-extrabold text-[20px] text-black pr-8">
          Authorize
        </h1> */}
      {/* </div> */}

      {loading ? (
        <ScreenLoader />
      ) : null}

      {error && !loading ? (
        <div className="mx-auto max-w-lg flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="size-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Cannot load this page</p>
            <p className="text-destructive/90 mt-1">{error}</p>
          </div>
        </div>
      ) : null}

      {!loading && !error && bookingView ? (
        <div className="w-full mx-auto grid grid-cols-1 lg:grid-cols-3 gap-2 lg:gap-4 max-w-7xl">
          <div className="col-span-1 flex flex-col lg:order-last">
            <CollapsibleCard
              title="BOOKING DETAILS"
              isOpen={openCard === 'booking'}
              onToggle={() => toggleCard('booking')}
            >
              <ReservationDetails
                reservationNumber={bookingView.confirmationLabel}
                carImage={bookingView.carImage}
                carTitle={bookingView.carName}
                carSubtitle={bookingView.carSpecs}
                pickupDate={bookingView.pickupWhen}
                pickupLocation={[bookingView.pickupWhereName, bookingView.pickupWhereAddress]
                  .filter(Boolean)
                  .join(' ')}
                returnDate={bookingView.returnWhen}
                returnLocation={[bookingView.returnWhereName, bookingView.returnWhereAddress]
                  .filter(Boolean)
                  .join(' ')}
              />
            </CollapsibleCard>

            {agreementSigned ? (
              <p className="mt-3 text-center text-[13px] text-emerald-700 font-medium px-2">
                Agreement signing is complete for this reservation.
              </p>
            ) : null}

            <div className="hidden lg:flex mt-2">
              <Button
                className="w-full bg-[#ffc107] hover:bg-[#ffb000] text-black font-bold text-[16px] py-6 shadow-sm rounded-full"
                disabled={saving || agreementSigned}
                onClick={() => void handleSave()}
              >
                {saving ? 'Saving…' : 'Save & Continue'}
              </Button>
            </div>
          </div>

          <div className="col-span-1 lg:col-span-2 flex flex-col h-full self-start">
            {signatureItems.length === 0 ? (
              <p className="text-[14px] text-[#6b7280] px-1">
                Nothing to sign for this booking as of now.
              </p>
            ) : (
              signatureItems.map((item) => {
                const key = signatureRowKey(item);
                const title = displayTitleForSignatureItem(item);
                const customerName = displayCustomerNameForSignatureItem(item);
                return (
                  <CollapsibleCard
                    key={key}
                    title={`${title} - ${customerName}`.toUpperCase()}
                    isOpen={openCard === key}
                    onToggle={() => toggleCard(key)}
                  >
                    <SignatureAgreementSection
                      item={item}
                      onSignatureChange={handleSignatureChange}
                      errorMessage={signatureErrors[key]}
                    />
                    {!item.issigned && !item.overcounteronly ? (
                      <div className="mt-4">
                        <Button
                          type="button"
                          className="bg-[#0061e0] hover:bg-[#0052cc] text-white"
                          disabled={saving || signingOneKey === key}
                          onClick={() => void handleSignSingle(item)}
                        >
                          {signingOneKey === key ? 'Signing…' : 'Sign this document'}
                        </Button>
                      </div>
                    ) : null}
                  </CollapsibleCard>
                );
              })
            )}
          </div>
        </div>
      ) : null}

      {!loading && !error && !bookingView && reservationRef ? (
        <p className="text-center text-[14px] text-[#6b7280]">
          Booking details could not be loaded. You can still try again from your
          booking list.
        </p>
      ) : null}

      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#f8f9fa] pt-4 pb-6 px-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] border-t border-gray-100">
        <Button
          className="w-full bg-[#ffc107] hover:bg-[#ffb000] text-black font-bold text-[16px] py-7 rounded-full shadow-md"
          disabled={saving || agreementSigned || !bookingView}
          onClick={() => void handleSave()}
        >
          {saving ? 'Saving…' : 'Save & Continue'}
        </Button>
      </div>
    </div>
  );
}

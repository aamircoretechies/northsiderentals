import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PaymentCardDisclaimer } from '@/components/payments/payment-card-disclaimer';
import { normalizePaymentReturnToAppOrigin } from '@/utils/app-origin';
import {
  parsePaymentReturnParams,
  resolvePaymentReturnSearchFromUrl,
} from '@/utils/payment-return';

export interface WindcavePaymentModalProps {
  open: boolean;
  paymentUrl: string | null;
  onClose: () => void;
  /** Called when Windcave redirects to the app confirmation URL (success / cancel / fail). */
  onComplete: (search: string) => void;
}

/**
 * Hosted Windcave form in a modal iframe so users stay on the booking app.
 * Falls back to same-tab redirect if the gateway blocks embedding.
 */
export function WindcavePaymentModal({
  open,
  paymentUrl,
  onClose,
  onComplete,
}: WindcavePaymentModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeBlocked, setIframeBlocked] = useState(false);
  const [loading, setLoading] = useState(true);

  const handleIframeLoad = useCallback(() => {
    setLoading(false);
    try {
      const frame = iframeRef.current;
      if (!frame?.contentWindow) return;
      const href = frame.contentWindow.location.href;
      if (!href || href === 'about:blank') return;

      const search = resolvePaymentReturnSearchFromUrl(href);
      if (!search) return;
      const params = parsePaymentReturnParams(search);
      if (params.status === 'unknown') return;
      onComplete(search);
    } catch {
      /* cross-origin — expected while on Windcave */
    }
  }, [onComplete]);

  useEffect(() => {
    if (!open) {
      setLoading(true);
      setIframeBlocked(false);
    }
  }, [open]);

  const openFullPage = () => {
    if (!paymentUrl) return;
    const target = normalizePaymentReturnToAppOrigin(paymentUrl);
    window.location.assign(target);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-2xl w-[calc(100%-1.5rem)] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-white flex-shrink-0">
          <DialogTitle className="text-base font-bold text-foreground">
            Secure card verification
          </DialogTitle>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted transition-colors cursor-pointer"
            aria-label="Close payment"
          >
            <X className="size-5" />
          </button>
        </div>
        <DialogDescription className="sr-only">
          Enter your card details on Windcave. Your card is not charged until your
          booking is confirmed.
        </DialogDescription>

        <div className="p-4 space-y-3 bg-[#f8fafc] flex-1 overflow-y-auto min-h-0">
          <PaymentCardDisclaimer />

          {iframeBlocked ? (
            <div className="text-center py-8 space-y-4">
              <p className="text-sm text-muted-foreground">
                Windcave cannot be embedded in this browser. Continue in the secure
                payment page — you will return here when finished.
              </p>
              <Button type="button" className="rounded-full" onClick={openFullPage}>
                Open secure payment
              </Button>
            </div>
          ) : (
            <div className="relative w-full rounded-xl overflow-hidden border border-border bg-white min-h-[350px] sm:min-h-[420px]">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                  <Loader2 className="size-8 text-[#0061e0] animate-spin" />
                </div>
              ) : null}
              {paymentUrl ? (
                <iframe
                  ref={iframeRef}
                  title="Windcave secure payment"
                  src={normalizePaymentReturnToAppOrigin(paymentUrl)}
                  className="w-full h-[380px] sm:h-[460px] md:h-[520px] border-0"
                  onLoad={handleIframeLoad}
                  onError={() => setIframeBlocked(true)}
                  allow="payment *"
                  sandbox="allow-forms allow-scripts allow-same-origin allow-popups"
                />
              ) : null}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

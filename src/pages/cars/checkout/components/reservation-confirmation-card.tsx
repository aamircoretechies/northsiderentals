import type { ReactNode } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ReservationConfirmationCardProps {
  title: string;
  reservationNo: string;
  /** e.g. "Reservation no" or "Quote no" */
  numberLabel?: string;
  message?: string | null;
  extra?: ReactNode;
  loading?: boolean;
  doneLabel?: string;
  onDone: () => void;
}

/** Same confirmation popup pattern as email quote — shows RCM reservation number. */
export function ReservationConfirmationCard({
  title,
  reservationNo,
  numberLabel = 'Reservation no',
  message,
  extra,
  loading = false,
  doneLabel = 'Done',
  onDone,
}: ReservationConfirmationCardProps) {
  return (
    <div className="flex flex-col items-center text-center gap-5 py-4 px-2 w-full max-w-md mx-auto">
      {loading ? (
        <Loader2 className="w-10 h-10 text-[#0061e0] animate-spin" />
      ) : (
        <div className="w-[72px] h-[72px] bg-[#0061e0] rounded-full flex items-center justify-center">
          <Check size={40} strokeWidth={3} className="text-white" />
        </div>
      )}
      <div className="flex flex-col gap-2">
        <h3 className="text-[#0061e0] font-bold text-[20px]">{title}</h3>
        <p className="text-black font-extrabold text-[17px]">
          {numberLabel}: {reservationNo || '—'}
        </p>
        {message ? (
          <p className="text-[#333] text-[14px] leading-relaxed max-w-[320px]">{message}</p>
        ) : null}
        {extra}
      </div>
      <Button
        type="button"
        className="w-full bg-[#ffc107] hover:bg-[#ffb000] text-black font-bold text-[16px] py-7 rounded-full shadow-md mt-2"
        onClick={onDone}
      >
        {doneLabel}
      </Button>
    </div>
  );
}

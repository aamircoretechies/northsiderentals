import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { submitSupportIssue } from '@/services/support';
import { getFriendlyError } from '@/utils/api-error-handler';

const inputClass =
  'w-full bg-[#f2f4f8] border-0 rounded-[12px] px-5 py-4 text-[15px] text-[#2c3e50] placeholder:text-[#8692a6] focus:ring-1 focus:ring-[#0061e0] outline-none font-medium transition-shadow';

type SupportIssueModalProps = {
  children: React.ReactNode;
  /** When opened from a booking, pre-fill the reservation reference. */
  defaultReservationRef?: string;
};

export function SupportIssueModal({
  children,
  defaultReservationRef = '',
}: SupportIssueModalProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reservationRef, setReservationRef] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setTitle('');
    setDescription('');
    setReservationRef(defaultReservationRef.trim());
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setReservationRef(defaultReservationRef.trim());
    } else {
      reset();
    }
  };

  const handleSubmit = async () => {
    if (title.trim().length < 3) {
      toast.error('Subject must be at least 3 characters');
      return;
    }
    if (description.trim().length < 5) {
      toast.error('Description must be at least 5 characters');
      return;
    }

    try {
      setSubmitting(true);
      await submitSupportIssue({
        title: title.trim(),
        description: description.trim(),
        reservation_ref: reservationRef.trim() || undefined,
      });
      toast.success('Support request sent');
      reset();
      setOpen(false);
    } catch (e) {
      toast.error(getFriendlyError(e, 'Could not send request'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent
        className="max-w-md w-full p-0 gap-0 overflow-hidden bg-[#f8f9fa] border-0 sm:rounded-[24px]"
        showCloseButton={false}
      >
        <div className="flex items-center p-4 pt-6 bg-[#f8f9fa]">
          <DialogClose className="p-2 -ml-2 text-black hover:bg-gray-200 rounded-full transition-colors flex-shrink-0 cursor-pointer">
            <ArrowLeft className="w-6 h-6" />
          </DialogClose>
          <DialogTitle className="flex-1 text-center font-extrabold text-[20px] text-black pr-8">
            Contact support
          </DialogTitle>
        </div>
        <DialogDescription className="sr-only">
          Send a message to support with an optional booking reference.
        </DialogDescription>

        <div className="px-5 pb-8 pt-4 overflow-y-auto max-h-[85vh] flex flex-col gap-4">
          <div className="relative">
            <div className="flex justify-end mb-1 px-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {title.length}/100
              </span>
            </div>
            <input
              type="text"
              placeholder="Subject"
              value={title}
              disabled={submitting}
              maxLength={100}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="relative">
            <div className="flex justify-end mb-1 px-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {description.length}/500
              </span>
            </div>
            <textarea
              placeholder="Describe your issue"
              value={description}
              disabled={submitting}
              maxLength={500}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className={`${inputClass} resize-none min-h-[120px]`}
            />
          </div>
          <div className="relative">
            <div className="flex justify-end mb-1 px-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {reservationRef.length}/50
              </span>
            </div>
            <input
              type="text"
              placeholder="Reservation reference (optional)"
              value={reservationRef}
              disabled={submitting}
              maxLength={50}
              onChange={(e) => setReservationRef(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="mt-4 mb-2">
            <Button
              type="button"
              className="w-full bg-[#ffc107] hover:bg-[#ffb000] text-black font-bold text-[16px] py-7 rounded-full shadow-[0_4px_14px_rgba(0,0,0,0.1)] cursor-pointer"
              disabled={submitting}
              onClick={() => void handleSubmit()}
            >
              {submitting ? 'Sending…' : 'Send'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Calendar, Clock, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { BookingDetailView } from '@/services/bookings';
import { normalizeMediaUrl } from '@/lib/helpers';

interface RequestExtensionModalProps {
  trigger: React.ReactNode;
  view: BookingDetailView;
}

const ALL_TIME_OPTIONS = [
  '05:00 AM', '05:30 AM', '06:00 AM', '06:30 AM',
  '07:00 AM', '07:30 AM', '08:00 AM', '08:30 AM',
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
  '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
  '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
  '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM',
  '07:00 PM', '07:30 PM', '08:00 PM', '08:30 PM',
  '09:00 PM', '09:30 PM', '10:00 PM', '10:30 PM',
  '11:00 PM', '11:30 PM',
];

export function RequestExtensionModal({ trigger, view }: RequestExtensionModalProps) {
  const [open, setOpen] = useState(false);
  const [targetDate, setTargetDate] = useState('');
  const [targetTime, setTargetTime] = useState('09:00 AM');

  const dateInputRef = useRef<HTMLInputElement>(null);
  const dateInputId = `ext-date-${view.bookingId || 'booking'}`;

  // Helper to convert DD/MM/YYYY or DD/MMM/YYYY to YYYY-MM-DD
  const formatToInputDate = (dateStr: string | undefined): string => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      try {
        return d.toISOString().split('T')[0];
      } catch (e) { /* ignore */ }
    }
    const parts = dateStr.includes('/') ? dateStr.split('/') : dateStr.split(' ');
    if (parts.length >= 3) {
      let [day, month, year] = parts;
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIndex = monthNames.findIndex(m => month.toLowerCase().startsWith(m.toLowerCase()));
      if (monthIndex !== -1) {
        month = (monthIndex + 1).toString().padStart(2, '0');
      } else {
        month = month.padStart(2, '0');
      }
      if (year.length === 2 && !isNaN(Number(year))) year = `20${year}`;
      return `${year}-${month}-${day.padStart(2, '0')}`;
    }
    return dateStr;
  };

  // Helper to convert 24h to 12h for Select
  const formatTo12Hour = (timeStr: string | undefined): string => {
    if (!timeStr) return '09:00 AM';
    const parts = timeStr.split(':');
    let h = parseInt(parts[0], 10);
    const m = parts[1] || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  const formatToDisplayDate = (dateStr: string) => {
    if (!dateStr) return 'Select Date';
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const minDate = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (open && view.returnWhen) {
      const parts = view.returnWhen.split(' ');
      if (parts[0]) setTargetDate(formatToInputDate(parts[0]));
      // Initialize time in 12h format for Select
      const timePart = parts[1];
      setTargetTime(formatTo12Hour(timePart));
    }
  }, [open, view.returnWhen]);

  const handleSubmit = () => {
    if (!targetDate || !targetTime) {
      toast.error('Please select both a new return date and time');
      return;
    }
    if (targetDate < minDate) {
      toast.error('You cannot select a past date for the extension.');
      return;
    }
    toast.success(`Extension request submitted for ${formatToDisplayDate(targetDate)} at ${targetTime}`);
    setOpen(false);
  };

  const handleManualTrigger = (ref: React.RefObject<HTMLInputElement>) => {
    try {
      if (ref.current && 'showPicker' in ref.current) {
        (ref.current as any).showPicker();
      } else {
        ref.current?.focus();
      }
    } catch (e) {
      console.error('Failed to trigger picker:', e);
    }
  };

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
        className="max-w-md p-0 flex flex-col gap-0 border-0 bg-[#f8f9fc] sm:rounded-[32px] overflow-hidden shadow-2xl h-[100dvh] sm:h-auto sm:max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex-none flex items-center justify-center p-4 sm:p-6 relative bg-white border-b border-gray-100 z-30">
          <button
            className="absolute left-4 sm:left-6 p-2 cursor-pointer hover:bg-gray-100 rounded-full transition-all"
            onClick={() => setOpen(false)}
          >
            <ArrowLeft size={24} className="text-black" />
          </button>
          <DialogTitle className="text-[19px] font-black text-black tracking-tight text-center w-full">
            Request Extension
          </DialogTitle>
        </div>
        <DialogDescription className="sr-only">
          Booking extension for {view.carName}.
        </DialogDescription>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col">

          <div className="flex flex-col mb-8 flex-none overflow-visible">

            {/* Top Car Info */}
            <div className="p-4 sm:p-5 flex gap-4 border-b border-gray-50 bg-[#fafbfc]">
              <div className="w-[110px] h-[75px] shrink-0 bg-white border border-gray-100 rounded-[14px] flex items-center justify-center p-2 shadow-sm">
                <img
                  src={normalizeMediaUrl(view.carImage) || 'https://cdn.pixabay.com/photo/2012/05/29/00/43/car-49278_1280.jpg'}
                  alt={view.carName}
                  className="w-full h-full object-contain mix-blend-multiply"
                />
              </div>
              <div className="flex flex-col justify-center gap-1">
                <div className="flex flex-col">
                  <span className="text-[#6b7280] text-[10px] font-bold uppercase tracking-widest">RESERVATION NO:</span>
                  <span className="font-black text-[#0061e0] text-[16px] leading-none">{view.confirmationLabel}</span>
                </div>
                <h3 className="text-black font-black text-[15px] leading-tight mt-1">{view.carName}</h3>
              </div>
            </div>

            {/* Timings */}
            <div className="grid grid-cols-2 divide-x divide-gray-50 border-b border-gray-50">
              <div className="p-4 sm:p-2 flex flex-col gap-2">
                <span className="text-[#6b7280] text-[10px] font-bold uppercase tracking-widest">Pickup:</span>
                <span className="text-black font-black text-[14px] leading-none">{view.pickupWhen}</span>
                <div className="text-[#6b7280] text-[11px] font-semibold leading-tight">
                  <p className="text-black truncate">{view.pickupWhereName}</p>
                </div>
              </div>
              <div className="p-4 sm:p-2 flex flex-col gap-2 bg-[#fdfdfd]">
                <span className="text-[#6b7280] text-[10px] font-bold uppercase tracking-widest text-[#0061e0]">Return:</span>
                <span className="text-black font-black text-[14px] leading-none">{view.returnWhen}</span>
                <div className="text-[#6b7280] text-[11px] font-semibold leading-tight">
                  <p className="text-black truncate">{view.returnWhereName}</p>
                </div>
              </div>
            </div>

            <hr className="mb-4" />

            {/* Input Form */}
            <div className="flex flex-col gap-5 bg-white">
              <span className="text-[12px] font-black text-[#0061e0] tracking-widest uppercase text-center">New Return Date & Time</span>
              <div className="flex flex-col sm:flex-row gap-4">

                {/* Date Picker (Native) */}
                <label
                  htmlFor={dateInputId}
                  className="flex-1 relative h-[68px] bg-[#f0f4f8]/50 border-2 border-transparent hover:border-[#0061e0]/30 rounded-[20px] flex items-center px-2 gap-4 cursor-pointer transition-all active:scale-[0.98]"
                >
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0">
                    <Calendar size={20} className="text-[#0061e0]" />
                  </div>
                  <div className="flex flex-col flex-1 overflow-hidden pointer-events-none">
                    <span className="text-[10px] font-bold text-[#6b7280] uppercase tracking-wider">Date</span>
                    <span className="text-black font-black text-[15px] truncate">
                      {formatToDisplayDate(targetDate)}
                    </span>
                  </div>
                  <input
                    id={dateInputId}
                    ref={dateInputRef}
                    type="date"
                    min={minDate}
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleManualTrigger(dateInputRef);
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                  />
                </label>

                {/* Time Picker (Select) */}
                <div className="flex-1">
                  <Select value={targetTime} onValueChange={setTargetTime}>
                    <SelectTrigger className="h-[68px] w-full bg-[#f0f4f8]/50 border-2 border-transparent hover:border-[#0061e0]/30 rounded-[20px] px-2 gap-4 shadow-none focus:ring-0 [&>svg:last-child]:hidden transition-all active:scale-[0.98]">
                      <div className="flex items-center gap-4 w-full">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0">
                          <Clock size={20} className="text-[#0061e0]" />
                        </div>
                        <div className="flex flex-col items-start flex-1 overflow-hidden">
                          <span className="text-[10px] font-bold text-[#6b7280] uppercase tracking-wider">Time</span>
                          <span className="text-black font-black text-[15px] truncate">
                            <SelectValue placeholder="Time" />
                          </span>
                        </div>
                        <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-xl border-gray-100 max-h-[300px]">
                      {ALL_TIME_OPTIONS.map((time) => (
                        <SelectItem key={time} value={time} className="py-3 font-bold text-black focus:bg-blue-50 focus:text-blue-700">
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-auto pt-4 flex flex-col gap-4 pb-2 shrink-0">
            <Button
              className="w-full bg-[#ffb700] hover:bg-[#ffc800] text-black font-black h-[64px] rounded-[32px] text-[18px] shadow-xl shadow-amber-200/40 transition-all active:scale-[0.97]"
              onClick={handleSubmit}
            >
              Submit Extend Request
            </Button>
            <button
              className="text-[#616e7c] font-bold text-[15px] p-3 hover:text-black transition-colors uppercase tracking-widest"
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

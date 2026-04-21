import { CircleHelp } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/** Hard cap for quantity-based optional extras (e.g. additional driver fee); API max is clamped to this. */
const MAX_OPTIONAL_EXTRA_QTY = 10;

export interface BookingDetailsForm {
  selectedInsurance: string;
  selectedOptionalFees: string[];
  optionalFeeQuantities: Record<string, number>;
  notes: string;
}

export function BookingDetailsCard({
  value,
  onChange,
  optionalFees,
  insuranceOptions,
}: {
  value: BookingDetailsForm;
  onChange: (patch: Partial<BookingDetailsForm>) => void;
  optionalFees: Array<{
    id: string;
    label: string;
    qtyEnabled?: boolean;
    maxQty?: number;
    description?: string;
  }>;
  insuranceOptions: Array<{ id: string; label: string; description?: string }>;
}) {
  const selectedOptionalFees = value.selectedOptionalFees ?? [];
  const optionalFeeQuantities = value.optionalFeeQuantities ?? {};
  const notes = value.notes ?? '';

  const InfoIcon = ({ description }: { description?: string }) =>
    description ? (
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className="inline-flex items-center align-middle ms-1">
            <CircleHelp size={13} className="text-[#0061e0]" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs whitespace-pre-wrap text-[12px] leading-relaxed">
          {description}
        </TooltipContent>
      </Tooltip>
    ) : null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-[14px] text-gray-800 font-medium mb-3">Optional Extras</p>
        <div className="space-y-2">
          {optionalFees.length === 0 ? (
            <p className="text-[13px] text-gray-500 px-1 py-2">
              No optional extras are available for this booking.
            </p>
          ) : null}
          {optionalFees.map((f) => {
            const upper = Math.min(
              MAX_OPTIONAL_EXTRA_QTY,
              Math.max(1, Number(f.maxQty ?? MAX_OPTIONAL_EXTRA_QTY)),
            );
            if (f.qtyEnabled) {
              const qty = Math.max(0, Math.min(upper, Number(optionalFeeQuantities[f.id] ?? 0)));
              const setQty = (nextRaw: number) => {
                const q = Math.max(0, Math.min(upper, Math.floor(nextRaw)));
                const nextQtyMap = { ...optionalFeeQuantities, [f.id]: q };
                let nextSel = [...selectedOptionalFees];
                if (q > 0) {
                  if (!nextSel.includes(f.id)) nextSel.push(f.id);
                } else {
                  nextSel = nextSel.filter((x) => x !== f.id);
                }
                onChange({
                  optionalFeeQuantities: nextQtyMap,
                  selectedOptionalFees: nextSel,
                });
              };
              return (
                <div
                  key={f.id}
                  className="flex flex-wrap items-center gap-3 p-3 bg-white border border-[#e2e8f0] rounded-[10px]"
                >
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <span className="text-[14px] text-black font-medium">
                      {f.label}
                      <InfoIcon description={f.description} />
                    </span>
                    <span className="text-[12px] text-gray-500">Quantity for this rental</span>
                  </div>
                  <div className="ml-auto flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      aria-label={`Decrease quantity for ${f.label}`}
                      onClick={() => setQty(qty - 1)}
                      disabled={qty <= 0}
                      className="size-8 rounded-full border border-[#d0d7e2] bg-white text-[18px] leading-none font-bold text-[#374151] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      -
                    </button>
                    <span
                      className="min-w-[2.25rem] text-center text-[15px] font-semibold tabular-nums"
                      aria-live="polite"
                    >
                      {qty}
                    </span>
                    <button
                      type="button"
                      aria-label={`Increase quantity for ${f.label}`}
                      onClick={() => setQty(qty + 1)}
                      disabled={qty >= upper}
                      className="size-8 rounded-full border border-[#d0d7e2] bg-white text-[18px] leading-none font-bold text-[#374151] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            }
            const checked = selectedOptionalFees.includes(f.id);
            return (
              <div
                key={f.id}
                className="flex items-center gap-3 p-3 bg-white border border-[#e2e8f0] rounded-[10px]"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...selectedOptionalFees, f.id]
                      : selectedOptionalFees.filter((x) => x !== f.id);
                    const nextQty = { ...optionalFeeQuantities };
                    if (!e.target.checked) {
                      delete nextQty[f.id];
                    } else if (!nextQty[f.id]) {
                      nextQty[f.id] = 1;
                    }
                    onChange({ selectedOptionalFees: next, optionalFeeQuantities: nextQty });
                  }}
                />
                <span className="text-[14px] text-black">
                  {f.label}
                  <InfoIcon description={f.description} />
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-[14px] text-gray-800 font-medium mb-2">Damage Cover</p>
        <div className="space-y-2">
          {insuranceOptions.length === 0 ? (
            <p className="text-[13px] text-gray-500 px-1 py-2">
              No damage cover options are available for this booking.
            </p>
          ) : null}
          {insuranceOptions.map((opt) => (
            <label
              key={opt.id}
              className="flex items-center gap-3 p-3 bg-white border border-[#e2e8f0] rounded-[10px]"
            >
              <input
                type="radio"
                name="insurance"
                checked={(value.selectedInsurance ?? '') === opt.id}
                onChange={() => onChange({ selectedInsurance: opt.id })}
              />
              <span className="text-[14px] text-black">
                {opt.label}
                <InfoIcon description={opt.description} />
              </span>
            </label>
          ))}
        </div>
      </div>

      <textarea
        placeholder="Booking notes"
        value={notes}
        onChange={(e) => onChange({ notes: e.target.value })}
        className="w-full bg-white border border-[#e2e8f0] rounded-[8px] px-4 py-3 text-[14px] text-[#2c3e50] focus:ring-1 focus:ring-[#0061e0] outline-none min-h-[90px]"
      />
    </div>
  );
}

import { cn } from '@/lib/utils';
import type { FieldErrors } from '@/utils/inline-form-validation';

function InlineFieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-[12px] text-destructive mt-0.5">{message}</p>;
}

export interface ExtraDriverItem {
  id: string;
  customerid: number;
  firstname: string;
  lastname: string;
  dateofbirth: string;
  licenseno: string;
  email: string;
  state: string;
  city: string;
  postcode: string;
  address: string;
}

export interface ExtraDriversForm {
  drivers: ExtraDriverItem[];
  removedCustomerIds: number[];
}

const inputClass =
  'w-full bg-white border border-[#e2e8f0] rounded-[8px] px-3 py-2 text-[14px]';

export function ExtraDriversCard({
  value,
  onChange,
  onUpdateDriver,
  fieldErrors = {},
  maxDrivers = 5,
  onRemoveDriver,
}: {
  value: ExtraDriversForm;
  onChange: (next: ExtraDriversForm) => void;
  onUpdateDriver?: (id: string, patch: Partial<ExtraDriverItem>) => void;
  fieldErrors?: FieldErrors;
  maxDrivers?: number;
  onRemoveDriver?: (driver: ExtraDriverItem) => Promise<void>;
}) {
  const drivers = value.drivers ?? [];
  const removedCustomerIds = value.removedCustomerIds ?? [];

  const err = (driverId: string, field: keyof ExtraDriverItem) =>
    fieldErrors[`${driverId}-${field}`];

  const update = (id: string, patch: Partial<ExtraDriverItem>) => {
    if (onUpdateDriver) {
      onUpdateDriver(id, patch);
      return;
    }
    onChange({
      drivers: drivers.map((d) => (d.id === id ? { ...d, ...patch } : d)),
      removedCustomerIds,
    });
  };

  const remove = async (id: string) => {
    const target = drivers.find((d) => d.id === id);
    if (!target) return;
    if (target.customerid > 0 && onRemoveDriver) {
      await onRemoveDriver(target);
    }
    const nextRemoved = [...removedCustomerIds];
    const shouldQueueDelete = target.customerid > 0 && !onRemoveDriver;
    if (shouldQueueDelete && !nextRemoved.includes(target.customerid)) {
      nextRemoved.push(target.customerid);
    }
    onChange({
      drivers: drivers.filter((d) => d.id !== id),
      removedCustomerIds: nextRemoved,
    });
  };

  const add = () => {
    if (drivers.length >= maxDrivers) return;
    onChange({
      drivers: [
        ...drivers,
        {
          id: crypto.randomUUID(),
          customerid: 0,
          firstname: '',
          lastname: '',
          dateofbirth: '',
          licenseno: '',
          email: '',
          state: '',
          city: '',
          postcode: '',
          address: '',
        },
      ],
      removedCustomerIds,
    });
  };

  const reachedMaxDrivers = drivers.length >= maxDrivers;

  return (
    <div className="flex flex-col gap-3">
      {drivers.map((d, idx) => (
        <div key={d.id} className="rounded-[12px] border border-[#e2e8f0] p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] text-[#6b7280]">Driver {idx + 1}</span>
            <button
              type="button"
              className="text-[12px] text-red-600"
              onClick={() => void remove(d.id)}
            >
              Remove
            </button>
          </div>
          <div className="grid gap-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <input
                  value={d.firstname ?? ''}
                  onChange={(e) => update(d.id, { firstname: e.target.value })}
                  placeholder="First name"
                  className={cn(
                    inputClass,
                    err(d.id, 'firstname') && 'ring-1 ring-destructive',
                  )}
                />
                <InlineFieldError message={err(d.id, 'firstname')} />
              </div>
              <div>
                <input
                  value={d.lastname ?? ''}
                  onChange={(e) => update(d.id, { lastname: e.target.value })}
                  placeholder="Last name"
                  className={cn(
                    inputClass,
                    err(d.id, 'lastname') && 'ring-1 ring-destructive',
                  )}
                />
                <InlineFieldError message={err(d.id, 'lastname')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <input
                  type="date"
                  value={d.dateofbirth ?? ''}
                  onChange={(e) => update(d.id, { dateofbirth: e.target.value })}
                  onKeyDown={(e) => e.preventDefault()}
                  onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                  className={cn(
                    inputClass,
                    'cursor-pointer',
                    err(d.id, 'dateofbirth') && 'ring-1 ring-destructive',
                  )}
                  aria-label="Extra driver date of birth"
                />
                <InlineFieldError message={err(d.id, 'dateofbirth')} />
              </div>
              <div>
                <input
                  value={d.licenseno ?? ''}
                  onChange={(e) => update(d.id, { licenseno: e.target.value })}
                  placeholder="License no."
                  className={cn(
                    inputClass,
                    err(d.id, 'licenseno') && 'ring-1 ring-destructive',
                  )}
                />
                <InlineFieldError message={err(d.id, 'licenseno')} />
              </div>
            </div>
            <div>
              <input
                value={d.email ?? ''}
                onChange={(e) => update(d.id, { email: e.target.value })}
                placeholder="Email"
                className={cn(
                  inputClass,
                  err(d.id, 'email') && 'ring-1 ring-destructive',
                )}
              />
              <InlineFieldError message={err(d.id, 'email')} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <input
                  value={d.state ?? ''}
                  onChange={(e) => update(d.id, { state: e.target.value })}
                  placeholder="State"
                  className={cn(
                    inputClass,
                    err(d.id, 'state') && 'ring-1 ring-destructive',
                  )}
                />
                <InlineFieldError message={err(d.id, 'state')} />
              </div>
              <div>
                <input
                  value={d.city ?? ''}
                  onChange={(e) => update(d.id, { city: e.target.value })}
                  placeholder="City"
                  className={cn(
                    inputClass,
                    err(d.id, 'city') && 'ring-1 ring-destructive',
                  )}
                />
                <InlineFieldError message={err(d.id, 'city')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <input
                  value={d.postcode ?? ''}
                  onChange={(e) => update(d.id, { postcode: e.target.value })}
                  placeholder="Postcode"
                  className={cn(
                    inputClass,
                    err(d.id, 'postcode') && 'ring-1 ring-destructive',
                  )}
                />
                <InlineFieldError message={err(d.id, 'postcode')} />
              </div>
              <div>
                <input
                  value={d.address ?? ''}
                  onChange={(e) => update(d.id, { address: e.target.value })}
                  placeholder="Address"
                  className={cn(
                    inputClass,
                    err(d.id, 'address') && 'ring-1 ring-destructive',
                  )}
                />
                <InlineFieldError message={err(d.id, 'address')} />
              </div>
            </div>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="w-full rounded-full border border-[#0061e0] text-[#0061e0] py-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={add}
        disabled={reachedMaxDrivers}
      >
        + Add More Driver
      </button>
      {reachedMaxDrivers ? (
        <p className="text-[12px] text-[#6b7280] text-center">
          Maximum {maxDrivers} additional drivers allowed.
        </p>
      ) : null}
    </div>
  );
}

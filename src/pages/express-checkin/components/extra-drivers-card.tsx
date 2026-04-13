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

export function ExtraDriversCard({
  value,
  onChange,
}: {
  value: ExtraDriversForm;
  onChange: (next: ExtraDriversForm) => void;
}) {
  const drivers = value.drivers ?? [];
  const removedCustomerIds = value.removedCustomerIds ?? [];

  const update = (id: string, patch: Partial<ExtraDriverItem>) => {
    onChange({
      drivers: drivers.map((d) => (d.id === id ? { ...d, ...patch } : d)),
      removedCustomerIds,
    });
  };

  const remove = (id: string) => {
    const target = drivers.find((d) => d.id === id);
    const nextRemoved = [...removedCustomerIds];
    if (target && target.customerid > 0 && !nextRemoved.includes(target.customerid)) {
      nextRemoved.push(target.customerid);
    }
    onChange({
      drivers: drivers.filter((d) => d.id !== id),
      removedCustomerIds: nextRemoved,
    });
  };

  const add = () => {
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

  return (
    <div className="flex flex-col gap-3">
      {drivers.map((d, idx) => (
        <div key={d.id} className="rounded-[12px] border border-[#e2e8f0] p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] text-[#6b7280]">Driver {idx + 1}</span>
            <button
              type="button"
              className="text-[12px] text-red-600"
              onClick={() => remove(d.id)}
            >
              Remove
            </button>
          </div>
          <div className="grid gap-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                value={d.firstname ?? ''}
                onChange={(e) => update(d.id, { firstname: e.target.value })}
                placeholder="First name"
                className="w-full bg-white border border-[#e2e8f0] rounded-[8px] px-3 py-2 text-[14px]"
              />
              <input
                value={d.lastname ?? ''}
                onChange={(e) => update(d.id, { lastname: e.target.value })}
                placeholder="Last name"
                className="w-full bg-white border border-[#e2e8f0] rounded-[8px] px-3 py-2 text-[14px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={d.dateofbirth ?? ''}
                onChange={(e) => update(d.id, { dateofbirth: e.target.value })}
                placeholder="Date of birth (01/Jan/1980)"
                className="w-full bg-white border border-[#e2e8f0] rounded-[8px] px-3 py-2 text-[14px]"
              />
              <input
                value={d.licenseno ?? ''}
                onChange={(e) => update(d.id, { licenseno: e.target.value })}
                placeholder="License no."
                className="w-full bg-white border border-[#e2e8f0] rounded-[8px] px-3 py-2 text-[14px]"
              />
            </div>
            <input
              value={d.email ?? ''}
              onChange={(e) => update(d.id, { email: e.target.value })}
              placeholder="Email"
              className="w-full bg-white border border-[#e2e8f0] rounded-[8px] px-3 py-2 text-[14px]"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                value={d.state ?? ''}
                onChange={(e) => update(d.id, { state: e.target.value })}
                placeholder="State"
                className="w-full bg-white border border-[#e2e8f0] rounded-[8px] px-3 py-2 text-[14px]"
              />
              <input
                value={d.city ?? ''}
                onChange={(e) => update(d.id, { city: e.target.value })}
                placeholder="City"
                className="w-full bg-white border border-[#e2e8f0] rounded-[8px] px-3 py-2 text-[14px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={d.postcode ?? ''}
                onChange={(e) => update(d.id, { postcode: e.target.value })}
                placeholder="Postcode"
                className="w-full bg-white border border-[#e2e8f0] rounded-[8px] px-3 py-2 text-[14px]"
              />
              <input
                value={d.address ?? ''}
                onChange={(e) => update(d.id, { address: e.target.value })}
                placeholder="Address"
                className="w-full bg-white border border-[#e2e8f0] rounded-[8px] px-3 py-2 text-[14px]"
              />
            </div>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="w-full rounded-full border border-[#0061e0] text-[#0061e0] py-2 font-semibold"
        onClick={add}
      >
        + Add More Driver
      </button>
    </div>
  );
}

export interface CustomerDetailsForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  numberTravelling: string;
  dateOfBirth: string;
  licenseNo: string;
  licenseIssued: string;
  licenseExpires: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postcode: string;
}

const inputClass =
  'w-full bg-white border border-[#e2e8f0] rounded-[8px] px-4 py-3 text-[14px] text-[#2c3e50] focus:ring-1 focus:ring-[#0061e0] outline-none';

export function CustomerDetailsCard({
  value,
  onChange,
}: {
  value: CustomerDetailsForm;
  onChange: (patch: Partial<CustomerDetailsForm>) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        placeholder="First Name"
        value={value.firstName}
        onChange={(e) => onChange({ firstName: e.target.value })}
        className={inputClass}
      />
      <input
        type="text"
        placeholder="Last Name"
        value={value.lastName}
        onChange={(e) => onChange({ lastName: e.target.value })}
        className={inputClass}
      />
      <input
        type="email"
        placeholder="Email"
        value={value.email}
        onChange={(e) => onChange({ email: e.target.value })}
        className={inputClass}
      />
      <input
        type="tel"
        placeholder="Phone (with country code)"
        value={value.phone}
        onChange={(e) => onChange({ phone: e.target.value })}
        className={inputClass}
        autoComplete="tel"
      />
      <input
        type="text"
        placeholder="Number of People Traveling"
        value={value.numberTravelling}
        onChange={(e) => onChange({ numberTravelling: e.target.value })}
        className={inputClass}
      />
      <input
        type="text"
        placeholder="Date of Birth"
        value={value.dateOfBirth}
        onChange={(e) => onChange({ dateOfBirth: e.target.value })}
        className={inputClass}
      />
      <input
        type="text"
        placeholder="License Number"
        value={value.licenseNo}
        onChange={(e) => onChange({ licenseNo: e.target.value })}
        className={inputClass}
      />
      <input
        type="text"
        placeholder="License Issuing Country"
        value={value.licenseIssued}
        onChange={(e) => onChange({ licenseIssued: e.target.value })}
        className={inputClass}
      />
      <input
        type="text"
        placeholder="License Expiry"
        value={value.licenseExpires}
        onChange={(e) => onChange({ licenseExpires: e.target.value })}
        className={inputClass}
      />
      <input
        type="text"
        placeholder="Address"
        value={value.address}
        onChange={(e) => onChange({ address: e.target.value })}
        className={inputClass}
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="City"
          value={value.city}
          onChange={(e) => onChange({ city: e.target.value })}
          className={inputClass}
        />
        <input
          type="text"
          placeholder="State"
          value={value.state}
          onChange={(e) => onChange({ state: e.target.value })}
          className={inputClass}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="Country"
          value={value.country}
          onChange={(e) => onChange({ country: e.target.value })}
          className={inputClass}
        />
        <input
          type="text"
          placeholder="Post Code"
          value={value.postcode}
          onChange={(e) => onChange({ postcode: e.target.value })}
          className={inputClass}
        />
      </div>
    </div>
  );
}

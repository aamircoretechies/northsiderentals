import { SignaturePad } from './signature-pad';

export function DamageCoverCard() {
  const DataRow = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div className="flex flex-col mb-4">
      <span className="text-black text-[14px] font-bold mb-0.5">{label}</span>
      <span className="text-black text-[14px] leading-snug">{value}</span>
    </div>
  );

  return (
    <div className="flex flex-col">
      <DataRow label="Insurance:" value="Combined Damage Waiver - 7+ Days" />
      <DataRow label="Policy Holder:" value="Siddahartha TEST" />
      <DataRow label="Insurance Excess Fee:" value="$500.00" />
      <DataRow label="Insurance Fee:" value="$154.00 ($14.00/Day (11 Days))" />
      
      <div className="flex flex-col mb-6">
        <span className="text-black text-[14px] font-bold mb-0.5">Insurance Description:</span>
        <span className="text-black text-[14px] leading-snug">
          Combined damage waiver will conditionally cover you with a minimum liability amount of $500.00 in the event of a vehicle-on-vehicle incident and a minimum liability amount of $1,000.00, or part thereof in the event of a single vehicle incident.
        </span>
        <span className="text-black text-[14px] leading-snug mt-4">
          These amounts are not further reducible.
        </span>
      </div>
      
      <div className="mt-2">
        <SignaturePad />
      </div>
    </div>
  );
}

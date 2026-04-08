import { SignaturePad } from './signature-pad';

export function AuthorizeCreditCardCard() {
  const DataRow = ({ label, value }: { label: string, value: string }) => (
    <div className="flex flex-col mb-4">
      <span className="text-black text-[14px] font-bold mb-0.5">{label}</span>
      <span className="text-black text-[14px]">{value}</span>
    </div>
  );

  return (
    <div className="flex flex-col">
      <DataRow label="Credit Card Number" value="XXXX XXXX XXXX XX98" />
      <DataRow label="Name:" value="Ethan Carter" />
      <DataRow label="Expiry Date" value="01 / 28" />
      
      <div className="mt-2">
        <SignaturePad />
      </div>
    </div>
  );
}

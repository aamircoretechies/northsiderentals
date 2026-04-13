export interface CollectCardForm {
  cardNumber: string;
  cardName: string;
  expiryMonth: string;
  expiryYear: string;
  cvc: string;
  email: string;
  acceptedTerms: boolean;
}

export function CollectCardDetailCard({
  value,
  onChange,
}: {
  value: CollectCardForm;
  onChange: (patch: Partial<CollectCardForm>) => void;
}) {
  const Field = ({
    label,
    keyName,
    type = 'text',
  }: {
    label: string;
    keyName: keyof CollectCardForm;
    type?: string;
  }) => (
    <div className="flex flex-col gap-1.5 w-full mb-3">
      <label className="text-[13px] text-[#8692a6] font-medium">{label}</label>
      <input
        type={type}
        value={String(value[keyName] ?? '')}
        onChange={(e) => onChange({ [keyName]: e.target.value })}
        className="w-full bg-white border border-[#e2e8f0] rounded-[8px] px-3 py-2.5 text-[14px] text-black focus:ring-1 focus:ring-[#0061e0] outline-none"
      />
    </div>
  );

  return (
    <div className="flex flex-col">
      <Field label="Card Number *" keyName="cardNumber" />
      <Field label="Name On Card *" keyName="cardName" />
      <div className="grid grid-cols-3 gap-3 mb-3">
        <Field label="MM" keyName="expiryMonth" />
        <Field label="YY" keyName="expiryYear" />
        <Field label="CVC" keyName="cvc" />
      </div>
      <Field label="Email *" keyName="email" type="email" />
      <label className="flex items-start gap-3 mt-2">
        <input
          type="checkbox"
          checked={Boolean(value.acceptedTerms)}
          onChange={(e) => onChange({ acceptedTerms: e.target.checked })}
          className="mt-1 w-[18px] h-[18px]"
        />
        <span className="text-[13px] text-black leading-snug pt-0.5">
          I have read and accept the Terms and Condition
        </span>
      </label>
    </div>
  );
}

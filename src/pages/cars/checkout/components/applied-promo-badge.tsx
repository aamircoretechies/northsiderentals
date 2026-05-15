import { getPromoCodeFromSearchParams } from '@/utils/promo-code';

export function AppliedPromoBadge({
  searchParams,
}: {
  searchParams?: Record<string, unknown> | null;
}) {
  const code = getPromoCodeFromSearchParams(searchParams);
  if (!code) return null;

  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-[#ffc107]/20 border border-[#ffc107]/40 px-4 py-2 text-[13px] font-semibold text-black">
      <span className="text-[#6b7280] font-medium">Promo applied:</span>
      <span className="uppercase tracking-wide">{code}</span>
    </div>
  );
}

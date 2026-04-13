import { Armchair, Luggage, Check, AlertCircle } from 'lucide-react';
import { Link } from 'react-router';
import { normalizeMediaUrl } from '@/lib/helpers';

export interface CarSearchMeta {
  taxinclusive?: boolean;
  taxrate?: number;
  currency_symbol?: string;
  currency_name?: string;
}

export interface CarCardProps {
  /** API `vehiclecategoryid` — used for get-details / booking. */
  id: string | number;
  /** API `vehiclecategorytypeid` — maps to `category_id` in create booking when search used 0. */
  vehiclecategorytypeid?: number;
  /** API `rateperiod_typeid` for booking payload */
  rateperiod_typeid?: number;
  image_url: string;
  title: string;
  /** API `vehiclecategorytype` e.g. "Small to Mid Size Cars" */
  subtitle?: string;
  transmission: string;
  year: string;
  passengers: number;
  bags: number;
  features: string[];
  original_price: string;
  discount_price: string;
  special_price_text: string;
  discount_percentage?: number | string;
  searchParams?: Record<string, unknown>;
  locations?: unknown[];
  searchMeta?: CarSearchMeta;
  currency_symbol?: string;
  /** Total rental from API for checkout summaries */
  total_rate_after_discount?: number;
  unavailable?: boolean;
  unavailable_message?: string;
}

export function CarCard(props: CarCardProps) {
  const sym = props.currency_symbol ?? props.searchMeta?.currency_symbol ?? '$';
  const imageSrc = normalizeMediaUrl(props.image_url);
  const detailParts = [
    props.transmission?.trim(),
    props.year?.trim() ? `${props.year.trim()} Model` : '',
  ].filter(Boolean);

  const priceUnavailable =
    props.unavailable ||
    !props.discount_price ||
    parseFloat(String(props.discount_price)) === 0;

  const cardInner = (
    <>
      <div className="relative rounded-[18px] bg-gradient-to-b from-[#eef6fc] to-[#f2f6fa] p-6 mb-5 h-[210px] flex items-center justify-center overflow-hidden ring-1 ring-black/[0.04]">
        <div className="absolute top-3 end-3 flex flex-col gap-2 z-[1]">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 shadow-sm text-[#374151] font-bold text-sm border border-black/[0.06]">
            <Armchair size={15} strokeWidth={2.5} />
            <span>{props.passengers}</span>
          </div>
          <div className="bg-white/95 backdrop-blur-sm rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 shadow-sm text-[#374151] font-bold text-sm border border-black/[0.06]">
            <Luggage size={15} strokeWidth={2.5} />
            <span>{props.bags}</span>
          </div>
        </div>

        {imageSrc ? (
          <img
            src={imageSrc}
            alt={props.title || 'Vehicle'}
            loading="lazy"
            decoding="async"
            className="max-w-[92%] max-h-[170px] w-auto h-auto object-contain object-center drop-shadow-sm transition-transform duration-300 ease-out group-hover:scale-[1.02]"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <span className="text-sm text-muted-foreground text-center px-4">
            No image provided
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-start gap-2 mb-2">
        <h3 className="text-[21px] font-bold text-foreground leading-tight flex-1 min-w-0">
          {props.title}
        </h3>
        {props.subtitle ? (
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[#0061e0] bg-[#0061e0]/10 px-2.5 py-1 rounded-full shrink-0">
            {props.subtitle}
          </span>
        ) : null}
      </div>

      {detailParts.length > 0 ? (
        <p className="text-muted-foreground text-[15px] font-medium mb-4">
          {detailParts.join(', ')}
        </p>
      ) : (
        <div className="mb-4" />
      )}

      <div className="grid grid-cols-1 gap-y-1.5 mb-6 text-[13px]">
        {props.features.map((feature, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <Check
              size={16}
              className="text-emerald-600 shrink-0 mt-0.5"
              strokeWidth={2.5}
            />
            <span className="text-emerald-800/90 font-medium leading-snug">
              {feature}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-1">
        {priceUnavailable ? (
          <div className="w-full rounded-[22px] py-4 flex flex-col items-center justify-center gap-1 mb-3 bg-muted text-muted-foreground cursor-not-allowed border border-dashed border-border">
            {props.unavailable ? (
              <>
                <AlertCircle className="size-5 opacity-80" />
                <span className="text-[15px] font-bold">
                  {props.unavailable_message?.trim() || 'Not available'}
                </span>
              </>
            ) : (
              <span className="text-[17px] font-bold">Not available</span>
            )}
          </div>
        ) : (
          <Link
            to="/cars/checkout/options"
            state={{ car: props }}
            className={`group/btn relative flex w-full items-center justify-center gap-2 rounded-[22px] bg-[#ffc107] py-4 font-bold text-black shadow-sm transition-all duration-200 hover:bg-[#ffb300] hover:shadow-md active:scale-[0.99] ${
              props.discount_percentage ? 'mt-1' : ''
            }`}
          >
            {props.discount_percentage ? (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#e85d04] px-3.5 py-0.5 text-[12px] font-extrabold tracking-wide text-white whitespace-nowrap shadow">
                {props.discount_percentage}% OFF
              </span>
            ) : null}
            {props.original_price &&
            props.original_price !== props.discount_price ? (
              <span className="text-[22px] font-bold text-[#8a6910] line-through decoration-2 opacity-90">
                {sym}
                {props.original_price}
              </span>
            ) : null}
            <span className="text-[26px] font-extrabold tracking-tight">
              {sym}
              {props.discount_price}
            </span>
            <span className="text-[13px] font-semibold opacity-80">/ day</span>
          </Link>
        )}
        <p className="text-center text-muted-foreground text-[13px] font-medium mt-2 leading-snug px-1">
          {props.special_price_text}
        </p>
      </div>
    </>
  );

  return (
    <div
      className={`group flex h-full flex-col rounded-[24px] border bg-card p-5 shadow-sm transition-all duration-300 ease-out hover:shadow-lg hover:border-[#0061e0]/20 ${
        props.unavailable ? 'opacity-90 saturate-[0.85]' : ''
      }`}
    >
      {cardInner}
    </div>
  );
}

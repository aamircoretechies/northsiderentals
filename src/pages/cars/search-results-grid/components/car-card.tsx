import { Armchair, Luggage, Check } from 'lucide-react';
import { Link } from 'react-router';
import { toAbsoluteUrl } from '@/lib/helpers';

export interface CarCardProps {
  id: string | number;
  image_url: string;
  title: string;
  transmission: string;
  year: string;
  passengers: number;
  bags: number;
  features: string[];
  original_price: string;
  discount_price: string;
  special_price_text: string;
  discount_percentage?: number | string;
  searchParams?: any;
  locations?: any[];
}

export function CarCard(props: CarCardProps) {
  return (
    <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-4 flex flex-col h-full hover:shadow-md transition-shadow">
      {/* Image Section */}
      <div className="bg-[#f2f6fa] rounded-[16px] p-6 relative flex items-center justify-center mb-5 h-[200px]">
        {/* Badges */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <div className="bg-[#fcedce] rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-sm text-[#4b5563] font-bold">
            <Armchair size={16} strokeWidth={2.5} />
            <span className="text-lg leading-none">{props.passengers}</span>
          </div>
          <div className="bg-[#fcedce] rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-sm text-[#4b5563] font-bold">
            <Luggage size={16} strokeWidth={2.5} />
            <span className="text-lg leading-none">{props.bags}</span>
          </div>
        </div>

        <img
          src={props.image_url.startsWith('http') ? props.image_url : toAbsoluteUrl(props.image_url)}
          alt={props.title}
          className="max-w-full max-h-[150px] object-contain drop-shadow-md mix-blend-darken"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>

      {/* Header text */}
      <h3 className="text-[22px] font-bold text-black leading-tight mb-1">{props.title}</h3>
      <p className="text-[#6b7280] text-[15px] font-medium mb-5">
        {props.transmission}, {props.year} Model
      </p>

      {/* Features Grid */}
      <div className="grid grid-cols-1 gap-y-1 gap-x-1 mb-6 text-[14px]">
        {props.features.map((feature, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <Check size={18} className="text-[#10b981] shrink-0 mt-[1px]" strokeWidth={3} />
            <span className="text-[#16a34a] font-medium leading-tight">{feature}</span>
          </div>
        ))}
      </div>

      {/* Pricing block placed at bottom */}
      <div className="mt-auto">
        <Link 
          to="/cars/checkout/options" 
          state={{ car: props }} 
          className={`w-full bg-[#ffc107] hover:bg-[#ffb000] transition-colors rounded-[24px] py-3.5 flex items-center justify-center gap-3 mb-3 text-black relative ${props.discount_percentage ? 'mt-6' : 'mt-2'}`}
        >
          {props.discount_percentage ? (
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#e85d04] text-white text-[13px] font-extrabold px-4 py-0.5 rounded-full whitespace-nowrap tracking-wide">
              {props.discount_percentage}% DISCOUNT
            </div>
          ) : null}
          {props.original_price && props.original_price !== props.discount_price ? (
            <span className="text-[24px] font-bold text-[#a17a00]">${props.original_price}</span>
          ) : null}
          <span className="text-[28px] font-extrabold">${props.discount_price}</span>
        </Link>
        <p className="text-center text-[#4b5563] text-[14px] font-medium">{props.special_price_text}</p>
      </div>
    </div>
  );
}

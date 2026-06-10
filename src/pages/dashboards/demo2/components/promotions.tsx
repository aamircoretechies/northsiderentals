import { toAbsoluteUrl } from '@/lib/helpers';
import type { Promotion } from '@/services/dashboard';

interface PromotionsProps {
  promotions?: Promotion[];
}

export function Promotions({ promotions }: PromotionsProps) {
  if (!promotions || promotions.length === 0) {
    return null;
  }

  return (
    <section
      id="promotions"
      className="w-full flex flex-col gap-4 scroll-mt-28"
      aria-labelledby="promotions-heading"
    >
      <h2
        id="promotions-heading"
        className="text-[22px] font-extrabold text-black mb-2"
      >
        Promotions
      </h2>
      <div className="flex gap-4 lg:gap-6 overflow-x-auto snap-x pb-4 no-scrollbar">
        {promotions.map((promo) => (
          <div
            key={String(promo.id)}
            className="shrink-0 snap-center sm:snap-start flex flex-col w-[calc(100%)] md:w-[calc(100%)] lg:w-[calc(70%-0.5rem)] group"
          >
            {/* Intentionally non-interactive: do not use promo.link for navigation. */}
            <div className="bg-[#f0f4f9] rounded-[24px] overflow-hidden relative shadow-sm hover:shadow-md transition-all duration-300 w-full aspect-[3/1] sm:aspect-[3/1]">
              <img
                src={promo.image_url.startsWith('http') ? promo.image_url : toAbsoluteUrl(promo.image_url)}
                alt={promo.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML = '<div class="absolute inset-0 flex items-center justify-center text-gray-400 font-bold bg-gray-100">Image Unavailable</div>';
                }}
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 sm:p-6 text-white transition-all duration-300">
                <h3 className="text-lg sm:text-xl font-bold truncate text-white">{promo.title}</h3>
                <p className="text-sm text-gray-200 truncate mt-1">{promo.description}</p>
                {promo.coupon_code && (
                  <div className="mt-3 inline-block bg-[#ffc107] text-black font-extrabold px-4 py-1.5 rounded-full text-xs sm:text-sm uppercase tracking-wider shadow-sm">
                    {promo.coupon_code}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

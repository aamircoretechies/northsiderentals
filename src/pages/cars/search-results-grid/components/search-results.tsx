import { useState } from 'react';
import { useLocation } from 'react-router';
import { Funnel, LayoutGrid, List, Search as SearchIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { CarCard, CarCardProps, CarSearchMeta } from './car-card';
import { CarsFiltersSheet } from './cars-filters-sheet';

type SearchResultsType = 'card' | 'list';

/** Backend marks rows as not bookable with available / numbervehiclesavailable. */
function isCarBookable(car: Record<string, unknown>): boolean {
  const available = car.available;
  const numVehicles = car.numbervehiclesavailable;
  const hasAvailKey = Object.prototype.hasOwnProperty.call(car, 'available');
  const hasNumKey = Object.prototype.hasOwnProperty.call(
    car,
    'numbervehiclesavailable',
  );

  if (available === true) return true;
  if (typeof available === 'number' && available > 0) return true;
  if (typeof available === 'string' && Number(available) > 0) return true;

  if (typeof numVehicles === 'number' && numVehicles > 0) return true;
  if (typeof numVehicles === 'string' && Number(numVehicles) > 0) return true;

  if (
    (hasAvailKey && (available === 0 || available === false || available === '0')) ||
    (hasNumKey &&
      (numVehicles === 0 || numVehicles === '0'))
  ) {
    return false;
  }

  if (!hasAvailKey && !hasNumKey) {
    const rate =
      Number(car.totalrateafterdiscount) ||
      Number(car.totalrate) ||
      Number(car.avgrate) ||
      0;
    return rate > 0;
  }

  return false;
}

function pushUniqueMessage(
  messages: string[],
  seen: Set<string>,
  text: unknown,
) {
  const t = typeof text === 'string' ? text.trim() : '';
  if (!t || seen.has(t)) return;
  seen.add(t);
  messages.push(t);
}

function rowAvailableMessage(row: Record<string, unknown>): string {
  const raw =
    row.availablemessage ??
    row.AvailableMessage ??
    row.available_message;
  return typeof raw === 'string' ? raw.trim() : '';
}

/** Hide boilerplate API status text so real `availablemessage` content stands out. */
function isGenericSearchMessage(text: string): boolean {
  const s = text.trim().toLowerCase();
  return (
    s === '' ||
    s === 'search completed.' ||
    s === 'search completed' ||
    s === 'success' ||
    s === 'ok'
  );
}

/**
 * Location / validation messages from the API, ordered so real errors (non-zero
 * errorcode) appear before informational rows.
 */
function getLocationFeesArray(
  data: Record<string, unknown> | undefined,
): unknown[] | undefined {
  if (!data) return undefined;
  const lf =
    data.locationfees ?? data.LocationFees ?? data.location_fees;
  return Array.isArray(lf) ? lf : undefined;
}

function getAvailableCarsArray(
  data: Record<string, unknown> | undefined,
): unknown[] | undefined {
  if (!data) return undefined;
  const ac =
    data.availablecars ?? data.AvailableCars ?? data.available_cars;
  return Array.isArray(ac) ? ac : undefined;
}

function collectAvailabilityMessages(data: Record<string, unknown> | undefined): string[] {
  if (!data) return [];
  const messages: string[] = [];
  const seen = new Set<string>();

  const locationFees = getLocationFeesArray(data);
  if (Array.isArray(locationFees)) {
    const rows = locationFees.filter(
      (row): row is Record<string, unknown> =>
        !!row && typeof row === 'object',
    );

    const withMessage = rows
      .map((row) => ({
        msg: rowAvailableMessage(row),
        errorCode: Number(row.errorcode) || 0,
      }))
      .filter((x) => x.msg);

    withMessage.sort((a, b) => {
      const aErr = a.errorCode !== 0;
      const bErr = b.errorCode !== 0;
      if (aErr !== bErr) return aErr ? -1 : 1;
      if (a.errorCode !== b.errorCode) return b.errorCode - a.errorCode;
      return 0;
    });

    for (const { msg } of withMessage) {
      pushUniqueMessage(messages, seen, msg);
    }
  }

  const cars = getAvailableCarsArray(data);
  if (Array.isArray(cars)) {
    for (const car of cars) {
      if (!car || typeof car !== 'object') continue;
      const c = car as Record<string, unknown>;
      if (!isCarBookable(c)) {
        const cm = rowAvailableMessage(c);
        if (cm.toLowerCase() === 'available') continue;
        pushUniqueMessage(messages, seen, cm);
      }
    }
  }

  return messages;
}

function extractCurrencyFromData(data: Record<string, unknown> | undefined) {
  const fees = getLocationFeesArray(data);
  const first = fees?.[0] as Record<string, unknown> | undefined;
  const symbol =
    typeof first?.currencysymbol === 'string' && first.currencysymbol.trim()
      ? first.currencysymbol.trim()
      : '$';
  const name =
    typeof first?.currencyname === 'string' ? first.currencyname.trim() : '';
  return { symbol, name };
}

function buildSearchMeta(
  data: Record<string, unknown> | undefined,
  currency: { symbol: string; name: string },
): CarSearchMeta {
  if (!data) {
    return {
      currency_symbol: currency.symbol,
      currency_name: currency.name,
    };
  }
  const tr = data.taxrate;
  const taxrate =
    typeof tr === 'number' ? tr : Number(tr);
  return {
    taxinclusive: Boolean(data.taxinclusive),
    taxrate: Number.isFinite(taxrate) && taxrate > 0 ? taxrate : 0.1,
    currency_symbol: currency.symbol,
    currency_name: currency.name,
  };
}

function seasonNameForCategory(
  data: Record<string, unknown> | undefined,
  categoryId: string | number,
): string {
  if (!data) return '';
  const sr = data.seasonalrates;
  if (!Array.isArray(sr)) return '';
  const idStr = String(categoryId);
  const row = sr.find(
    (r) =>
      r &&
      typeof r === 'object' &&
      String((r as Record<string, unknown>).vehiclecategoryid) === idStr,
  ) as Record<string, unknown> | undefined;
  const season = row?.season;
  return typeof season === 'string' ? season.trim() : '';
}

function carFeaturesFromApi(
  car: Record<string, unknown>,
  seasonName: string,
): string[] {
  const out: string[] = [];
  const min = Number(car.minimumage);
  const max = Number(car.maximumage);
  if (min > 0 && max > 0) out.push(`Driver age ${min}–${max} years`);
  const sipp = car.sippcode;
  if (typeof sipp === 'string' && sipp.trim()) out.push(`SIPP ${sipp.trim()}`);
  const off = car.offerdescription;
  if (typeof off === 'string' && off.trim()) out.push(off.trim());
  if (seasonName) out.push(seasonName);
  const pct = Number(car.vehiclesbookedpercent);
  if (pct >= 85 && Number(car.available) > 0) {
    out.push('High demand — book early');
  }
  const minDays = Number(car.minimumbookingday);
  if (minDays > 1) out.push(`Minimum booking ${minDays} days`);
  return out;
}

function mapApiCarToCard(
  car: Record<string, unknown>,
  index: number,
  apiData: Record<string, unknown> | undefined,
  searchMeta: CarSearchMeta,
  currencySymbol: string,
  searchParams: unknown,
  locations: unknown,
  unavailable: boolean,
): CarCardProps {
  const vehicleCategoryId = Number(car.vehiclecategoryid);
  const typeIdRaw = car.vehiclecategorytypeid;
  const fallbackId: string | number =
    typeof typeIdRaw === 'number' || typeof typeIdRaw === 'string'
      ? typeIdRaw
      : index;
  const id: string | number =
    Number.isFinite(vehicleCategoryId) && vehicleCategoryId > 0
      ? vehicleCategoryId
      : fallbackId;

  const noDays = Math.max(Number(car.numberofdays) || 1, 1);
  const ogPrice =
    Number(car.totalrate) ||
    Number(car.totalratebeforediscount) ||
    (Number(car.avgrate) ? Number(car.avgrate) * noDays : 0);
  const finalPrice =
    car.totalrateafterdiscount !== undefined &&
    Number(car.totalrateafterdiscount) !== 0
      ? Number(car.totalrateafterdiscount)
      : Number(car.totalrate) ||
        (Number(car.discounteddailyrate)
          ? Number(car.discounteddailyrate) * noDays
          : ogPrice);

  const dailyOg = Math.round(ogPrice / noDays) || 0;
  const dailyFinal = Math.round(finalPrice / noDays) || dailyOg;

  const isDiscounted = ogPrice > finalPrice;
  const discountPerc = isDiscounted
    ? Math.round(((ogPrice - finalPrice) / ogPrice) * 100)
    : Number(car.discountrate) > 0
      ? Number(car.discountrate)
      : undefined;

  const desc1 =
    typeof car.vehicledescription1 === 'string' ? car.vehicledescription1 : '';
  const yearMatch = desc1.match(/\d{4}/);
  const transmission = desc1.split(',')[0]?.trim() || '';

  const imageRaw = typeof car.imageurl === 'string' ? car.imageurl : '';

  const title =
    (typeof car.categoryfriendlydescription === 'string' &&
      car.categoryfriendlydescription.trim()) ||
    (typeof car.vehiclecategory === 'string' && car.vehiclecategory.trim()) ||
    (typeof car.categoryname === 'string' && car.categoryname.trim()) ||
    '';

  const subtitle =
    typeof car.vehiclecategorytype === 'string'
      ? car.vehiclecategorytype.trim()
      : '';

  const ratePeriod =
    typeof car.rateperiod_typename === 'string'
      ? car.rateperiod_typename.trim()
      : 'day';
  const periodLabel = ratePeriod ? `per ${ratePeriod}` : 'per day';

  const season = seasonNameForCategory(apiData, id as number);
  const features = carFeaturesFromApi(car, season);

  const availMsg =
    typeof car.availablemessage === 'string' ? car.availablemessage.trim() : '';

  const typeIdNum = Number(car.vehiclecategorytypeid);
  const ratePeriodTypeId = Number(car.rateperiod_typeid);

  return {
    id,
    vehiclecategorytypeid:
      Number.isFinite(typeIdNum) && typeIdNum > 0 ? typeIdNum : undefined,
    rateperiod_typeid:
      Number.isFinite(ratePeriodTypeId) && ratePeriodTypeId > 0
        ? ratePeriodTypeId
        : undefined,
    image_url: imageRaw,
    title,
    subtitle: subtitle || undefined,
    transmission,
    year: yearMatch?.[0] || '',
    passengers: Number(car.numberofadults) || 0,
    bags:
      (Number(car.numberoflargecases) || 0) +
      (Number(car.numberofsmallcases) || 0),
    features,
    original_price: dailyOg.toString(),
    discount_price: unavailable ? '0' : dailyFinal.toString(),
    special_price_text: unavailable
      ? availMsg || 'Not available for these dates'
      : `${noDays}-day rental · ${currencySymbol}${Math.round(finalPrice)} total · ${currencySymbol}${dailyFinal} ${periodLabel}`,
    discount_percentage: unavailable ? undefined : discountPerc,
    searchParams: searchParams as Record<string, unknown>,
    locations: locations as unknown[],
    searchMeta,
    currency_symbol: currencySymbol,
    total_rate_after_discount: unavailable ? 0 : finalPrice,
    unavailable,
    unavailable_message: unavailable ? availMsg || undefined : undefined,
  };
}

export function SearchResults({ mode }: { mode: SearchResultsType }) {
  const [searchInput, setSearchInput] = useState('');
  const [activeTab, setActiveTab] = useState<SearchResultsType>(mode);

  const location = useLocation();
  const searchData = location.state?.searchData;
  const searchParams = location.state?.searchParams;
  const locations = location.state?.locations;

  const apiPayload = searchData as Record<string, unknown> | undefined;
  const nestedData = apiPayload?.data;
  const apiData: Record<string, unknown> | undefined =
    nestedData && typeof nestedData === 'object' && !Array.isArray(nestedData)
      ? (nestedData as Record<string, unknown>)
      : apiPayload;
  const rawCars = apiData
    ? (getAvailableCarsArray(apiData) as Record<string, unknown>[]) ?? []
    : [];

  const bookableCars = rawCars.filter(isCarBookable);
  const soldOutCars = rawCars.filter((c) => !isCarBookable(c));

  const currency = extractCurrencyFromData(apiData);
  const searchMeta = buildSearchMeta(apiData, currency);

  const availabilityMessages = collectAvailabilityMessages(apiData);
  const apiStatusMessage =
    typeof searchData?.message === 'string' ? searchData.message.trim() : '';
  const showApiStatusMessage =
    apiStatusMessage && !isGenericSearchMessage(apiStatusMessage);

  const bookableItems: CarCardProps[] = bookableCars.map(
    (car: Record<string, unknown>, index: number) =>
      mapApiCarToCard(
        car,
        index,
        apiData,
        searchMeta,
        currency.symbol,
        searchParams,
        locations,
        false,
      ),
  );

  const soldOutItems: CarCardProps[] = soldOutCars.map(
    (car: Record<string, unknown>, index: number) =>
      mapApiCarToCard(
        car,
        index,
        apiData,
        searchMeta,
        currency.symbol,
        searchParams,
        locations,
        true,
      ),
  );

  const filterText = searchInput.trim().toLowerCase();
  const items = filterText
    ? bookableItems.filter(
        (it) =>
          it.title.toLowerCase().includes(filterText) ||
          (it.subtitle?.toLowerCase().includes(filterText) ?? false),
      )
    : bookableItems;

  const filteredSoldOut = filterText
    ? soldOutItems.filter(
        (it) =>
          it.title.toLowerCase().includes(filterText) ||
          (it.subtitle?.toLowerCase().includes(filterText) ?? false),
      )
    : soldOutItems;

  /** At least one bookable vehicle from API (before search box filter). */
  const hasBookableFromApi = bookableItems.length > 0;
  /** Show sold-out cards only when user can still book something (comparison). */
  const showSoldOutSection =
    hasBookableFromApi && filteredSoldOut.length > 0;

  return (
    <div className="flex flex-col items-stretch gap-7">
      <div className="flex items-center gap-2 w-full">
        <div className="relative flex items-center w-full mx-auto  z-1">
          <SearchIcon
            className="absolute start-4 text-muted-foreground"
            size={16}
          />

          <Input
            id="search-input"
            value={searchInput}
            placeholder="Search for cars..."
            onChange={(e) => setSearchInput(e.target.value)}
            className="ps-9 pe-10 w-full bg-white shadow-sm"
          />

          {/*  <Badge className="absolute end-2 gap-1" variant="outline" size="sm">
            ⌘ K
          </Badge> */}
        </div>

        <CarsFiltersSheet
          trigger={
            <Button>
              <Funnel /> Filter
            </Button>
          }
        />
      </div>

      <div className="flex flex-wrap items-center gap-5 justify-between mt-0">
        {hasBookableFromApi ? (
          <h3 className="text-sm font-medium text-muted-foreground">
            {items.length === bookableItems.length
              ? `${items.length} vehicle${items.length === 1 ? '' : 's'} available`
              : `${items.length} of ${bookableItems.length} vehicles match your search`}
          </h3>
        ) : null}

        {/* <div className="flex items-center gap-2.5">
          <Select defaultValue="price-low">
            <SelectTrigger className="w-[175px] bg-white">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="popularity">Popularity</SelectItem>
              <SelectItem value="newest">Newest Arrivals</SelectItem>
            </SelectContent>
          </Select>

          <ToggleGroup
            type="single"
            variant="outline"
            value={activeTab}
            onValueChange={(value) => {
              if (value === 'card' || value === 'list') setActiveTab(value);
            }}
            className="bg-white"
          >
            <ToggleGroupItem value="card">
              <LayoutGrid size={16} />
            </ToggleGroupItem>
            <ToggleGroupItem value="list">
              <List size={16} />
            </ToggleGroupItem>
          </ToggleGroup>
        </div> */}
      </div>

      {!searchData ? (
        <div className="flex flex-col items-center justify-center p-10 bg-white rounded-[16px] shadow-sm border border-gray-100 min-h-[300px]">
          <SearchIcon className="w-12 h-12 text-[#8692a6] mb-4" />
          <h3 className="text-[#0061e0] font-bold text-[18px]">No search data</h3>
          <p className="text-[#8692a6] text-[14px] mt-2">Please return to the dashboard and perform a search.</p>
        </div>
      ) : !hasBookableFromApi ? (
        <div className="flex flex-col items-center justify-center text-center p-10 sm:p-12 bg-white rounded-[20px] shadow-sm border border-gray-100 min-h-[320px] max-w-lg mx-auto">
          <div className="rounded-full bg-[#f0f7ff] p-4 mb-5">
            <SearchIcon className="w-10 h-10 text-[#0061e0]" strokeWidth={1.75} />
          </div>
          {availabilityMessages.length > 0 ? (
            <>
              <p className="text-lg sm:text-xl font-semibold text-[#111827] leading-relaxed px-2">
                {availabilityMessages[0]}
              </p>
              <p className="text-sm text-muted-foreground mt-5 max-w-md">
                Adjust your pickup or drop-off date and time, or choose another
                location, then search again.
              </p>
            </>
          ) : soldOutItems.length > 0 ? (
            <>
              <h3 className="text-xl font-bold text-[#0061e0]">
                Nothing available to book
              </h3>
              <p className="text-[15px] text-muted-foreground mt-3 max-w-md leading-relaxed">
                Every vehicle in this search is fully booked or not offered on
                your dates. Try different dates or another pickup or drop-off
                location.
              </p>
            </>
          ) : (
            <>
              <h3 className="text-xl font-bold text-[#0061e0]">
                No cars available right now
              </h3>
              <p className="text-[15px] text-muted-foreground mt-3 max-w-md leading-relaxed">
                We couldn&apos;t find any vehicles for these dates and locations.
                Try widening your dates or selecting a different office.
              </p>
              {showApiStatusMessage ? (
                <p className="text-sm text-muted-foreground mt-4 max-w-md">
                  {apiStatusMessage}
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {items.length > 0 ? (
            <div
              className={
                activeTab === 'card'
                  ? 'grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-2'
                  : 'grid grid-cols-1 gap-6'
              }
            >
              {items.map((item, index) => (
                <div
                  key={`bookable-${String(item.id)}-${index}`}
                  className={
                    activeTab === 'list'
                      ? 'flex flex-row max-w-4xl mx-auto'
                      : ''
                  }
                >
                  <CarCard {...item} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              No vehicles match your search text. Clear the search box to see
              all {bookableItems.length} available option
              {bookableItems.length === 1 ? '' : 's'}.
            </p>
          )}

          {showSoldOutSection ? (
            <div className="flex flex-col gap-4">
              <div className="border-t border-border pt-8">
                <h3 className="text-base font-bold text-foreground">
                  Also in this category (not available on your dates)
                </h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                  For reference only — choose an available vehicle above to book.
                </p>
              </div>
              <div
                className={
                  activeTab === 'card'
                    ? 'grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                    : 'grid grid-cols-1 gap-6'
                }
              >
                {filteredSoldOut.map((item, index) => (
                  <div
                    key={`soldout-${String(item.id)}-${index}`}
                    className={
                      activeTab === 'list'
                        ? 'flex flex-row max-w-4xl mx-auto'
                        : ''
                    }
                  >
                    <CarCard {...item} />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

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
import { CarCard, CarCardProps } from './car-card';
import { CarsFiltersSheet } from './cars-filters-sheet';

type SearchResultsType = 'card' | 'list';

export function SearchResults({ mode }: { mode: SearchResultsType }) {
  const [searchInput, setSearchInput] = useState('');
  const [activeTab, setActiveTab] = useState<SearchResultsType>(mode);

  const location = useLocation();
  const searchData = location.state?.searchData;
  const searchParams = location.state?.searchParams;
  const locations = location.state?.locations;

  const items: CarCardProps[] = searchData?.data?.availablecars ? searchData.data.availablecars.map((car: any) => {
    const noDays = car.numberofdays || 1;
    // Align with the provided API schema while ensuring safety across properties
    const ogPrice = car.totalrate || car.totalratebeforediscount || (car.avgrate ? car.avgrate * noDays : 0);
    const finalPrice = (car.totalrateafterdiscount !== undefined && car.totalrateafterdiscount !== 0)
      ? car.totalrateafterdiscount
      : (car.totalrate || (car.discounteddailyrate ? car.discounteddailyrate * noDays : ogPrice));

    const dailyOg = Math.round(ogPrice / noDays) || 0;
    const dailyFinal = Math.round(finalPrice / noDays) || dailyOg;

    const isDiscounted = ogPrice > finalPrice;
    const discountPerc = isDiscounted
      ? Math.round(((ogPrice - finalPrice) / ogPrice) * 100)
      : (car.discountrate && car.discountrate > 0 ? car.discountrate : undefined);

    return {
      id: car.vehiclecategoryid,
      image_url: car.imageurl ? (car.imageurl.startsWith('//') ? 'https:' + car.imageurl : car.imageurl) : 'https://cdn.pixabay.com/photo/2012/05/29/00/43/car-49278_1280.jpg',
      title: car.categoryname || car.categoryfriendlydescription || car.vehiclecategory || 'Unknown Car',
      transmission: car.vehicledescription1 ? car.vehicledescription1.split(',')[0].trim() : 'Automatic',
      year: car.vehicledescription1 && car.vehicledescription1.includes('Model') ? car.vehicledescription1.match(/\d{4}/)?.[0] || '2024' : '2024',
      passengers: car.numberofadults || 4,
      bags: (car.numberoflargecases || 0) + (car.numberofsmallcases || 0),
      features: [
        '24/7 Roadside Assistance',
        'GST Included',
        'Unlimited Km Per Day',
        'Standard Damage Cover',
      ],
      original_price: dailyOg.toString(),
      discount_price: dailyFinal.toString(),
      special_price_text: `${noDays} day special price . $${dailyFinal} per day`,
      discount_percentage: discountPerc,
      searchParams,
      locations
    };
  }) : [];

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
        <h3 className="text-sm text-mono font-medium">
          Showing {items.length > 0 ? 1 : 0} - {items.length} of {items.length} results for cars
        </h3>

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
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-10 bg-white rounded-[16px] shadow-sm border border-gray-100 min-h-[300px]">
          <SearchIcon className="w-12 h-12 text-[#8692a6] mb-4" />
          <h3 className="text-[#0061e0] font-bold text-[18px]">0 results found</h3>
          <p className="text-[#8692a6] text-[14px] mt-2">Try adjusting your filters or date range to find more available cars.</p>
        </div>
      ) : (
        <div
          className={
            activeTab === 'card'
              ? 'grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-4'
              : 'grid grid-cols-1 gap-6'
          }
        >
          {items.map((item, index) => {
            return (
              <div key={index} className={activeTab === 'list' ? 'flex flex-row max-w-4xl mx-auto' : ''}>
                <CarCard {...item} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

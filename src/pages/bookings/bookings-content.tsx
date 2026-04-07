import { useState } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BookingCard, BookingCardProps } from './components/booking-card';

export function BookingsContent() {
  const [searchInput, setSearchInput] = useState('');

  const sampleBookings: BookingCardProps[] = [
    {
      reservationNumber: '1815075CA249B36',
      carName: 'MG HS-Excite - 5 seater',
      carSpecs: 'Automatic, 2023 Model',
      carImage: 'https://cdn.pixabay.com/photo/2012/05/29/00/43/car-49278_1280.jpg',
      pickupDate: '07/03/2026 9:00 AM',
      returnDate: '08/03/2026 9:00 AM',
      status: 'Allocated'
    },
    {
      reservationNumber: '1942083XY984D12',
      carName: 'Nissan X-Trail - 5 seater',
      carSpecs: 'Automatic, 2024 Model',
      carImage: 'https://cdn.pixabay.com/photo/2012/05/29/00/43/car-49278_1280.jpg',
      pickupDate: '12/04/2026 10:00 AM',
      returnDate: '15/04/2026 10:00 AM',
      status: 'Pending'
    },
    {
      reservationNumber: '2561937ZT105R55',
      carName: 'Toyota Corolla Hybrid - 5 seater',
      carSpecs: 'Automatic, 2023 Model',
      carImage: 'https://cdn.pixabay.com/photo/2012/05/29/00/43/car-49278_1280.jpg',
      pickupDate: '20/05/2026 2:00 PM',
      returnDate: '25/05/2026 1:00 PM',
      status: 'Completed'
    }
  ];

  return (
    <div className="flex flex-col items-stretch gap-7">
      
      {/* Search and Filters Bar */}
      <div className="flex items-center gap-3 w-full">
        <div className="relative flex items-center w-full mx-auto z-1">
          <SearchIcon
            className="absolute start-4 text-muted-foreground"
            size={16}
          />

          <Input
            id="search-input"
            value={searchInput}
            placeholder="Search bookings by ID, car..."
            onChange={(e) => setSearchInput(e.target.value)}
            className="ps-9 pe-10 w-full"
          />

          <Badge className="absolute end-2 gap-1" variant="outline" size="sm">
            ⌘ K
          </Badge>
        </div>

      </div>

      {/* Sorting and Results Bar */}
      <div className="flex flex-wrap items-center gap-5 justify-between mt-3">
        <h3 className="text-sm text-mono font-medium">
          1 - {sampleBookings.length} over {sampleBookings.length} results
        </h3>

        <div className="flex items-center gap-2.5">
          <Select defaultValue="active">
            <SelectTrigger className="w-[175px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bookings List */}
      <div className="grid grid-cols-1 gap-5">
        {sampleBookings.map((booking, index) => (
          <BookingCard key={index} {...booking} />
        ))}
      </div>
    </div>
  );
}

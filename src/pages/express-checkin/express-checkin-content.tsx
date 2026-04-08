import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';
import { CollapsibleCard } from './components/collapsible-card';
import { ReservationDetails } from './components/reservation-details';
import { RentalFeeSummaryBottomSheet } from './components/rental-fee-summary-bottom-sheet';
import { RentalFeeSummary } from '@/pages/cars/checkout/options/components/rental-fee-summary';
import { CustomerDetailsCard } from './components/customer-details-card';
import { BookingDetailsCard } from './components/booking-details-card';
import { ExtraDriversCard } from './components/extra-drivers-card';
import { UploadImagesCard } from './components/upload-images-card';
import { CollectCardDetailCard } from './components/collect-card-detail-card';
import { Button } from '@/components/ui/button';

export function ExpressCheckinContent() {
  const navigate = useNavigate();

  const [openCard, setOpenCard] = useState<string | null>('reservation');

  const toggleCard = (id: string) => {
    setOpenCard(openCard === id ? null : id);
  };

  const handleSave = () => {
    // Save action logic here
    console.log('Saved');
  };

  const actionButtons = (
    <Button
      className="w-full bg-[#ffc107] hover:bg-[#ffb000] text-black font-bold text-[16px] py-4 sm:py-6 rounded-full shadow-md mt-4"
      onClick={handleSave}
    >
      Save
    </Button>
  );

  return (
    <div className="flex flex-col h-full min-h-screen pb-[300px] lg:pb-10 relative px-4 pt-0 lg:px-0">
      {/* Header */}
      {/*  <div className="flex items-center mb-6 pt-2">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 -ml-2 text-black hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="flex-1 text-center font-extrabold text-[18px] sm:text-[20px] text-black pr-8">
          Express Check-in
        </h1>
      </div> */}

      <div className="flex-1 w-full mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 ">

        {/* Small Grid: Reservation Details & Fee Summary (Right side on desktop, top on mobile) */}
        <div className="col-span-1 flex flex-col lg:order-last">

          {/* Mapped to BookingOverview's place */}
          <CollapsibleCard
            title="RESERVATION DETAILS"
            isOpen={openCard === 'reservation'}
            onToggle={() => toggleCard('reservation')}
          >
            <ReservationDetails
              reservationNumber="1815075CA249B36"
              carImage="https://cdn.pixabay.com/photo/2012/05/29/00/43/car-49278_1280.jpg"
              carTitle="MG HS-Excite - 5 seater"
              carSubtitle="Automatic, 2023 Model"
              pickupDate="07/03/2026 9:00 AM"
              pickupLocation="Welshpool, Perth Airport Perth - 102121"
              returnDate="14/03/2026 9:00 AM"
              returnLocation="Welshpool, Perth Airport Perth - 102121"
            />
          </CollapsibleCard>

          {/* Desktop Summary Placeholder (matches options layout) */}
          <div className="bg-white rounded-[16px] border border-gray-100 shadow-sm p-4 hidden lg:flex flex-col mt-2">
            <RentalFeeSummary
              days={6}
              dailyRate={43.0}
              totalExtras={10.0}
              gstAmount={12.0}
            >
              {actionButtons}
            </RentalFeeSummary>
          </div>
        </div>

        {/* Large Grid: The rest of the collapsible cards (Left side on desktop, below on mobile) */}
        <div className="col-span-1 lg:col-span-2 flex flex-col h-full">

          <CollapsibleCard
            title="CUSTOMER DETAILS"
            isOpen={openCard === 'customer'}
            onToggle={() => toggleCard('customer')}
          >
            <CustomerDetailsCard />
          </CollapsibleCard>

          <CollapsibleCard
            title="BOOKING DETAILS"
            isOpen={openCard === 'booking'}
            onToggle={() => toggleCard('booking')}
          >
            <BookingDetailsCard />
          </CollapsibleCard>

          <CollapsibleCard
            title="EXTRA DRIVERS"
            isOpen={openCard === 'drivers'}
            onToggle={() => toggleCard('drivers')}
          >
            <ExtraDriversCard />
          </CollapsibleCard>

          <CollapsibleCard
            title="UPLOAD IMAGES"
            isOpen={openCard === 'images'}
            onToggle={() => toggleCard('images')}
          >
            <UploadImagesCard />
          </CollapsibleCard>

          <CollapsibleCard
            title="COLLECT CARD DETAIL"
            isOpen={openCard === 'creditcard'}
            onToggle={() => toggleCard('creditcard')}
          >
            <CollectCardDetailCard />
          </CollapsibleCard>

        </div>
      </div>

      {/* Mobile Sticky Bottom Sheet */}
      <div className="lg:hidden">
        <RentalFeeSummaryBottomSheet
          days={6}
          dailyRate={43.0}
          totalExtras={10.0}
          totalCost={280.0}
          gstAmount={12.0}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}

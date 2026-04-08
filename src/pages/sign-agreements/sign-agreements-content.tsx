import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';
import { CollapsibleCard } from '@/pages/express-checkin/components/collapsible-card';
import { ReservationDetails } from '@/pages/express-checkin/components/reservation-details';
import { RentalAgreementCard } from './components/rental-agreement-card';
import { DamageCoverCard } from './components/damage-cover-card';
import { AuthorizeCreditCardCard } from './components/authorize-credit-card-card';
import { TermsAndConditionsCard } from './components/terms-and-conditions-card';
import { Button } from '@/components/ui/button';

export function SignAgreementsContent() {
  const navigate = useNavigate();
  
  const [openCard, setOpenCard] = useState<string | null>('booking');

  const toggleCard = (id: string) => {
    setOpenCard(openCard === id ? null : id);
  };

  const handleSave = () => {
    // Save action logic here
    console.log('Saved sign agreements');
  };

  return (
    <div className="flex flex-col h-full min-h-screen pb-[150px] lg:pb-10 relative px-4 pt-0 lg:px-0 bg-[#f8f9fa]">
      {/* Header */}
      <div className="flex items-center mb-6 pt-2">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 -ml-2 text-black hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="flex-1 text-center font-extrabold text-[20px] text-black pr-8">
          Authorize
        </h1>
      </div>

      <div className="flex-1 w-full mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl">
        
        {/* Small Grid: Booking Details (Right side on desktop, top on mobile) */}
        <div className="col-span-1 flex flex-col lg:order-last">
          
          <CollapsibleCard 
            title="BOOKING DETAILS" 
            isOpen={openCard === 'booking'} 
            onToggle={() => toggleCard('booking')}
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

          {/* Desktop Save Button */}
          <div className="hidden lg:flex mt-2">
            <Button
              className="w-full bg-[#ffc107] hover:bg-[#ffb000] text-black font-bold text-[16px] py-6 shadow-sm rounded-full"
              onClick={handleSave}
            >
              Save & Continue
            </Button>
          </div>
        </div>

        {/* Large Grid: The rest of the collapsible cards (Left side on desktop, below on mobile) */}
        <div className="col-span-1 lg:col-span-2 flex flex-col h-full">
          
          <CollapsibleCard 
            title="RENTAL AGREEMENT" 
            isOpen={openCard === 'rental_agreement'} 
            onToggle={() => toggleCard('rental_agreement')}
          >
            <RentalAgreementCard />
          </CollapsibleCard>

          <CollapsibleCard 
            title="DAMAGE COVER" 
            isOpen={openCard === 'damage_cover'} 
            onToggle={() => toggleCard('damage_cover')}
          >
            <DamageCoverCard />
          </CollapsibleCard>

          <CollapsibleCard 
            title="AUTHORIZE CREDIT CARD" 
            isOpen={openCard === 'authorize_cc'} 
            onToggle={() => toggleCard('authorize_cc')}
          >
            <AuthorizeCreditCardCard />
          </CollapsibleCard>

          <CollapsibleCard 
            title="TERMS AND CONDITIONS" 
            isOpen={openCard === 'terms'} 
            onToggle={() => toggleCard('terms')}
          >
            <TermsAndConditionsCard />
          </CollapsibleCard>

        </div>
      </div>

      {/* Mobile Sticky Bottom Floating Save Button */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#f8f9fa] pt-4 pb-6 px-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] border-t border-gray-100">
        <Button
          className="w-full bg-[#ffc107] hover:bg-[#ffb000] text-black font-bold text-[16px] py-7 rounded-full shadow-md"
          onClick={handleSave}
        >
          Save & Continue
        </Button>
      </div>
    </div>
  );
}

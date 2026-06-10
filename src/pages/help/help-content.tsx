import { ArrowLeft, Phone, Mail } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';

interface OfficeLocation {
  name: string;
  address: string;
  phone: string;
  email: string;
}

const offices: OfficeLocation[] = [
  {
    name: 'Welshpool/Perth Airport Office',
    address: '30 Kewdale Road, Welshpool, WA 6106, Australia',
    phone: '+61 1300 677 227',
    email: 'airport@northsiderentals.com.au'
  },
  {
    name: 'Greenwood Office',
    address: '33 Canham Way, Greenwood, WA 6024',
    phone: '+61 08 6245 2182',
    email: 'greenwood@northsiderentals.com.au'
  },
  {
    name: 'Broome Office',
    address: '7 Farrell Street, Broome, WA 6725',
    phone: '+61 08 9345 5855',
    email: 'broome@northsiderentals.com.au'
  },
  {
    name: 'Busselton Office',
    address: '35 Fairlawn Rd, Busselton, WA 6280',
    phone: '+61 08 9742 1819',
    email: 'busselton@northsiderentals.com.au'
  },
  {
    name: 'Karratha Office',
    address: '1500 Anderson Rd, Karratha Industrial Estate, WA 6714',
    phone: '+61 08 9129 4919',
    email: 'kalgoorlie@northsiderentals.com.au'
  },
  {
    name: 'Kalgoorlie Office',
    address: '12 O\'Byrne Crescent Broadwood, WA 6430',
    phone: '+6108 6377 7628',
    email: 'kalgoorlie@northsiderentals.com.au'
  }
];

export function HelpContent() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full min-h-screen bg-[#f8f9fa] pb-10 px-4 pt-2 lg:px-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      {/*  <div className="flex items-center mb-6 pt-2">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 -ml-2 text-black hover:bg-gray-200 rounded-full transition-colors shrink-0 cursor-pointer"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="flex-1 text-center font-extrabold text-[20px] text-black pr-8">
          Help
        </h1>
      </div> */}

      <div className="flex flex-col items-center max-w-2xl mx-auto w-full">
        <h2 className="text-[#0061e0] font-bold text-[22px] mb-6 text-center">
          Car Hire Booking
        </h2>

        <Button onClick={() => window.location.href = 'tel:+611300677227'} className="w-full bg-[#0061e0] hover:bg-[#0051ba] text-white font-semibold text-[16px] py-7 rounded-full shadow-sm mb-4 cursor-pointer">
          <div className="flex items-center justify-center gap-2">
            <div className="bg-[#ffc107] p-1 rounded-full text-[#0061e0]">
              <Phone className="w-4 h-4 fill-current text-white" />
            </div>
            +61 1300 677 227
          </div>
        </Button>

        <Button onClick={() => window.open('https://northsiderentals.com.au/faq/general-information/customer-handy-tips/', '_blank')} className="w-full bg-[#ffc107] hover:bg-[#ffb000] text-black font-semibold text-[16px] py-7 rounded-full shadow-sm mb-10 cursor-pointer">
          Roadside Assistance
        </Button>
      </div>

      <div className="w-full">
        <h3 className="text-[#8692a6] font-bold text-[13px] uppercase tracking-wide mb-4 mt-2">
          OFFICES
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {offices.map((office, idx) => (
            <div key={idx} className="bg-white rounded-[16px] p-5 shadow-sm border border-gray-100 flex flex-col h-full">
              <h4 className="text-[#0061e0] font-bold text-[15px] mb-1">{office.name}</h4>
              <p className="text-[#8692a6] text-[13px] mb-4 flex-grow">{office.address}</p>

              <div className="flex flex-col gap-3 mt-auto pt-4 border-t border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 shrink-0 bg-[#ffc107] rounded-full flex items-center justify-center">
                    <Phone className="w-3.5 h-3.5 text-white fill-current" />
                  </div>
                  <span className="text-black font-bold text-[14px]">{office.phone}</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 shrink-0 bg-[#ffc107] rounded-full flex items-center justify-center">
                    <Mail className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                  </div>
                  <a href={`mailto:${office.email}`} className="text-black font-bold text-[14px] underline underline-offset-2">
                    {office.email}
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

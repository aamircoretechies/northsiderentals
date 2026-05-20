import { useEffect, useState } from 'react';
import { addDays, format } from 'date-fns';
import { CalendarDays, Download } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { Helmet } from 'react-helmet-async';
import { Link, Outlet } from 'react-router';
import { useLocation, useNavigate } from 'react-router-dom';
import { MENU_SIDEBAR } from '@/config/menu.config';
import { useBodyClass } from '@/hooks/use-body-class';
import { useMenu } from '@/hooks/use-menu';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSettings } from '@/providers/settings-provider';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Footer } from './components/footer';
import { Header } from './components/header';
import { Navbar } from './components/navbar';
import { Toolbar, ToolbarActions, ToolbarHeading } from './components/toolbar';

/** Router location state passed between checkout steps */
type CheckoutNavState = {
  carData?: unknown;
  searchParams?: unknown;
  locations?: unknown;
  extras?: unknown;
  damageOptions?: unknown;
  selectedDamageOption?: unknown;
  countries?: unknown;
  areaOfUseOptions?: unknown;
};

export function Demo9Layout() {
  const { setOption } = useSettings();
  const location = useLocation();
  const { pathname } = location;
  const { getCurrentItem } = useMenu(pathname);
  const isMobile = useIsMobile();
  const item = getCurrentItem(MENU_SIDEBAR);
  const navigate = useNavigate();

  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(2025, 0, 20),
    to: addDays(new Date(2025, 0, 20), 20),
  });

  useBodyClass(`
    [--header-height:78px]
    bg-background!
  `);

  useEffect(() => {
    setOption('layout', 'demo9');
  }, [setOption]);

  return (
    <>
      <Helmet>
        <title>{item?.title}</title>
      </Helmet>
      <div className="flex grow flex-col min-h-screen min-h-full  in-data-[sticky-header=on]:pt-(--header-height)">
        <Header />

        {!isMobile && <Navbar />}

        <main className="flex flex-col grow  h-full min-h-full bg-[#E8ECEF70]" role="content">
          {/*       {!pathname.includes('/public-profile/') && ( */}
          {pathname !== '/home' && pathname !== '/' && (
            <Toolbar>
              <ToolbarHeading />

              <ToolbarActions>
                {!pathname.includes('/cars/checkout/success') && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (pathname === '/cars/checkout/details') {
                        // Reconstruct options state: carData in details is the car object in options
                        const state = (location.state ?? {}) as CheckoutNavState;
                        navigate('/cars/checkout/options', { 
                          state: { 
                            car: state?.carData,
                            // Preserve search params and locations if available
                            searchParams: state?.searchParams,
                            locations: state?.locations,
                            extras: state?.extras,
                            damageOptions: state?.damageOptions,
                            selectedDamageOption: state?.selectedDamageOption,
                            countries: state?.countries,
                            areaOfUseOptions: state?.areaOfUseOptions
                          } 
                        });
                      } else if (pathname === '/cars/checkout/options') {
                        navigate('/cars/search-results-grid', { state: location.state });
                      } else {
                        navigate(-1);
                      }
                    }}
                  >
                    Go Back
                  </Button>
                )}
              </ToolbarActions>
            </Toolbar>
          )}

          <div className="flex-grow">
            <Outlet />
          </div>

          <div className="mt-auto">
            <Footer />
          </div>
        </main>
      </div>
    </>
  );
}

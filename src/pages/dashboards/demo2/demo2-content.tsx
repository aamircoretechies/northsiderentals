import { useEffect } from 'react';
import { CarHireWidget, FeaturedCars, Promotions } from './components';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { ContentLoader } from '@/components/common/content-loader';
import { Button } from '@/components/ui/button';

export function Demo2Content() {
  const { data, loading, error, registerDevice } = useDashboardData();

  useEffect(() => {
    console.log('Demo2Content mounted');
    registerDevice({
      fcm_token: 'web-fcm-token',
      device_id: navigator.userAgent,
      device_type: 'web',
      device_name: navigator.userAgent,
      device_os_version: navigator.platform,
      app_version: '1.0.0',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  console.log('Demo2Content render - data:', data, 'loading:', loading, 'error:', error);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <ContentLoader />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="text-danger font-medium text-lg font-bold">Error: {error}</div>
        <Button
          className="bg-[#ffc107] hover:bg-[#ffb000] text-black font-bold px-8 py-2 rounded-lg"
          onClick={() => window.location.reload()}
        >
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:gap-7.5">

      <div className="grid lg:grid-cols-1 gap-y-5 lg:gap-7.5 items-stretch">
        <div className="lg:col-span-1 min-w-0">
          <div className="grid md:grid-cols-1 gap-5 lg:gap-7.5 h-full items-stretch w-full max-w-full">
            <CarHireWidget locations={data?.locations} driverAges={data?.driverages} />
          </div>
        </div>
      </div>
      <div className="lg:col-span-1 min-w-0 overflow-hidden">
        <FeaturedCars cars={data?.featuredCars} locations={data?.locations} />
      </div>
      <div className="grid lg:grid-cols-1 gap-5 lg:gap-7.5 items-stretch">
        <div className="lg:col-span-1 min-w-0 overflow-hidden">
          <Promotions promotions={data?.promotions} />
        </div>
      </div>
      {/* <div className="grid lg:grid-cols-3 gap-5 lg:gap-7.5 items-stretch">
        <div className="lg:col-span-2">
          <Integrations />
        </div>
        <div className="lg:col-span-1">
          <BlockList
            className="h-full"
            text="Users on the block list are unable to send chat requests or messages to you anymore, ever, or again"
          />
        </div>
      </div> */}
      {/*  <div className="grid lg:grid-cols-3 gap-5 lg:gap-7.5 items-stretch">
        <div className="lg:col-span-2">
          <Teams />
        </div>
        <div className="lg:col-span-1">
          <ManageData className="h-full" />
        </div>
      </div> */}
    </div>
  );
}

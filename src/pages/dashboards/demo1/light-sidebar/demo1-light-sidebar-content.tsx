import { useEffect } from 'react';
import {
  ChannelStats,
  EarningsChart,
  Highlights,
  TeamMeeting,
  Teams,

} from './components';
import { useDashboardData } from '@/hooks/use-dashboard-data';

export function Demo1LightSidebarContent() {
  const { data, loading, error, registerDevice } = useDashboardData();

  useEffect(() => {
    console.log('Demo1LightSidebarContent mounted');

    // Register device on mount
    const deviceData = {
      fcm_token: 'web-fcm-token',
      device_id: navigator.userAgent,
      device_type: 'web',
      device_name: navigator.userAgent,
      device_os_version: navigator.platform,
      app_version: '1.0.0',
    };
    registerDevice(deviceData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return <div>Loading dashboard data...</div>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="text-danger font-medium text-lg">Error: {error}</div>
        <button 
          className="btn btn-primary" 
          onClick={() => window.location.reload()}
        >
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:gap-7.5">
      <div className="grid lg:grid-cols-3 gap-y-5 lg:gap-7.5 items-stretch">
        <div className="lg:col-span-1 flex flex-col gap-5 lg:gap-7.5">
          {/*   <CarHireWidget locations={data?.locations} driverAges={data?.driverages} /> */}
          <div className="grid grid-cols-2 gap-5 lg:gap-7.5 items-stretch">
            <ChannelStats />
          </div>
        </div>
        <div className="lg:col-span-2">
          {/* We replace EntryCallout with FeaturedCars, since the user wants it to be repeated horizontally in the page */}
          {/*   <FeaturedCars cars={data?.featuredCars} /> */}
        </div>
      </div>
      <div className="grid lg:grid-cols-3 gap-5 lg:gap-7.5 items-stretch">
        <div className="lg:col-span-1">
          <Highlights limit={3} />
        </div>
        <div className="lg:col-span-2">
          <EarningsChart />
        </div>
      </div>
      <div className="grid lg:grid-cols-3 gap-5 lg:gap-7.5 items-stretch">
        <div className="lg:col-span-1">
          <TeamMeeting />
        </div>
        <div className="lg:col-span-2">
          <Teams />
        </div>
      </div>
    </div>
  );
}

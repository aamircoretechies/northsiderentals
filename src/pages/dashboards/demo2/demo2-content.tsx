import { CarHireWidget, FeaturedCars, Promotions } from './components';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { ContentLoader } from '@/components/common/content-loader';
import { Button } from '@/components/ui/button';

export function Demo2Content() {
  const { data, loading, error, refresh } = useDashboardData();

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <ContentLoader />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <div className="text-danger text-lg font-bold">Error: {error}</div>
        <Button
          className="rounded-lg bg-[#ffc107] px-8 py-2 font-bold text-black hover:bg-[#ffb000]"
          onClick={() => void refresh()}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:gap-7.5">
      <div className="grid items-stretch gap-y-5 lg:grid-cols-1 lg:gap-7.5">
        <div className="min-w-0 lg:col-span-1">
          <div className="grid h-full w-full max-w-full grid-cols-1 items-stretch gap-5 md:grid-cols-1 lg:gap-7.5">
            <CarHireWidget
              locations={data?.locations}
              driverAges={data?.driverages}
              officetimes={data?.officetimes}
            />
          </div>
        </div>
      </div>
      <div className="min-w-0 overflow-hidden lg:col-span-1">
        <FeaturedCars cars={data?.featuredCars} locations={data?.locations} />
      </div>
      <div className="grid items-stretch gap-5 lg:grid-cols-1 lg:gap-7.5">
        <div className="min-w-0 overflow-hidden lg:col-span-1">
          <Promotions promotions={data?.promotions} />
        </div>
      </div>
    </div>
  );
}

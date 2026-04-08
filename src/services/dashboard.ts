export interface RegisterDeviceRequest {
  fcm_token: string;
  device_id: string;
  device_type: string;
  device_name: string;
  device_os_version: string;
  app_version: string;
}

export interface Location {
  id: number;
  location: string;
  isdefault?: boolean;
  ispickupavailable?: boolean;
  isdropoffavailable?: boolean;
}

export interface CategoryType {
  id: number;
  category_id?: number;
  name?: string;
  value?: string;
}

export interface DriverAge {
  id: number;
  driverage: string;
  age_id?: number;
}

export interface OfficeTime {
  // Define based on API response
}

export interface Holiday {
  // Define based on API response
}

export interface FeaturedCar {
  id: number | string;
  title: string;
  description: string;
  daily_rate: string;
  image_url: string;
  link?: string;
  rate_description: string;
  slug?: string;
  transmission?: string;
  year?: string;
  discount_price?: string;
}

export interface Promotion {
  id: number | string;
  title: string;
  description: string;
  coupon_code: string;
  image_url: string;
  link: string;
  slug: string;
}

export interface DashboardData {
  locations: Location[];
  categorytypes: CategoryType[];
  driverages: DriverAge[];
  officetimes: OfficeTime[];
  holidays: Holiday[];
  featuredCars?: FeaturedCar[];
  promotions?: Promotion[];
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.example.com'; // Replace with actual base URL

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((err) => {
        window.clearTimeout(timeoutId);
        reject(err);
      });
  });
}

export const dashboardService = {
  async registerDevice(data: RegisterDeviceRequest): Promise<DashboardData> {
    console.log('Making API call to:', `${API_BASE_URL}/dashboard/register-device`);
    console.log('Request data:', data);

    try {
      const request = fetch(`${API_BASE_URL}/dashboard/register-device`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const response = await withTimeout(request, 9000);

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error text:', errorText);
        throw new Error(`Failed to register device: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Response data:', result);

      // Handle different possible response structures
      const extractArray = (key1: string, key2: string) => {
        if (Array.isArray(result?.[key1])) return result[key1];
        if (Array.isArray(result?.[key2])) return result[key2];
        if (Array.isArray(result?.data?.[key1])) return result.data[key1];
        if (Array.isArray(result?.data?.[key2])) return result.data[key2];
        if (Array.isArray(result?.data?.results?.[key1])) return result.data.results[key1];
        if (Array.isArray(result?.data?.results?.[key2])) return result.data.results[key2];
        return null;
      };

      const locationsSource = extractArray('locations', 'location_list') || [];
      const categorytypesSource = extractArray('categorytypes', 'category_types') || [];
      const driveragesSource = extractArray('driverages', 'driver_ages') || [];
      const featuredCarsSource = extractArray('featured_cars', 'featuredCars') || [];
      const officetimesSource = extractArray('officetimes', 'office_times') || [];
      const holidaysSource = extractArray('holidays', 'holiday_list') || [];
      const promotionsSource = extractArray('promotions', 'promotion_list') || [];

      console.log('Extracted featured cars:', featuredCarsSource.length);
      console.log('Extracted promotions:', promotionsSource.length);

      return {
        locations: locationsSource.map((loc: any) => ({
          id: loc.id,
          location: loc.location || loc.name || 'Unknown location',
          isdefault: loc.isdefault,
          ispickupavailable: loc.ispickupavailable,
          isdropoffavailable: loc.isdropoffavailable,
        })),
        categorytypes: categorytypesSource.map((ct: any) => ({
          id: ct.id || ct.category_id,
          category_id: ct.category_id,
          name: ct.name || ct.value,
          value: ct.value,
        })),
        driverages: driveragesSource.map((age: any) => ({
          id: age.id || age.age_id,
          driverage: age.driverage || age.age_range || `${age.age_id}`,
          age_id: age.age_id,
        })),
        officetimes: officetimesSource,
        holidays: holidaysSource,
        featuredCars: Array.isArray(featuredCarsSource)
          ? featuredCarsSource.map((car: any) => {
              console.log('Processing car:', car);
              return {
                id: car.id || car.car_id,
                title: car.title || car.name || car.model || 'Featured Car',
                description: car.description || car.subtitle || car.specs || '',
                daily_rate: car.daily_rate?.toString() || car.price?.toString() || car.rate?.toString() || '0',
                image_url: car.image_url || car.image || car.photo || '/media/images/600x600/1.jpg',
                link: car.link,
                rate_description: car.rate_description || car.description || '',
                slug: car.slug,
                transmission: car.transmission || car.gearbox || 'Automatic',
                year: car.year || car.model_year || '2024',
                discount_price: car.discount_price || car.daily_rate || car.price || '0',
              };
            })
          : [],
        promotions: Array.isArray(promotionsSource)
          ? promotionsSource.map((promo: any) => ({
              id: promo.id,
              title: promo.title || '',
              description: promo.description || '',
              coupon_code: promo.coupon_code || '',
              image_url: promo.image_url || '',
              link: promo.link || '',
              slug: promo.slug || '',
            }))
          : [],
      } as DashboardData;
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  },
};
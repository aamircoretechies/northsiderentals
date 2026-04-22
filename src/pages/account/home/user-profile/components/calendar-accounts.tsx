import { toAbsoluteUrl } from '@/lib/helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardData } from '@/hooks/use-dashboard-data';

interface ICalendarAccountsItem {
  logo: string;
  title: string;
  email: string;
}
type ICalendarAccountsItems = Array<ICalendarAccountsItem>;

function useSocialAccountRow(): ICalendarAccountsItems {
  const { rcmProfile, profile } = useDashboardData();

  const email = (rcmProfile?.email || profile.email || '').trim();
  const method = rcmProfile?.method?.toLowerCase() ?? '';
  const isSocial = Boolean(rcmProfile?.is_social_login);

  if (!isSocial || !email) {
    return [];
  }

  let logo = 'google.svg';
  let title = 'Social account';

  if (method === 'google' || email.toLowerCase().endsWith('@gmail.com')) {
    logo = 'google.svg';
    title = 'Google';
  } else if (method === 'facebook' || email.toLowerCase().endsWith('@facebook.com')) {
    logo = 'facebook.svg';
    title = 'Facebook';
  } else if (method === 'apple' || email.toLowerCase().endsWith('@apple.com')) {
    logo = 'apple-black.svg';
    title = 'Apple';
  } else if (method === 'microsoft' || method === 'azure' || email.toLowerCase().endsWith('@outlook.com') || email.toLowerCase().endsWith('@hotmail.com')) {
    logo = 'microsoft-5.svg';
    title = 'Microsoft';
  } else if (method !== '') {
    title = method.charAt(0).toUpperCase() + method.slice(1);
    // Keep default google logo or try to find one if we had a mapping
  }

  return [
    {
      logo,
      title,
      email,
    },
  ];
}

const CalendarAccounts = () => {
  const items = useSocialAccountRow();

  const renderItem = (item: ICalendarAccountsItem, index: number) => {
    return (
      <div
        key={index}
        className="flex items-center justify-between flex-wrap border border-border rounded-xl gap-2 px-3.5 py-2.5"
      >
        <div className="flex items-center flex-wrap gap-3.5">
          <img
            src={toAbsoluteUrl(`/media/brand-logos/${item.logo}`)}
            className="size-6 shrink-0"
            alt=""
          />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-mono mb-px">{item.title}</span>
            <span className="text-sm text-secondary-foreground truncate">
              {item.email}
            </span>
          </div>
        </div>
      </div>
    );
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2.5">
          {items.map((item, index) => renderItem(item, index))}
        </div>
      </CardContent>
    </Card>
  );
};

export {
  CalendarAccounts,
  type ICalendarAccountsItem,
  type ICalendarAccountsItems,
};

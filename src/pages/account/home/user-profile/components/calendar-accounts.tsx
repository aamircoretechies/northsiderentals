import { toAbsoluteUrl } from '@/lib/helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardData } from '@/hooks/use-dashboard-data';

interface ICalendarAccountsItem {
  logo: string;
  title: string;
  email: string;
}
type ICalendarAccountsItems = Array<ICalendarAccountsItem>;

function useGoogleAccountRow(): ICalendarAccountsItems {
  const { rcmProfile, profile } = useDashboardData();

  const email = (rcmProfile?.email || profile.email || '').trim();
  const method = rcmProfile?.method?.toLowerCase() ?? '';
  const isGmail =
    email.length > 0 && email.toLowerCase().endsWith('@gmail.com');

  const showGoogle =
    method === 'google' ||
    (Boolean(rcmProfile?.is_social_login) && isGmail);

  if (!showGoogle || !email) {
    return [];
  }

  return [
    {
      logo: 'google.svg',
      title: 'Google',
      email,
    },
  ];
}

const CalendarAccounts = () => {
  const items = useGoogleAccountRow();

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2.5">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-1">
              No Google account linked for calendar, or you signed in with email and password.
            </p>
          ) : (
            items.map((item, index) => renderItem(item, index))
          )}
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

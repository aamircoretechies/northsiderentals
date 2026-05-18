import { toAbsoluteUrl } from '@/lib/helpers';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { useAuth } from '@/auth/context/auth-context';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertIcon } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
  const { logout, auth } = useAuth();
  const isAuthed = Boolean(auth?.access_token);
  const renderItem = (item: ICalendarAccountsItem, index: number) => {
    return (
      <div
        key={index}
        className="flex items-center mb-4 justify-between flex-wrap border border-border rounded-xl gap-2 px-3.5 py-2.5"
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
          {items.length === 0 ? <></> : items.map((item, index) => renderItem(item, index))}
        </div>
        {isAuthed && (
          <Dialog>
            <DialogTrigger asChild>
              <button
                className="h-8 rounded-full cursor-pointer border border-red-300 text-red-600 px-8 hover:bg-destructive hover:text-white text-[13px] font-medium"
              >Delete Account</button>
            </DialogTrigger>
            <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
              <DialogHeader className="text-left sm:text-left">
                <DialogTitle>Delete Account</DialogTitle>
                <DialogDescription asChild>
                  <div className="space-y-4 pt-2 text-left">
                    <p className='text-destructive'>Deleting your account will remove your profile and associated account data from our active systems.</p>
                    <Alert variant="warning" appearance="light" className="items-start text-left">
                      <AlertIcon>
                        <AlertTriangle className="size-4 mt-0.5" />
                      </AlertIcon>
                      <AlertDescription>
                        <div className="mb-1.5">
                          <Badge variant="warning" appearance="light" size="sm">Legal Note</Badge>
                        </div>
                        <p className='text-yellow-700 text-[12px] leading-[16px]'>Some booking, payment, invoice, transaction, fraud prevention, security, or legal compliance records may be retained where required by law or legitimate business obligations.</p>
                      </AlertDescription>
                    </Alert>
                    <p>Are you sure you want to continue?</p>
                  </div>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="grid grid-cols-2 w-full gap-2 pt-4 pb-2">
                <DialogClose asChild>
                  <Button variant="outline" className='py-2'>Cancel</Button>
                </DialogClose>
                <Button variant="destructive" className='py-2'>Continue</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>

    </Card>
  );
};

export {
  CalendarAccounts,
  type ICalendarAccountsItem,
  type ICalendarAccountsItems,
};

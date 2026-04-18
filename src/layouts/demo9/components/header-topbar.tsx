import { StoreClientTopbar } from '@/pages/store-client/components/common/topbar';
import { DropdownMenu2 } from '@/partials/dropdown-menu/dropdown-menu-2';
import { ChatSheet } from '@/partials/topbar/chat-sheet';
import { NotificationsSheet } from '@/partials/topbar/notifications-sheet';
import { UserDropdownMenu } from '@/partials/topbar/user-dropdown-menu';
import { BellDot, ChevronDown, MessageCircleMore, MessageSquareDot, Siren } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ProfileAvatarImage } from '@/components/common/profile-avatar-image';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export function HeaderTopbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { profile, notificationUnreadCount } = useDashboardData();

  return (
    <div className="flex items-center gap-2 lg:gap-3.5 lg:w-[400px] justify-end">
      {/* pathname.startsWith('/store-client') ? (
        <StoreClientTopbar />
      ) :  */(
          <>
            <div className="flex items-center gap-2 me-0.5">
              {/* <ChatSheet ... */}

              <Button
                variant="ghost"
                mode="icon"
                shape="circle"
                className="hidden text-center item-center sm:block text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                title="SOS / Emergency"
                onClick={() => navigate('/help')}

              >
                <Siren className="size-[22px]!" />
              </Button>

              <NotificationsSheet
                trigger={
                  <Button
                    variant="ghost"
                    mode="icon"
                    shape="circle"
                    className="relative hover:bg-transparent hover:[&_svg]:text-primary"
                  >
                    <BellDot className="size-4.5!" />
                    {notificationUnreadCount > 0 ? (
                      <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-white">
                        {notificationUnreadCount > 99
                          ? '99+'
                          : notificationUnreadCount}
                      </span>
                    ) : null}
                  </Button>
                }
              />

              <UserDropdownMenu
                trigger={
                  <div
                    className="ms-2.5 size-9 shrink-0 cursor-pointer overflow-hidden rounded-full border-2 border-success"
                    title="Account menu"
                  >
                    <ProfileAvatarImage
                      src={profile.avatarUrl}
                      fallbackLabel={profile.displayName}
                      alt=""
                      className="size-full object-cover"
                      fallbackClassName="size-full"
                    />
                  </div>
                }
              />
            </div>


            {/*   <div className="flex items-center space-x-2">
            <Switch id="auto-update" size="sm" defaultChecked />
            <Label htmlFor="auto-update">Pro</Label>
          </div> */}

            {/* <div className="border-e border-border h-5"></div> */}

            {/* <DropdownMenu2
            trigger={
              <Button variant="mono">
                Create
                <ChevronDown />
              </Button>
            }
          /> */}
          </>
        )}
    </div>
  );
}

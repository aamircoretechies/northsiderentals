import { ReactNode, useState } from 'react';
import type { RcmNotification } from '@/services/notifications';
import { Bell, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { timeAgo } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import { getFriendlyError } from '@/utils/api-error-handler';

export function NotificationsSheet({ trigger }: { trigger: ReactNode }) {
  const {
    notifications,
    refreshNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    clearAllNotifications,
    deleteNotification,
  } = useDashboardData();

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setRefreshing(true);
      void refreshNotifications().finally(() => setRefreshing(false));
    }
  };

  const listBootLoading = refreshing && notifications.length === 0;

  const unread = notifications.filter((n) => !n.is_read);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="p-0 gap-0 sm:w-[500px] sm:max-w-none inset-5 start-auto h-auto rounded-lg p-0 sm:max-w-none [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
        <SheetHeader className="mb-0">
          <SheetTitle className="p-3">Notifications</SheetTitle>
        </SheetHeader>
        <SheetBody className="grow p-0">
          <ScrollArea className="h-[calc(100vh-10.5rem)]">
            <Tabs defaultValue="all" className="w-full relative">
              <TabsList variant="line" className="w-full px-5 mb-3">
                <TabsTrigger value="all">All ({notifications.length})</TabsTrigger>
                <TabsTrigger value="unread">Unread ({unread.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-0 px-0">
                <NotificationList
                  items={notifications}
                  loading={listBootLoading}
                  busy={busy}
                  setBusy={setBusy}
                  onRead={markNotificationRead}
                  onDelete={deleteNotification}
                />
              </TabsContent>

              <TabsContent value="unread" className="mt-0 px-0">
                <NotificationList
                  items={unread}
                  loading={listBootLoading}
                  busy={busy}
                  setBusy={setBusy}
                  onRead={markNotificationRead}
                  onDelete={deleteNotification}
                />
              </TabsContent>
            </Tabs>
          </ScrollArea>
        </SheetBody>
        <SheetFooter className="border-t border-border p-5 grid grid-cols-2 gap-2.5">
          <Button
            variant="outline"
            disabled={busy || notifications.length === 0}
            onClick={async () => {
              if (!window.confirm('Remove all notifications? This cannot be undone.')) {
                return;
              }
              try {
                setBusy(true);
                await clearAllNotifications();
                toast.success('All notifications cleared');
              } catch (e) {
                toast.error(getFriendlyError(e, 'Could not clear notifications.'));
              } finally {
                setBusy(false);
              }
            }}
          >
            Clear all
          </Button>
          <Button
            variant="outline"
            disabled={busy || unread.length === 0}
            onClick={async () => {
              try {
                setBusy(true);
                await markAllNotificationsRead();
                toast.success('Marked all as read');
              } catch (e) {
                toast.error(getFriendlyError(e, 'Could not update notifications.'));
              } finally {
                setBusy(false);
              }
            }}
          >
            Mark all as read
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function NotificationList({
  items,
  loading,
  busy,
  setBusy,
  onRead,
  onDelete,
}: {
  items: RcmNotification[];
  loading: boolean;
  busy: boolean;
  setBusy: (v: boolean) => void;
  onRead: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground text-sm">
        <Loader2 className="size-5 animate-spin" />
        Loading…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 px-5 text-center text-muted-foreground text-sm">
        <Bell className="size-10 opacity-40" />
        <p>No notifications to show.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {items.map((n) => (
        <div
          key={n.notification_id}
          className={cn(
            'group border-b border-border px-5 py-3 transition-colors',
            !n.is_read && 'bg-muted/40',
          )}
        >
          <div className="flex gap-3">
            <button
              type="button"
              className="min-w-0 flex-1 text-start"
              disabled={busy}
              onClick={async () => {
                if (n.is_read) return;
                try {
                  setBusy(true);
                  await onRead(n.notification_id);
                } catch (e) {
                  toast.error(getFriendlyError(e, 'Could not mark notification as read.'));
                } finally {
                  setBusy(false);
                }
              }}
            >
              <p
                className={cn(
                  'text-sm font-semibold text-foreground',
                  !n.is_read && 'text-primary',
                )}
              >
                {n.title}
              </p>
              <p className="mt-1 text-sm text-muted-foreground leading-snug">{n.message}</p>
              <p className="mt-2 text-xs font-medium text-muted-foreground">
                {n.created_at ? timeAgo(n.created_at) : ''}
                {n.type ? (
                  <>
                    <span className="mx-1.5 text-muted-foreground/50">·</span>
                    <span className="font-mono text-[11px]">{n.type}</span>
                  </>
                ) : null}
              </p>
            </button>
            <Button
              type="button"
              variant="ghost"
              mode="icon"
              size="sm"
              className="shrink-0 text-muted-foreground opacity-70 hover:opacity-100 hover:text-destructive"
              title="Delete"
              disabled={busy}
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  setBusy(true);
                  await onDelete(n.notification_id);
                  toast.success('Notification removed');
                } catch (err) {
                  toast.error(getFriendlyError(err, 'Could not delete notification.'));
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

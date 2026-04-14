import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { getAuth } from '@/auth/lib/helpers';
import { UserModel } from '@/auth/lib/models';
import { resolveRcmPublicUrl } from '@/lib/helpers';
import {
  dashboardService,
  DashboardData,
  DashboardProfile,
  RegisterDeviceRequest,
} from '@/services/dashboard';
import {
  notificationsService,
  RcmNotification,
} from '@/services/notifications';
import {
  profileService,
  RcmProfile,
  UpdateProfilePayload,
} from '@/services/profile';

const defaultDevicePayload = (): RegisterDeviceRequest => ({
  fcm_token: 'web-fcm-token',
  device_id:
    typeof navigator !== 'undefined' ? navigator.userAgent : 'web-client',
  device_type: 'web',
  device_name:
    typeof navigator !== 'undefined' ? navigator.userAgent : 'web-client',
  device_os_version:
    typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
  app_version: import.meta.env.VITE_APP_VERSION || '1.0.0',
});

export type MergedProfile = {
  displayName: string;
  email: string;
  phone: string;
  localAddress: string;
  postalAddress: string;
  avatarUrl: string | null;
};

function mergeProfile(
  user: UserModel | undefined,
  dash: DashboardProfile | null | undefined,
  rcm: RcmProfile | null,
): MergedProfile {
  const email = (rcm?.email || dash?.email || user?.email || '').trim();
  const first =
    rcm?.first_name ?? dash?.first_name ?? user?.first_name ?? '';
  const last = rcm?.last_name ?? dash?.last_name ?? user?.last_name ?? '';
  const fromParts = `${first} ${last}`.trim();
  const displayName =
    user?.fullname?.trim() ||
    fromParts ||
    (email ? email.split('@')[0] : '') ||
    'Guest';

  const rawPic =
    rcm?.profile_picture?.trim() ||
    dash?.profile_image_url?.trim() ||
    user?.pic?.trim() ||
    '';

  const avatarUrl = rawPic ? resolveRcmPublicUrl(rawPic) : null;

  const addr = rcm?.address;

  return {
    displayName,
    email,
    phone: (rcm?.mobile || dash?.phone || user?.phone || '').trim(),
    localAddress: (addr?.local_address || dash?.local_address || '').trim(),
    postalAddress: (addr?.postal_address || dash?.postal_address || '').trim(),
    avatarUrl,
  };
}

export type DashboardDataContextValue = {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  profile: MergedProfile;
  apiProfile: DashboardProfile | null;
  rcmProfile: RcmProfile | null;
  profileBusy: boolean;
  refresh: () => Promise<void>;
  updateProfile: (body: UpdateProfilePayload) => Promise<void>;
  uploadProfilePicture: (file: File) => Promise<void>;
  deleteProfilePicture: () => Promise<void>;
  notifications: RcmNotification[];
  notificationUnreadCount: number;
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  /** @deprecated use refresh() — kept for any code still calling registerDevice */
  registerDevice: (payload?: RegisterDeviceRequest) => Promise<void>;
};

const DashboardDataContext = createContext<DashboardDataContextValue | null>(
  null,
);

export function DashboardDataProvider({ children }: PropsWithChildren) {
  const { user, auth, loading: authLoading } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [rcmProfile, setRcmProfile] = useState<RcmProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<RcmNotification[]>([]);

  const load = useCallback(async (payload?: RegisterDeviceRequest) => {
    try {
      setLoading(true);
      setError(null);
      const body = payload ?? defaultDevicePayload();
      const token = getAuth()?.access_token?.trim();

      const [dashResult] = await Promise.allSettled([
        dashboardService.registerDevice(body),
      ]);

      if (dashResult.status === 'fulfilled') {
        setData(dashResult.value);
      } else {
        setData(null);
        setError(
          dashResult.reason instanceof Error
            ? dashResult.reason.message
            : 'Failed to load home data',
        );
      }

      if (token) {
        const [profResult, notifResult] = await Promise.allSettled([
          profileService.fetchProfile(),
          notificationsService.list(1, 50),
        ]);

        if (profResult.status === 'fulfilled') {
          setRcmProfile(profResult.value);
        } else {
          setRcmProfile(null);
        }

        if (notifResult.status === 'fulfilled') {
          setNotifications(notifResult.value);
        } else {
          setNotifications([]);
        }
      } else {
        setRcmProfile(null);
        setNotifications([]);
      }
    } catch (err) {
      setData(null);
      setRcmProfile(null);
      setNotifications([]);
      setError(
        err instanceof Error ? err.message : 'Failed to load dashboard data',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Home / car search data: always load `register-device` (public). Profile + notifications
  // only when logged in. `GET /bookings/list` stays gated in the bookings page.
  useEffect(() => {
    if (authLoading) return;
    void load();
  }, [authLoading, auth?.access_token, load]);

  const apiProfile = data?.profile ?? null;

  const profile = useMemo(
    () => mergeProfile(user, apiProfile, rcmProfile),
    [user, apiProfile, rcmProfile],
  );

  const updateProfile = useCallback(async (body: UpdateProfilePayload) => {
    try {
      setProfileBusy(true);
      const updated = await profileService.updateProfile(body);
      setRcmProfile(updated);
    } finally {
      setProfileBusy(false);
    }
  }, []);

  const uploadProfilePicture = useCallback(async (file: File) => {
    try {
      setProfileBusy(true);
      const updated = await profileService.uploadProfilePicture(file);
      setRcmProfile(updated);
    } finally {
      setProfileBusy(false);
    }
  }, []);

  const deleteProfilePicture = useCallback(async () => {
    try {
      setProfileBusy(true);
      await profileService.deleteProfilePicture();
      const fresh = await profileService.fetchProfile();
      setRcmProfile(fresh);
    } finally {
      setProfileBusy(false);
    }
  }, []);

  const notificationUnreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications],
  );

  const refreshNotifications = useCallback(async () => {
    try {
      const list = await notificationsService.list(1, 50);
      setNotifications(list);
    } catch {
      setNotifications([]);
    }
  }, []);

  const markNotificationRead = useCallback(async (notificationId: string) => {
    const updated = await notificationsService.markRead(notificationId);
    setNotifications((prev) =>
      prev.map((n) =>
        n.notification_id === notificationId ? { ...n, ...updated } : n,
      ),
    );
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    const unread = notifications.filter((n) => !n.is_read);
    await Promise.all(
      unread.map((n) => notificationsService.markRead(n.notification_id)),
    );
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }, [notifications]);

  const clearAllNotifications = useCallback(async () => {
    await notificationsService.clearAll();
    setNotifications([]);
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    await notificationsService.remove(notificationId);
    setNotifications((prev) =>
      prev.filter((n) => n.notification_id !== notificationId),
    );
  }, []);

  const value = useMemo<DashboardDataContextValue>(
    () => ({
      data,
      loading: authLoading || loading,
      error,
      profile,
      apiProfile,
      rcmProfile,
      profileBusy,
      refresh: () => load(),
      updateProfile,
      uploadProfilePicture,
      deleteProfilePicture,
      notifications,
      notificationUnreadCount,
      refreshNotifications,
      markNotificationRead,
      markAllNotificationsRead,
      clearAllNotifications,
      deleteNotification,
      registerDevice: (p) => load(p),
    }),
    [
      data,
      authLoading,
      loading,
      error,
      profile,
      apiProfile,
      rcmProfile,
      profileBusy,
      load,
      updateProfile,
      uploadProfilePicture,
      deleteProfilePicture,
      notifications,
      notificationUnreadCount,
      refreshNotifications,
      markNotificationRead,
      markAllNotificationsRead,
      clearAllNotifications,
      deleteNotification,
    ],
  );

  return (
    <DashboardDataContext.Provider value={value}>
      {children}
    </DashboardDataContext.Provider>
  );
}

export function useDashboardData(): DashboardDataContextValue {
  const ctx = useContext(DashboardDataContext);
  if (!ctx) {
    throw new Error('useDashboardData must be used within DashboardDataProvider');
  }
  return ctx;
}

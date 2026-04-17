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
import { getFriendlyError } from '@/utils/api-error-handler';

const DEVICE_ID_STORAGE_KEY = `${import.meta.env.VITE_APP_NAME || 'app'}-device-id`;

function createLocalDeviceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const rand = Math.random().toString(36).slice(2, 10);
  return `web-${Date.now().toString(36)}-${rand}`;
}

function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'web-client';
  try {
    const existing = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY)?.trim();
    if (existing) return existing;
    const next = createLocalDeviceId();
    window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, next);
    return next;
  } catch {
    return createLocalDeviceId();
  }
}

function rotateDeviceId(): string {
  const next = createLocalDeviceId();
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, next);
    } catch {
      // ignore storage write errors; still return a new in-memory id for this request
    }
  }
  return next;
}

function isDeviceIdConflictError(error: unknown): boolean {
  const msg =
    error instanceof Error ? error.message : String(error ?? '');
  return (
    msg.toLowerCase().includes('device_id') &&
    msg.toLowerCase().includes('unique')
  );
}

const defaultDevicePayload = (): RegisterDeviceRequest => ({
  fcm_token: 'web-fcm-token',
  // Stable per-browser-install ID avoids backend unique collisions on device_id.
  device_id: getOrCreateDeviceId(),
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
  const rawDisplayName =
    user?.fullname?.trim() ||
    fromParts ||
    (email ? email.split('@')[0] : '') ||
    '';
  const displayName =
    /^guest$/i.test(rawDisplayName) || /^guest user$/i.test(rawDisplayName)
      ? ''
      : rawDisplayName;

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
      let body = payload ?? defaultDevicePayload();
      const token = getAuth()?.access_token?.trim();

      let dashResult = await Promise.allSettled([
        dashboardService.registerDevice(body),
      ]);

      // Legacy/bad device IDs can collide in backend unique(device_id).
      // Rotate local ID and retry once transparently.
      if (
        dashResult[0].status === 'rejected' &&
        isDeviceIdConflictError(dashResult[0].reason)
      ) {
        body = { ...body, device_id: rotateDeviceId() };
        dashResult = await Promise.allSettled([
          dashboardService.registerDevice(body),
        ]);
      }

      if (dashResult[0].status === 'fulfilled') {
        setData(dashResult[0].value);
      } else {
        setData(null);
        setError(
          getFriendlyError(dashResult[0].reason, 'Failed to load home data'),
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
        getFriendlyError(err, 'Failed to load dashboard data'),
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
      setRcmProfile((prev) => ({
        ...(prev ?? updated),
        ...updated,
        profile_picture: updated.profile_picture ?? prev?.profile_picture ?? null,
      }));
    } finally {
      setProfileBusy(false);
    }
  }, []);

  const uploadProfilePicture = useCallback(async (file: File) => {
    try {
      setProfileBusy(true);
      const updated = await profileService.uploadProfilePicture(file);
      const nextPicture = updated.profile_picture
        ? `${updated.profile_picture}${updated.profile_picture.includes('?') ? '&' : '?'}v=${Date.now()}`
        : updated.profile_picture;
      setRcmProfile((prev) => ({
        ...(prev ?? updated),
        ...updated,
        profile_picture: nextPicture ?? prev?.profile_picture ?? null,
      }));
    } finally {
      setProfileBusy(false);
    }
  }, []);

  const deleteProfilePicture = useCallback(async () => {
    try {
      setProfileBusy(true);
      await profileService.deleteProfilePicture();
      let fresh = await profileService.fetchProfile();
      if (fresh.profile_picture) {
        // Some backends require a profile PATCH/PUT nulling the field after delete.
        fresh = await profileService.updateProfile({ profile_picture: null });
      }
      setRcmProfile({ ...fresh, profile_picture: null });
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
    await notificationsService.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }, []);

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

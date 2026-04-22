import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  normalizeProfilePicturePath,
  profileService,
  RcmProfile,
  UpdateProfilePayload,
} from '@/services/profile';
import { getFriendlyError } from '@/utils/api-error-handler';
import {
  defaultDevicePayload,
  isDeviceIdConflictError,
  rotateDeviceId,
} from '@/providers/dashboard-device';

export type MergedProfile = {
  displayName: string;
  email: string;
  phone: string;
  localAddress: string;
  postalAddress: string;
  avatarUrl: string | null;
};

function appendCacheBuster(url: string, version: number | null): string {
  if (!url || !version) return url;
  // Use a URL fragment instead of a query param so the browser sees a fresh URL
  // without sending `?v=...` to the backend static-file handler.
  const [base] = url.split('#');
  return `${base}#v=${version}`;
}

function mergeProfile(
  user: UserModel | undefined,
  dash: DashboardProfile | null | undefined,
  rcm: RcmProfile | null,
  avatarVersion: number | null,
  avatarOverrideUrl: string | null,
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
    normalizeProfilePicturePath(rcm?.profile_picture) ||
    normalizeProfilePicturePath(dash?.profile_image_url) ||
    normalizeProfilePicturePath(user?.pic) ||
    '';

  const avatarUrl = avatarOverrideUrl
    ? avatarOverrideUrl
    : rawPic
      ? appendCacheBuster(resolveRcmPublicUrl(rawPic), avatarVersion)
      : null;

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

function isAuthScreenPath(pathname: string): boolean {
  return /^\/auth(?:\/|$)/.test(pathname);
}

function getCurrentPathname(): string {
  return typeof window !== 'undefined' ? window.location.pathname || '/' : '/';
}

export function DashboardDataProvider({ children }: PropsWithChildren) {
  const { user, auth, loading: authLoading } = useAuth();
  const autoLoadKeyRef = useRef<string | null>(null);
  const avatarObjectUrlRef = useRef<string | null>(null);
  const [pathname, setPathname] = useState(getCurrentPathname);
  const [data, setData] = useState<DashboardData | null>(null);
  const [rcmProfile, setRcmProfile] = useState<RcmProfile | null>(null);
  const [avatarVersion, setAvatarVersion] = useState<number | null>(null);
  const [avatarOverrideUrl, setAvatarOverrideUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<RcmNotification[]>([]);

  const replaceAvatarOverrideUrl = useCallback((nextUrl: string | null) => {
    const prevUrl = avatarObjectUrlRef.current;
    if (prevUrl && prevUrl !== nextUrl) {
      URL.revokeObjectURL(prevUrl);
    }
    avatarObjectUrlRef.current = nextUrl;
    setAvatarOverrideUrl(nextUrl);
  }, []);

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

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updatePathname = () => setPathname(getCurrentPathname());
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function (...args) {
      originalPushState.apply(this, args);
      updatePathname();
    };

    window.history.replaceState = function (...args) {
      originalReplaceState.apply(this, args);
      updatePathname();
    };

    window.addEventListener('popstate', updatePathname);
    window.addEventListener('hashchange', updatePathname);

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', updatePathname);
      window.removeEventListener('hashchange', updatePathname);
    };
  }, []);

  // Home / car search data: always load `register-device` (public). Profile + notifications
  // only when logged in. `GET /bookings/list` stays gated in the bookings page.
  useEffect(() => {
    if (authLoading) return;
    if (isAuthScreenPath(pathname)) {
      return;
    }
    const authKey = auth?.access_token?.trim() ? `auth:${auth.access_token.trim()}` : 'guest';
    const loadKey = `${authKey}:${pathname}`;
    if (autoLoadKeyRef.current === loadKey) return;
    autoLoadKeyRef.current = loadKey;
    void load();
  }, [authLoading, auth?.access_token, load, pathname]);

  const apiProfile = data?.profile ?? null;

  const profile = useMemo(
    () => mergeProfile(user, apiProfile, rcmProfile, avatarVersion, avatarOverrideUrl),
    [user, apiProfile, rcmProfile, avatarVersion, avatarOverrideUrl],
  );

  const updateProfile = useCallback(async (body: UpdateProfilePayload) => {
    try {
      setProfileBusy(true);
      await profileService.updateProfile(body);
      const fresh = await profileService.fetchProfile();
      setRcmProfile(fresh);
    } finally {
      setProfileBusy(false);
    }
  }, []);

  const uploadProfilePicture = useCallback(async (file: File) => {
    const localPreviewUrl = URL.createObjectURL(file);
    replaceAvatarOverrideUrl(localPreviewUrl);
    try {
      setProfileBusy(true);
      const hasExistingPicture = Boolean(
        rcmProfile?.profile_picture || data?.profile?.profile_image_url || user?.pic,
      );
      await profileService.uploadProfilePicture(
        file,
        hasExistingPicture,
      );
      const fresh = await profileService.fetchProfile();
      setAvatarVersion(Date.now());
      setRcmProfile(fresh);
      replaceAvatarOverrideUrl(localPreviewUrl);
    } catch (error) {
      replaceAvatarOverrideUrl(null);
      throw error;
    } finally {
      setProfileBusy(false);
    }
  }, [
    data?.profile?.profile_image_url,
    rcmProfile?.profile_picture,
    replaceAvatarOverrideUrl,
    user?.pic,
  ]);

  const deleteProfilePicture = useCallback(async () => {
    try {
      setProfileBusy(true);
      await profileService.deleteProfilePicture();
      let fresh = await profileService.fetchProfile();
      if (fresh.profile_picture) {
        // Some backends require a profile PATCH/PUT nulling the field after delete.
        fresh = await profileService.updateProfile({ profile_picture: null });
      }
      replaceAvatarOverrideUrl(null);
      setAvatarVersion(Date.now());
      setRcmProfile({ ...fresh, profile_picture: null });
    } finally {
      setProfileBusy(false);
    }
  }, [replaceAvatarOverrideUrl]);

  useEffect(() => {
    return () => {
      if (avatarObjectUrlRef.current) {
        URL.revokeObjectURL(avatarObjectUrlRef.current);
        avatarObjectUrlRef.current = null;
      }
    };
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

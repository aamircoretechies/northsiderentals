import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { ScreenLoader } from '@/components/common/screen-loader';
import { useAuth } from './context/auth-context';

/**
 * App shell guard: restores API session when a token exists. All routes stay reachable
 * for guests; pages and modals gate sensitive actions (profile edit, change password API).
 */
export const RequireAuth = () => {
  const { auth, verify, loading: globalLoading } = useAuth();
  const [shellReady, setShellReady] = useState(false);
  const token = auth?.access_token?.trim() ?? '';

  useEffect(() => {
    let cancelled = false;
    setShellReady(false);
    (async () => {
      try {
        await verify();
      } finally {
        if (!cancelled) setShellReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, verify]);

  if (!shellReady || globalLoading) {
    return <ScreenLoader />;
  }

  return <Outlet />;
};

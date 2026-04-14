import { useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { ScreenLoader } from '@/components/common/screen-loader';
import { useAuth } from './context/auth-context';

/**
 * App shell guard: restores API session when a token exists. All routes stay reachable
 * for guests; pages and modals gate sensitive actions (profile edit, change password API).
 */
export const RequireAuth = () => {
  const { auth, verify, loading: globalLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const verificationStarted = useRef(false);

  useEffect(() => {
    const checkAuth = async () => {
      if (!auth?.access_token || !verificationStarted.current) {
        verificationStarted.current = true;
        try {
          await verify();
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    checkAuth();
  }, [auth, verify]);

  if (loading || globalLoading) {
    return <ScreenLoader />;
  }

  return <Outlet />;
};

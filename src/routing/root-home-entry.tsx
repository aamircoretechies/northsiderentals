import { Navigate } from 'react-router';
import { useAuth } from '@/auth/context/auth-context';
import { DefaultPage } from '@/pages/dashboards';

/**
 * Home route: signed-in users see the dashboard home; guests are sent to sign-in.
 */
export function RootHomeEntry() {
  const { auth } = useAuth();
  if (!auth?.access_token) {
    return <Navigate to="/auth/signin" replace />;
  }
  return <DefaultPage />;
}

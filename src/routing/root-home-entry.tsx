import { Navigate } from 'react-router';

/** Home route: always show the booking home (car search), not the login screen. */
export function RootHomeEntry() {
  return <Navigate to="/home" replace />;
}

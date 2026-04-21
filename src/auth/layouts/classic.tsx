import { useEffect } from 'react';
import { Link, Outlet, useNavigationType } from 'react-router-dom';
import { useAuth } from '@/auth/context/auth-context';
import { toAbsoluteUrl } from '@/lib/helpers';
import { Card, CardContent } from '@/components/ui/card';

export function ClassicLayout() {
  const navigationType = useNavigationType();
  const { auth, logout } = useAuth();
  const shouldLogoutOnBack = navigationType === 'POP' && Boolean(auth?.access_token);

  useEffect(() => {
    if (!shouldLogoutOnBack) return;
    logout();
  }, [logout, shouldLogoutOnBack]);

  if (shouldLogoutOnBack) {
    return null;
  }

  return (
    <>
      <style>
        {`
          .page-bg {
            background-image: url('${toAbsoluteUrl('/media/images/2600x1200/bg-10.png')}');
          }
          .dark .page-bg {
            background-image: url('${toAbsoluteUrl('/media/images/2600x1200/bg-10-dark.png')}');
          }
        `}
      </style>
      <div className="flex flex-col items-center justify-center grow bg-center bg-no-repeat page-bg">
        <div className="m-5">
          <Link to="/">
            <img
              src={toAbsoluteUrl('/media/app/mini-logo.svg')}
              className="h-[35px] max-w-none"
              alt=""
            />
          </Link>
        </div>
        <Card className="w-full max-w-[400px]">
          <CardContent className="p-6">
            <Outlet />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

import { useEffect } from 'react';
import { Link, Outlet, useNavigationType } from 'react-router-dom';
import { useAuth } from '@/auth/context/auth-context';
import { toAbsoluteUrl } from '@/lib/helpers';
import { Card, CardContent } from '@/components/ui/card';

export function BrandedLayout() {
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
          .branded-bg {
            background-image: url('${toAbsoluteUrl('/media/background/loginbg.webp')}');
          }
          .dark .branded-bg {
            background-image: url('${toAbsoluteUrl('/media/background/loginbg.webp')}');
          }
        `}
      </style>
      <div className="grid lg:grid-cols-1 grow bg-top xxl:bg-center xl:bg-cover bg-no-repeat branded-bg min-h-screen">
        <div className="flex justify-center items-center p-8 lg:p-10 order-2 lg:order-1">
          <Card className="w-full max-w-[400px]">
            <CardContent className="p-6">
              <Outlet />
            </CardContent>
          </Card>
        </div>

        {/*   <div className="lg:rounded-xl lg:border lg:border-border lg:m-5 order-1 lg:order-2 bg-top xxl:bg-center xl:bg-cover bg-no-repeat branded-bg">
          <div className="flex flex-col p-8 lg:p-16 gap-4">
            <Link to="/">
              <img
                src={toAbsoluteUrl('/media/app/mini-logo.svg')}
                className="h-[28px] max-w-none"
                alt=""
              />
            </Link>

            <div className="flex flex-col gap-3">
              <h3 className="text-2xl font-semibold text-mono">
                Secure Dashboard Access
              </h3>
              <div className="text-base font-medium text-secondary-foreground">
                A robust authentication gateway ensuring
                <br /> secure&nbsp;
                <span className="text-mono font-semibold">
                  efficient user access
                </span>
                &nbsp;to the Metronic
                <br /> Dashboard interface.
              </div>
            </div>
          </div>
        </div> */}
      </div>
    </>
  );
}

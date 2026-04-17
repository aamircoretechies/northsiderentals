import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Check, Eye, EyeOff, MoveLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { LoaderCircleIcon } from 'lucide-react';
import {
  getOtpPasswordResetSchema,
  OtpPasswordResetSchemaType,
} from '../forms/reset-password-schema';
import { resetPasswordWithOtp } from '@/services/auth-reset-password';

export function ResetPasswordConfirmPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isClassic = location.pathname.includes('/classic/');
  const resetPasswordPath = isClassic
    ? '/auth/classic/reset-password'
    : '/auth/reset-password';
  const signinPath = isClassic ? '/auth/classic/signin' : '/auth/signin';
  const [searchParams] = useSearchParams();
  const emailFromUrl = (searchParams.get('email') || '').trim();

  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!emailFromUrl) {
      navigate(resetPasswordPath, { replace: true });
    }
  }, [emailFromUrl, navigate, resetPasswordPath]);

  const form = useForm<OtpPasswordResetSchemaType>({
    resolver: zodResolver(getOtpPasswordResetSchema()),
    defaultValues: {
      otp: '',
      password: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(values: OtpPasswordResetSchemaType) {
    try {
      setIsProcessing(true);
      setError(null);

      await resetPasswordWithOtp({
        email: emailFromUrl,
        otp: values.otp,
        newPassword: values.password,
        confirmNewPassword: values.confirmPassword,
      });

      setSuccessMessage('Your password has been reset. You can sign in now.');
      form.reset();

      setTimeout(() => {
        navigate(`${signinPath}?pwd_reset=success`);
      }, 1500);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred. Please try again.',
      );
    } finally {
      setIsProcessing(false);
    }
  }

  if (!emailFromUrl) {
    return null;
  }

  return (
    <div className="max-w-md mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Enter verification code
            </h1>
            <p className="text-sm text-muted-foreground">
              We sent a code to{' '}
              <span className="font-medium text-foreground">{emailFromUrl}</span>.
              Enter the code and your new password below.
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertIcon>
                <AlertCircle className="h-4 w-4" />
              </AlertIcon>
              <AlertTitle>{error}</AlertTitle>
            </Alert>
          )}

          {successMessage && (
            <Alert>
              <AlertIcon>
                <Check className="h-4 w-4 text-green-500" />
              </AlertIcon>
              <AlertTitle>{successMessage}</AlertTitle>
            </Alert>
          )}

          <div className="space-y-5">
            <FormField
              control={form.control}
              name="otp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Verification code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Code from email"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={passwordVisible ? 'text' : 'password'}
                        placeholder="New password"
                        autoComplete="new-password"
                        className="pr-10"
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        mode="icon"
                        onClick={() => setPasswordVisible(!passwordVisible)}
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      >
                        {passwordVisible ? (
                          <EyeOff className="text-muted-foreground h-4 w-4" />
                        ) : (
                          <Eye className="text-muted-foreground h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm new password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={confirmPasswordVisible ? 'text' : 'password'}
                        placeholder="Confirm new password"
                        autoComplete="new-password"
                        className="pr-10"
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        mode="icon"
                        onClick={() =>
                          setConfirmPasswordVisible(!confirmPasswordVisible)
                        }
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      >
                        {confirmPasswordVisible ? (
                          <EyeOff className="text-muted-foreground h-4 w-4" />
                        ) : (
                          <Eye className="text-muted-foreground h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isProcessing}>
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <LoaderCircleIcon className="h-4 w-4 animate-spin" />{' '}
                  Updating…
                </span>
              ) : (
                'Reset password'
              )}
            </Button>
          </div>

          <div className="text-center text-sm space-y-2">
            <div>
              <Link
                to={resetPasswordPath}
                className="inline-flex items-center gap-2 text-sm font-semibold text-accent-foreground hover:underline hover:underline-offset-2"
              >
                <MoveLeft className="size-3.5 opacity-70" /> Use a different email
              </Link>
            </div>
            <div>
              <Link
                to={signinPath}
                className="text-primary hover:underline text-sm"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}

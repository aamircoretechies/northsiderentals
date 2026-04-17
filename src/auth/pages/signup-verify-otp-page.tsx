import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Check, MoveLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
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
import { useAuth } from '@/auth/context/auth-context';
import { getFriendlyError } from '@/utils/api-error-handler';

const getVerifyOtpSchema = () =>
  z.object({
    otp: z
      .string()
      .min(4, { message: 'Enter OTP sent to your email.' })
      .max(12, { message: 'OTP looks too long.' }),
  });

type VerifyOtpSchemaType = z.infer<ReturnType<typeof getVerifyOtpSchema>>;

export function SignupVerifyOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifySignupOtp, resendSignupOtp } = useAuth();
  const isClassic = location.pathname.includes('/classic/');
  const signinPath = isClassic ? '/auth/classic/signin' : '/auth/signin';
  const signupPath = isClassic ? '/auth/classic/signup' : '/auth/signup';
  const [searchParams] = useSearchParams();
  const email = (searchParams.get('email') || '').trim();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showResendMessage, setShowResendMessage] = useState(false);
  const [resendMessageCycle, setResendMessageCycle] = useState(0);

  useEffect(() => {
    if (resendMessageCycle <= 0) return;
    const timeout = window.setTimeout(() => setShowResendMessage(false), 3000);
    return () => window.clearTimeout(timeout);
  }, [resendMessageCycle]);

  const form = useForm<VerifyOtpSchemaType>({
    resolver: zodResolver(getVerifyOtpSchema()),
    defaultValues: {
      otp: '',
    },
  });

  async function onSubmit(values: VerifyOtpSchemaType) {
    try {
      setIsProcessing(true);
      setError(null);
      setShowResendMessage(false);
      await verifySignupOtp(email, values.otp);
      setSuccessMessage('OTP verified successfully. You can sign in now.');
      setTimeout(() => {
        navigate(signinPath);
      }, 1000);
    } catch (err) {
      setError(getFriendlyError(err, 'OTP verification failed.'));
    } finally {
      setIsProcessing(false);
    }
  }

  async function onResendOtp() {
    try {
      setIsResending(true);
      setError(null);
      setSuccessMessage(null);
      await resendSignupOtp(email);
      setShowResendMessage(true);
      setResendMessageCycle((prev) => prev + 1);
    } catch (err) {
      setError(getFriendlyError(err, 'Could not resend OTP.'));
    } finally {
      setIsResending(false);
    }
  }

  if (!email) {
    return (
      <div className="max-w-md mx-auto space-y-4 text-center">
        <p className="text-sm text-muted-foreground">
          Missing signup email. Please start signup again.
        </p>
        <Button asChild className="w-full">
          <Link to={signupPath}>Back to Sign Up</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto max-h-[80vh] overflow-y-auto pe-1">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Verify OTP</h1>
            <p className="text-sm text-muted-foreground">
              Enter the OTP sent to <span className="font-medium text-foreground">{email}</span>
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

          {showResendMessage && (
            <Alert>
              <AlertIcon>
                <Check className="h-4 w-4 text-green-500" />
              </AlertIcon>
              <AlertTitle>OTP resent successfully. Please check your inbox.</AlertTitle>
            </Alert>
          )}

          <FormField
            control={form.control}
            name="otp"
            render={({ field }) => (
              <FormItem>
                <FormLabel>OTP</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter OTP"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isProcessing}>
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <LoaderCircleIcon className="h-4 w-4 animate-spin" /> Verifying...
              </span>
            ) : (
              'Verify OTP'
            )}
          </Button>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Didn&apos;t receive OTP? </span>
            <button
              type="button"
              className="font-semibold text-primary hover:underline disabled:opacity-60"
              disabled={isResending}
              onClick={() => void onResendOtp()}
            >
              {isResending ? 'Resending...' : 'Resend OTP'}
            </button>
          </div>

          <div className="text-center text-sm">
            <Link
              to={signupPath}
              className="inline-flex items-center gap-2 text-sm font-semibold text-accent-foreground hover:underline hover:underline-offset-2"
            >
              <MoveLeft className="size-3.5 opacity-70" /> Back to Sign Up
            </Link>
          </div>
        </form>
      </Form>
    </div>
  );
}

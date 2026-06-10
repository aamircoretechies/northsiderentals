import { useEffect, useState } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { zodResolver } from '@hookform/resolvers/zod';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Icons } from '@/components/common/icons';
import { firebaseAuth, googleProvider } from '@/lib/firebase';
import { getSigninSchema, SigninSchemaType } from '../forms/signin-schema';
import { mapAuthErrorToField } from '@/utils/inline-form-validation';
import { LoaderCircleIcon } from 'lucide-react';
export function SignInPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { auth, login, loginWithGoogleIdToken } = useAuth();
  const nextPath = searchParams.get('next') || '/home';
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const form = useForm<SigninSchemaType>({
    resolver: zodResolver(getSigninSchema()),
    mode: 'onTouched',
    defaultValues: {
      email: '',
      password: '',
      rememberMe: true,
    },
  });

  // Password reset success or OAuth redirect errors — show inline on fields, not above the card.
  useEffect(() => {
    const pwdReset = searchParams.get('pwd_reset');
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (pwdReset === 'success') {
      setSuccessMessage(
        'Your password has been successfully reset. You can now sign in with your new password.',
      );
      form.clearErrors();
      return;
    }

    if (errorParam) {
      setSuccessMessage(null);
      const msg =
        errorDescription ||
        (errorParam === 'auth_callback_failed'
          ? 'Authentication failed. Please try again.'
          : errorParam === 'auth_token_error'
            ? 'Failed to set authentication session. Please try again.'
            : 'Authentication error. Please try again.');
      form.setError('email', { type: 'server', message: msg });
    }
  }, [searchParams, form]);

  async function onSubmit(values: SigninSchemaType) {
    try {
      setIsProcessing(true);
      form.clearErrors();
      setSuccessMessage(null);

      await login(values.email, values.password);

      navigate(nextPath);
    } catch (err) {
      console.error('Unexpected sign-in error:', err);
      setSuccessMessage(null);
      const msg =
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred. Please try again.';
      const field = mapAuthErrorToField(msg);
      form.setError(field, { type: 'server', message: msg });
    } finally {
      setIsProcessing(false);
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      form.clearErrors();
      setSuccessMessage(null);

      const googleUserCredential = await signInWithPopup(
        firebaseAuth,
        googleProvider,
      );
      const credential =
        GoogleAuthProvider.credentialFromResult(googleUserCredential);
      const idToken =
        credential?.idToken || (await googleUserCredential.user.getIdToken());

      await loginWithGoogleIdToken(idToken);

      navigate(nextPath);
    } catch (err) {
      console.error('Google sign-in error:', err);
      const errorCode =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code?: unknown }).code ?? '')
          : '';
      if (errorCode === 'auth/popup-closed-by-user') {
        setSuccessMessage(null);
        form.setError('email', {
          type: 'server',
          message: 'Sign-in was cancelled. Please try again.',
        });
        return;
      }
      if (errorCode === 'auth/popup-blocked') {
        setSuccessMessage(null);
        form.setError('email', {
          type: 'server',
          message:
            'Popup was blocked by your browser. Please allow popups and try again.',
        });
        return;
      }
      setSuccessMessage(null);
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to sign in with Google. Please try again.';
      form.setError('email', { type: 'server', message: msg });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  if (auth?.access_token) {
    return <Navigate to={nextPath} replace />;
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="block w-full space-y-5"
        noValidate
      >

        <div className="flex justify-center pb-2">
          <Link to="/home">
            <img
              src="/media/app/logo-nsr.svg"
              className="h-10 shrink-0"
              alt="Northside Rentals"
            />
          </Link>
        </div>

        <div className="text-center space-y-1 pb-3">
          <h1 className="text-2xl font-semibold tracking-tight">Sign In</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back! Log in with your credentials.
          </p>
          {successMessage ? (
            <p className="text-sm text-emerald-700 pt-2">{successMessage}</p>
          ) : null}
        </div>

        {/*  <Alert appearance="light" size="sm" close={false}>
          <AlertIcon>
            <AlertCircle className="text-primary" />
          </AlertIcon>
          <AlertTitle className="text-accent-foreground">
            Use <strong>demo@kt.com</strong> username and {` `}
            <strong>demo123</strong> password for demo access.
          </AlertTitle>
        </Alert> */}

        <div className="flex flex-col gap-3.5">
          <Button
            variant="outline"
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <span className="flex items-center gap-2">
                <LoaderCircleIcon className="size-4! animate-spin" /> Signing in with
                Google...
              </span>
            ) : (
              <>
                <Icons.googleColorful className="size-5!" /> Sign in with Google
              </>
            )}
          </Button>
        </div>

        <div className="relative py-1.5">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  placeholder="Your email"
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    form.clearErrors('email');
                  }}
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
              <div className="flex justify-between items-center gap-2.5">
                <FormLabel>Password</FormLabel>
              </div>
              <div className="relative">
                <Input
                  placeholder="Your password"
                  type={passwordVisible ? 'text' : 'password'}
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    form.clearErrors('password');
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  mode="icon"
                  onClick={() => setPasswordVisible(!passwordVisible)}
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                >
                  {passwordVisible ? (
                    <EyeOff className="text-muted-foreground" />
                  ) : (
                    <Eye className="text-muted-foreground" />
                  )}
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="rememberMe"
          render={({ field }) => (
            <FormItem className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-normal cursor-pointer">
                    Remember me
                  </FormLabel>
                </div>
                <Link
                  to="/auth/reset-password"
                  className="text-sm font-semibold text-foreground hover:text-primary"
                >
                  Forgot Password?
                </Link>
              </div>
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isProcessing}>
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <LoaderCircleIcon className="h-4 w-4 animate-spin" /> Loading...
            </span>
          ) : (
            'Sign In'
          )}
        </Button>

        <div className="text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link
            to="/auth/signup"
            className="text-sm font-semibold text-foreground hover:text-primary"
          >
            Sign Up
          </Link>
        </div>
        <div className="text-center text-sm text-muted-foreground">
          <Link
            to="/home"
            replace
            className="text-sm font-semibold text-foreground hover:text-primary"
          >
            Continue as Guest
          </Link>
        </div>
      </form>
    </Form>
  );
}

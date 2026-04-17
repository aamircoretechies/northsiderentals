import { useEffect, useState } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Check, Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { LoaderCircleIcon } from 'lucide-react';
import {
  getNewPasswordSchema,
  NewPasswordSchemaType,
} from '../forms/reset-password-schema';
import { getFriendlyError } from '@/utils/api-error-handler';

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isClassic = location.pathname.includes('/classic/');
  const resetPasswordPath = isClassic
    ? '/auth/classic/reset-password'
    : '/auth/reset-password';
  const signinPath = isClassic ? '/auth/classic/signin' : '/auth/signin';
  const [searchParams] = useSearchParams();
  const {} = useAuth();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [tokenValid, setTokenValid] = useState(false);

  // Check for different possible token parameter names used by Supabase
  // Supabase might use 'token', 'code', 'token_hash' or pass it as a URL hash
  const token =
    searchParams.get('token') ||
    searchParams.get('code') ||
    searchParams.get('token_hash');

  // Process Supabase recovery token
  useEffect(() => {
    // This automatically processes the token in the URL
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Token is valid and has been processed by Supabase
        setTokenValid(true);
        setSuccessMessage('You can now set your new password');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Also check for hash fragment which might contain the token
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const hashToken =
      hashParams.get('token') ||
      hashParams.get('code') ||
      hashParams.get('token_hash');

    if (hashToken && !token) return;
  }, [token]);

  const form = useForm<NewPasswordSchemaType>({
    resolver: zodResolver(getNewPasswordSchema()),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(values: NewPasswordSchemaType) {
    try {
      setIsProcessing(true);
      setError(null);

      // Use Supabase's updateUser method directly
      // The token is already processed by the onAuthStateChange handler
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      });

      if (error) {
        throw new Error(error.message);
      }

      // Set success message
      setSuccessMessage('Password changed successfully!');

      // Reset form
      form.reset();

      // Redirect to login page after a successful password reset
      setTimeout(() => {
        navigate(signinPath);
      }, 2000);
    } catch (err) {
      setError(getFriendlyError(err, 'Could not reset password. Please try again.'));
    } finally {
      setIsProcessing(false);
    }
  }

  if (!token && !tokenValid) {
    return (
      <div className="max-w-md mx-auto space-y-5">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Reset Password</h1>
          <p className="text-sm text-muted-foreground">
            You need a valid reset link to change your password
          </p>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg border border-border">
          <h3 className="font-medium mb-2">How to reset your password:</h3>
          <ol className="list-decimal ms-4 text-sm space-y-1 text-muted-foreground">
            <li>Request a verification code via email</li>
            <li>Check your email inbox and spam folder</li>
            <li>Enter the code and choose a new password</li>
          </ol>
        </div>

        <Button asChild className="w-full">
          <Link to={resetPasswordPath}>Forgot password (email code)</Link>
        </Button>

        <div className="text-center text-sm">
          <span className="text-muted-foreground">Remember your password?</span>{' '}
          <Link to={signinPath} className="text-primary hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Set New Password
            </h1>
            <p className="text-muted-foreground">
              Create a strong password for your account
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

          <div className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <div className="relative">
                    <Input
                      placeholder="New password"
                      type={passwordVisible ? 'text' : 'password'}
                      autoComplete="new-password"
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
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <div className="relative">
                    <Input
                      placeholder="Confirm new password"
                      type={confirmPasswordVisible ? 'text' : 'password'}
                      autoComplete="new-password"
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
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isProcessing}>
            {isProcessing ? (
              <span className="flex items-center gap-2">
                  <LoaderCircleIcon className="h-4 w-4" /> Updating password...
              </span>
            ) : (
              'Reset Password'
            )}
          </Button>

          <div className="text-center text-sm">
            <Link to={signinPath} className="text-primary hover:underline">
              Back to Sign In
            </Link>
          </div>
        </form>
      </Form>
    </div>
  );
}

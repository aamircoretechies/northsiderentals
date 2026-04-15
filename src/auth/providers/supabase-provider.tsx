import { PropsWithChildren, useEffect, useState } from 'react';
import { SupabaseAdapter } from '@/auth/adapters/supabase-adapter';
import { AuthContext } from '@/auth/context/auth-context';
import * as authHelper from '@/auth/lib/helpers';
import { AuthModel, UserModel } from '@/auth/lib/models';

// Define the Supabase Auth Provider
export function AuthProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState<AuthModel | undefined>(authHelper.getAuth());
  const [currentUser, setCurrentUser] = useState<UserModel | undefined>();
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin
  useEffect(() => {
    setIsAdmin(currentUser?.is_admin === true);
  }, [currentUser]);

  const verify = async () => {
    if (auth) {
      try {
        const user = await getUser();
        setCurrentUser(user || undefined);
      } catch {
        setCurrentUser(undefined);
      }
    }
  };

  const saveAuth = (auth: AuthModel | undefined) => {
    setAuth(auth);
    if (auth) {
      authHelper.setAuth(auth);
    } else {
      authHelper.removeAuth();
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const auth = await SupabaseAdapter.login(email, password);
      saveAuth(auth);
      try {
        const user = await getUser();
        setCurrentUser(user || undefined);
      } catch {
        // Backend-token sessions may not have a Supabase user; keep auth token.
        setCurrentUser(undefined);
      }
    } catch (error) {
      saveAuth(undefined);
      throw error;
    }
  };

  const loginWithGoogleIdToken = async (idToken: string) => {
    try {
      const auth = await SupabaseAdapter.loginWithGoogleIdToken(idToken);
      saveAuth(auth);
      try {
        const user = await getUser();
        setCurrentUser(user || undefined);
      } catch {
        setCurrentUser(undefined);
      }
    } catch (error) {
      saveAuth(undefined);
      throw error;
    }
  };

  const register = async (
    email: string,
    password: string,
    country_code: string,
    mobile: string,
  ) => {
    try {
      await SupabaseAdapter.register(email, password, country_code, mobile);
    } catch (error) {
      throw error;
    }
  };

  const verifySignupOtp = async (email: string, otp: string) => {
    await SupabaseAdapter.verifySignupOtp(email, otp);
  };

  const resendSignupOtp = async (email: string) => {
    await SupabaseAdapter.resendSignupOtp(email);
  };

  const requestPasswordReset = async (email: string) => {
    await SupabaseAdapter.requestPasswordReset(email);
  };

  const resetPassword = async (
    password: string,
    password_confirmation: string,
  ) => {
    await SupabaseAdapter.resetPassword(password, password_confirmation);
  };

  const resendVerificationEmail = async (email: string) => {
    await SupabaseAdapter.resendVerificationEmail(email);
  };

  const getUser = async () => {
    return await SupabaseAdapter.getCurrentUser();
  };

  const updateProfile = async (userData: Partial<UserModel>) => {
    return await SupabaseAdapter.updateUserProfile(userData);
  };

  const logout = () => {
    SupabaseAdapter.logout();
    saveAuth(undefined);
    setCurrentUser(undefined);
    const base = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');
    window.location.assign(`${base}auth/signin`);
  };

  return (
    <AuthContext.Provider
      value={{
        loading,
        setLoading,
        auth,
        saveAuth,
        user: currentUser,
        setUser: setCurrentUser,
        login,
        loginWithGoogleIdToken,
        register,
        verifySignupOtp,
        resendSignupOtp,
        requestPasswordReset,
        resetPassword,
        resendVerificationEmail,
        getUser,
        updateProfile,
        logout,
        verify,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

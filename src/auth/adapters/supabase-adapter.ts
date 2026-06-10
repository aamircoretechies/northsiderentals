import { AuthModel, UserModel } from '@/auth/lib/models';
import { supabase } from '@/lib/supabase';
import {
  requestSignupOtp,
  resendSignupOtp,
  verifySignupOtp,
} from '@/services/auth-signup';

/**
 * Supabase adapter that maintains the same interface as the existing auth flow
 * but uses Supabase under the hood.
 */
export const SupabaseAdapter = {
  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<AuthModel> {
    const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(
      /\/$/,
      '',
    );
    if (!apiBaseUrl) {
      throw new Error('Missing API base URL configuration');
    }

    const body = JSON.stringify({
      email: email.trim(),
      password,
    });

    // Support common backend auth route names across environments.
    const candidatePaths = ['/auth/login', '/auth/signin'];
    let lastError = 'Invalid login credentials';

    for (const path of candidatePaths) {
      const response = await fetch(`${apiBaseUrl}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      });

      const payload = await response.json().catch(() => ({}));

      if (response.status === 404) {
        continue;
      }

      if (!response.ok) {
        lastError =
          payload?.message ||
          payload?.error ||
          `Login failed: ${response.status}`;
        throw new Error(lastError);
      }

      if (
        payload?.status !== undefined &&
        payload.status !== 1 &&
        payload.status !== '1'
      ) {
        throw new Error(payload?.message || 'Invalid login credentials');
      }

      const tokenContainer = payload?.data ?? payload;
      const accessToken =
        tokenContainer?.access_token ??
        tokenContainer?.accessToken ??
        tokenContainer?.token;
      const refreshToken =
        tokenContainer?.refresh_token ?? tokenContainer?.refreshToken;

      if (!accessToken) {
        throw new Error('Login succeeded but no access token was returned');
      }

      return {
        access_token: accessToken,
        refresh_token: refreshToken,
      };
    }

    throw new Error(lastError);
  },

  /**
   * Login with Firebase Google ID token using backend API
   */
  async loginWithGoogleIdToken(idToken: string): Promise<AuthModel> {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

    if (!apiBaseUrl) {
      throw new Error('Missing API base URL configuration');
    }

    const response = await fetch(`${apiBaseUrl}/auth/google-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id_token: idToken }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        payload?.message || payload?.error || 'Failed to login with Google';
      throw new Error(message);
    }

    // Support both direct token response and nested data objects.
    const tokenContainer = payload?.data ?? payload;
    const accessToken =
      tokenContainer?.access_token ??
      tokenContainer?.accessToken ??
      tokenContainer?.token;
    const refreshToken =
      tokenContainer?.refresh_token ?? tokenContainer?.refreshToken;

    if (!accessToken) {
      throw new Error('Google login succeeded but no access token was returned');
    }

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  },

  /**
   * Login with OAuth provider (Google, GitHub, etc.)
   */
  async signInWithOAuth(
    provider:
      | 'google'
      | 'github'
      | 'facebook'
      | 'twitter'
      | 'discord'
      | 'slack',
    options?: { redirectTo?: string },
  ): Promise<void> {
    console.log(
      'SupabaseAdapter: Initiating OAuth flow with provider:',
      provider,
    );

    try {
      const redirectTo =
        options?.redirectTo || `${window.location.origin}/auth/callback`;

      console.log('SupabaseAdapter: Using redirect URL:', redirectTo);

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
        },
      });

      if (error) {
        console.error('SupabaseAdapter: OAuth error:', error);
        throw new Error(error.message);
      }

      console.log('SupabaseAdapter: OAuth flow initiated successfully');

      // No need to return anything - the browser will be redirected
    } catch (error) {
      console.error('SupabaseAdapter: Unexpected OAuth error:', error);
      throw error;
    }
  },

  /**
   * Register a new user
   */
  async register(
    email: string,
    password: string,
    country_code: string,
    mobile: string,
  ): Promise<void> {
    await requestSignupOtp({
      email,
      country_code,
      mobile,
      password,
    });
  },

  async verifySignupOtp(email: string, otp: string): Promise<void> {
    await verifySignupOtp({ email, otp });
  },

  async resendSignupOtp(email: string): Promise<void> {
    await resendSignupOtp(email);
  },

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    console.log('Requesting password reset for:', email);

    try {
      // Ensure the redirect URL is properly formatted with a hash for token
      const redirectUrl = `${window.location.origin}/auth/reset-password`;
      console.log('Using redirect URL:', redirectUrl);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        console.error('Password reset request error:', error);
        throw new Error(error.message);
      }

      console.log('Password reset email sent successfully');
    } catch (err) {
      console.error('Unexpected error in password reset:', err);
      throw err;
    }
  },

  /**
   * Reset password with token
   */
  async resetPassword(
    password: string,
    password_confirmation: string,
  ): Promise<void> {
    if (password !== password_confirmation) {
      throw new Error('Passwords do not match');
    }

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) throw new Error(error.message);
  },

  /**
   * Request another verification email
   */
  async resendVerificationEmail(email: string): Promise<void> {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/verify-email`,
      },
    });

    if (error) throw new Error(error.message);
  },

  /**
   * Get current user from the session
   */
  async getCurrentUser(): Promise<UserModel | null> {
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return null;
      return this.getUserProfile();
    } catch {
      return null;
    }
  },

  /**
   * Get user profile from user metadata
   */
  async getUserProfile(): Promise<UserModel> {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) throw new Error(error?.message || 'User not found');

    // Get user metadata and transform to UserModel format
    const metadata = user.user_metadata || {};

    // Format data to maintain compatibility with existing UI
    return {
      id: user.id,
      email: user.email || '',
      email_verified: user.email_confirmed_at !== null,
      username: metadata.username || '',
      first_name: metadata.first_name || '',
      last_name: metadata.last_name || '',
      fullname:
        metadata.fullname ||
        `${metadata.first_name || ''} ${metadata.last_name || ''}`.trim(),
      occupation: metadata.occupation || '',
      company_name: metadata.company_name || '',
      companyName: metadata.company_name || '', // For backward compatibility
      phone: metadata.phone || '',
      roles: metadata.roles || [],
      pic: metadata.pic || '',
      language: metadata.language || 'en',
      is_admin: metadata.is_admin || false,
    };
  },

  /**
   * Update user profile (stored in metadata)
   */
  async updateUserProfile(userData: Partial<UserModel>): Promise<UserModel> {
    // Transform from UserModel to metadata format
    const metadata: Record<string, unknown> = {
      username: userData.username,
      first_name: userData.first_name,
      last_name: userData.last_name,
      fullname:
        userData.fullname ||
        `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
      occupation: userData.occupation,
      company_name: userData.company_name || userData.companyName, // Support both formats
      phone: userData.phone,
      roles: userData.roles,
      pic: userData.pic,
      language: userData.language,
      is_admin: userData.is_admin,
      updated_at: new Date().toISOString(),
    };

    // Remove undefined fields
    Object.keys(metadata).forEach((key) => {
      if (metadata[key] === undefined) {
        delete metadata[key];
      }
    });

    // Update user metadata
    const { error } = await supabase.auth.updateUser({
      data: metadata,
    });

    if (error) throw new Error(error.message);

    return this.getCurrentUser() as Promise<UserModel>;
  },

  /**
   * Logout the current user
   */
  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  },
};

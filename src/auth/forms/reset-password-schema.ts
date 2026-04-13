import { z } from 'zod';

// Schema for requesting a password reset email
export const getResetRequestSchema = () => {
  return z.object({
    email: z
      .string()
      .email({ message: 'Please enter a valid email address.' })
      .min(1, { message: 'Email is required.' }),
  });
};

const strongPassword = z
  .string()
  .min(6, { message: 'Password must be at least 6 characters.' })
  .regex(/[A-Z]/, {
    message: 'Password must contain at least one uppercase letter.',
  })
  .regex(/[0-9]/, {
    message: 'Password must contain at least one number.',
  });

// Schema for setting a new password
export const getNewPasswordSchema = () => {
  return z
    .object({
      password: strongPassword,
      confirmPassword: z
        .string()
        .min(1, { message: 'Please confirm your password.' }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    });
};

export type ResetRequestSchemaType = z.infer<
  ReturnType<typeof getResetRequestSchema>
>;
export type NewPasswordSchemaType = z.infer<
  ReturnType<typeof getNewPasswordSchema>
>;

/** OTP + new password (API reset step after forgot-password). */
export const getOtpPasswordResetSchema = () => {
  return z
    .object({
      otp: z
        .string()
        .min(4, { message: 'Enter the verification code from your email.' })
        .max(12, { message: 'Verification code looks too long.' }),
      password: strongPassword,
      confirmPassword: z
        .string()
        .min(1, { message: 'Please confirm your password.' }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    });
};

export type OtpPasswordResetSchemaType = z.infer<
  ReturnType<typeof getOtpPasswordResetSchema>
>;

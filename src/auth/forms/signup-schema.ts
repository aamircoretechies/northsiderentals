import { z } from 'zod';

export const getSignupSchema = () => {
  return z
    .object({
      email: z
        .string()
        .email({ message: 'Please enter a valid email address.' })
        .min(1, { message: 'Email is required.' }),
      country_code: z
        .string()
        .min(1, { message: 'Country code is required.' })
        .max(8, { message: 'Country code is too long.' }),
      mobile: z
        .string()
        .min(6, { message: 'Mobile number is required.' })
        .max(20, { message: 'Mobile number is too long.' }),
      password: z
        .string()
        .min(6, { message: 'Password must be at least 6 characters.' })
        .regex(/[A-Z]/, {
          message: 'Password must contain at least one uppercase letter.',
        })
        .regex(/[0-9]/, {
          message: 'Password must contain at least one number.',
        }),
      confirmPassword: z
        .string()
        .min(1, { message: 'Please confirm your password.' }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    });
};

export type SignupSchemaType = z.infer<ReturnType<typeof getSignupSchema>>;

import { z } from 'zod'

/**
 * Auth Form Validation Schemas
 * 
 * Zod schemas for login, register, and password reset forms.
 * These schemas match the backend validation requirements.
 */

// Password requirements (must match backend)
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one digit')

// Email validation
const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')

/**
 * Login Form Schema
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

export type LoginFormData = z.infer<typeof loginSchema>

/**
 * Register Form Schema
 */
export const registerSchema = z.object({
  fullName: z
    .string()
    .min(1, 'Full name is required')
    .min(2, 'Name must be at least 2 characters'),
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export type RegisterFormData = z.infer<typeof registerSchema>

/**
 * Forgot Password Form Schema
 */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

/**
 * Reset Password Form Schema
 */
export const resetPasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail, Lock, User, Loader2, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import { registerSchema, type RegisterFormData } from '@/lib/validations/auth'
import { useRegister } from '@/hooks/useSession'

interface RegisterFormProps {
  onSuccess?: () => void
  onSwitchToLogin?: () => void
}

// Simple password strength calculation
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 2) return { score, label: 'Weak', color: 'bg-red-500' }
  if (score <= 3) return { score, label: 'Fair', color: 'bg-yellow-500' }
  if (score <= 4) return { score, label: 'Good', color: 'bg-blue-500' }
  return { score, label: 'Strong', color: 'bg-green-500' }
}

export default function RegisterForm({ onSuccess, onSwitchToLogin }: RegisterFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [requiresVerification, setRequiresVerification] = useState(true)
  const registerMutation = useRegister()

  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  })

  const password = watch('password')
  const strength = password ? getPasswordStrength(password) : null

  const onSubmit = async (data: RegisterFormData) => {
    setError('')
    try {
      const result = await registerMutation.mutateAsync({
        email: data.email,
        password: data.password,
        fullName: data.fullName,
      })
      setRequiresVerification((result as any).requires_verification ?? true)
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Registration failed')
    }
  }

  // Success — show appropriate message based on whether verification is required
  if (success) {
    return (
      <div className="text-center space-y-4 py-4">
        <div className="w-16 h-16 mx-auto bg-green-900/30 rounded-full flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>
        <h3 className="text-lg font-semibold text-white">
          {requiresVerification ? 'Check your email' : 'Account created'}
        </h3>
        <p className="text-sm text-gray-400">
          {requiresVerification
            ? "We've sent a verification link to your email address. Please verify your account to sign in."
            : 'Your account has been created successfully. You can now sign in.'}
        </p>
        {onSwitchToLogin && (
          <button
            onClick={onSwitchToLogin}
            className="text-brand-500 hover:text-brand-600 font-medium text-sm"
          >
            {requiresVerification ? 'Back to sign in' : 'Sign in now'}
          </button>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-red-400 bg-red-900/20 rounded-xl" role="alert">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Full name */}
      <div>
        <label htmlFor="reg-name" className="block text-sm font-medium mb-1" style={{ color: '#CBD5E1' }}>
          Full Name
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94A3B8' }} />
          <input
            id="reg-name"
            type="text"
            {...register('fullName')}
            placeholder="John Doe"
            autoComplete="name"
            className="w-full pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            style={{ backgroundColor: '#103351', border: '1px solid #15446c', color: '#FFFFFF' }}
            aria-invalid={!!errors.fullName}
          />
        </div>
        {errors.fullName && <p className="mt-1 text-xs text-red-400">{errors.fullName.message}</p>}
      </div>

      {/* Email */}
      <div>
        <label htmlFor="reg-email" className="block text-sm font-medium mb-1" style={{ color: '#CBD5E1' }}>
          Email
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94A3B8' }} />
          <input
            id="reg-email"
            type="email"
            {...register('email')}
            placeholder="you@example.com"
            autoComplete="email"
            className="w-full pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            style={{ backgroundColor: '#103351', border: '1px solid #15446c', color: '#FFFFFF' }}
            aria-invalid={!!errors.email}
          />
        </div>
        {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
      </div>

      {/* Password */}
      <div>
        <label htmlFor="reg-password" className="block text-sm font-medium mb-1" style={{ color: '#CBD5E1' }}>
          Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94A3B8' }} />
          <input
            id="reg-password"
            type={showPassword ? 'text' : 'password'}
            {...register('password')}
            placeholder="Create a strong password"
            autoComplete="new-password"
            className="w-full pl-10 pr-10 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            style={{ backgroundColor: '#103351', border: '1px solid #15446c', color: '#FFFFFF' }}
            aria-invalid={!!errors.password}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 hover:text-white transition-colors"
            style={{ color: '#94A3B8' }}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}

        {/* Strength indicator */}
        {strength && password.length > 0 && (
          <div className="mt-2">
            <div className="flex gap-1 mb-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full ${i <= strength.score ? strength.color : ''}`}
                  style={i > strength.score ? { backgroundColor: '#15446c' } : undefined}
                />
              ))}
            </div>
            <p className="text-xs" style={{ color: '#94A3B8' }}>Strength: {strength.label}</p>
          </div>
        )}
      </div>

      {/* Confirm password */}
      <div>
        <label htmlFor="reg-confirm" className="block text-sm font-medium mb-1" style={{ color: '#CBD5E1' }}>
          Confirm Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94A3B8' }} />
          <input
            id="reg-confirm"
            type={showPassword ? 'text' : 'password'}
            {...register('confirmPassword')}
            placeholder="Confirm your password"
            autoComplete="new-password"
            className="w-full pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            style={{ backgroundColor: '#103351', border: '1px solid #15446c', color: '#FFFFFF' }}
            aria-invalid={!!errors.confirmPassword}
          />
        </div>
        {errors.confirmPassword && <p className="mt-1 text-xs text-red-400">{errors.confirmPassword.message}</p>}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={registerMutation.isPending}
        className="w-full py-3 px-4 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold flex items-center justify-center gap-2"
        style={{ backgroundColor: '#0891B2' }}
      >
        {registerMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        Create Account
      </button>

      <p className="text-xs text-center" style={{ color: '#64748B' }}>
        By creating an account, you agree to our Terms of Service and Privacy Policy.
      </p>

      {/* Switch to login */}
      {onSwitchToLogin && (
        <p className="text-center text-sm" style={{ color: '#94A3B8' }}>
          Already have an account?{' '}
          <button type="button" onClick={onSwitchToLogin} className="font-medium" style={{ color: '#0891B2' }}>
            Sign in
          </button>
        </p>
      )}
    </form>
  )
}

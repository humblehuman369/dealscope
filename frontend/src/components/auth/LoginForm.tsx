'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail, Lock, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { loginSchema, type LoginFormData } from '@/lib/validations/auth'
import { useLogin, useLoginMfa } from '@/hooks/useSession'
import type { MFAChallengeResponse } from '@/lib/api-client'

interface LoginFormProps {
  onSuccess?: () => void
  onForgotPassword?: () => void
  onSwitchToRegister?: () => void
}

export default function LoginForm({ onSuccess, onForgotPassword, onSwitchToRegister }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [mfaChallenge, setMfaChallenge] = useState<string | null>(null)
  const [mfaCode, setMfaCode] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  const loginMutation = useLogin()
  const mfaMutation = useLoginMfa()

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (data: LoginFormData) => {
    setError('')
    try {
      const result = await loginMutation.mutateAsync({
        email: data.email,
        password: data.password,
        rememberMe,
      })
      if ('mfa_required' in result && result.mfa_required) {
        setMfaChallenge((result as MFAChallengeResponse).challenge_token)
      } else {
        onSuccess?.()
      }
    } catch (err: any) {
      setError(err.message || 'Login failed')
    }
  }

  const onMfaSubmit = async () => {
    if (!mfaChallenge || mfaCode.length !== 6) return
    setError('')
    try {
      await mfaMutation.mutateAsync({
        challengeToken: mfaChallenge,
        totpCode: mfaCode,
        rememberMe,
      })
      onSuccess?.()
    } catch (err: any) {
      setError(err.message || 'Invalid MFA code')
    }
  }

  const isLoading = loginMutation.isPending || mfaMutation.isPending

  // MFA verification screen
  if (mfaChallenge) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-white">Two-Factor Authentication</h3>
          <p className="text-sm text-gray-400 mt-1">
            Enter the 6-digit code from your authenticator app.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 text-sm text-red-400 bg-red-900/20 rounded-xl" role="alert">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div>
          <label htmlFor="mfa-code" className="sr-only">MFA Code</label>
          <input
            id="mfa-code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className="w-full px-4 py-3 text-center text-2xl tracking-[0.5em] rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            style={{ backgroundColor: '#103351', border: '1px solid #15446c', color: '#FFFFFF' }}
            autoFocus
            autoComplete="one-time-code"
          />
        </div>

        <button
          onClick={onMfaSubmit}
          disabled={isLoading || mfaCode.length !== 6}
          className="w-full py-3 px-4 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold flex items-center justify-center gap-2"
          style={{ backgroundColor: '#0891B2' }}
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          Verify
        </button>

        <button
          onClick={() => { setMfaChallenge(null); setMfaCode(''); setError('') }}
          className="w-full text-sm text-gray-400 hover:text-white hover:underline transition-colors"
        >
          Back to login
        </button>
      </div>
    )
  }

  // Standard login form
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-red-400 bg-red-900/20 rounded-xl" role="alert">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Email */}
      <div>
        <label htmlFor="login-email" className="block text-sm font-medium mb-1" style={{ color: '#CBD5E1' }}>
          Email
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94A3B8' }} />
          <input
            id="login-email"
            type="email"
            {...register('email')}
            placeholder="you@example.com"
            autoComplete="email"
            className="w-full pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            style={{ backgroundColor: '#103351', border: '1px solid #15446c', color: '#FFFFFF' }}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'login-email-error' : undefined}
          />
        </div>
        {errors.email && (
          <p id="login-email-error" className="mt-1 text-xs text-red-400">{errors.email.message}</p>
        )}
      </div>

      {/* Password */}
      <div>
        <label htmlFor="login-password" className="block text-sm font-medium mb-1" style={{ color: '#CBD5E1' }}>
          Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94A3B8' }} />
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            {...register('password')}
            placeholder="Enter your password"
            autoComplete="current-password"
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
        {errors.password && (
          <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>
        )}
      </div>

      {/* Remember me + Forgot password */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500"
            style={{ backgroundColor: '#103351', borderColor: '#15446c' }}
          />
          <span className="text-sm" style={{ color: '#94A3B8' }}>Remember me</span>
        </label>
        {onForgotPassword && (
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-sm font-medium"
            style={{ color: '#0891B2' }}
          >
            Forgot password?
          </button>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 px-4 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold flex items-center justify-center gap-2"
        style={{ backgroundColor: '#0891B2' }}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        Sign In
      </button>

      {/* Switch to register */}
      {onSwitchToRegister && (
        <p className="text-center text-sm" style={{ color: '#94A3B8' }}>
          Don&apos;t have an account?{' '}
          <button type="button" onClick={onSwitchToRegister} className="font-medium" style={{ color: '#0891B2' }}>
            Sign up
          </button>
        </p>
      )}
    </form>
  )
}

'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail, Loader2, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/lib/validations/auth'
import { authApi } from '@/lib/api-client'

interface ForgotPasswordFormProps {
  onBack?: () => void
}

export default function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setError('')
    setIsLoading(true)
    try {
      await authApi.forgotPassword(data.email)
      setSent(true)
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email')
    } finally {
      setIsLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="text-center space-y-4 py-4">
        <div className="w-16 h-16 mx-auto bg-green-900/30 rounded-full flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>
        <h3 className="text-lg font-semibold text-white">Check your email</h3>
        <p className="text-sm text-gray-400">
          If an account exists with that email, we&apos;ve sent a password reset link.
        </p>
        {onBack && (
          <button onClick={onBack} className="text-brand-500 hover:text-brand-600 font-medium text-sm">
            Back to sign in
          </button>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {onBack && (
        <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to sign in
        </button>
      )}

      <p className="text-sm text-gray-400">
        Enter your email and we&apos;ll send you a link to reset your password.
      </p>

      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-red-400 bg-red-900/20 rounded-xl" role="alert">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div>
        <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-300 mb-1">
          Email
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            id="forgot-email"
            type="email"
            {...register('email')}
            placeholder="you@example.com"
            autoComplete="email"
            className="w-full pl-10 pr-4 py-3 border rounded-xl bg-navy-700 border-navy-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            aria-invalid={!!errors.email}
          />
        </div>
        {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 px-4 bg-brand-500 text-white rounded-xl hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold flex items-center justify-center gap-2"
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        Send Reset Link
      </button>
    </form>
  )
}

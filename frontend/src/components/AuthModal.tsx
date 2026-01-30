'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Mail, Lock, User, Loader2, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { 
  loginSchema, 
  registerSchema, 
  forgotPasswordSchema,
  type LoginFormData,
  type RegisterFormData,
  type ForgotPasswordFormData
} from '@/lib/validations/auth'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dealscope-production.up.railway.app'

export default function AuthModal() {
  const router = useRouter()
  const pathname = usePathname()
  const { showAuthModal, setShowAuthModal, login, register: registerUser, isLoading } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSendingReset, setIsSendingReset] = useState(false)

  // Login form
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  // Register form
  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  })

  // Forgot password form
  const forgotPasswordForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  // Sync modal type with context
  useEffect(() => {
    if (showAuthModal === 'login') {
      setIsLogin(true)
    } else if (showAuthModal === 'register') {
      setIsLogin(false)
    }
    // Reset forms when modal opens
    loginForm.reset()
    registerForm.reset()
    forgotPasswordForm.reset()
    setError('')
    setSuccess('')
    setShowForgotPassword(false)
  }, [showAuthModal, loginForm, registerForm, forgotPasswordForm])

  const handleForgotPassword = async (data: ForgotPasswordFormData) => {
    setError('')
    setSuccess('')
    setIsSendingReset(true)
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      })

      if (response.ok) {
        setSuccess('If an account exists with that email, a reset link has been sent. Please check your inbox.')
        forgotPasswordForm.reset()
      } else {
        const errorData = await response.json()
        setError(errorData.detail || 'Failed to send reset email')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setIsSendingReset(false)
    }
  }

  if (!showAuthModal) return null

  const handleLoginSubmit = async (data: LoginFormData) => {
    setError('')
    setSuccess('')

    try {
      await login(data.email, data.password)
      setSuccess('Login successful!')
      
      // Only redirect to dashboard if user is on homepage or login-related pages
      const shouldRedirect = pathname === '/' || pathname === '/login' || pathname === '/register'
      if (shouldRedirect) {
        router.push('/dashboard')
      }
      setShowAuthModal(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
    }
  }

  const handleRegisterSubmit = async (data: RegisterFormData) => {
    setError('')
    setSuccess('')

    try {
      await registerUser(data.email, data.password, data.fullName)
      setSuccess('Account created successfully!')
      
      const shouldRedirect = pathname === '/' || pathname === '/login' || pathname === '/register'
      if (shouldRedirect) {
        router.push('/dashboard')
      }
      setShowAuthModal(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      
      // Handle verification required case
      if (errorMessage.startsWith('VERIFICATION_REQUIRED:')) {
        setSuccess(errorMessage.replace('VERIFICATION_REQUIRED:', ''))
        return
      }
      
      setError(errorMessage)
    }
  }

  const handleClose = () => {
    setShowAuthModal(null)
  }

  const toggleMode = () => {
    setIsLogin(!isLogin)
    setError('')
    setSuccess('')
    setShowForgotPassword(false)
    loginForm.reset()
    registerForm.reset()
  }

  // Get the current form's errors for display
  const currentErrors = isLogin ? loginForm.formState.errors : registerForm.formState.errors

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-navy-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-teal dark:from-accent-500 to-navy-900/70 dark:to-navy-900/70 px-6 py-8 text-white">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold text-white">
            {showForgotPassword ? 'Reset Password' : isLogin ? 'Welcome Back!' : 'Create Account'}
          </h2>
          <p className="text-white/80 mt-1">
            {showForgotPassword 
              ? 'Enter your email to receive a reset link'
              : isLogin 
                ? 'Sign in to access your investment portfolio' 
                : 'Start analyzing real estate investments today'}
          </p>
        </div>

        {/* Form Content */}
        {showForgotPassword ? (
          /* Forgot Password Form */
          <form onSubmit={forgotPasswordForm.handleSubmit(handleForgotPassword)} className="p-6 space-y-4">
            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                {success}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  {...forgotPasswordForm.register('email')}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                />
              </div>
              {forgotPasswordForm.formState.errors.email && (
                <p className="mt-1 text-xs text-red-500">{forgotPasswordForm.formState.errors.email.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSendingReset}
              className="w-full py-3 bg-gradient-to-r from-teal dark:from-accent-500 to-navy-900/70 dark:to-navy-900/70 text-white font-semibold rounded-lg hover:opacity-90 focus:ring-4 focus:ring-teal/30 dark:focus:ring-accent-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isSendingReset ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Reset Link'
              )}
            </button>

            {/* Back to Login */}
            <button
              type="button"
              onClick={() => {
                setShowForgotPassword(false)
                setError('')
                setSuccess('')
              }}
              className="w-full text-center text-sm text-gray-600 dark:text-gray-400 hover:text-teal dark:hover:text-accent-500"
            >
              ← Back to Sign In
            </button>
          </form>
        ) : isLogin ? (
          /* Login Form */
          <form onSubmit={loginForm.handleSubmit(handleLoginSubmit)} className="p-6 space-y-4">
            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                {success}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  {...loginForm.register('email')}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                />
              </div>
              {loginForm.formState.errors.email && (
                <p className="mt-1 text-xs text-red-500">{loginForm.formState.errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...loginForm.register('password')}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-2.5 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {loginForm.formState.errors.password && (
                <p className="mt-1 text-xs text-red-500">{loginForm.formState.errors.password.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-teal dark:from-accent-500 to-navy-900/70 dark:to-navy-900/70 text-white font-semibold rounded-lg hover:opacity-90 focus:ring-4 focus:ring-teal/30 dark:focus:ring-accent-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>

            {/* Forgot Password */}
            <button
              type="button"
              onClick={() => {
                setShowForgotPassword(true)
                setError('')
                setSuccess('')
              }}
              className="w-full text-center text-sm text-teal dark:text-accent-500 hover:underline"
            >
              Forgot your password?
            </button>

            {/* Toggle Mode */}
            <div className="text-center text-sm text-gray-600 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-neutral-700">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={toggleMode}
                className="text-teal dark:text-accent-500 font-semibold hover:underline"
              >
                Sign up
              </button>
            </div>
          </form>
        ) : (
          /* Register Form */
          <form onSubmit={registerForm.handleSubmit(handleRegisterSubmit)} className="p-6 space-y-4">
            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                {success}
              </div>
            )}

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  {...registerForm.register('fullName')}
                  placeholder="John Doe"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                />
              </div>
              {registerForm.formState.errors.fullName && (
                <p className="mt-1 text-xs text-red-500">{registerForm.formState.errors.fullName.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  {...registerForm.register('email')}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                />
              </div>
              {registerForm.formState.errors.email && (
                <p className="mt-1 text-xs text-red-500">{registerForm.formState.errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...registerForm.register('password')}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-2.5 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Min 8 characters with uppercase, lowercase, and number
              </p>
              {registerForm.formState.errors.password && (
                <p className="mt-1 text-xs text-red-500">{registerForm.formState.errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...registerForm.register('confirmPassword')}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                />
              </div>
              {registerForm.formState.errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-500">{registerForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-teal dark:from-accent-500 to-navy-900/70 dark:to-navy-900/70 text-white font-semibold rounded-lg hover:opacity-90 focus:ring-4 focus:ring-teal/30 dark:focus:ring-accent-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>

            {/* Toggle Mode */}
            <div className="text-center text-sm text-gray-600 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-neutral-700">
              Already have an account?{' '}
              <button
                type="button"
                onClick={toggleMode}
                className="text-teal dark:text-accent-500 font-semibold hover:underline"
              >
                Sign in
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

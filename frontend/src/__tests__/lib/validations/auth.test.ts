import { describe, it, expect } from 'vitest'
import { 
  loginSchema, 
  registerSchema, 
  forgotPasswordSchema,
  resetPasswordSchema 
} from '@/lib/validations/auth'

describe('Auth Validation Schemas', () => {
  describe('loginSchema', () => {
    it('validates a correct login', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
      })
      expect(result.success).toBe(true)
    })

    it('rejects empty email', () => {
      const result = loginSchema.safeParse({
        email: '',
        password: 'password123',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Email is required')
      }
    })

    it('rejects invalid email format', () => {
      const result = loginSchema.safeParse({
        email: 'not-an-email',
        password: 'password123',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('valid email')
      }
    })

    it('rejects empty password', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: '',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Password is required')
      }
    })
  })

  describe('registerSchema', () => {
    const validRegistration = {
      fullName: 'John Doe',
      email: 'john@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
    }

    it('validates a correct registration', () => {
      const result = registerSchema.safeParse(validRegistration)
      expect(result.success).toBe(true)
    })

    it('rejects short password', () => {
      const result = registerSchema.safeParse({
        ...validRegistration,
        password: 'Pass1',
        confirmPassword: 'Pass1',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 8 characters')
      }
    })

    it('rejects password without uppercase', () => {
      const result = registerSchema.safeParse({
        ...validRegistration,
        password: 'password123',
        confirmPassword: 'password123',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('uppercase')
      }
    })

    it('rejects password without lowercase', () => {
      const result = registerSchema.safeParse({
        ...validRegistration,
        password: 'PASSWORD123',
        confirmPassword: 'PASSWORD123',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('lowercase')
      }
    })

    it('rejects password without digit', () => {
      const result = registerSchema.safeParse({
        ...validRegistration,
        password: 'PasswordABC',
        confirmPassword: 'PasswordABC',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('digit')
      }
    })

    it('rejects mismatched passwords', () => {
      const result = registerSchema.safeParse({
        ...validRegistration,
        confirmPassword: 'DifferentPassword123!',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('do not match')
      }
    })

    it('rejects empty full name', () => {
      const result = registerSchema.safeParse({
        ...validRegistration,
        fullName: '',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Full name is required')
      }
    })
  })

  describe('forgotPasswordSchema', () => {
    it('validates a correct email', () => {
      const result = forgotPasswordSchema.safeParse({
        email: 'test@example.com',
      })
      expect(result.success).toBe(true)
    })

    it('rejects invalid email', () => {
      const result = forgotPasswordSchema.safeParse({
        email: 'invalid',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('resetPasswordSchema', () => {
    it('validates matching passwords', () => {
      const result = resetPasswordSchema.safeParse({
        password: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      })
      expect(result.success).toBe(true)
    })

    it('rejects mismatched passwords', () => {
      const result = resetPasswordSchema.safeParse({
        password: 'NewPassword123!',
        confirmPassword: 'DifferentPassword123!',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('do not match')
      }
    })
  })
})

import { describe, it, expect } from '@jest/globals'
import { sanitizeObject, sanitizeInput } from '../utils/sanitization.js'

describe('sanitizeObject', () => {
  it('keeps arrays as arrays and sanitizes their string items', () => {
    const out = sanitizeObject({ tags: ['a', '<script>x</script>b'], items: [{ id: 1, qty: 2 }] })
    expect(Array.isArray(out.tags)).toBe(true)
    expect(out.tags).toEqual(['a', 'b'])
    expect(Array.isArray(out.items)).toBe(true)
    expect(out.items).toEqual([{ id: 1, qty: 2 }])
  })

  it('handles a top-level array', () => {
    expect(sanitizeObject(['x', { a: 1 }])).toEqual(['x', { a: 1 }])
  })

  it('does not alter credential fields', () => {
    const body = {
      password: 'p<a>ss&1',
      newPassword: 'n<w>&2',
      currentPassword: 'c<u>3',
      confirmPassword: 'c<f>4',
      token: 't<k>5',
      code: '12<3'
    }
    expect(sanitizeObject(body)).toEqual(body)
  })

  it('still sanitizes ordinary text fields', () => {
    expect(sanitizeObject({ name: '<script>alert(1)</script>Ann' }).name).toBe('Ann')
    expect(sanitizeInput('<img src=x onerror=alert(1)>')).not.toContain('onerror')
  })
})

/**
 * Zentrale Passwort-Policy (DRY). Diese eine Quelle wird überall verwendet,
 * wo Passwörter vergeben werden (Versammlungs-Passwort, Admin-Passwort).
 * Eine Änderung hier wirkt auf alle betroffenen Stellen.
 */
export interface PasswordPolicy {
  minLength: number
  requireUpper: boolean
  requireLower: boolean
  requireDigit: boolean
  requireSpecial: boolean
}

export const PASSWORD_POLICY: PasswordPolicy = {
  minLength: 8,
  requireUpper: true,
  requireLower: true,
  requireDigit: true,
  requireSpecial: true,
}

/** Fehlercode-Benennung passt zu den i18n-Keys (password.errors.*). */
export type PasswordErrorCode =
  | 'minLength'
  | 'upper'
  | 'lower'
  | 'digit'
  | 'special'

export interface PasswordValidationResult {
  valid: boolean
  errors: PasswordErrorCode[]
}

const LOWER = /[a-z]/
const UPPER = /[A-Z]/
const DIGIT = /[0-9]/
const SPECIAL = /[^A-Za-z0-9]/

/** Prüft ein Passwort gegen die Policy. Gibt alle fehlgeschlagenen Regeln zurück. */
export function validatePassword(
  password: string,
  policy: PasswordPolicy = PASSWORD_POLICY
): PasswordValidationResult {
  const errors: PasswordErrorCode[] = []
  if (password.length < policy.minLength) errors.push('minLength')
  if (policy.requireUpper && !UPPER.test(password)) errors.push('upper')
  if (policy.requireLower && !LOWER.test(password)) errors.push('lower')
  if (policy.requireDigit && !DIGIT.test(password)) errors.push('digit')
  if (policy.requireSpecial && !SPECIAL.test(password)) errors.push('special')
  return { valid: errors.length === 0, errors }
}